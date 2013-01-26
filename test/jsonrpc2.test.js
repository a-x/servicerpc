var rpc = require("../lib/jsonrpc2.js"),
    util = require("util");

rpc = new rpc({
    add: function(a, b, fn) {
        a = a || 0;
        b = b || 0;
        fn(null, a + b);
    },
    sub: function(a, b, fn) {
        a = a || 0;
        b = b || 0;
        fn(null, a - b);
    },
    max: function(a, b, fn) {
        fn(null, a > b ? a : b);
    },
    get: function(fn) {
        fn(null, 'ok');
    }
})

var req = {
    jsonrpc: "2.0",
    id: "11",
    method: "add",
    params: {
        a: 11,
        b: 100
    }
}

//req.method = '';
//req.params = [];
//rpc.call(req, function(res){
//    console.log(res)
//})
//return;

var PARSE_ERROR = -32700;
var INVALID_REQUEST = -32600;
var METHOD_NOT_FOUND = -32601;
var INVALID_PARAMS = -32602;

var vows = require('vows'),
    fs = require('fs'),
    spec = require('./../node_modules/vows/lib/vows/reporters/spec'),
    assert = require('assert');

var rpcCall = function(json) {
    return function() {
        var callback = this.callback;
        rpc.callJSON(json, function(res) {
            callback(null, res);
        })
    };
}

var testAnswer = function(answer) {
    return function(res) {
        res = res && JSON.parse(res);
        if (res && res.error) 
            assert.equal(answer, res.error.code);
        else 
            assert.equal(answer, res ? res.result : res);
    };
}

var testTopic = function(json, error) {
    var obj = {
        topic: rpcCall(json)
    }
    obj[json] = typeof(error) === 'function' ? error : testAnswer(error);
    return obj;
}

