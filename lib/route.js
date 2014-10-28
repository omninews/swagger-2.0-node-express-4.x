'use strict';

/**
 * Add method for defining a swagger spec on a route
 */

var Route = require('express').Route;

Route.prototype.spec = function(resources) {
  this._spec = resources;
  return this;
};
