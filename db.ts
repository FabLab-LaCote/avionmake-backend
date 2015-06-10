import mongodb = require('mongodb');
import autoIncrement = require('mongodb-autoincrement');
import plane = require('./plane');

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
