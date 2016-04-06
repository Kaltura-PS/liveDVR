var MP4Writer = require('../../../lib/MP4Writer');
var fs = require('fs');
var http = require('http');
var Url = require('url');

var tsFilePath = "/Users/igors/Documents/media-u3hnkeqbd_w624400711_8026.ts_saved.ts";//__dirname+'/../resources/media-uixh2a1qh_w1892051821_472.ts';
var httpPath = 'http://localhost/wn/media-uhe4wm3o6_b475136_144354218.ts';

var ts2mp4 = new MP4Writer(tsFilePath, {
        debug: console.log,
        info: console.log,
        warn: console.log,
        error: console.log
    });

var origUrl = {
    'http:': function (url, cb) {
        var req = http.get(url);
        req.on('error', function (err) {
            console.log(err);
        });
        req.on('response', function (responce, error) {
            if (error) {
                req.emit('error', error);
                return;
            }
            cb(response);
            req.end();
        });
    },
    'file:': function (url, cb) {
        var rs = fs.createReadStream(url.path);
        cb(rs);
    }
};


var createPipe = function(url,cb){
    var resolved = Url.parse(url);
    return origUrl[resolved.protocol ? resolved.protocol : 'file:'](resolved,cb);

};


createPipe( tsFilePath, function(readable) {
    readable.pipe(ts2mp4)
        .on('data', function (chunk) {
            console.log("data " + chunk.length);
        })
        .on('end', function (fileInfo) {
            console.log("end");
        })
        .on('error', function (err) {
            console.log(err);
        });
});
