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

            // Setup token
            var max_session = svmp.config.get('settings:max_session_length');

            // Additional JWT content
            result.exp = toDate(max_session).seconds.fromNow;
            result.iss = svmp.config.get('settings:rest_server_url');
            result.jti = util.format('%s-%s',result.username,uuid.v4());

            var token = auth.makeToken(result);

            // Response object
            var responseObj = {
                sessionInfo: {
                    token: token,
                    maxLength: max_session,
                    gracePeriod: svmp.config.get('settings:session_token_ttl')
                },
                server: {
                    host: "svmp-server.example.com",
                    port: 8002
                },
                webrtc: svmp.config.get("webrtc")
            };

            res.json(200,responseObj);
        }
    });
};


/**
 * Change current User password
 * You'll never get here without a valid JWT token in the header
 * @param req
 * @param res
 */
exports.changeUserPassword = function(req,res) {
    var un = req.user.username; // Get username from token (done in Express)

    var oldPassword = req.body.password;
    var newPassword = req.body.new_password;

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
                    res.json({username: un});
                }
            });
        }
        else {
            // failed authentication, reject
            res.send(401); // UnAuth
        }
    });

};


