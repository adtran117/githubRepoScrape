var request = require('request');
var keys = require('./keys.js');


var url = 'https://api.github.com/search/repositories?q=language:fortran';


var options = {
  	url: url,
  	headers: {
    	'User-Agent': 'adtran117'
  	}
};

var rateLimitUrl = 'https://api.github.com/rate_limit' 
// + '?client_id=' + keys.id + '&client_secret=' + keys.secret;

var rateLimitOptions = {
	url: rateLimitUrl,
	headers: {
		'User-Agent': 'adtran117'
	}
}

var scrape = function() {
	request(options, function(err, response, body) {
		console.log('Made request to github');
		var remaining = response.headers['x-ratelimit-remaining'];
		var resetTime = response.headers['x-ratelimit-reset'];
		// console.log(remaining)
		// body = JSON.parse(body);
		if(remaining <= 1) {
				console.log(remaining);
				checkResetTime();
		} else {
			scrape();
		}
	})
};

scrape();

var checkResetTime = function(){
	request(rateLimitOptions, function(err, response,body) {
					body = JSON.parse(body);
					var remaining = body.resources.search.remaining;
					var resetTime = body.resources.search.reset;
					console.log('inside checkResetTime', remaining)
					if(remaining <= 1) {
						console.log("Waiting until rate limit is over...");
						console.log('Time when limit is over: ' + new Date(resetTime * 1000));
						setTimeout(function() {
							checkResetTime();
						}, 10000)
					} else {
						console.log("Rate limit is over!");
						scrape();
					}
				})
}