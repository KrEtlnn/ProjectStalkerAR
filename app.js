var express = require('express');
var favicon = require('serve-favicon');
var bodyParser = require('body-parser');
var fs = require('fs');
var app = express();

var config = {
    port: process.env.PORT || 5000,
};

app.use(bodyParser.urlencoded());
app.use(favicon(__dirname + '/favicon.ico'));
app.use(express.static(__dirname + '/public'));

app.get('/', function (req, res) {
    res.sendfile('public/pages/members/index.html');
});
app.get('/datasync-js-master/build/cloud-data-sync-api.js', function (req, res) {
    res.sendfile('datasync-js-master/build/cloud-data-sync-api.js');
});
app.get('/javascript/script.js', function (req, res) {
    res.sendfile('public/javascripts/script.js');
});
app.get('/gmaps.js', function (req, res) {
    res.sendfile('gmaps.js');
});
app.get('/gameover', function (req, res) {
    res.sendfile('public/gameover.html');
});


app.listen(config.port);
console.log('server started on port ' + config.port);