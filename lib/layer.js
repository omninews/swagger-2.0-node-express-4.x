'use strict';

/**
 * Replace express Layer and add path to all layers
 */

var OldLayer = require('express/lib/router/layer');

function Layer (path, options, fn) {
  var layer = OldLayer.call(this, path, options, fn);
  layer = layer || this;
  layer.path = path;
  return layer;
};

Layer.prototype = OldLayer.prototype;

require.cache[require.resolve('express/lib/router/layer')].exports = Layer;
