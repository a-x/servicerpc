/*!
 * JSON-RPC 2.0 SockJS middleware
 * Copyright(c) 2012 Ax
 * 
 * require('jsonrpc2-socket.io')(service, {server: server}); 
 */

var socketio = require('socket.io'),
    Jsonrpc2 = require('./jsonrpc2');

var jsonrpc = module.exports = function(service, args) {
    var rpc = new Jsonrpc2(service);

    args = typeof(args) === 'object' ? args : {};
    var io = socketio.listen(args.server, args);
    args.prefix && (io = io.of(args.prefix));
    io.on('connection', function(socket) {
        console.log("!!!Connect", socket);
        socket.on('jsonrpc2', function(req) {
            console.log("!!!", req);
            rpc.call(req, function callback(res) {
                socket.emit("jsonrpc2", res);
            });
        });
        socket.on('disconnect', function () { });
    });
    return io;
};