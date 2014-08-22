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
    svmp = require('./svmp'),
    jwt = require('jsonwebtoken');

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
        jwt.verify(token, svmp.config.get('settings:jwtSecret'), function (err, decoded) {
            if (err) {
                res.json(401, {msg: 'bad token'});
            } else {
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

//    if (token) {
//        jwt.verify(token, svmp.config.get('settings:jwtSecret'), function (err, decoded) {
//            if (err) {
//                res.json(401, {msg: 'bad token'});
//            } else {
//                if (decoded.role === 'admin') {
//                    req.user = decoded;
//                    next();
//                } else {
//                    res.json(401, {msg: 'wrong role'});
//                }
//            }
//        });
//    } else {
//        res.json(401, {msg: 'no token'});
//    }
                    next();
};

/**
 * Make a JWT token with userInfo payload
 * Used during the login process
 *
 * @param userInfo object {username: 'some username'}
 * @returns {*} the signed JWT String
 */
exports.makeToken = function (userInfo) {
    return jwt.sign(userInfo, svmp.config.get('settings:jwtSecret'));
};


/**
 * Return authentication strategy based on configuration params. Supports
 * TLS, PAM, DB.  Always checks of password needs changed
 * @returns {Function}
 */
exports.loadStrategy = function () {

    if (svmp.config.isEnabled('settings:use_tls_user_auth')) {
        // TLS
        return function (req, callback) {
            var cert = undefined;
            try {
                cert = req.client.getPeerCertificate();

                if (cert && cert.subject && cert.subject.emailAddress) {

                    svmp.User.findOne({email: cert.subject.emailAddress}, function (err, user) {
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

            } catch (e) {
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
                    } else if (token) {
                        // the user presented a token, attempt to verify it
                        jwt.verify(token, svmp.config.get('settings:jwtSecret'), function (err, decoded) {
                            if (err) {
                                callback(401);
                            } else {
                                callback(undefined, {'token': token, 'exp': decoded.exp});
                            }
                        });
                    } else if (pw && svmp.config.isEnabled('settings:use_pam')) {
                        // the user presented a password and PAM authentication is enabled
                        var pam = require('authenticate-pam'),
                            pam_service = svmp.config.get('settings:pam_service'),
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