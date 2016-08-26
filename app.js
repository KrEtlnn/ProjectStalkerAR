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
app.get('/javascript/map.js', function (req, res) {
    res.sendfile('public/javascripts/map.js');
});
app.get('/javascript/loot.js', function (req, res) {
    res.sendfile('public/javascripts/loot.js');
});
app.get('/gmaps.js', function (req, res) {
    res.sendfile('gmaps.js');
});
app.get('/gameover', function (req, res) {
    res.sendfile('public/gameover.html');
});
app.get('/flesh_idle.mp3', function (req, res) {
    res.sendfile('public/audio/flesh_idle.mp3');
});
app.get('/vow.min.js', function (req, res) {
    res.sendfile('vow.min.js');
});


app.listen(config.port);
console.log('server started on port ' + config.port);