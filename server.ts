///<reference path="typings/tsd.d.ts" />

require('dotenv').load();
import http = require('http');
import cors = require('cors');
import express = require('express');
import bodyParser = require('body-parser');
import errorHandler = require('errorhandler');
import raven = require('raven');
import fs = require('fs');
import nodemailer = require('nodemailer');

var client = new raven.Client( process.env.SENTRY_DSN || '');
client.patchGlobal(function(sent, err) {
  console.log(err.stack);
  process.exit(1);
});
import db = require('./db');
import plane = require('./plane');

enum PrintState{NONE,PREVIEW,PRINT,CUT};

var app = express();

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


var SERVER_PREFIX:string = process.env.SERVER_PREFIX || 'FL';

//save/update
app.post('/api/plane', function(req, res){
    function saveNewPlane(){
        db.getNextId(SERVER_PREFIX, (err, autoIndex)=>{
            req.body._id = SERVER_PREFIX + '-' + autoIndex;
            
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
                        res.end(p._id);
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

app.get('/api/finalpdf/:id', function(req, res){
    //TODO check id
    var prefix = req.params.id.split('-')[0];
    res.sendFile(__dirname + '/pdf/' + prefix + '/' + req.params.id + '-' + req.query.type + '.pdf');
});

app.get('/api/nextplanes/:id?/:limit?', function(req, res){
    db.nextPlanes(req.params.id, req.params.limit || 1, (err, p)=>{
      res.json(p);
    });
});

//print = create pdf files
app.post('/api/print/:id', function(req, res){
   
    db.getPlane(req.params.id, true, (err, p:IPlane)=>{  
        if(p){
            p.name = req.body.name;
            delete req.body.name;
            Promise.all([
               plane.createPDF(fs.createWriteStream(__dirname + '/pdf/' + SERVER_PREFIX + '/' + p._id + '-print.pdf' ), p, {
                    mergePdf:true,
                    texturePage: true,
                    cutPage:false
                }),
                plane.createPDF(fs.createWriteStream(__dirname + '/pdf/' + SERVER_PREFIX + '/' + p._id + '-cut.pdf'), p, {
                    mergePdf:false,
                    texturePage: false,
                    cutPage:true
                }),
                plane.createPDF(fs.createWriteStream(__dirname + '/pdf/' + SERVER_PREFIX + '/' + p._id + '-merged.pdf'), p, {
                    mergePdf:true,
                    texturePage: true,
                    cutPage:true
               })
            ])
            .then(()=>{
                //TODO: send to printer?
                /*
                if(print)
                exec print 
                PrintDate?
                res.end('print');
                res.end('print@home');
                */
                res.end('print@home');
                db.updateField(p._id, 'printState', PrintState.PRINT, null);
                db.updateField(p._id, 'name', p.name, null);
                db.updateField(p._id, 'info', req.body, null);
                p.info = req.body;
                
                //if net send-email
                if(req.body.email){
                    sendmail(p);
                }                
            });
          
        } else {
            res.sendStatus(404);   
        }
    });
});

var transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: true,
    debug: true,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
    }
});

//sendmail
function sendmail(p){
    transporter.sendMail({
        from: 'info@fablab-lacote.ch',
        to: p.info.email,
        subject: 'avion:make ' + p._id,
        text: 'Your plane from FabLab La Côte avion:make (beta).',
        attachments:[
            {
                path: __dirname + '/pdf/' + SERVER_PREFIX + '/' + p._id + '-print.pdf'
            },
            {
                path:  __dirname + '/pdf/' + SERVER_PREFIX + '/' + p._id + '-cut.pdf'
            },
            {
                path: __dirname  + '/pdf/' + SERVER_PREFIX + '/' + p._id + '-merged.pdf'
            },
            {
                filename: 'guide.png',
                path: __dirname + '/guide/' + p.type + '.png'
            }
        ]
        
        
    },(err, info)=>{
        //update state emailed...
        var emailSent:any = err;
        if(!err && info && info.accepted){
            if(info.accepted.indexOf(p.email)>-1){
                emailSent = new Date();
            }else{
                emailSent = 'not accepted';
            }
        }
        db.updateField(p._id, 'info.emailSent', emailSent, null); 
    });
}


//update state printed...
//get collection paged? filtered sorted
    //get ranking
//disable a plane from collection
//update score

app.listen(9001, function(){
    console.log('server listening on port %d in %s mode', 9001, app.settings.env);
});


export var App = app;
