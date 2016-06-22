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
			// Iterate through the results (it is an array)
				// Insert the results of the request as a User node 
				// With the nodes inserted, make sure it has a relationship to the Repo node

var totalRepos;
var currentRepoIndex = 0;

var scrape = function() {
	session
		// Get count of Repo nodes in db. The number is stored in 'totalRepos';
		.run('MATCH (n: Repo) RETURN count(*)+"" as total')
		.then(function(result) {
				totalRepos = result.records[0].get('total');
				totalRepos = Number(totalRepos);
		})
		.then(function(){
			findNode(currentRepoIndex);
		})

	var findNode = function(index) {
		session
			.run('MATCH (n:Repo) WHERE id(n) = ' + index + ' return n.repo_contributors_url as node')
			.then(function(results){
				var userEndpoint = results.records[0].get('node');
				getUsers(userEndpoint);
			})
	}	
}

/*
	Things I want:
	login
	id
	avatar_url
	url
	html_url
	followers_url
	following_url
	starred_url
	subscriptions_url
	organizations_url
	repos_url
*/

var getUsers = function(endpoint) {
	var url = endpoint + '?client_id=' + keys.id + '&client_secret=' + keys.secret;
	var options = {
		url: url,
		headers: {
    	'User-Agent': 'adtran117'
  	}
	}
	request(options, function(err, response, body) {
		console.log('Made a request to github asking for users for repo# ' + currentRepoIndex);
		if(err) {
			console.log(err);
		}
		body = JSON.parse(body);

		if(body.length > 0) {
			var insertCount = 0;
			for(var i = 0; i < body.length; i++) {
				session
					// Insert into DB
					.run("MERGE (a:User {login:'" + body[i].login + "', id:" + body[i].id + ", avatar_url:'" +
						body[i].avatar_url + "', url:'" + body[i].url + "', html_url:'" + body[i].html_url + 
						"', followers_url:'" + body[i].followers_url + "', following_url:'" + body[i].following_url +
						"', starred_url:'" + body[i].starred_url + "', subscriptions_url:'" + body[i].subscriptions_url + 
						"', organizations_url:'" + body[i].organizations_url + "', repos_url:'" + body[i].repos_url + "'})")
					.then(function(){
						++insertCount;
						// If amount inserted reaches equals amount of users that contributed to the repo go to next repo
						if(insertCount === body.length) {
							++currentRepoIndex;
							if(currentRepoIndex <= totalRepos) {
								scrape();
							}
						}
					})
					.catch(function(err) {
						console.log(err);
					})
			}
			// If no contributors do this..
		} else {
			++currentRepoIndex;
			if(currentRepoIndex <= totalRepos) {
				scrape();
			}
		}
	})
}


scrape();
// session.run('match (n:Repo) where id(n) = 7379 return n')
// 	.then(function(result){
// 		console.log(result.records[0])
// 	})
// 	.catch(function(err) {
// 		console.log("ERROR!!", err);
// 	})