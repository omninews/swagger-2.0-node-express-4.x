# Swagger 2.0 &mdash; Express 4.x

Generate swagger 2.0 spec based on express 4.x routes, and validate express
routes based on swagger specs.

This is pretty much the opposite approach to that of [swagger-node-express][1].
Instead of defining a spec and generate a route handle from that, a spec is
attached to an already existing express router.

Also currently supports validation of parameters, though that should really be a
separate module.

# Example

```js
// This must be first to enable enhancing of express' Router and Layer.
var Swagger = require('swagger-2.0-node-express-4.x');

var docs = new Swagger();
var schemas = require('some/schema/definitions');
var express = require('express');
var expressValidator = require('express-validator');
var bodyParser = require('body-parser');

var app = express();
var Router = express.Router;
var router = new Router();

router.use(expressValidator({
  customValidators: Swagger.customValidators
}));

router.use(bodyParser.json());

router
  .route('/resource/:id')
  .spec({
    get: {
      summary: 'A resource',
      parameters: [{
        name: 'id',
        description: 'An id',
        in: 'path',
        type: 'string',
        // ...
      }],
      resources: {
        200: {}
      }
    },
    post: {
      // ...
    }
  })
  .validate()
  .get(function (req, res) {
    res.send({ such: 'data' });
  });

app.use(router);

docs
  .addInfo(/* swagger info */)
  .addDefinitions(schemas)
  .readResources(app._router);

app.get('/swagger.json', function (req, res) {
  res.json(docs.generateDoc());
});

app.listen(3000);
```

This will render a swagger file at /swagger.json.

# API

## `express.Router#spec(spec)`

Define a specification of the methods' paramaters and responses for the path.
See [swagger#pathItemObject][2]. Global (for all methods) parameter validation
is not supported yet.

## `express.Router#validate()`

Enables validation of the parameters for all succeeding routes. Sends a 400
response if any parameter does not match the paramter definition.

*This is a work in progress and should probably be moved to a separate module.*

## `new Swagger()`

Creates an object for generating docs.

## `Swagger#addInfo(info)`

Sets the info field in the swagger file.

## `Swagger#addDefinitions(definitions)`

Sets the definitions field in the swagger file.

## `Swagger#setBasePath(path)`

Sets the basePath field in the swagger file.

## `Swagger#readResources(Router)`

Parses an express Router and generates the path object in the swagger file. Must
be called after all routes have been added.

## `Swagger#generateDoc()`

Returns the swagger object, to be sent to a client.

[1]: https://github.com/swagger-api/swagger-node-express
[2]: https://github.com/swagger-api/swagger-spec/blob/master/versions/2.0.md#pathItemObject
