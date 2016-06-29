/* Things to get
* followers - top
* stars
* forks
* watch
*/

var request = require('request');
var keys = require('./keys.js');
var neo4j = require('neo4j-driver').v1;


var driver = neo4j.driver("bolt://localhost", neo4j.auth.basic("neo4j", "neo4j1"));
var session = driver.session();


var totalUsers;
// Internal db user index starts at 7378...will fix later max should be 13042 or so
var currentUserIndex = 7378;
// var currentUserIndex = 9534;
// My pseudocode
// Get total count of all Users 
// Iterate over Users in db from 0 to total count of all Users
	// Get login/username of the user 
	// Make a request with that username ex: 'https:/api.github.com/users/adtran117'
		// Grab the followers and insert to User's properties in db
			// Make a request with the user's repo URL
				// Grab total count of stars, forks, and watching
				// Attach total to original user

var scrape = function() {
	session
		.run('MATCH (n: User) RETURN count(*)+"" as total')
		.then(function(result){
			totalUsers = Number(result.records[0].get('total'));
			totalUsers = totalUsers + 7378;
		})
		.then(function(){
			findNodes(currentUserIndex);
		})
		.catch(function(err){
			console.log("ERROR in scrape", err);
		})
};

var findNodes = function(index) {
	session
		.run('MATCH (n:User) WHERE id(n) = ' + index + ' return n.repos_url as repos, n.login as login')
		.then(function(results) {
			var userRepoEndpoint = results.records[0].get('repos');
			var login = results.records[0].get('login');
			getRepoInfo(userRepoEndpoint, login); 
		})
}

var getRepoInfo = function(endpoint, login) {
	var url = endpoint + '?client_id=' + keys.id + '&client_secret=' + keys.secret;
	var options = {
		url: url,
		headers: {
    	'User-Agent': 'adtran117'
  	}
	}

	request(options, function(err, response, body) {
		console.log('Made a request to github asking for repos that the user# '+ currentUserIndex + ' owns.');
		var remaining = response.headers['x-ratelimit-remaining'];
		var resetTime = response.headers['x-ratelimit-reset'];

		if(remaining <= 1) {
			checkResetTime(endpoint, login);
		} else {
			var totalForks = 0;
			var totalStars = 0;
			var totalWatches = 0;
			body = JSON.parse(body);
			if(body.length > 0) {
				for(var i = 0; i < body.length; i++) {
					totalForks += body[i]['forks'];
					totalStars += body[i]['stargazers_count'];
					totalWatches += body[i]['watchers_count'];
				}
				session
					.run("MATCH (n:User {login:'" + login + "'}) SET n.totalForks = " + totalForks + 
						", n.totalStars = " + totalStars + ", n.totalWatches = " + totalWatches)
					.then(function(){
						++currentUserIndex;
						if(currentUserIndex < totalUsers) {
							scrape();
						} else {
							session.close();
							driver.close();
						}
					})
					.catch(function(err){
						console.log("ERROR in getRepoInfo", err);
						++currentUserIndex
						if(currentUserIndex < totalUsers) {
							scrape();
						} else {
							session.close();
							driver.close();
						}
					})
			} else {
				session
					.run("MATCH (n:User {login:'" + login + "'}) SET n.totalForks = " + 0 + 
						", n.totalStars = " + 0 + ", n.totalWatches = " + 0)
					.then(function() {
						++currentUserIndex;
						if(currentUserIndex < totalUsers) {
							scrape();
						} else {
							session.close();
							driver.close();
						}
					})
			}
		}
	})
}


var rateLimitUrl = 'https://api.github.com/rate_limit' + '?client_id=' + keys.id +
	'&client_secret=' + keys.secret;

var rateLimitOptions = {
	url: rateLimitUrl,
	headers: {
		'User-Agent': 'adtran117'
	}
}

var checkResetTime = function(endpoint, login){
	request(rateLimitOptions, function(err, response,body) {
		if(err) {
			console.log("ERROR in checkResetTime", err);
		}
		body = JSON.parse(body);
		var remaining = body.resources.core.remaining;
		var resetTime = body.resources.core.reset;
		if(remaining <= 1) {
			console.log("Waiting until rate limit is over...");
			console.log('Time when limit is over: ' + new Date(resetTime * 1000));
			setTimeout(function() {
				checkResetTime(endpoint);
			}, 10000)
		} else {
			console.log("Rate limit is over! Talking to github api again.");
			getRepoInfo(endpoint, login);
		}
	})
}

scrape();