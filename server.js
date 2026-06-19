const express = require('express'),
    cookieParser = require('cookie-parser'),
    rfs = require('rotating-file-stream'),
    log = require('morgan'),
    path = require('path'),
    cors = require('cors'),
    multer = require('multer'),
    upload = multer(),
    app = express(),
    challengeLogger = require('./util/logger').challengeLogger(module),
    dotenv = require('dotenv').config();

    PORT = process.env.PORT || 3000,
    NODE_ENV = process.env.NODE_ENV || 'development';

app.set('port', PORT);
app.set('env', NODE_ENV);

app.use(cors());

// set up logging
var accessLogStream = rfs.createStream('access.log', {interval: '1d', path: path.join(__dirname, 'logs')});
app.use(log('[:date[iso]] :remote-addr :method :url :status :res[content-length] :response-time ms', {stream: accessLogStream}));

// parse application/json
app.use(express.json());

// parse raw text
app.use(express.text());

// parse application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// parse multipart/form-data
app.use(upload.array()); 
app.use(express.static('public'));

app.use(cookieParser());

require('./routes')(app);

// catch 404
app.use((req, res, next) => {
    res.status(404).send({ status: 404, error: 'Path not found' });
});

// catch errors
app.use((err, req, res, next) => {
    const status = err.status || 500;
    const msg = err.error || err.message;
    res.status(status).send({ status, error: msg });
});

module.exports = app;

app.listen(PORT, () => {
    challengeLogger.info(
        `Express Server started on Port ${app.get(
            'port'
        )} | Environment : ${app.get('env')}`
    );
});