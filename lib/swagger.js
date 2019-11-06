'use strict';

var path = require('path');
var concat = Array.prototype.concat;

var Swagger = module.exports = function Swagger (info) {
  this.info = info || {};
  this.definitions = {};
};


Swagger.prototype.addInfo = function(info) {
  var self = this;

  Object.keys(info).forEach(function (key) {
    self.info[key] = info[key];
  });

  return this;
};

Swagger.prototype.setBasePath = function(path) {
  this.basePath = path;
  return this;
};

Swagger.prototype.readResources = function(router) {
  this.resources = findAllRoutes(router, '').map(function (route) {
    return {
      path: path.posix.join(route.path).replace(/:([^\/]+)/g, '{$1}'),
      spec: route.spec
    };
  });

  return this;
};

Swagger.prototype.formatResources = function() {
  return this.resources.reduce(function (resources, route) {
    resources[route.path] = route.spec;
    return resources;
  }, {});
};

Swagger.prototype.generateDoc = function() {
  var base = {
    swagger: '2.0',
    info: this.info,
    basePath: this.basePath,
    paths: this.formatResources(),
    definitions: this.definitions
  };

  return base;
};

Swagger.prototype.addDefinition = function(name, definition) {
  this.definitions[name] = definition;

  return this;
};

Swagger.prototype.addDefinitions = function(definitions) {
  var self = this;

  Object.keys(definitions).forEach(function (key) {
    self.addDefinition(key, definitions[key]);
  });

  return this;
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
