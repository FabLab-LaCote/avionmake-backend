///<reference path="typings/tsd.d.ts" />

import http = require('http');
import cors = require('cors');
import express = require('express');
import bodyParser = require('body-parser');
import errorHandler = require('errorhandler');

import db = require('./db');
import plane = require('./plane');

enum PrintState{NONE,PREVIEW,PRINT,CUT};

var app = express();
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
    app.use(errorHandler());
    app.use(express.static(__dirname + '/public'));
}

//save/update
app.post('/api/plane', function(req, res){
    try{
        if(req.body._id){
            //if id and found and note printed update
            db.getPlane(req.body._id, false, (err, p)=>{
                if(p.printState < PrintState.PRINT){
                    db.savePlane(<IPlane>req.body, (err, result)=>{
                        res.end(String(req.body._id));
                    });
                }else{
                    res.end(String(p.id));
                }
            });      
        }else{
            //if no_id -> save with newid
            db.getNextSequence((err, autoIndex)=>{
                req.body._id = autoIndex;
                db.savePlane(<IPlane>req.body, (err, result)=>{
                    res.end(String(autoIndex));
                });    
            });
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
