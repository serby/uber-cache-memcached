module.exports = UberCacheMemcached

var EventEmitter = require('events').EventEmitter
  , through = require('through')
  , noop = function () {}

function UberCacheMemcached(memcached) {
  this.memcached = memcached
}

UberCacheMemcached.prototype = Object.create(EventEmitter.prototype)

function setCache(key, value, ttl, callback) {
  var lifetime = ttl ? ttl : 0
    , expiryTime = ttl ? ttl + Date.now() : undefined
    , dataPacket =
      { expiryTime: expiryTime
      , data: value
      , updated: new Date()
      }

  this.memcached.set(key, dataPacket, lifetime, function (error) {
    if (typeof callback === 'function') {
      // conformance test expects null rather than undefined
      callback(error ? error : null, value)
    }
  })
}

UberCacheMemcached.prototype.set = function(key, value, ttl, callback) {
  var stream

  // If no TTL is defined then last as long as possible
  if (typeof ttl === 'function') {
    callback = ttl
    ttl = undefined
  }

  // Don’t handle undefined cache keys
  if (typeof key === 'undefined') {
    return callback(new Error('Invalid key undefined'))
  }

  // Check for cyclic reference
  try {
    JSON.stringify(value)
  } catch (e) {
    return callback(e)
  }

  if ((value === undefined) && (callback === undefined)) {
    value = []
    return stream = through(function write(data) {
        value.push(data)
        this.queue(data)
      }
    ).on('end', (function () {
        // Check for cyclic reference
        try {
          JSON.stringify(value)
        } catch (e) {
          return stream.emit('error', e)
        }
        setCache.call(this, key, value, ttl, (function(error) {
          if (error) return this.emit('error', error)
        }).bind(this))
      }).bind(this))
  }
  setCache.call(this, key, value, ttl, callback)
}

UberCacheMemcached.prototype.get = function(key, callback) {
  this.memcached.get(key, (function (error, cachePacket) {
    var value

    if (error) return callback(error)

    if (!cachePacket) {
      this.emit('miss', key)
      return callback(null)
    }

    value = cachePacket.data
    // If ttl has expired, delete
    if (cachePacket.expiryTime < Date.now()) {
      this.delete(key)
      this.emit('miss', key)
      this.emit('stale', key, value, cachePacket.expiryTime)
      return callback(null, undefined)
    }

    this.emit('hit', key)

    callback(null, value)
  }).bind(this))
}

UberCacheMemcached.prototype.delete = function(key, callback) {
  if (typeof callback !== 'function') callback = noop

  this.memcached.delete(key, (function(error) {
    if (error) return callback(error)
    this.emit('delete', key)
    callback(null)
  }).bind(this))
}

UberCacheMemcached.prototype.clear = function(callback) {
  if (typeof callback !== 'function') callback = noop
  this.memcached.flush((function(err) {
    if (err) return callback(err)
    this.emit('clear')
    callback()
  }).bind(this))
}

/* Update: this function is bugged and will only work with single server — please do not use!
           (it is only here to make testing possible)
*/
UberCacheMemcached.prototype.size = function(callback) {

  this.memcached.items((function (error, result) {
    result.forEach((function (itemSet) {
      var keys = Object.keys(itemSet);

      if (keys.length === 0) return callback(undefined, 0)

      keys.pop();
      keys.forEach((function (slabId) {
        this.memcached.cachedump(itemSet.server, parseInt(slabId, 10), itemSet[slabId].number
            , function (err, items) {
          if (error) return callback(error)

          if (Array.isArray(items)) {
            return callback(error, items.length)
          }
          return callback(error, 1)
        })
      }).bind(this))
    }).bind(this))
  }).bind(this))
}
