///<reference path="typings/tsd.d.ts" />

import mongodb = require('mongodb');
import autoIncrement = require('mongodb-autoincrement');
import plane = require('./plane');
import PrintState = require('./printstate');

var server = new mongodb.Server('localhost', 27017, {auto_reconnect: true});
var db = new mongodb.Db('avionmake', server, { w: 1 });
db.open(function() {
	return true;
});

//TODO fix https://github.com/TheRoSS/mongodb-autoincrement/issues/2
export function getNextId(collection:string, callback:(err, autoIndex)=>void){
    autoIncrement.getNextSequence(db, collection, null,  callback);
}

export function savePlane(plane:IPlane, callback:(err, res)=>void){
    plane.printState = PrintState.PREVIEW;
    plane.lastModified = new Date();
    db.collection('plane')
    .update({_id: plane._id}, plane, {upsert:true}, callback);
}


export function getPlane(id:string, fullPlane:boolean, callback:(err, res)=>void){
    //info are protected
    db.collection('plane').findOne({_id: id}, {info:0}, (err, p) => {
        if(p && fullPlane){
            p = plane.expandPlane(p);
        }
        callback(err, p);   
    });
}

export function updateField(id:string, field:string, value:any, callback:(err, res)=>void){
    var update = {};
    update[field] = value;
    db.collection('plane')
    .update({_id: id}, {
        $set:update,
        $currentDate: { lastModified: true }}, callback);
}

export function firstPlanes(limit, callback:(err, res)=>void){
    db.collection('plane').find({
            lastModified: {$exists:true}
        },
        {
            info:0
        }, {
            sort: { lastModified : 1 },
            limit: limit
        }).toArray(callback);
}

export function nextPlanes(id, limit, callback:(err, res)=>void){
    getPlane(id, false, (err, p)=>{
       if(p && p.lastModified){
           db.collection('plane').find({
             lastModified: {$gt: p.lastModified}
            }, {
                info:0
            }, {
                sort: {lastModified: 1,  _id: 1},
                limit: limit
            }).toArray((err, data) => {
                if( data.length > 0){
                    callback(err, data);
                }else{         
                    firstPlanes(limit, callback);
                } 
            });    
       }else{
            firstPlanes(limit, callback);
       }
        
    });
}

export function getScores(callback:(err, res)=>void){
    db.collection('plane').find({
            score: {$exists:true},
            printState: PrintState.FLY
        }, {
            info:0,
            parts:0
        }, {
            sort: {score: -1}
        }).toArray(callback);
}

export function getStats(callback:(err, res)=>void){
    db.collection('plane').find({
            }, {
            info:0,
            parts:0
        }, {
            sort: {lastModified: 1,  _id: 1}
        }).toArray(callback);
}
