/*!
 * JSON-RPC 2.0 connect middleware
 * Copyright(c) 2012 Ax
 * 
 * app.all('/service', require('jsonrpc2-connect')(service))
 */

var Jsonrpc2 = require('./jsonrpc2'),
    fs = require('fs');

var jsonrpc = module.exports = function(service, args) {
    var rpc = new Jsonrpc2(service);

    return function(req, res, next) {
        function callback(rpcRes) {
            res.setHeader("Content-Type", "application/json")
            res.end(JSON.stringify(rpcRes, null, 2));
        };
        if ('GET' === req.method) {
            rpc.call(req.query, callback);
        }
        else if ('POST' === req.method) {
            rpc.call(req.body, callback);
        }
        else {
            next();
        }
    }
};

var processDir = function (path) {
    var names = fs.readdirSync(path),
        files = {};
    for (var i=0, l=names.length; i<l ; ++i) {
        var name = names[i];
        var text = fs.readSync(path+'/'+name, 'utf8');
        files[name] = text;
    }
}

jsonrpc.applyDir = function (path, app) {
    var files = processDir(path);
    for (var name in files) {
        app.all('/'+name, jsonrpc(files[name]));
    }
}