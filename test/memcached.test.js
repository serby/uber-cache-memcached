var _ = require('lodash');

require('uber-cache/test/engine')('memcachedEngine', function(options) {

  options = _.extend({
    serverLocations: ["127.0.0.1:11211"]
  }, options);

  var engine = require('../')(options);

  engine.clear();
  return engine;
});