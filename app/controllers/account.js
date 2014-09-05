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
    svmp = require('../../lib/svmp'),
    auth = require('../../lib/authentication'),
    strategy = auth.loadStrategy(),
    toDate = require('to-date'),
    uuid = require('node-uuid'),
    util = require('util');

/**
 * Login/Authenticate User.
 *
 * Loads authentication strategy based on config file settings (TLS, PAM, DB)
 * and checks if password change is needed.
 *
 * On Success, returns a JSON payload with a JWT token that the client must send
 * as a header field in subsequent requests to get access.
 * @param req
 * @param res
 */
exports.login = function(req,res) {
    // use loaded strategy for authentication
    strategy(req,function(errCode,result) {
        if(errCode) {
            res.json(errCode,{msg: 'Error authenticating'});
        } else {
            sendToken(res, result);
        }
    });
};


/**
 * Change current User password
 * @param req
 * @param res
 */
exports.changeUserPassword = function(req,res) {
    var un = req.body.username;
    var oldPassword = req.body.password;
    var newPassword = req.body.newPassword;

    svmp.User.findOne({username: un}, function (err, user) {
        if (err) {
            res.send(400); // Bad Request
        }
        else if (user && user.authenticate(oldPassword)) {

            user.password = newPassword;
            user.password_change_needed = false;

            user.save(function (err1, r) {
                if (err1) {
                    // user model validation failed
                    res.send(400);
                } else {
                    sendToken(res, {'user': user});
                }
            });
        }
        else {
            // failed authentication, reject
            res.send(401); // UnAuth
        }
    });

};

// private function
function sendToken(res, result) {
    // Setup token
    // result either contains an existing token, or a user object

    var max_session;
    var token = result.token;
    if (token) {
        // the client used a JWT to log in; instruct them to reuse it
        // we tell the client the number of seconds the token is valid; this has decreased
        max_session = (new Date(result.exp).getTime() - new Date().getTime()) / 1000;
    } else {
        // the client authenticated some other way; make a new token
        max_session = svmp.config.get('max_session_length');
        var args = {
            'sub': result.user.username,
            'email': result.user.email,
            'role': result.user.roles[0],
            'exp': toDate(max_session).seconds.fromNow,
            'iss': svmp.config.get('overseer_url'),
            'jti': uuid.v4()
        };
        token = auth.makeToken(args);
    }

    // Response object
    var responseObj = {
        sessionInfo: {
            token: token,
            maxLength: max_session
        },
        server: {
            host: svmp.config.get('proxy_host'),
            port: svmp.config.get('proxy_port')
        },
        webrtc: svmp.config.get("webrtc")
    };

    res.json(200,responseObj);
}
