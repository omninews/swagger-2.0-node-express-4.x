'use strict';

var path = require('path');
var concat = Array.prototype.concat;

var Swagger = module.exports = function Swagger () {};


Swagger.prototype.parse = function(app) {
  this.resources = findAllRoutes(app._router, '').map(function (route) {
    return {
      path: path.join(route.path).replace(/:([^\/]+)/g, '{$1}'),
      spec: route.spec
    };
  });
};


function findAllRoutes (router, path) {
  if(!router || !router.stack || !router.stack.length) {
    return [];
  }

  return concat.apply([], router.stack.map(function (layer) {
    if(layer.route) {
      if(!layer.route._spec) {
        return [];
      }

      return [{
        path: path + layer.path,
        spec: layer.route._spec
      }];
    }

    return concat.apply([], findAllRoutes(layer.handle, path + layer.path));
  }));
}
