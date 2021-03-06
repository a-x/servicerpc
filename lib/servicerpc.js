(function(module, $, undefined) {
    "use strict";

    var validate = function(req) {
        var error;
        if (typeof(req.method) !== 'string') {
            error = {
                code: 32600,
                message: 'Invalid Request'
            };
        }
        else if (req.params && typeof(req.params) !== 'object') {
            error = {
                code: 32602,
                message: 'Invalid params'
            };
        }

        return error;
    };

    var uuid = function() {
        return (Math.random()*0xffffffff | 1).toString(16) + '-' + 
        (Math.random()*0xffff | 1).toString(16) + '-' + 
        (Math.random()*0xffff | 1).toString(16) + '-' + 
        (Math.random()*0xffff | 1).toString(16) + '-' + 
        (Math.random()*0xffffffffffff | 1).toString(16) + '-' + 
        (+new Date);
    };
    
    var inherits = function(child, parent) {
        var F = function() { };
        F.prototype = parent.prototype;
        child.prototype = new F();
        child.prototype.constructor = child;
        child.superclass = parent.prototype;
        child.parent = parent;
    };
    
    // Transport interface
    var Transport = function (url) {
        this._args = {url: url || '/'};
        this._init();
    };

    Transport.prototype.send = function(req) {
    };

    // SocketIO transport
    var SocketIO = function(url) {
        Transport.apply(this, arguments);
    };

    inherits(SocketIO, Transport);
    
    SocketIO.prototype._init = function() {
        this.socket = io.connect(this._args.url);
        var self = this;
        self._opened = true;
        this.socket.on("jsonrpc2", function(res)  {
            self.onmessage && self.onmessage(res);
        });
    };
    
    SocketIO.prototype.send = function(req) {
        this.socket.emit("jsonrpc2", req);
    }
    
    // SockJS transport
    var Sock = function(url) {
        Transport.apply(this, arguments);
    };

    inherits(Sock, Transport);
    
    Sock.prototype._init = function() {
        var sockjs_url = this._args.url;
        this.sockjs = new SockJS(sockjs_url);
        var self = this;
        this.sockjs.onopen    = function()  {
            self._opened = true;
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
              
            self.onmessage && self.onmessage(res);
        };
        this.sockjs.onclose   = function()  {
            self._opened = false;
            self.onerror && self.onerror({error: { code:-32603, message: 'Internal error' }});
            self._init();
        };
        this.sockjs.onerror   = function(e)  {
            self._opened = false;
            self.onerror && self.onerror({error: { code:-32603, message: 'Internal error' }});
        };
    };
    
    Sock.prototype.send = function(req) {
        this.sockjs.send(JSON.stringify(req), this.sockjs.onerror);
    }
    
    // WebSocket transport
    var WSocket= function(url) {
        Transport.apply(this, arguments);
    };

    inherits(WSocket, Transport);
    
    WSocket.prototype._init = function() {
        this.ws = new WebSocket(this._args.url);
        var self = this;
        this.ws.onopen    = function()  {
            self._opened = true;
        };
        this.ws.onmessage = function(e) {
            var data = e.data || '',
                error,
                res = {};
            try {
                res = JSON.parse(data);
            } catch (err) {
                error = { code:-32603, message: 'Internal error' };
            }
            res = (typeof(res) === 'object') ? res : {error: error || { code:-32603, message: 'Internal error' }};
              
            self.onmessage && self.onmessage(res);
        };
        this.ws.onclose   = function()  {
            self._opened = false;
            self.onerror && self.onerror({error: { code:-32603, message: 'Internal error' }});
            self._init();
        };
        this.ws.onerror   = function(e)  {
            self._opened = false;
            self.onerror && self.onerror({error: { code:-32603, message: 'Internal error' }});
        };
    };
    
    WSocket.prototype.send = function(req) {
        this.ws.send(JSON.stringify(req), this.ws.onerror);
    }

    // HttpGet transport
    var HttpGet= function(url) {
        Transport.apply(this, arguments);
    };

    inherits(HttpGet, Transport);
    
    HttpGet.prototype._init = function() {
        var self = this;
        this._onmessage = function(res) {
            self.onmessage && self.onmessage(res);
        };
        this._onerror = function(res) {
            self.onerror && self.onerror({error: { code:-32603, message: 'Internal error' }});
        };
    };
    
    HttpGet.prototype.send = function(req) {
        $.getJSON(this._args.url, req)
            .success(this._onmessage)
            .error(this._onerror);
    }
    
    // HttpPost transport
    var HttpPost= function(url) {
        HttpGet.apply(this, arguments);
    };

    inherits(HttpPost, HttpGet);

    HttpPost.prototype.send = function(req) {
        $.ajax({
            dataType: "json",
            url: this._args.url,
            data: JSON.stringify(req), // req if formData
            contentType : 'application/json', // '' if formData
            type: "POST"
        })
        .success(this._onmessage)
        .error(this._onerror);
    }

    // Service
    var Service = function(args) {
        this._args = args || {};
        this._url = args.url || '';
        this._methods = {};
        this._callbacks = {};
        this._clearCallbacks();
        switch (this._args.transport) {
            case 'Socket.IO' : 
                this._transport =  new SocketIO(this._url);
                break;
            case 'SockJS' : 
                this._transport =  new Sock(this._url);
                break;
            case 'WebSocket' : 
                this._transport =  new WSocket(this._url);
                break;
            case 'GET' : 
                this._transport =  new HttpGet(this._url);
                break;
            case 'POST' : 
            default:
                this._transport =  new HttpPost(this._url);
                break;
        }
        
        var self = this;
        this._transport.onmessage = function(res) {
            res = typeof(res) === 'object' ? res : {error: { code:-32603, message: 'Internal error' }};
            var callback = res.id && self._callbacks[res.id];
            res.id && (delete self._callbacks[res.id]);
            callback && callback(res.error, res.result);
        };
        this._transport.onerror = function(res) {
            self._clearCallbacks();
        };
        
        return this.bind();
    }

    Service.prototype._clearCallbacks = function() {
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

    Service.prototype._call = function(req, callback) {
        var err = validate(req);
        if (err) {
            callback && callback(err);
        } 
        else {
            callback ? (req.id = uuid()) : (delete(req.id));
            callback && (this._callbacks[req.id] = callback);
            req.jsonrpc = '2.0';
            this._transport.send(req);
        }
    }

    Service.prototype.bind = function() {
        var self = this;
        return function() {
            return self.method.apply(self, arguments);
        };
    }
    
    Service.prototype.method = function(name) {
        name = name || '';
        var self = this;
        
        this._methods.hasOwnProperty(name) || (this._methods[name] = function () {
            var args = Array.prototype.slice.call(arguments),
                callback = args[args.length-1];
            if (typeof(callback) === 'function') {
                args.length = args.length-1;
            } else {
                callback = undefined;
            }
            var req = {method: name};
            args && (req.params = args);
            self._call(req, callback);            
        });
        return this._methods[name];
    }
    
    if (module.exports)
        module.exports = Service;
    else
        module.Service = Service;

})( (typeof(module) !== 'undefined' && module.exports) ? module : this, jQuery );
/**   MODULE  **/