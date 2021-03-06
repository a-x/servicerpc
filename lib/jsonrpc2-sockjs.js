/*!
 * JSON-RPC 2.0 SockJS middleware
 * Copyright(c) 2012 Ax
 * 
 * require('jsonrpc2-sockjs')(service).installHandlers(httpServer, {prefix:'/sockjs'}); 
 */

var sockjs = require('sockjs'),
    Jsonrpc2 = require('./jsonrpc2');

var jsonrpc = module.exports = function(service, args) {
    var rpc = new Jsonrpc2(service);

    args = typeof(args) === 'object' ? args : {};
    args.sockjs_url = args.sockjs_url || "http://cdn.sockjs.org/sockjs-0.3.min.js";
    var sock = sockjs.createServer(args);
    sock.on('connection', function(conn) {
        conn.on('data', function(message) {
            rpc.callJSON(message, function callback(rpcRes) {
                conn.write(rpcRes);
            });
        });
    });
    sock.installHandlers(args.server, args);
    return sock;
};