/*
 * Copyright 2014 The MITRE Corporation, All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this work except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * author Joe Portner
 *
 */

'use strict';

var
    fs = require('fs'),
    svmp = require('../../lib/svmp'),
    jwt = require('jsonwebtoken');

// do NOT read this directly, use the getter methods
var pubKey = null;

// this route is called before any other middleware
// it logs Request and Response information at various levels
// logging happens right before the Response is sent to the client


/**
 * Daveb:  This now only logs requests that have tokens (which it seemed was the original intent).
 * I reworked it below because it was only sending the
 * status code and stripping all returned messages in the console app causing a bunch of things to break.
 * @param app
 */
module.exports = function (app) {
    var logLevel = svmp.config.get('log_level');

    app.use(function (req, res, next) {
        // intercept the response before it gets sent
        var token = req.get('svmp-authtoken');
        if (token) {
            var send = res.send;
            res.send = function (string, m) {
                var token = req.get('svmp-authtoken');
                // 'this' is the response

                if (logLevel === 'debug' || logLevel === 'silly') {
                    var that = this;
                    var decoded = jwt.decode(token);
                    // not every API call will contain a JWT; if it does (for admin APIs), pull the username out of it
                    var reqUser = decoded.sub + "@";
                    // debug: log the request address/method/URL and response status code
                    svmp.logger.debug("Request (%s%s) %s '%s'; Response code: %d",
                        reqUser, req.connection.remoteAddress, req.method, req.originalUrl, that.statusCode);
                }
                if (logLevel === 'silly') {
                    // identify part of the JWT if the client presented one
                    var reqJWT = JSON.stringify(decoded);
                    var resJSON = JSON.parse(string);
                    // silly: log the JWT/body and response body
                    svmp.logger.silly("  Request JWT: '%s', JSON: %s; Response JSON: %s",
                        reqJWT, JSON.stringify(req.body, stringifyFilter), JSON.stringify(resJSON, stringifyFilter));
                }
                // we're done logging, finish sending the response
                send.call(this, string);
            };
        }

        /*var send = res.send;
         res.send = function (string, m) {
         var token = req.get('svmp-authtoken');
         // 'this' is the response

         if ((logLevel === 'debug' || logLevel === 'silly') && token) {
         var that = this;

         // The below fails on requests without tokens, such as console calls
         //if (!token) {
         //    token = ""; // prevents JWT verification error
         //}
         var decoded = jwt.decode(token);
         // not every API call will contain a JWT; if it does (for admin APIs), pull the username out of it
         var reqUser = decoded.sub + "@";

         // debug: log the request address/method/URL and response status code
         svmp.logger.debug("Request (%s%s) %s '%s'; Response code: %d",
         reqUser, req.connection.remoteAddress, req.method, req.originalUrl, that.statusCode);
         }
         if (logLevel === 'silly' && token) {
         // identify part of the JWT if the client presented one
         var reqJWT = JSON.stringify(decoded);
         var resJSON = JSON.parse(string);
         // silly: log the JWT/body and response body
         svmp.logger.silly("  Request JWT: '%s', JSON: %s; Response JSON: %s",
         reqJWT, JSON.stringify(req.body, stringifyFilter), JSON.stringify(resJSON, stringifyFilter));
         }
         // we're done logging, finish sending the response

         console.log("IN LOG: ", m);

         send.call(this, string);
         };*/
        // move on to the next middleware (token check, then requested route)
        next();
    });
};

// filter values that are stringified in Request/Response JSON so we don't leak sensitive info
// or spam the logs with output from arrays of data
function stringifyFilter(key, value) {
    if (value === null) {
        return undefined;
    } else if (value instanceof Array && value.length > 0) {
        return "<filtered array>";
    } else if (key === "password" || key === "newPassword") {
        return "<hidden>";
    } else if (key === "token") {
        return shortJWT(value);
    }

    return value;
}

// shortens a client's JWT to prevent logging sensitive information
function shortJWT(token) {
    var short = "";
    if (token) {
        var printChars = 6; // how many chars to print from the end of the JWT
        if (token.length > printChars)
            token = "..." + token.substr(token.length - printChars);
        short = token;
    }
    return short;
}

// get the public token verification key
// load it from disk if not already in memory
function getPubKey() {
    if (pubKey === null) {
        pubKey = fs.readFileSync(svmp.config.get('server_certificate'));
    }
    return pubKey;
}
