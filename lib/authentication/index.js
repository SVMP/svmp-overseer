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
 * author Dave Bryson
 *
 */

'use strict';

var
    svmp = require('../svmp'),
    jwt = require('jsonwebtoken');

/**
 * Checks for JWT authentication in header with field name: svmp-authtoken
 * @param req
 * @param res
 * @param next
 */
exports.checkToken = function(req,res,next) {
    var token = req.get('svmp-authtoken');

    if(token) {
        jwt.verify(token,svmp.config.get('settings:jwtSecret'), function(err,decoded) {
            if(err) {
                res.json(401,{msg: 'bad token'});
            } else {
                req.username = decoded.username;
                next()
            }
        });
    } else {
        res.json(401,{msg: 'no token'});
    }
};

/**
 * Make a JWT token with userInfo payload
 * @param userInfo: object {username: 'some username'}
 * @returns {*} the signed JWT String
 */
exports.makeToken = function(userInfo) {
    return jwt.sign(userInfo, svmp.config.get('settings:jwtSecret'));
};

/**
 * Return authentication strategy based on configuration params. Supports
 * TLS, PAM, DB
 * @returns {Function}
 */
exports.loadStrategy = function() {

    if(svmp.config.isEnabled('settings:use_pam')) {
        // PAM
        return function(req, callback) {
            var pam = require('authenticate-pam'),
                pam_service = svmp.config.get('settings:pam_service'),
                pam_host = 'localhost';

            var un = req.body.username;
            var pw = req.body.password;

            if(!un || !pw) {
                callback(400);
            } else {
                pam.authenticate(un, pw, function (err) {
                    if (err) {
                        callback(401);
                    }
                    else {
                        callback(undefined, {username: un})
                    }
                }, {serviceName: pam_service, remoteHost: pam_host});
            }
        }
    } else if(svmp.config.isEnabled('settings:use_tls_user_auth')) {
        // TLS
        return function(req, callback) {
            var cert = req.client.getPeerCertificate();

            if (cert && cert.subject && cert.subject.emailAddress)
                callback(undefined, {username: cert.subject.emailAddress});
            else
                callback(401);
        }
    } else {
        // DB
        return function(req,callback) {
            var un = req.body.username;
            var pw = req.body.password;
            if(!un || !pw) {
                callback(400);
            } else {
                svmp.users.authenticateUser(un,pw, callback);
            }
        }
    }
};