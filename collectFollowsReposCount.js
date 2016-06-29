var request = require('request');
var keys = require('./keys.js');
var neo4j = require('neo4j-driver').v1;


var driver = neo4j.driver("bolt://localhost", neo4j.auth.basic("neo4j", "neo4j1"));
var session = driver.session();


var totalUsers;
// Internal db user index starts at 7378...will fix later max should be 13042 or so
// var currentUserIndex = 7378;
var currentUserIndex = 12356;

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
		.run('MATCH (n:User) WHERE id(n) = ' + index + ' return n.url as url, n.login as login')
		.then(function(results) {
			var userEndpoint = results.records[0].get('url');
			var login = results.records[0].get('login');
			getUserInfo(userEndpoint, login); 
		})
}

var getUserInfo = function(endpoint, login) {
	var url = endpoint + '?client_id=' + keys.id + '&client_secret=' + keys.secret;
	var options = {
		url: url,
		headers: {
    	'User-Agent': 'adtran117'
  	}
	}

	request(options, function(err, response, body) {
		console.log('Made a request to github asking for followers&repoCount that the ' +
			'user# '+ currentUserIndex + ' has.');
		var remaining = response.headers['x-ratelimit-remaining'];
		var resetTime = response.headers['x-ratelimit-reset'];

		if(remaining <= 1) {
			checkResetTime(endpoint, login);
		} else {
			body = JSON.parse(body);
			var followers = body.followers;
			var repos = body["public_repos"];
			session
				.run("MATCH (n:User {login:'" + login + "'}) SET n.totalFollowers = " + followers +
					", n.totalRepos = " + repos )
				.then(function() {
					++currentUserIndex;
					if(currentUserIndex < totalUsers) {
						scrape();
					} else {
							console.log('Complete!');
							session.close();
							driver.close();
					}
				})
				.catch(function(err) {
					console.log("ERROR in getUserInfo", err);
					++currentUserIndex;
					if(currentUserIndex < totalUsers) {
						scrape();
					} else {
							console.log('Complete!');
							session.close();
							driver.close();
					}
				})
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
			getUserInfo(endpoint, login);
		}
	})
}

scrape();