/*!
 * JSON-RPC 2.0 util
 * Copyright(c) 2012 Ax
 * 
 */
var fs = require('fs')
    , path = require("path")
    ;

var processDir = exports.processDir = function (dir) {
    dir = path.resolve(dir);
    var names = fs.readdirSync(dir),
        files = []
    for (var i=0, l=names.length; i<l ; ++i) {
        var name = names[i]
            , fn = path.join(dir, name) 
            , stat = fs.statSync(fn);
        if (stat.isDirectory()) {
            files = files.concat(processDir(fn));
        } else {
            '.js' === path.extname(fn).toLowerCase() && files.push(fn);
        }
    }
    return files;
}


