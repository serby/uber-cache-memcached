# Memcached engine for Uber Cache

[![build status](https://secure.travis-ci.org/serby/uber-cache-memcached.png)](http://travis-ci.org/serby/uber-cache-memcached)
[![dependency status](https://david-dm.org/serby/uber-cache-memcached.svg)](https://david-dm.org/serby/uber-cache-memcached) [![Greenkeeper badge](https://badges.greenkeeper.io/serby/uber-cache-memcached.svg)](https://greenkeeper.io/)

## Installation

      npm install uber-cache-memcached

## Usage

```js

var UberCacheMemcached = require('uber-cache-memcached')
  , Memcached = require('memcached')
  , cache = new UberCacheMemcached(new Memcached())

cache.set('the key', 'the value', function(error) {
  cache.get('the key', function(error, value) {
    console.log(value)
  })
})

```

## Credits

Kuba Stawiarski

## Licence

Licenced under the [New BSD License](http://opensource.org/licenses/bsd-license.php)
