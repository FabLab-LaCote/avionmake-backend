/// <reference path="bcrypt/bcrypt.d.ts" />
/// <reference path="clone/clone.d.ts" />
/// <reference path="es6-promise/es6-promise.d.ts" />
/// <reference path="express-session/express-session.d.ts" />
/// <reference path="express/express.d.ts" />
/// <reference path="mongodb/mongodb.d.ts" />
/// <reference path="node/node.d.ts" />
/// <reference path="nodemailer-direct-transport/nodemailer-direct-transport.d.ts" />
/// <reference path="nodemailer-smtp-transport/nodemailer-smtp-transport.d.ts" />
/// <reference path="nodemailer/nodemailer-types.d.ts" />
/// <reference path="nodemailer/nodemailer.d.ts" />
/// <reference path="passport-local/passport-local.d.ts" />
/// <reference path="passport-strategy/passport-strategy.d.ts" />
/// <reference path="passport/passport.d.ts" />


declare module 'canvas'{
    var Canvas:{
        new(width, height);
        Image:any;
    }
    export = Canvas;
}

declare module 'pdfkit'{
    var PDFDocument:{
        new(args:any):any;
    }
    export = PDFDocument;
}

declare module "mongodb-autoincrement"{
    import mongodb = require("mongodb");
    export function getNextSequence(db:mongodb.Db, collectionName:string, fieldName:string, callback: (err,autoIndex:number)=>void):void;
}


declare module 'mailchimp-lite'{
    var Mailchimp:{
        new(args:any):any;
    }
    export = Mailchimp;
}
