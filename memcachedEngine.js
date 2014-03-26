var _ = require('lodash'), 
    EventEmitter = require('events').EventEmitter,
    noop = function() {},
    Memcached = require('memcached');

module.exports = function(options) {

  if (!options.hasOwnProperty('serverLocations')) {
    throw new Error("The serverLocations setting is required");
  }

  var serverLocations = options.serverLocations;
  delete options.serverLocations;

  var client = new Memcached(serverLocations, options),
      handle = new EventEmitter();

  handle.uberCacheVersion = '1';
  handle.staleDisabled = true;

  handle.set = function(key, value, ttl, callback) {
    var encoded, err;

    if (typeof ttl === 'function') {
      callback = ttl;
      ttl = 0;
    }

    if (typeof key === 'undefined') {
      err = new Error('Invalid key undefined');
      if (typeof callback === 'function') {
        callback(err);
      }
      handle.emit('miss', key);
      return;
    }

    try {
      encoded = JSON.stringify(value);
    } catch (e) {
      callback(e);
      return;
    }

    if ((typeof(ttl) === 'number') && (parseInt(ttl, 10) === ttl)) {
      ttl = Math.ceil(ttl);
      client.set(key, encoded, ttl, function(error) {
        if (typeof err === "undefined") {
          err = null;
        }
        callback(err);
      });
    }
  };

  handle.get = function(key, callback) {
    return client.get(key, function(err, encoded) {
      var value;

      if (typeof key === 'undefined') {
        err = new Error('Invalid key undefined');
        callback(err);
        handle.emit('error', err);
        return;
      }

      if (err) {
        return callback(err);
      }

      if (encoded === false) {
        callback(err, undefined);
        handle.emit('miss', key);
        return;
      }

      try {
        value = JSON.parse(encoded);
      } catch (e) {
        callback(e);
        return;
      }

      callback(null, value);
    });
  };

  handle.del = function(key, callback) {
    if (typeof callback !== 'function') {
      callback = noop;
    }
    client.del(key, callback);
  };

  handle.clear = function(callback) {
    if (typeof callback !== 'function') {
      callback = noop;
    }
    client.flush(callback);
  };

  handle.size = function(callback) {
    if (typeof callback !== 'function') {
      callback = noop;
    }

    client.stats(function (err, results) {
      if (err) {
        callback(err);
        return;
      }
      callback(null, results[0].curr_items);
    });
  };

  return handle;
};