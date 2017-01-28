'use strict';

var assert = require('assert');
var chai = require('chai');
var chaiHttp = require('chai-http');
var app = require('./app');

var expect = chai.expect;

chai.use(chaiHttp);

describe('validate', function () {
  describe('body', function () {
    context('with right body', function () {
      it('returns HTTP 200', function (done) {
        chai
          .request(app)
          .post('/body-required')
          .send({ string: 'string', integer: '123' })
          .end(function (err, res) {
            expect(res).to.have.status(200);
            done();
          });
      });
    });

    context('with wrong body', function () {
      it('returns HTTP 400', function (done) {
        chai
          .request(app)
          .post('/body-required')
          .send({ integer: 'foo' })
          .end(function (err, res) {
            expect(res).to.have.status(400);
            expect(res.body).to.deep.equal([
              { param: 'string', msg: 'string is required in request body' },
              { param: 'integer', msg: 'integer must be of type integer', value: 'foo'},
            ]);
            done();
          });
      });
    });

    context('without body', function () {
      it('returns HTTP 400', function (done) {
        chai
          .request(app)
          .post('/body-required')
          .end(function (err, res) {
            expect(res).to.have.status(400);
            done();
          });
      });
    });
  });

  describe('query parameters', function () {
    context('with query parameters', function () {
      it('returns HTTP 200', function (done) {
        chai
          .request(app)
          .get('/query-required?foo=bar')
          .end(function (err, res) {
            expect(res).to.have.status(200);
            done();
          });
      });
    });

    context('without query parameters', function() {
      it('returns HTTP 400', function (done) {
        chai
          .request(app)
          .get('/query-required')
          .end(function (err, res) {
            expect(res).to.have.status(400);
            done();
          });
      });
    });
  });
});
