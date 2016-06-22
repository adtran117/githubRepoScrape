// Don't try to understand this file. Just my own notes.





//Create a db object. We will using this object to work on the DB.
// db = new neo4j('http://neo4j:neo4j1@localhost:7474');
var request = require('request');
var neo4j = require('neo4j-driver').v1;
var async = require("async");

var driver = neo4j.driver("bolt://localhost", neo4j.auth.basic("neo4j", "neo4j1"));
var session = driver.session();


var client_id = '6578b002bdb9fc4a0ab8';
var client_secret = '57beabb90cdc1041bc1e0f654ff6cc5f18fd6324';
//language:fortran created:2007-11-01..2008-12-01

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
//total: 7378
//761 results => language:fortran created:2008-01-01..2013-01-01
//978 results => language:fortran created:2013-01-02..2014-01-02
//790 results => language:fortran created:2014-01-03..2014-06-03
//909 results => language:fortran created:2014-06-04..2015-01-04
//824 results => language:fortran created:2015-01-05..2015-05-05
//810 results => language:fortran created:2015-05-06..2015-09-06
//927 results => language:fortran created:2015-09-07..2016-01-07
//789 results => language:fortran created:2016-01-08..2016-04-08
//590 results => language:fortran created:2016-04-09..2016-07-09

var currentPage = 1;
var url = 'https://api.github.com/search/repositories?q=+' + query[0] + '&page='+ currentPage +'&per_page=100&client_id=6578b002bdb9fc4a0ab8&client_secret=57beabb90cdc1041bc1e0f654ff6cc5f18fd6324';
// Get data from Github
var results;
// var url = 'https://api.github.com/search/repositories?q=+language:logos&page=1&per_page=100?client_id=6578b002bdb9fc4a0ab8&client_secret=57beabb90cdc1041bc1e0f654ff6cc5f18fd6324';
// var url = 'https://api.github.com/search/repositories?q=+language:logos&'
var options = {
  url: url,
  headers: {
    'User-Agent': 'adtran117'
  }
};

request(options, function(err, response, body){
  body = JSON.parse(body);
  var totalResults = body.total_count;
  var totalPages = Math.ceil(totalResults/100);

  var count = 0;
  // for loop will keep on going even after .run is called due to async so we use count instead of i
  for(var i = 0; i < body.items.length; i++) {
    session
      .run("MERGE (a:Repo {name:'" + body.items[i].name + "', repo_id:'" + body.items[i].id +
        "', repo_contributors_url:'" + body.items[i].contributors_url + "'})")
      .then(function() {
        console.log(count);
        ++count;
        if(body.items.length === count) {
          session.close();/.
          driver.close();
        }
      })
      .catch(function(err) {
        console.log(err);
        ++count;
        if(body.items.length === count) {
          session.close();
          driver.close();
        }
      })
  }
});





// session
  // .run( "CREATE (a:Person {name:'Arthur', title:'King'})" )
//   .then( function()
//   {
//     return session.run( "MATCH (a:Person) WHERE a.name = 'Arthur' RETURN a.name AS name, a.title AS title" )
//   })
//   .then( function( result ) {
//     console.log( result.records[0].get("title") + " " + result.records[0].get("name") );
//     session.close();
//     driver.close();
//   })


var createRepo = function() {

}
