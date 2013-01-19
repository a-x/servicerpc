var util = require('util'),
    Jsonrpc2 = require('ax.jsonrpc2');

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
            res.end(""+req.method);
            
//            return next();
        }
    }
};