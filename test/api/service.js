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
    },
    echo: function(message, fn) {
        fn(null, message);
    }
};

service.add.description = 'add param to param';
service.add.returns = 'number';
service.add.params = [{
    name: 'aaa',
    type: 'number',
    description: 'first param'
}, {
    name: 'bbb',
    type: 'number',
    description: 'second param'
}];
