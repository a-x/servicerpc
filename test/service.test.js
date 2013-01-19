var service = module.exports = {
    add: function(a, b, fn) {
        fn(null, + a + (+b));
    },
    sub: function(a, b, fn) {
        fn(null, + a - b);
    },
    max: function(a, b, fn) {
        fn(null, a > b ? a : b);
    },
    get: function(fn) {
        fn(null, 'ok');
    }
};