var swagger = require('../lib');
var express = require('express');
var expressValidator = require('express-validator');
var bodyParser = require('body-parser');

var app = express();

app.use(expressValidator({
  customValidators: swagger.customValidators
}));

app.use(bodyParser.json());

var success = function (req, res) {
  res.sendStatus(200);
};

app
  .route('/query-required')
  .spec({
    get: {
      parameters: [
        {
          name: 'foo',
          in: 'query',
          required: true
        }
      ]
    }
  })
  .validate()
  .get(success);

app
  .route('/body-required')
  .spec({
    post: {
      parameters: [
        {
          name: 'body',
          in: 'body',
          required: true,
          schema: {
            required: ['string', 'integer'],
            properties: {
              string: {
                type: 'string',
              },
              integer: {
                type: 'integer',
              }
            }
          }
        }
      ]
    }
  })
  .validate()
  .post(success);

module.exports = app;
