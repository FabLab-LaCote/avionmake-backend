///<reference path="typings/tsd.d.ts" />

import http = require('http');
import cors = require('cors');
import express = require('express');
import bodyParser = require('body-parser');
import errorHandler = require('errorhandler');
import raven = require('raven');
var client = new raven.Client('https://604cf8a1fa92494c935ca53fb59260c9:daf6d8f9d6b44a618f07174cb25704dc@j42.org/sentry/5');
client.patchGlobal(function(sent, err) {
  console.log(err.stack);
  process.exit(1);
});
import db = require('./db');
import plane = require('./plane');

enum PrintState{NONE,PREVIEW,PRINT,CUT};

var app = express();

//TODO SENTRY_DSN as env_var
app.use(raven.middleware.express(client));
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json({limit: '50mb'}));

var env = process.env.NODE_ENV || 'development';
if (env === 'development') {
    app.use(errorHandler({ dumpExceptions: true, showStack: true }));
    app.use(express.static(__dirname + '/../../avionmake/app'));
    app.use('/scripts', express.static(__dirname + '/../../avionmake/.tmp/scripts'));
    app.use('/styles', express.static(__dirname + '/../../avionmake/.tmp/styles'));
    app.use('/bower_components', express.static(__dirname + '/../../avionmake/bower_components'));
}
else if (env === 'production') {
    app.use(express.static(__dirname + '/public'));
}

//save/update
app.post('/api/plane', function(req, res){
    function saveNewPlane(){
        //TODO: get from env?
        var serverPrefix = process.env.NODE_ENV || 'FL';
        db.getNextId(serverPrefix, (err, autoIndex)=>{
            req.body._id = serverPrefix + '-' + autoIndex;
            db.savePlane(<IPlane>req.body, (err, result)=>{
                res.end(req.body._id);
            });    
        });
    }   
    try{
        if(req.body._id){
            //if id and found and note printed update
            db.getPlane(req.body._id, false, (err, p)=>{
                if(p && p.hasOwnProperty('printState')){
                    if(p.printState < PrintState.PRINT){
                        db.savePlane(<IPlane>req.body, (err, result)=>{
                            res.end(String(req.body._id));
                        });
                    }else{
                        res.end(p.id);
                    }
                }else{
                    saveNewPlane();
                }
            });      
        }else{
            //if no_id -> save with newid
            saveNewPlane();
        }
    }catch(err){
         res.status(500);
         res.end(err);
    }
});

app.get('/api/plane/:id', function(req, res){
    //get from db
    db.getPlane(req.params.id, false, (err, p)=>{
        res.json(p);
        res.end();    
    });
});


//preview
app.get('/api/pdf/:id', function(req, res){
    //get from db
    db.getPlane(req.params.id, true, (err, p)=>{
        plane.createPDF(res, p, {
            mergePdf:req.query.hasOwnProperty('merge'),
            texturePage: true,
            cutPage:true
        });    
    });
});

//print = create pdf files
app.get('/api/print/:id', function(req, res){
    db.getPlane(req.params.id, true, (err, p)=>{  
        //TODO FS
        plane.createPDF(res, p, {
            mergePdf:false,
            texturePage: true,
            cutPage:false
        });
        //TODO FS
        plane.createPDF(res, p, {
            mergePdf:false,
            texturePage: false,
            cutPage:true
        });
    });
});
//get collection paged? filtered sorted
    //get ranking
//disable a plane from collection
//update state printed...
//update score

app.listen(8080, function(){
    console.log('server listening on port %d in %s mode', 8080, app.settings.env);
});

export var App = app;
