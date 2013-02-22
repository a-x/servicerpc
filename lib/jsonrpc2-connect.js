/*!
 * JSON-RPC 2.0 connect middleware
 * Copyright(c) 2012 Ax
 * 
 * app.all('/service', require('jsonrpc2-connect')(service))
 */

var Jsonrpc2 = require('./jsonrpc2')
    , path = require("path")
    , util = require("./jsonrpc2-util");

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

// jsonrpc.applyDir({dir: __dirname +'/api', app: app, prefix: '/api'});
jsonrpc.applyDir = function (args) {
    args = args || {};
    args.dir = args.dir || ".";
    args.prefix = args.prefix || "";
    var names = util.processDir(args.dir);
    for (var i=0, l=names.length; i<l ; ++i) {
        var fn = names[i]
            ,  name = path.relative(args.dir, fn)
        name = args.prefix + '/' + name.substring(0, name.length-3) + '/?';    
        args.app.all(name, jsonrpc(require(fn)));
    }
}

