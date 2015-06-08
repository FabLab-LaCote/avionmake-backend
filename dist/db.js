var mongodb = require('mongodb');
var autoIncrement = require('mongodb-autoincrement');
var plane = require('./plane');
var server = new mongodb.Server('localhost', 27017, { auto_reconnect: true });
var db = new mongodb.Db('avionmake', server, { w: 1 });
db.open(function () {
    return true;
});
function getNextSequence(callback) {
    autoIncrement.getNextSequence(db, 'plane', null, callback);
}
exports.getNextSequence = getNextSequence;
function savePlane(plane, callback) {
    db.collection('plane')
        .update({ _id: plane._id }, plane, { upsert: true }, callback);
}
exports.savePlane = savePlane;
function getPlane(id, fullPlane, callback) {
    db.collection('plane').findOne({ _id: Number(id) }, { info: 0 }, function (err, p) {
        if (fullPlane) {
            p = plane.expandPlane(p);
        }
        callback(err, p);
    });
}
exports.getPlane = getPlane;
//# sourceMappingURL=db.js.map