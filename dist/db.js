var mongodb = require('mongodb');
var autoIncrement = require('mongodb-autoincrement');
var plane = require('./plane');
var server = new mongodb.Server('localhost', 27017, { auto_reconnect: true });
var db = new mongodb.Db('avionmake', server, { w: 1 });
db.open(function () {
    return true;
});
function getNextId(collection, callback) {
    autoIncrement.getNextSequence(db, collection, null, callback);
}
exports.getNextId = getNextId;
function savePlane(plane, callback) {
    plane.lastModified = new Date();
    db.collection('plane')
        .update({ _id: plane._id }, plane, { upsert: true }, callback);
}
exports.savePlane = savePlane;
function getPlane(id, fullPlane, callback) {
    db.collection('plane').findOne({ _id: id }, { info: 0 }, function (err, p) {
        if (p && fullPlane) {
            p = plane.expandPlane(p);
        }
        callback(err, p);
    });
}
exports.getPlane = getPlane;
function updateField(id, field, value, callback) {
    var update = {};
    update[field] = value;
    db.collection('plane')
        .update({ _id: id }, {
        $set: update,
        $currentDate: { lastModified: true } }, callback);
}
exports.updateField = updateField;
//# sourceMappingURL=db.js.map