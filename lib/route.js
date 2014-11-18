'use strict';

/**
 * Add method for defining a swagger spec on a route
 */

var Route = require('express').Route;

// Map between swagger 'in' and express properties
var where = {
  'path': 'param',
  'header': 'headers', //## Not sure
  'query': 'query',
  'body': 'body',
  'files': 'files'
};

// Map in to validation method
var check = {
  'path': 'checkParams',
  'header': 'checkHeader',
  'query': 'checkQuery',
  'body': 'checkBody',
  'file': 'checkFiles'
};

// Map between swagger type and node-validator methods
var validatorsByType = {
  // 'string': Makes no sense to test, everything is a string
  'number': 'isFloat',
  'integer': 'isInt'
};

// Map between swagger format and node-validator methods
var validatorsByFormat = {
  'uuid': 'isUUID',
  'date': 'isDate'
};


Route.prototype.spec = function(resources) {
  this._spec = resources;
  return this;
};

Route.prototype.validate = function() {
  this.all(validator.bind(null, this));

  setValidationErrorResponse(this._spec);

  return this;
};

function validator (route, req, res, next) {
  var method = req.method.toLowerCase();
  var spec = route._spec[method];
  var errors;

  if(!spec) {
    return next();
  }

  if(spec.parameters) {
    spec.parameters.forEach(function (param) {
      ensureDefaults(req, param);
    });
    spec.parameters.forEach(function (param) {
      validate(req, param);
    });
    spec.parameters.forEach(function (param) {
      sanitize(req, param);
    });
  }

  errors = req.validationErrors();

  if (errors) {
    return res.json(errors, 400);
  }

  next();
}

function ensureDefaults (req, param) {
  var source = req[where[param.in]];

  if(param.default === undefined) {
    return;
  }

  if(!(param.name in source)) {
    source[param.name] = param.default;
  }
}

function validate (req, param) {
  var source = req[where[param.in]];
  var checker = req[check[param.in]];

  // Skip not set and not required params
  if(!param.required && source[param.name] === undefined) {
    return;
  }

  if(param.required) {
    checker([param.name], param.name + ' is required').isSet();
  }
  if(param.type && validatorsByType[param.type]) {
    checker([param.name], param.name + ' must be of type ' + param.type)[validatorsByType[param.type]]();
  }
  if(param.format && req[validatorsByFormat[param.format]]) {
    checker([param.name], param.name + ' must have format ' + param.type)[validatorsByFormat[param.format]]();
  }
  if(param.pattern) {
    checker([param.name], param.name + ' must match pattern ' + param.pattern).matches(param.pattern);
  }
  if('minLength' in param) {
    checker([param.name], param.name + ' must be at least ' + param.minLength + ' characters long').isLength(param.minLength);
  }
  if('maxLength' in param) {
    checker([param.name], param.name + ' must be no more than ' + param.maxLength + ' characters long').isLength(0, param.maxLength);
  }
  if('minimum' in param) {
    checker([param.name], param.name + ' must be at least ' + param.minimum).isGreaterThan(param.minimum - (param.exclusiveMinimum ? 0 : 1));
  }
  if('maximum' in param) {
    checker([param.name], param.name + ' must be at most ' + param.maximum).isLessThan(param.minimum + (param.exclusiveMaximum ? 0 : 1));
  }
}

function sanitize (req, param) {
  var source;

  if(param.in !== 'path' && param.in !== 'query' && param.in !== 'body') {
    return;
  }

  source = where[param.in];

  switch(param.type) {
    case 'string':
      if(req[source][param.name]) {
        req[source][param.name] = String(req[source][param.name]);
      }
      else {
        req[source][param.name] = '';
      }
      break;

    // Fall-through intentional
    case 'integer':
    case 'number':
      req[source][param.name] = Number(req[source][param.name]);
      break;

    case 'boolean':
      req[source][param.name] = Boolean(req[source][param.name]);
      break;

    case 'array':
      if(!Array.isArray(req[source][param.name])) {
        req[source][param.name] = [req[source][param.name]];
      }
      break;

    case 'object':
      // What to do?
      break;
    default:
      // Fall back to string. Dunno if it's expected, but it's safer (should prevent against noSQL-injection)
      req[source][param.name] = String(req[source][param.name]);
      break;
  }

  switch(param.format) {
    // Fall-through intentional
    case 'date':
    case 'time':
    case 'date-time':
      req[source][param.name] = new Date(req[source][param.name]);
      break;
  }
}

function setValidationErrorResponse (spec) {
  Object.keys(spec).forEach(function (key) {
    var method = spec[key];

    if(!method.responses) {
      method.responses = {};
    }

    if(!method.responses[400]) {
      method.responses[400] = {
        description: 'Parameter validation error',
        schema: {
          type: 'array',
          items: {
            required: ['param', 'msg', 'value'],
            properties: {
              param: {
                type: 'string',
                description: 'The invalid property'
              },
              msg: {
                type: 'string',
                description: 'Description of the type of validation error'
              },
              value: {
                type: 'string',
                description: 'The value received'
              }
            }
          }
        }
      };
    }
  });
}
