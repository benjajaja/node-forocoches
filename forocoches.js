var http = require('http');
var jsdom = require("jsdom");
var jquery = require('fs').readFileSync(__dirname + '/jquery-1.9.0.min.js').toString();
var Iconv  = require('iconv').Iconv;


exports.forum = {
	GENERAL: 2
};

var request = function(path, callback) {
	console.log('GET ' + path);
	var request = http.request({
		hostname: 'm.forocoches.com',
		port: 80,
		path: path,
		method: 'GET',
		headers: {
			'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
			'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.22 (KHTML, like Gecko) Chrome/25.0.1364.29 Safari/537.22',
			//'Accept-Encoding': 'gzip,deflate,sdch',
			'Accept-Language': 'en-US,en;q=0.8,es;q=0.6',
			'Accept-Charset': 'ISO-8859-1,utf-8;q=0.7,*;q=0.3',
			'Host': 'm.forocoches.com',
			//'Connection': 'keep-alive',
			'Cache-Control': 'max-age=0'
		}
	});
	request.on('response', function(clientResponse) {
		var chunks = [], length = 0;
		clientResponse.on('data', function (chunk) {
			chunks.push(chunk);
			length += chunk.length;
		});
		
		clientResponse.on('end', function () {
			if (clientResponse.statusCode != 200) {
				return callback(clientResponse.statusCode);
			}
			
			var buffer = new Buffer(length);
			var iconv = new Iconv('ISO-8859-1', 'UTF-8');
			var pos = 0;
			chunks.forEach(function(chunk) {
				chunk.copy(buffer, pos);
				pos += chunk.length;
			});
			
			jsdom.env({
				html: iconv.convert(buffer).toString(),
				src: [jquery],
				done: callback
			});
		});
	});
	request.end();
};

exports.foro = function(id, callback) {
	request('/foro/forumdisplay.php?f=' + id, function(errors, window) {
		if (errors) {
			callback(errors);
		} else if (!window) {
			callback('could not create window object');
		} else {
			var links = Array.prototype.slice.call(window.$('.page > div > ul > li > a[id]')).filter(function(a) {
				return a.id.indexOf('thread_title_') !== -1;
			}).map(function(a) {
				return {
					title: a.textContent,
					link: a.getAttribute("href")
				};
			});
			callback(null, links);
		}
	});
};

exports.post = function(id, callback) {
	request('/foro/showthread.php?t=' + id, function(errors, window) {
		if (errors) {
			callback(errors);
		} else if (!window) {
			callback('could not create window object');
		} else {
			var posts = Array.prototype.slice.call(window.$('.page > div > ul')).filter(function(post) {
				if (post.children.length === 1) {
					return false;
				} else if (post.className === 'ulpagenav') {
					return false;
				}
				
				return true;
			}).map(function(post) {
				var html = window.$('<div/>').html(window.$(post).find('div[name=HOTWordsTxt]').first().html());
				html.find(':not(img)').remove();
				
				return {
					user: {
						online: window.$(post).find('a.postuseravatarlink').children().first().attr('src'),
						id: parseInt(window.$(post).find('.xsaid a.ui-link').first().attr('href').substring('member.php?u='.length)),
						name: window.$(post).find('.xsaid a.ui-link').first().text().trim()
					},
					text: html.html()
				};
			});
			callback(null, posts);
		}
	});
};
