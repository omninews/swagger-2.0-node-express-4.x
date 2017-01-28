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
    return res.status(400).json(errors);
  }

  next();
}

function ensureDefaults (req, param) {
  var source = req[where[param.in]];

  if(param.default === undefined) {
    return;
  }

  if(!(param.name in source)) {
    source[param.name] = JSON.parse(JSON.stringify(param.default));
  }
}

function validate (req, param) {
  var source = req[where[param.in]];
  var checker = req[check[param.in]];

  // Skip not set and not required params
  if(!param.required && source[param.name] === undefined) {
    return;
  }

  // Run all checkers on the given parameter.
  //
  // name - A string describing the name of the parameter.
  // options - An object describing swagger options (type, format, pattern etc.)
  var checkers = function (name, options) {
    if(options.type && validatorsByType[options.type]) {
      checker([name], name + ' must be of type ' + options.type)[validatorsByType[options.type]]();
    }
    if(options.format && req[validatorsByFormat[options.format]]) {
      checker([name], name + ' must have format ' + options.type)[validatorsByFormat[options.format]]();
    }
    if(options.pattern) {
      checker([name], name + ' must match pattern ' + options.pattern).matches(options.pattern);
    }
    if('minLength' in options) {
      checker([name], name + ' must be at least ' + options.minLength + ' characters long').isLength(options.minLength);
    }
    if('maxLength' in options) {
      checker([name], name + ' must be no more than ' + options.maxLength + ' characters long').isLength(0, options.maxLength);
    }
    if('minimum' in options) {
      checker([name], name + ' must be at least ' + options.minimum).isGreaterThan(options.minimum - (options.exclusiveMinimum ? 0 : 1));
    }
    if('maximum' in options) {
      checker([name], name + ' must be at most ' + options.maximum).isLessThan(options.minimum + (options.exclusiveMaximum ? 0 : 1));
    }
  }

  if(param.in == 'body') {
    if(param.required) {
      param.schema.required.forEach(function (property) {
        checker([property], property + ' is required in request body').isSet();
      });
    }

    Object.keys(param.schema.properties).forEach(function (property) {
      var options = param.schema.properties[property];
      checkers(property, options);
    });
  } else {
    if(param.required) {
      checker([param.name], param.name + ' is required').isSet();
    }

    checkers(param.name, param);
  }
}

function sanitize (req, param) {
  var source, type;

  if(param.in !== 'path' && param.in !== 'query' && param.in !== 'body') {
    return;
  }

  source = where[param.in];

  type = param.type;

  if(!type && param.schema) {
    type = param.schema.type;
  }

  switch(type) {
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
      if(req[source][param.name]) {
        req[source][param.name] = Number(req[source][param.name]);
      }
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
      if(req[source][param.name]) {
        req[source][param.name] = new Date(req[source][param.name]);
      }
      break;
  }
}

function setValidationErrorResponse (spec) {
  Object.keys(spec).forEach(function (key) {
    var method = spec[key];

    if(key.indexOf('x-') === 0) {
      return;
    }

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

module.exports.validate = validate;
