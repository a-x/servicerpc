(function(module) {
    "use strict";

    var validate = function(req) {
        var error;
        if (typeof(req.method) !== 'function') {
            error = {
                code: 32600,
                message: 'Invalid Request'
            };
        }
        else if (req.params && typeof(req.method) !== 'object') {
            error = {
                code: 32602,
                message: 'Invalid params'
            };
        }

        return error;
    };

    var uuid = function() {
        uuid._id = +uuid._id || 0;
        return ++uuid._id + '';

    };
    
    var Trasport = function (args) {
    };
    Trasport.prototype.send = function(req, callback) {
    };

    var Sock = function(args) {
        this._args = args || {};
        this._callbacks = {};
        this._init();
    };
    Sock.prototype._clearCallbacks = function() {
        for(var id in this.callbacks) {
            if (!this._callbacks.hasOwnProperty(id))
                continue;
            var callback = this._callbacks[id];
            if (typeof(callback) === 'function') {
                callback({ code:-32603, message: 'Internal error' });
            }
        }
        this._callbacks = {}
    }
    
    Sock.prototype._init = function() {
        this._clearCallbacks();
        var sockjs_url = this._args.url || '/';
        this.sockjs = new SockJS(sockjs_url);
        var self = this;
        this.sockjs.onopen    = function()  {
            self.opened = true;
        };
        this.sockjs.onmessage = function(e) {
            var data = e.data || '',
                error,
                res = {};
            try {
                res = JSON.parse(data);
            } catch (err) {
                error = { code:-32603, message: 'Internal error' };
            }
    
            res = (typeof(res) === 'object') ? res : {error: error || { code:-32603, message: 'Internal error' }};
              
            var callback = res.id && self._callbacks[res.id];
            callback && callback(res);
            
        };
        this.sockjs.onclose   = function()  {
            self.opened = false;
            self._init();
        };
        this.sockjs.onerror   = function(e)  {
            self.opened = false;
            self._init();
            alert(e);
        };
    };
    
    Sock.prototype.send = function(req, callback) {
        callback && (this._callbacks[req.id] = callback);
        this.sockjs.send(JSON.stringify(req));
    }
    
    var Service = module.exports = function(args) {
        this.callbacks = {}
        this.url = args.url || '';
        this.transport = new Sock(args);
    }

    Service.prototype.call = function(req, callback) {
        var err = validate(req);
        if (err) {
            callback && callback(err);
        }
        else {
            callback ? (req.id = uuid()) : (delete(req.id));
            req.jsonrpc = '2.0';
            this.transport.send(req, function(res) {
                res = res || {};
                var error = res.error,
                    result = res.result;
                callback && callback(error, result);                   
            });
        }


    }
    url: "",
    _counter: 0 // TODO: UUID ?
    ,
    applyFunctions: function() {
        this.call("", 0, $.proxy(function(data) {
            console.log(data)
            if (!data) return;

            for (var key in data) {
                this[key] = (function(name) {
                    return function(d, c) {
                        this.call(name, d, c)
                    }
                })(key)
            }
        }, this))
    },
    call: function(name, data, callback) {
        // set data object
        data = {
            "id": "" + (this._counter++) + "-" + (+new Date),
            "jsonrpc": "2.0",
            "method": name,
            "params": data
        };
        var options = {
            "url": this.url,
            "type": "POST",
            "dataType": 'json',
            "data": data
        };
        if (callback) {
            options.success = $.proxy(function(data, textStatus, jqXHR) {
                data && callback(data.result);
            }, this);
            options.error = $.proxy(function(jqXHR, textStatus, errorThrown) {
                callback(undefined, {
                    "code": -1,
                    "message": textStatus
                });
            }, this);
        }
        $.ajax(options);
    },
},

function(data) {
    data && $.extend(this, data);
});

//------------------------------------------------------------------------------

exports.SocketService = util.extender({
    url: "",
    _response: "response",
    _request: "request",
    _counter: 0, // TODO: UUID ?
    _callbacks: {},
    call: function(name, data, callback) {
        // set data object
        data = {
            id: "" + (this._counter++) + "-" + (+new Date),
            name: name,
            data: data
        };
        console.log(data.id);
        this.socket.emit(this._request, data);
        if (callback) this._callbacks[data.id] = callback;
    },
    response: function(data) {
        var id = data.id;
        console.log(id);
        var callback = this._callbacks[id];
        if (callback) {
            delete this._callbacks[id];
            callback(data.data);
        }
        else {
            console.log("Not callback for id: " + id);
        }
    }
},

function(data) {
    data && $.extend(this, data);

    this.socket = io.connect(window.location.host + this.url);
    this.socket.on(this._response, $.proxy(this.response, this));
});

//------------------------------------------------------------------------------

})();
/**   MODULE  **/
