//   /\  
//  /\/\
// / /\ \

(function(module) {
    'use strict';


    var jsonrpc = module.exports = function(service) {
        this._init(service);
    };

    jsonrpc.version = '2.0';
    jsonrpc.errors = {
        INVALID_REQUEST     : { code:-32600, message: 'Invalid Request' },
        METHOD_NOT_FOUND    : { code:-32601, message: 'Method not found' },
        INVALID_PARAMS      : { code:-32602, message: 'Invalid params' },
        INTERNAL_ERROR      : { code:-32603, message: 'Internal error' },
        PARSE_ERROR         : { code:-32700, message: 'Parse error' }
    };    
    
    jsonrpc.prototype._defineSchema = function(service) {
        var schema = {
            "title": "JSON RPC 2.0 Schema",
            "type": "object",
            "properties": {}
        };
        var properties = schema.properties;
        for (var key in service) {
            var method = service[key];
            if (typeof(method) !== 'function')
                continue;

            var methodString = method.toString(),
                methodParams = methodString.slice(methodString.indexOf('(')+1, methodString.indexOf(')'))
                        .replace(/(\/\*([\s\S]*?)\*\/)|(\/\/(.*)$)/gm, '')
                        .match(/[\w]+/g) || [],
                param, i, l = methodParams.length,
                info = {
                    type        :"method",
                    description : method.description || key,
                    returns     : method.returns || '*',
                    params      : []
                };        
                            
            for (i=0; i<l; ++i) {
                param = (method.params instanceof Array) ? method.params[i] : {};
                param = (typeof(param) === 'object') ? param : {};
                param.name = methodParams[i];
                param.type = param.type || '*';
                param.required = true;
                info.params[i] = param;
            }
            
            properties[key] = info;
        }
        return schema;
    };

    jsonrpc.prototype._init = function(service) {
        this._service = service || {};
        this._service[''] = (function(self) {
            return function (callback) {
                callback && callback(null, self._schema);
            }
        })(this);

        this._schema = this._defineSchema(this._service);
    };

    jsonrpc.prototype.call = function(req, callback) {
        var err = this._validate(req);
        if (err) {
            callback && callback(this._response(err, null, req && req.id));
        } else if (req instanceof Array) {
            var i, 
                x = 0,
                l = req.length,
                answer = [],
                f = function(res) {
                    res && answer.push(res);
                    if (++x === l) {
                        callback && callback(answer.length ? answer : undefined);
                    };
                };    
            for (i = 0; i < l; ++i) {
                this.call(req[i], f);
            }
        } else {
           var self = this,
               id = req.id || null,
               params = req.params,
               method = this._service[req.method];

           params.push(function(err, result) {
               id && callback && callback(self._response(err, result, id));
           });


           !id && callback && callback(undefined);

           try {
               method.apply(this._service, params);
           }
           catch (err) {
               id && callback && callback(self._response(err, null, id));
           }
        }
    };
    
    jsonrpc.prototype.callJSON = function(json, callback) {
        var error;
        try {
            var req = JSON.parse(json);
        } catch (err) {
            error = {
                code    : jsonrpc.errors.PARSE_ERROR.code,
                message : err.message
            };
        }

        if (error) {
            callback && callback(JSON.stringify(this._response(error)));
        } else {
            this.call(req, function(res) {
                callback && callback(JSON.stringify(res));
            });
        }
    };
        
    jsonrpc.prototype._response = function (err, result, id) {
        id = id || null;
        var obj = {
            id      : id,
            jsonrpc : jsonrpc.version,
        };
        if (err) {
            obj.error = {
                code    : err.code ? err.code : jsonrpc.errors.INTERNAL_ERROR.code,
                message : String(err.message ? err.message : err)
            };
        } else {
            obj.result = result;
        }
        
        return obj;
    };

    jsonrpc.prototype._validate = function (req) {
        var err;
        if (typeof(req) !== 'object') {
            err = jsonrpc.errors.INVALID_REQUEST;
        } else if (req instanceof Array) {
              if (!req.length) {
                  err = jsonrpc.errors.INVALID_REQUEST;
              }
        } else {
            var id      = req.id,
                params  = req.params || [],
                method  = typeof(req.method) === 'string' ? this._service[req.method] : null;
            if (typeof(req.method) !== 'string' || req.jsonrpc !== jsonrpc.version ||
                (id && !(typeof(id) === 'number' || typeof(id) === 'string'))) {
                err = jsonrpc.errors.INVALID_REQUEST;
            } else if (!method || typeof(method) !== 'function') {
                err = jsonrpc.errors.METHOD_NOT_FOUND;
            } else if (params && !(typeof(params) === 'object' || (params instanceof Array))) {
                err = jsonrpc.errors.INVALID_PARAMS;
            } else {
                var i, l, args = [],
                    fs = method.toString(),
                    names = this._schema.properties[req.method].params;    
                if (params instanceof Array) {
                    if (params.length !== names.length-1) {
                        err = jsonrpc.errors.INVALID_PARAMS;
                    } else {
                        for (i = 0, l = names.length - 1; i < l; ++i) {
                            args[i] = params[i];
                        }
                    }
                } else {
                    i = 0;
                    for (var key in params) {
                        if (params.hasOwnProperty(key))
                            ++i;
                    }
                    if (i !== names.length-1) {
                        err = jsonrpc.errors.INVALID_PARAMS;
                    } else {
                        for (i=0, l=names.length-1; i<l; ++i) {
                            var key = names[i].name;
                            if (!params.hasOwnProperty(key)) {
                                err = jsonrpc.errors.INVALID_PARAMS;
                                break;
                            }
                            args[i] = params[key];
                        }
                    }
                }
                req.params = args;
            }   
        }
        return err;
    };
})( typeof(module) !== 'undefined' && module.exports ? module : this );
//----------------------------------------------------------------