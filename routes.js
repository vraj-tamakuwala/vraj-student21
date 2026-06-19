const express = require('express');

module.exports = function (app) {
    /*
    * Routes
    */
    app.use('/v1/users', require('./routes/user_v1.route'));
  };  