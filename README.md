# JSON-RPC 2.0 connect middleware
 
JSON-RPC 2.0 connect middleware
 
 
## API
 
### `JSON-RPC`
 
        var rpc = require("./jsonrpc.js");
        rpc.callJSON(json, function(res) {
            callback(null, res);
        })
 
[1]: http://nodejs.org