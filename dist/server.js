///<reference path="typings/tsd.d.ts" />
require('dotenv').load();
var cors = require('cors');
var express = require('express');
var session = require('express-session');
var bodyParser = require('body-parser');
var errorHandler = require('errorhandler');
var raven = require('raven');
var fs = require('fs');
var nodemailer = require('nodemailer');
var isOnline = require('is-online');
var childProcess = require('child_process');
var passport = require('passport');
var passportLocal = require('passport-local');
var bcrypt = require('bcrypt');
var client = new raven.Client(process.env.SENTRY_DSN || '');
client.patchGlobal(function (sent, err) {
    console.log(err.stack);
    process.exit(1);
});
var db = require('./db');
var plane = require('./plane');
var app = express();
app.use(raven.middleware.express(client));
app.use(cors({
    origin: true,
    credentials: true
}));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json({ limit: '50mb' }));
app.use(session({
    secret: process.env.SESSION_SECRET,
    saveUninitialized: false,
    resave: false
}));
app.use(passport.initialize());
app.use(passport.session());
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
passport.use(new passportLocal.Strategy(function (username, password, done) {
    db.getUser(username, function (err, user) {
        if (user && bcrypt.compareSync(password, user.password)) {
            done(null, user);
        }
        else {
            done(null, false, { message: 'incorrect login' });
        }
    });
}));
passport.serializeUser(function (user, done) {
    done(null, user.username);
});
passport.deserializeUser(function (username, done) {
    db.getUser(username, function (err, user) {
        if (user) {
            done(null, user);
        }
        else {
            done(null, false);
        }
    });
});
var SERVER_PREFIX = process.env.SERVER_PREFIX || 'FL';
function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.sendStatus(401);
}
app.get('/api/create/:username/:password', function (req, res) {
    db.createUser(req.params.username, req.params.password, function (err, u) {
        res.json(u);
    });
});
app.post('/api/login', function (req, res, next) {
    return passport.authenticate('local', function (err, user) {
        if (err) {
            return next(err);
        }
        if (!user) {
            return res.status(400).send({
                message: 'Bad username or password'
            });
        }
        req.logIn(user, function (err) {
            if (err) {
                return next(err);
            }
            res.json(user.username);
        });
    })(req, res, next);
});
app.get('/api/logout', function (req, res) {
    req.logout();
    res.end();
});
app.post('/api/set/:id', ensureAuthenticated, function (req, res) {
    db.update(req.params.id, req.body, function (err, c) {
        if (err) {
            client.captureError(err);
        }
        db.getStats(function (err2, planes) {
            res.json(planes);
        });
    });
});
app.get('/api/stats', ensureAuthenticated, function (req, res) {
    db.getStats(function (err, planes) {
        res.json(planes);
    });
});
app.post('/api/plane', function (req, res) {
    function saveNewPlane() {
        db.getNextId(SERVER_PREFIX, function (err, autoIndex) {
            if (err) {
                client.captureError(err);
            }
            req.body._id = SERVER_PREFIX + '-' + autoIndex;
            req.body.previewCount = 1;
            db.savePlane(req.body, function (err, result) {
                res.end(req.body._id);
            });
        });
    }
    try {
        if (req.body._id) {
            db.getPlane(req.body._id, false, function (err, p) {
                if (err) {
                    client.captureError(err);
                }
                if (p && p.hasOwnProperty('printState')) {
                    if (p.printState < 2) {
                        req.body.previewCount = 1 + p.previewCount;
                        db.savePlane(req.body, function (err, result) {
                            res.end(String(req.body._id));
                        });
                    }
                    else {
                        res.end(p._id);
                    }
                }
                else {
                    saveNewPlane();
                }
            });
        }
        else {
            saveNewPlane();
        }
    }
    catch (err) {
        res.status(500);
        res.end(err);
    }
});
app.get('/api/scores', function (req, res) {
    db.getScores(function (err, scores) {
        res.json(scores);
    });
});
app.get('/api/plane/:id', function (req, res) {
    db.getPlane(req.params.id, false, function (err, p) {
        res.json(p);
        res.end();
    });
});
app.get('/api/pdf/:id', function (req, res) {
    db.getPlane(req.params.id, true, function (err, p) {
        plane.createPDF(res, p, {
            mergePdf: req.query.hasOwnProperty('merge'),
            texturePage: true,
            cutPage: true
        });
    });
});
app.get('/api/finalpdf/:id', function (req, res) {
    var prefix = req.params.id.split('-')[0];
    res.sendFile(__dirname + '/pdf/' + prefix + '/' + req.params.id + '-' + req.query.type + '.pdf');
});
app.get('/api/nextplanes/:id?/:limit?', function (req, res) {
    db.nextPlanes(req.params.id, req.params.limit || 1, function (err, p) {
        res.json(p);
    });
});
app.post('/api/print/:id', function (req, res) {
    db.getPlane(req.params.id, true, function (err, p) {
        if (err) {
            client.captureError(err);
        }
        if (p) {
            p.name = req.body.name;
            delete req.body.name;
            Promise.all([
                plane.createPDF(fs.createWriteStream(__dirname + '/pdf/' + SERVER_PREFIX + '/' + p._id + '-print.pdf'), p, {
                    mergePdf: true,
                    texturePage: true,
                    cutPage: false
                }),
                plane.createPDF(fs.createWriteStream(__dirname + '/pdf/' + SERVER_PREFIX + '/' + p._id + '-cut.pdf'), p, {
                    mergePdf: false,
                    texturePage: false,
                    cutPage: true
                }),
                plane.createPDF(fs.createWriteStream(__dirname + '/pdf/' + SERVER_PREFIX + '/' + p._id + '-merged.pdf'), p, {
                    mergePdf: true,
                    texturePage: true,
                    cutPage: true
                })
            ])
                .then(function () {
                if (process.env.PRINTER && process.env.FOXIT_LOCATION) {
                    childProcess.spawn(process.env.FOXIT_LOCATION, ['/t', __dirname + '/pdf/' + SERVER_PREFIX + '/' + p._id + '-print.pdf', process.env.PRINTER], {
                        stdio: 'ignore'
                    });
                    res.end('print');
                }
                else {
                    res.end('print@home');
                }
                db.update(p._id, {
                    printState: 2,
                    printDate: new Date(),
                    name: p.name,
                    info: req.body
                }, function (err, r) {
                    if (err) {
                        client.captureError(err);
                    }
                });
                p.info = req.body;
                if (req.body.email) {
                    isOnline(function (err, isOnline) {
                        if (isOnline) {
                            sendmail(p);
                        }
                    });
                }
            });
        }
        else {
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
function sendmail(p) {
    transporter.sendMail({
        from: 'info@fablab-lacote.ch',
        to: p.info.email,
        subject: 'FabLab La Côte - avion:make ' + p._id,
        text: "Bonjour et merci pour votre participation à notre atelier.\n\nNous espérons que les différentes étapes de réalisation vous ont plus.\nVous trouverez, ci-joint, les plans de votre avion à découper ainsi que les instructions de montage.\n\nRéutilisez-les à volonté et éclatez-vous!\n\nAméliorez votre avion en y rajoutant des LED pour des vols de nuit ou encore un petit moteur pour qu'il aille encore plus loin!\n\nVous ne savez pas comment faire?\nPassez au FabLab la Côte, nous vous donnerons des pistes!\n\nA bientôt,\nL'équipe du FabLab la Côte\nhttp://www.fablab-lacote.ch/",
        html: "<p>Bonjour et merci pour votre participation à notre atelier.</p><p>Nous espérons que les différentes étapes de réalisation vous ont plus.<br/>Vous trouverez, ci-joint, les plans de votre avion à découper ainsi que les instructions de montage.</p><p>Réutilisez-les à volonté et clatez-vous!<br/>Améliorez votre avion en y rajoutant des LED pour des vols de nuit ou encore un petit moteur pour qu'il aille encore plus loin!</p><p>Vous ne savez pas comment faire?<br/>Passez au FabLab la Côte, nous vous donnerons des pistes!</p><p>A bientôt,<br/>L'équipe du FabLab la Côte</p>" + '<p><img src="http://www.fablab-lacote.ch/FabLab.png" alt="" /></p><pre><span style="font-size: medium; color: #006eb8;"><a style="text-decoration: none;"><span style="color: #006eb8;"><strong> www.fablab-lacote.ch</strong></span></a></span></pre><pre>&nbsp;</pre><pre><strong>Suivez-nous sur:</strong><a title="Likez notre page!" href="https://www.facebook.com/FabLabLaCote"><img src="http://www.fablab-lacote.ch/facebook.jpg" alt="" /></a> <a title="Rejoignez notre communaut&eacute; google" href="https://plus.google.com/u/0/communities/111573537840303612395"><img src="http://www.fablab-lacote.ch/google.jpg" alt="" /></a> <a title="Suivez-nous sur Twitter" href="https://twitter.com/FabLabLaCote"><img src="http://www.fablab-lacote.ch/twitter.jpg" alt="" /></a></pre></div>',
        attachments: [
            {
                path: __dirname + '/pdf/' + SERVER_PREFIX + '/' + p._id + '-print.pdf'
            },
            {
                path: __dirname + '/pdf/' + SERVER_PREFIX + '/' + p._id + '-cut.pdf'
            },
            {
                path: __dirname + '/pdf/' + SERVER_PREFIX + '/' + p._id + '-merged.pdf'
            },
            {
                filename: 'guide.png',
                path: __dirname + '/guide/' + p.type + '.png'
            }
        ]
    }, function (err, info) {
        var emailSent = err.message;
        if (!err && info && info.accepted) {
            if (info.accepted.indexOf(p.email) > -1) {
                emailSent = new Date().toISOString();
            }
            else {
                emailSent = 'not accepted';
            }
        }
        if (err) {
            client.captureError(err);
        }
        db.update(p._id, { 'info.emailSent': emailSent }, function (err, r) {
            if (err) {
                client.captureError(err);
            }
        });
    });
}
var server = app.listen(process.env.SERVER_PORT, 'localhost');
server.on('listening', function () {
    console.log('server listening on port %d in %s mode', server.address().port, app.settings.env);
});
exports.App = app;
//# sourceMappingURL=server.js.map