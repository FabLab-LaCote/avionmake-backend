///<reference path="typings/tsd.d.ts" />
var mongodb = require('mongodb');
var autoIncrement = require('mongodb-autoincrement');
var bcrypt = require('bcrypt');
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
    plane.printState = 1;
    plane.lastModified = new Date();
    db.collection('planes')
        .update({ _id: plane._id }, plane, { upsert: true }, callback);
}
exports.savePlane = savePlane;
function getPlane(id, fullPlane, callback) {
    db.collection('planes').findOne({ _id: id }, { info: 0 }, function (err, p) {
        if (p && fullPlane) {
            p = plane.expandPlane(p);
        }
        callback(err, p);
    });
}
exports.getPlane = getPlane;
function update(id, update, callback) {
    db.collection('planes')
        .update({ _id: id }, {
        $set: update,
        $currentDate: { lastModified: true } }, callback);
}
exports.update = update;
function firstPlanes(limit, callback) {
    db.collection('planes').find({
        lastModified: { $exists: true },
        disabled: false
    }, {
        info: 0
    }, {
        sort: { lastModified: 1 },
        limit: limit
    }).toArray(callback);
}
exports.firstPlanes = firstPlanes;
function nextPlanes(id, limit, callback) {
    getPlane(id, false, function (err, p) {
        if (p && p.lastModified) {
            db.collection('planes').find({
                disabled: false,
                lastModified: { $gt: p.lastModified }
            }, {
                info: 0
            }, {
                sort: { lastModified: 1, _id: 1 },
                limit: limit
            }).toArray(function (err, data) {
                if (data.length > 0) {
                    callback(err, data);
                }
                else {
                    firstPlanes(limit, callback);
                }
            });
        }
        else {
            firstPlanes(limit, callback);
        }
    });
}
exports.nextPlanes = nextPlanes;
function getScores(callback) {
    db.collection('planes').find({
        score: { $exists: true },
        disabled: false,
        printState: 5
    }, {
        info: 0,
        parts: 0
    }, {
        sort: { score: -1 }
    }).toArray(callback);
}
exports.getScores = getScores;
function getStats(callback) {
    db.collection('planes').find({}, {
        info: 0,
        parts: 0
    }, {
        sort: { lastModified: 1, _id: 1 }
    }).toArray(callback);
}
exports.getStats = getStats;
function getUser(username, callback) {
    db.collection('users').findOne({
        username: username
    }, callback);
}
exports.getUser = getUser;
function createUser(username, password, callback) {
    db.collection('users').insert({
        username: username,
        password: bcrypt.hashSync(password, 10)
    }, callback);
}
exports.createUser = createUser;
//# sourceMappingURL=db.js.map