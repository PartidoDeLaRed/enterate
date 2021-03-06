var express = require('express');
var app = module.exports = express();
var api = require('lib/db-api');
var config = require('lib/config');
var path = require('path');
var resolve = path.resolve;
var strip = require('mout/string/stripHtmlTags');
var log = require('debug')('democracyos:twitter-card');

app.get('/topic/:id', function(req, res, next){
  log('Twitter Request /topic/%s', req.params.id);
  api.topic.get(req.params.id, function (err, topicDoc) {
    if (err) return _handleError(err, req, res);
    log('Serving Twitter topic %s', topicDoc.id);
    res.render(resolve(__dirname, 'topic.jade'), { topic: topicDoc, config : config, strip: strip });
  });
})

app.get('*', function(req, res, next){
  log('Twitter Request generic page');
  res.render(resolve(__dirname, 'generic.jade'), {config : config});
})
