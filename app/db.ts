/*

This file is part of avionmake.

Copyright (C) 2015  Boris Fritscher

This program is free software; you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation; either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program; if not, see http://www.gnu.org/licenses/.

*/

///<reference path="../typings/tsd.d.ts" />

import mongodb = require('mongodb');
import autoIncrement = require('./mongodb-autoincrement');
import bcrypt = require('bcrypt');
import plane = require('./plane');
import PrintState = require('./printstate');

var server = new mongodb.Server(process.env.MONGODB_PORT_27017_TCP_ADDR, process.env.MONGODB_PORT_27017_TCP_PORT, {auto_reconnect: true});
var db = new mongodb.Db('avionmake', server, { w: 1 });
db.open(function() {
    db.createIndex('planes', {
        'lastModified' : 1,
        '_id' : 1
    }, {name: 'dateModifiedSort'}, (err, result) => {
        console.log(err, result);
    });
	return true;
});

//TODO fix https://github.com/TheRoSS/mongodb-autoincrement/issues/2
export function getNextId(collection:string, callback:(err, autoIndex)=>void){
    autoIncrement.getNextSequence(db, collection, null,  callback);
}

export function savePlane(plane:IPlane, callback:(err, res)=>void){
    plane.printState = PrintState.PREVIEW;
    plane.lastModified = new Date();
    db.collection('planes')
    .update({_id: plane._id}, plane, {upsert:true}, callback);
}


export function getPlane(id:string, fullPlane:boolean, callback:(err, res)=>void){
    //info are protected
    db.collection('planes').findOne({_id: id}, {info:0}, (err, p) => {
        if(p && fullPlane){
            p = plane.expandPlane(p);
        }
        callback(err, p);
    });
}

export function update(id:string, update:any, callback:(err, res)=>void){
    db.collection('planes')
    .update({_id: id}, {
        $set:update,
        $currentDate: { lastModified: true }}, callback);
}

export function firstPlanes(limit, callback:(err, res)=>void){
    db.collection('planes').find({
            lastModified: {$exists:true},
            printState: {$gte: PrintState.PRINT},
            $or: [{disabled: false},{disabled:{$exists:false}}]
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
           db.collection('planes').find({
             lastModified: {$gt: p.lastModified},
             printState: {$gte: PrintState.PRINT},
             $or: [{disabled: false},{disabled:{$exists:false}}]
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
    db.collection('planes').find({
            score: {$exists:true},
            printState: PrintState.FLY,
            $or: [{disabled: false},{disabled:{$exists:false}}]
        }, {
            info:0,
            parts:0
        }, {
            sort: {score: -1}
        }).toArray(callback);
}

export function getStats(callback:(err, res)=>void){
    db.collection('planes').find({
            }, {
            info:0,
            parts:0
        }, {
            sort: {lastModified: 1,  _id: 1}
        }).toArray(callback);
}

export function getUser(username: string, callback:(err, res)=>void){
    db.collection('users').findOne({
        username: username
    }, callback);
}

export function createUser(username: string, password: string, callback:(err, res)=>void){
    db.collection('users').insert({
        username: username,
        password: bcrypt.hashSync(password, 10)
    }, callback);
}
