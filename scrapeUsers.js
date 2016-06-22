var request = require('request');
var neo4j = require('neo4j-driver').v1;

var keys = require('./keys.js');

var driver = neo4j.driver("bolt://localhost", neo4j.auth.basic("neo4j", "neo4j1"));
var session = driver.session();


// My pseudocode:
// Get max length/count of Repo nodes in db
// Loop through each individual Repo node in db
	// Go to the repo_contributors_url property of the node
		// Make a http request to that url/link
			// Insert the results of the request as a User node
			// With the nodes inserted, make sure it has a relationship to the Repo node

var totalRepos;

session
	// Get count of Repo nodes in db. The number is stored in 'totalRepos';
	.run('MATCH (`n: *`) RETURN count(*)+"" as total')
	.then(function(result) {
		setTimeout(function() {
			console.log(result.records[0].get('total'));
			totalRepos = result.records[0].get('total');
			totalRepos = Number(totalRepos);
			
		}, 2000)
	})
	.then(function(){
		var currentIndex = 0;
		findNode(currentIndex);
	})

var findNode = function(index) {
	session
		.run('MATCH (n:Repo) WHERE id(n) = ' + index + ' return n.repo_contributors_url as node')
		.then(function(results){
			console.log(results.records[0].get('node'));
		})
}


// session.run('match (n:Repo) where id(n) = 7379 return n')
// 	.then(function(result){
// 		console.log(result.records[0])
// 	})
// 	.catch(function(err) {
// 		console.log("ERROR!!", err);
// 	})