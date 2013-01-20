#!/bin/env node

var http = require('http'),
    util = require('util'),
    express = require('express'),
    app = express(),
    cluster = require('cluster'),
    service = require('./service.test.js'),
    jsonrpc = require('../lib/jsonrpc2-connect'),
    numCPUs = 1,
    /*require('os').cpus().length*/
    PORT = process.env.OPENSHIFT_INTERNAL_PORT || process.env.PORT || 8080,
    HOST = process.env.OPENSHIFT_INTERNAL_IP || process.env.IP || '127.0.0.1'


app.configure(function() {
    app.use(express.favicon());
    app.use(express.logger());
    //  app.use(express.basicAuth(function(user, pass){return 'admin' == user && '12345' == pass;}));
    app.use(express.bodyParser());
    app.use(express.cookieParser());
    app.use(express.session({
        "secret": "JDTH-QVVP-RRYD-ZYGG"
    }));
    app.use(app.router);
    app.use(express.static(__dirname + '/public'));
    app.use(function(err, req, res, next) {
        console.error(err.stack);
        res.send(500, 'Something broke!');
    });
});

app.configure('development', function() {
    app.use(express.errorHandler());
});

app.all('/service', jsonrpc(service));

var test = function() {
    var options = {
        hostname: 'jsonrpc2-connect.ax.c9.io',
        port: 80,
        method: 'POST',
        path: '/service',
        headers : {
            "Content-Type" : "application/json"
        }
    };

    var req = http.request(options, function(res) {
//        console.log('STATUS: ' + res.statusCode);
//        console.log('HEADERS: ' + JSON.stringify(res.headers));
        res.setEncoding('utf8'); 
        res.on('data', function(chunk) {
            console.log('BODY: ' + chunk);
        });
    });

    req.on('error', function(e) {
        console.log('problem with request: ' + e.message);
    });

    // write data to request body
    req.write('{"id":1,"jsonrpc":"2.0","method":"get"}');
    req.end();
    
    http.get("http://jsonrpc2-connect.ax.c9.io/service?id=1&params=10&params=3&method=add&jsonrpc=2.0", function(res) {
//        console.log('STATUS: ' + res.statusCode);
//        console.log('HEADERS: ' + JSON.stringify(res.headers));
        res.setEncoding('utf8'); 
        res.on('data', function(chunk) {
            console.log('BODY: ' + chunk);
        });
    }).on('error', function(e) {
        console.log('problem with request: ' + e.message);
    });
    console.log(process.memoryUsage());
    process.nextTick(test);
}

if (cluster.isMaster) {
    // Fork workers.
    for (var i = 0; i < numCPUs; i++) {
        cluster.fork();
    }

    cluster.on('exit', function(worker, code, signal) {
        console.log('worker ' + worker.process.pid + ' died');
    });
}
else {
    // Workers can share any TCP connectionf
    // In this case its a HTTP server
    http.createServer(app).listen(PORT, HOST, function() {
        console.log("Express server(%d) listening on %s:%d", process.pid, HOST, PORT);
    });
    setTimeout(test, 1000);        
}

//var options = {
//    key: fs.readFileSync('./ssl/server.key'),
//    cert: fs.readFileSync('./ssl/server.crt')
//};
//https.createServer(options, app).listen(443);
