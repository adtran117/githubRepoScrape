var request = require('request');
var neo4j = require('neo4j-driver').v1;
// var async = require("async");
var keys = require('./keys.js');

var driver = neo4j.driver("bolt://localhost", neo4j.auth.basic("neo4j", "neo4j1"));
var session = driver.session();

//sample!
// 16 queries per minute
// https://api.github.com/search/repositories?q=+language:fortran+created:2008-01-01..2013-01-01&page=1&per_page=100

// What the results should be if you look for fortran
//total: 7378 repos
//761 results => language:fortran created:2008-01-01..2013-01-01
//978 results => language:fortran created:2013-01-02..2014-01-02
//790 results => language:fortran created:2014-01-03..2014-06-03
//909 results => language:fortran created:2014-06-04..2015-01-04
//824 results => language:fortran created:2015-01-05..2015-05-05
//810 results => language:fortran created:2015-05-06..2015-09-06
//927 results => language:fortran created:2015-09-07..2016-01-07
//789 results => language:fortran created:2016-01-08..2016-04-08
//590 results => language:fortran created:2016-04-09..2016-07-09


//define multiple github URL/endpoints to get results
var query = {
  1: 'language:fortran+created:2008-01-01..2013-01-01',
  2: 'language:fortran+created:2013-01-02..2014-01-02',
  3: 'language:fortran+created:2014-01-03..2014-06-03',
  4: 'language:fortran+created:2014-06-04..2015-01-04',
  5: 'language:fortran+created:2015-01-05..2015-05-05',
  6: 'language:fortran+created:2015-05-06..2015-09-06',
  7: 'language:fortran+created:2015-09-07..2016-01-07',
  8: 'language:fortran+created:2016-01-08..2016-04-08',
  9: 'language:fortran+created:2016-04-09..2016-07-09'
};


//number of times a repo was entered into the db
var maxNumQueries = 9;
var numInsert = 0;
var currentPage = 1;
var currentQuery = 1;

// number of total results to a specific query
var totalResults;
// number of pages to iterate through for a specific query
var totalPages = 1;


var scrape = function() {
//talk to each end point...only do next end point when you are finished with pagination..
	var url = 'https://api.github.com/search/repositories?q=+' + query[currentQuery] + '&page='+ currentPage + 
		'&per_page=100&client_id=' + keys.id + '&client_secret=' + keys.secret;
	var options = {
  	url: url,
  	headers: {
    	'User-Agent': 'adtran117'
  	}
	};

	request(options, function(err, response, body) {
		console.log('Made a request to github with query# ' + currentQuery +' and page# ' + currentPage);
		if(err){
			console.log(err);
		}

		// The data that comes back is in JSON format so we must parse it.
		body = JSON.parse(body);

		// The results of your query will tell you how many results there are. There can only be
		// 100 results or 100 nodes per page so totalPages is calculated here.
		totalResults = body.total_count;
		totalPages = Math.ceil(totalResults/100);

		dbInsert(body);

		// No recursive call here because of async. We have to move our recursive call in the
		// insertion function (dbInsesrt).

		// ++currentPage;
		// if(currentPage < totalPages) {
		// 	scrape();
		// }
	});
};

// should insert 100 nodes per page
// note that the .then contains the recursive scrape call
var dbInsert = function(body) {
	var insertCount = 0;
	for (var i = 0; i < body.items.length; i++) {
		session
		// Insert ONE node into db
	      .run("MERGE (a:Repo {name:'" + body.items[i].name + "', repo_id:'" + body.items[i].id +
	        "', repo_contributers_url:'" + body.items[i].contributors_url + "'})")
	      // Run this when finished inserting..
	      .then(function() {
	      	// I use an insertCount variable here to keep track how many times a node was inserted. The 
	      	// variable 'i' is not used because 'i' will keep on incrementing even after insertions are 
	      	// not complete due to lack of async support in a regular for loop.
	        ++insertCount;

	        // If the amount of insertions equal the amount of nodes in one page, go to the next page
	        if(body.items.length === insertCount) {
	          ++currentPage;
	          // Keep scraping if you haven't reached the total number of pages yet
	          // Remember that if totalResults are 761, there must be 8 pages so you wouldn't stop
	          // until you reach 9 pages
	          if(currentPage <= totalPages) {
	          	scrape();
	          	// If the current page reaches the max num of pages in a query, reset page to 1 but
	          	// go to next query (total of 9 queries to be done)
	          } else {
	          	currentPage = 1;
	          	++currentQuery;
	          	// Keep on scraping as long as you dont go over the num of queries you need
	          	if(currentQuery <= maxNumQueries) {
		          	console.log('Moving to next query (' + currentQuery +')');
		          	scrape();
	          	} else {
	          		console.log('Finished!');
	          	}
	          }
	        }
	      })
	      .catch(function(err) {
	        console.log("ERROR", err);
	        ++insertCount;
	        if(body.items.length === insertCount) {
	          ++currentPage;
	          if(currentPage < totalPages) {
	          	scrape();
	          } else {
	          	currentPage = 1;
	          	++currentQuery;
	          	console.log('Moving to next query (' + currentQuery +')');
	          	console.log('It is in error/catch');
	          	scrape();
	          }
	        }
	      })
	}
}

scrape();
