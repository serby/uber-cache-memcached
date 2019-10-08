module.exports = UberCacheMemcached

var EventEmitter = require('events').EventEmitter
var through = require('through')
var noop = function() {}

function formatKey(key) {
  key = key.replace(/_/g, '#_#')
  key = key.replace(/ /g, '_')
  return key
}

function UberCacheMemcached(memcached) {
  this.memcached = memcached
}

UberCacheMemcached.prototype = Object.create(EventEmitter.prototype)

function setCache(key, value, ttl, callback) {
  var lifetime = ttl || 0
  var expiryTime = ttl ? ttl + Date.now() : undefined
  var dataPacket = { expiryTime: expiryTime, data: value, updated: new Date() }

  this.memcached.set(key, dataPacket, lifetime, function(error) {
    if (typeof callback === 'function') {
      // conformance test expects null rather than undefined
      callback(error || null, value)
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

  key = formatKey(key)
  let length

  if (value === undefined && callback === undefined) {
    var bufferedValue = []
    return (stream = through(function write(data) {
      bufferedValue.push(data)
      this.queue(data)
    }).on(
      'end',
      function() {
        // Check for cyclic reference
        try {
          length = JSON.stringify(bufferedValue).length
        } catch (e) {
          return stream.emit('error', e)
        }
        this.emit('set', {
          key,
          ttl,
          value,
          length
        })
        setCache.call(
          this,
          key,
          bufferedValue,
          ttl,
          function(error) {
            if (error) return this.emit('error', error)
          }.bind(this)
        )
      }.bind(this)
    ))
  }

  // Check for cyclic reference
  try {
    length = JSON.stringify(value).length
  } catch (e) {
    return callback(e)
  }
  this.emit('set', {
    key,
    ttl,
    value,
    length
  })
  setCache.call(this, key, value, ttl, callback)
}

UberCacheMemcached.prototype.get = function(key, callback) {
  key = formatKey(key)
  this.memcached.get(
    key,
    function(error, cachePacket) {
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
    }.bind(this)
  )
}

UberCacheMemcached.prototype.delete = function(key, callback) {
  if (typeof callback !== 'function') callback = noop

  key = formatKey(key)

  this.memcached.delete(
    key,
    function(error) {
      if (error) return callback(error)
      this.emit('delete', key)
      callback(null)
    }.bind(this)
  )
}

UberCacheMemcached.prototype.clear = function(callback) {
  if (typeof callback !== 'function') callback = noop
  this.memcached.flush(
    function(err) {
      if (err) return callback(err)
      this.emit('clear')
      callback()
    }.bind(this)
  )
}

UberCacheMemcached.prototype.size = function(callback) {
  this.memcached.stats((err, stats) => {
    if (err) return callback(err)
    callback(
      undefined,
      stats.reduce((size, server) => size + server['curr_items'], 0)
    )
  })
}