vows.describe('JSON-RPC').addBatch({
    'Error': {
        'PARSE_ERROR': {
            '1': testTopic('{"jsonrpc": "2.0", "method": "add", "params": [42, 23], "id": 1', PARSE_ERROR),
            '2': testTopic('test', PARSE_ERROR)
        },
        'INVALID_REQUEST': {
            '1': testTopic('[]', INVALID_REQUEST),
            '2': testTopic('{}', INVALID_REQUEST),
            '3': testTopic('{"id":1}', INVALID_REQUEST),
            '4': testTopic('{"jsonrpc":"1.2"}', INVALID_REQUEST),
            '5': testTopic('{"jsonrpc":"1.2", "id":1}', INVALID_REQUEST),
            '6': testTopic('{"jsonrpc":"2.0"}', INVALID_REQUEST),
            '7': testTopic('{"jsonrpc":"2.0", "id":1}', INVALID_REQUEST),
            '8': testTopic('{"jsonrpc":"2.0", "id":[1], "method":"ax"}', INVALID_REQUEST),
            '9': testTopic('{"jsonrpc":"2.0", "params":[1,2], "id":123}', INVALID_REQUEST),
            '10': testTopic('{"jsonrpc":"2.0", "mehod":"add", "params":[1,2], "id":1}', INVALID_REQUEST)
        },
        'METHOD_NOT_FOUND': {
            '1': testTopic('{"jsonrpc":"2.0", "id":1, "method":"ax"}', METHOD_NOT_FOUND),
            '4': testTopic('{"jsonrpc":"2.0", "method":"multiple", "params":[1,2], "id":1}', METHOD_NOT_FOUND),
            '5': testTopic('{"jsonrpc":"2.0", "method":"name", "params":[1,2], "id":1}', METHOD_NOT_FOUND)
        },
        'INVALID_PARAMS': {
            '1': testTopic('{"jsonrpc":"2.0", "id":1, "method":"add", "params": [1,2,3]}', INVALID_PARAMS),
            '2': testTopic('{"jsonrpc":"2.0", "method":"add", "params":23, "id":1}', INVALID_PARAMS),
            '3': testTopic('{"jsonrpc":"2.0", "method":"add", "params":"2,3", "id":1}', INVALID_PARAMS),
            '4': testTopic('{"jsonrpc":"2.0", "method":"add", "params":[5,2,3], "id":1}', INVALID_PARAMS),
            '5': testTopic('{"jsonrpc":"2.0", "method":"add", "params":[5,2,3,4]}', INVALID_PARAMS),
            '6': testTopic('{"jsonrpc":"2.0", "method":"add", "params":[5], "id":1}', INVALID_PARAMS),
            '7': testTopic('{"jsonrpc":"2.0", "method":"add", "params":[], "id":1}', INVALID_PARAMS),
            '8': testTopic('{"jsonrpc":"2.0", "method":"add", "params":{"a":10,"x":3}, "id":1}', INVALID_PARAMS),
            '9': testTopic('{"jsonrpc":"2.0", "method":"get", "params":{"a":10,"b":3,"c":34}, "id":1}', INVALID_PARAMS),
            '10': testTopic('{"jsonrpc":"2.0", "method":"add", "params":{}, "id":1}', INVALID_PARAMS)
        }
    },
    'CALL': {
        '1': testTopic('{"jsonrpc":"2.0", "id":1, "method":"add", "params": [1,2]}', 3),
        '2': testTopic('{"jsonrpc":"2.0", "id":1, "method":"add", "params": {"a":10,"b":3}}', 13),
        '3': testTopic('{"jsonrpc":"2.0", "id":1, "method":"get", "params":[]}', 'ok'),
        '4': testTopic('{"jsonrpc":"2.0", "id":1, "method":"get", "params":{}}', 'ok'),
        '5': testTopic('{"jsonrpc":"2.0", "id":1, "method":"get"}', 'ok'),
        '6': testTopic('{"jsonrpc":"2.0", "method":"get"}'),
        '7': testTopic('{"jsonrpc":"2.0", "id":1, "method":"sub", "params": [10,2]}', 8),
        '8': testTopic('{"jsonrpc":"2.0", "id":1, "method":"sub", "params": [2,10]}', -8),
        '9': testTopic('{"jsonrpc":"2.0", "id":1, "method":"sub", "params": {"a":10,"b":3}}', 7),
        '10': testTopic('{"jsonrpc":"2.0", "id":1, "method":"sub", "params": {"b":3,"a":10}}', 7)
    },
    'BATCH': {
        '1': testTopic('[{"jsonrpc":"2.0", "id":1, "method":"get"},{"jsonrpc": "2.0", "method": "subtract", "params": [42, 23], "id": 1}]', function(res) {
            res = JSON.parse(res);
            assert.equal(res.length, 2);
            assert.equal(res[0].result, 'ok');
            assert.equal(res[1].error.code, METHOD_NOT_FOUND);
        }),
        '2': testTopic('[1,2,3]', function(res) {
            res = JSON.parse(res);
            assert.equal(res.length, 3);
            assert.equal(res[0].error.code, INVALID_REQUEST);
            assert.equal(res[1].error.code, INVALID_REQUEST);
            assert.equal(res[2].error.code, INVALID_REQUEST);
        }),
        '3': testTopic('[1,{"jsonrpc":"2.0", "method":"get"}]', function(res) {
            res = JSON.parse(res);
            assert.equal(res[0].error.code, INVALID_REQUEST);
        }),
        '4': testTopic('[{"jsonrpc":"2.0", "method":"get"},{"jsonrpc":"2.0", "method":"get"}]', function(res) {
            assert.isUndefined(res);
        }),
        '5': testTopic('[{"jsonrpc":"2.0", "id":1, "method":"sub", "params": [10,2]},{"jsonrpc":"2.0", "id":2, "method":"sub", "params": {"b":3,"a":10}}]', function(res) {
            res = JSON.parse(res);
            assert.equal(res.length, 2);
            assert.equal(res[0].result, 8);
            assert.equal(res[1].result, 7);
        }),
        '6': testTopic('[{"jsonrpc":"2.0", "id":1, "method":""}]', function(res) {
            res = JSON.parse(res);
            assert.equal(res[0].result.properties.add.params[0].name, 'a');
            assert.equal(res[0].result.properties.add.params[1].name, 'b');
            assert.equal(res[0].result.properties.get.params.length, 1);
        })
    }
}).run({
    reporter: spec
});