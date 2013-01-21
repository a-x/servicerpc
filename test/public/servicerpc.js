(function(module) {
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
        uuid._salt = uuid._salt || (Math.random()*1000000 | 1);
        uuid._id = +uuid._id || 0;
        return ++uuid._id + '-' + (+new Date) + '-' + uuid._salt;

    };
    
    var inherits = function(child, parent) {
        var F = function() { };
        F.prototype = parent.prototype;
        child.prototype = new F();
        child.prototype.constructor = child;
        child.superclass = parent.prototype;
        child.parent = parent;
    };
    
    var Transport = function (url) {
        this._args = {url: url};
        this._init();
    };

    Transport.prototype.send = function(req) {
    };


    var Sock = function(url) {
        Transport.apply(this, arguments);
    };

    inherits(Sock, Transport);
    
    Sock.prototype._init = function() {
        var sockjs_url = this._args.url || '/';
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
            alert(e);
        };
    };
    
    Sock.prototype.send = function(req) {
        this.sockjs.send(JSON.stringify(req));
    }
    
    var Http= function(url) {
        Transport.apply(this, arguments);
    };

    inherits(Http, Transport);
    
    Http.prototype._init = function() {
    };
    
    Http.prototype.send = function(req) {
        $.getJSON(this._args.url || '/', req)
            .success(function(res) { 
                self.onmessage && self.onmessage(res);
            })
            .error(function() { 
                self.onerror && self.onerror({error: { code:-32603, message: 'Internal error' }});
            })
    }
    
    var Service = module.Service = function(url, is) {
        this._url = url || '';
        this._callbacks = {};
        this._clearCallbacks();
        this._transport = is ? new Sock(this._url) : new Http(this._url);
        var self = this;
        this._transport.onmessage = function(res) {
            res = typeof(res) === 'object' ? res : {error: { code:-32603, message: 'Internal error' }};
            var callback = res.id && self._callbacks[res.id];
            callback && callback(res.error, res.result);
        };
        this._transport.onerror = function(res) {
            self._clearCallbacks();
        };
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

    Service.prototype.call = function(req, callback) {
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
})( typeof(module) !== 'undefined' && module.exports ? module : this );
/**   MODULE  **/
