var util = require('util'),
    Jsonrpc2 = require('ax.jsonrpc2');

var jsonrpc = module.exports = function (service, args) {
    var rpc = new Jsonrpc2(service);
    return function(req, res, next) {
        
        var rpcReq = { 
            id : req.body.id,
            method : req.body.method,
            params : req.body.params
        }
        rpc.call(rpcReq, function(rpcRes) {
            res.json(rpcRes);
        });
    }    
};