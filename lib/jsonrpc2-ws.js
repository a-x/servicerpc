/*!
 * JSON-RPC 2.0 WebSocket middleware
 * Copyright(c) 2012 Ax
 * 
 * require('jsonrpc2-sockjs')(service).installHandlers(httpServer, {prefix:'/sockjs'}); 
 */

var WebSocketServer = require('ws').Server,
    Jsonrpc2 = require('./jsonrpc2');

var jsonrpc = module.exports = function(service, args) {
    var rpc = new Jsonrpc2(service);

    args = typeof(args) === 'object' ? args : {};
    var wss =  new WebSocketServer(args);
    wss.on('connection', function(ws) {
        ws.on('message', function(message) {
            rpc.callJSON(message, function callback(rpcRes) {
                ws.send(rpcRes);
            });
        });
    });
    return wss;
};