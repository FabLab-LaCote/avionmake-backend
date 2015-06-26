/// <reference path="express.d.ts" />

declare module "body-parser" {
    import express = require("express");
    function bodyParser(): express.RequestHandler;
    module bodyParser {
        function urlencoded(opts?: any): express.RequestHandler;
        function json(opts?:any): express.RequestHandler;
    }
    export = bodyParser;
}

declare module "method-override" {
    import express = require("express");
    function methodOverride(): express.RequestHandler;
    export = methodOverride;
}

declare module "errorhandler" {
    import express = require("express");
    function errorHandler(opts?: any): express.ErrorRequestHandler;
    export = errorHandler;
}

declare module "cors" {
    import express = require("express");
    function cors(args?:any): express.RequestHandler;
    export = cors;
}

declare module "raven"{
    var middleware;
    var Client:Client;
    interface Client{
        new (dsn:String, options?:any);
        captureMessage(message:String, options?:any, callback?:Function);
        captureError(error:Error, options?:any, callback?:Function);
        captureQuery(query:String, type?:String, callback?:Function);    
    }
}

declare module "is-online"{
    function isOnline(callback:(err:Error, isOnline:boolean)=>void):void;
    export = isOnline;
}