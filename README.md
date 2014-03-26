# Memcached engine for Uber Cache

## Installation

      npm install uber-cache-memcached

## Usage

```js

var cache = require('uber-cache').createUberCache({
  engine: require('uber-cache-memcached')({
    serverLocations: ["127.0.0.1:11211"]
  })
});

cache.set('the key', 'the value', function(error) {
  cache.get('the key', function(error, value) {
    console.log(value);
  });
});

```

## Credits
[Rémy Hubscher](https://github.com/Natim/) follow me on [twitter](http://twitter.com/Natim)

## Licence
Licenced under the [New BSD License](http://opensource.org/licenses/bsd-license.php)
