var Memcached = require('memcached')
var UberCacheMemcached = require('..')

describe('uber-cache-memcached', function() {
  var memcached = new Memcached()
  var engine

  beforeEach(function(done) {
    engine = new UberCacheMemcached(memcached)
    engine.clear(done)
  })

  require('uber-cache/test/conformance-test')(
    'uber-cache-memcached',
    function() {
      return engine
    }
  )
})
