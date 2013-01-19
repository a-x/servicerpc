var connect = require('connect'),
    jsonrpc = require('../lib/jsonrpc2-connect');


// $ curl -i http://localhost:3000/
var service = {
    add: function(a, b, fn) {
        fn(null, +a + (+b));
    },
    sub: function(a, b, fn) {
        fn(null, +a - b);
    },
    max: function(a, b, fn) {
        fn(null, a > b ? a : b);
    },
    get: function(fn) {
        fn(null, 'ok');
    }
};

var rpc = jsonrpc(service);

connect(
    connect.limit('0.5kb')
    , connect.cookieParser()
    , connect.session({ secret: 'keyboard cat', cookie: { maxAge: 60000 }})
    , connect.logger({ immediate: true, format: 'dev' })
    , connect.favicon()
    , connect.static(__dirname + '/public', { maxAge: 0 })
    , connect.json() //strict:false, 
//    , connect.urlencoded()
    , connect.multipart()
//    , connect.bodyParser()
    , connect.query({maxKeys: 5})
    , function(req, res, next) {
        console.log('!', (req.body), req.url)
        if (req.url.indexOf('/service') === 0)
            rpc(req, res, next)
        else    
            next();
    }
    , connect.errorHandler()
).listen(process.env.PORT || 3000, process.env.IP || 80);