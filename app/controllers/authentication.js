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
    toDate = require('to-date');


exports.login = function(req,res) {
    // use loaded strategy for authentication
    strategy(req,function(err,result) {
        if(err) {
            res.json(err,{msg: 'Error authenticating'});
        } else {
            var token = auth.makeToken(result);
            var max_session = svmp.config.get('settings:max_session_length');

            var responseObj = {
                authtoken: token,
                expiresAt: toDate(max_session).seconds.fromNow,
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