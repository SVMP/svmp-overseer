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
    fs = require('fs'),
    shell = require('shelljs'),
    svmp = require('./svmp'),
    jwt = require('jsonwebtoken');

// do NOT read these directly, use the getter methods
var pubKey = null;
var privKey = null;

/**
 * Checks for JWT authentication in header with field name: svmp-authtoken
 * Called in Express route filter
 *
 * @param req
 * @param res
 * @param next
 */
exports.checkToken = function (req, res, next) {
    // Extract from Headers
    var token = req.get('svmp-authtoken');

    if (token) {
        jwt.verify(token, getPubKey(), function (err, decoded) {
            if (err) {
                res.logMessage = err.message;
                res.json(401, {msg: 'bad token (' + err.message + ')'});
            } else if (typeof decoded.sub === 'undefined' || decoded.sub === '') {
                res.logMessage = 'Token has no subject specified';
                res.json(401, {msg: 'bad token (no subject)'});
            } else {
                res.logUsername = decoded.sub;
                req.user = decoded;
                next()
            }
        });
    } else {
        res.json(401, {msg: 'no token'});
    }
};

/**
 * Check the token has a role of Admin
 * Called in Express route filter
 * @param req
 * @param res
 * @param next
 */
exports.checkAdminToken = function (req, res, next) {
    // Extract from Headers
    var token = req.get('svmp-authtoken');
    if (token) {
        jwt.verify(token, getPubKey(), function (err, decoded) {
            res.logUsername = decoded.sub;
            if (err) {
                res.logMessage = err.message;
                res.json(401, {msg: 'bad token (' + err.message + ')'});
            } else if (typeof decoded.sub === 'undefined' || decoded.sub === '') {
                res.logMessage = 'Token has no subject specified';
                res.json(401, {msg: 'bad token (no subject)'});
            } else if (decoded.role !== 'admin') {
                res.logMessage = 'Incorrect token role \'' + decoded.role + '\'';
                res.json(401, {msg: 'wrong role'});
            } else {
                res.logUsername = decoded.sub;
                req.user = decoded;
                next();
            }
        });
    } else {
        res.json(401, {msg: 'no token'});
    }
};

/**
 * Make a JWT token with userInfo payload
 * Used during the login process
 *
 * @param userInfo object {username: 'some username'}
 * @returns {*} the signed JWT String
 */
exports.makeToken = function (userInfo) {
    return jwt.sign(userInfo, getPrivKey(), {algorithm: svmp.config.get("jwt_signing_alg")});
};


/**
 * Return authentication strategy based on configuration params. Supports
 * TLS, PAM, DB.  Always checks of password needs changed
 * @returns {Function}
 */
exports.loadStrategy = function () {
    if (svmp.config.useTlsCertAuth()) {
        // TLS
        return function (req, callback) {
            var cert = undefined;
            if (svmp.config.get('behind_reverse_proxy')) {
                // external SSL terminator path
                // Reverse proxy will do the verification and inject HTTP headers with
                // the relevant data fields from the cert subject
                cert = { subject: { CN: req.headers['x-forwarded-ssl-client-s-dn-cn']}};
            } else {
                // direct SSL path
                if (req.client.authorized) {
                    cert = req.client.getPeerCertificate();
                } else {
                    //certificate rejected
                    callback(401);
                    return;
                }
            }

            // look for a username matching the CN
            if (cert && cert.subject && cert.subject.CN) {
                svmp.User.findOne({username: cert.subject.CN}, function (err, user) {
                    if (err) {
                        // server error
                        callback(500);
                    } else if (!user) {
                        // no user found
                        callback(401);
                    } else {
                        callback(undefined, {'user': user});
                    }
                });
            } else {
                callback(400); // Bad Request
            }
        }
    } else {
        // DB
        return function (req, callback) {
            var un = req.body.username;
            var pw = req.body.password;
            var token = req.body.sessionToken;

            if (!un || (!pw && !token)) {
                callback(400); // Bad Request
            } else {
                svmp.User.findOne({username: un}, function (err, user) {
                    if (err) {
                        // server error
                        callback(500);
                    } else if (!user) {
                        // no user found
                        callback(401);
                    } else if (pw && svmp.config.get('authentication_type') === 'pam') {
                        // the user presented a password and PAM authentication is enabled
                        var pam = require('authenticate-pam'),
                            pam_service = svmp.config.get('pam_service'),
                            pam_host = 'localhost';
                        // attempt to verify the password
                        pam.authenticate(un, pw, function (err) {
                            if (err) {
                                // PAM authentication failed
                                callback(401); // Not authorized
                            } else {
                                // the user presented a password that verified, make sure it doesn't need to be changed
                                checkPasswordChange(user, callback);
                            }
                        }, {serviceName: pam_service, remoteHost: pam_host});
                    } else if (pw && user.authenticate(pw)) {
                        // the user presented a password that verified, make sure it doesn't need to be changed
                        checkPasswordChange(user, callback);
                    } else {
                        // either token failed to verify or password failed to verify
                        callback(401);
                    }
                });
            }
        }
    }
};

// private function
function checkPasswordChange(user, callback) {
    // checks whether the user needs to change their password to proceed
    if (user.password_change_needed) {
        callback(403); // Forbidden
    } else {
        callback(undefined, {'user': user});
    }
}

// get the private token signing key
// load it from disk if not already in memory
function getPrivKey() {
    if (privKey === null) {
        var pass = svmp.config.get('private_key_pass');
        var file = svmp.config.get('private_key');
        process.env.passphrase = pass;
        var command = 'openssl rsa -in ' + file + ' -passin env:passphrase';
        privKey = shell.exec(command, {silent: true}).output;
        delete process.env.passphrase;
    }
    return privKey;
}

// get the public token verification key
// load it from disk if not already in memory
function getPubKey() {
    if (pubKey === null) {
        pubKey = fs.readFileSync(svmp.config.get('server_certificate'));
    }
    return pubKey;
}
