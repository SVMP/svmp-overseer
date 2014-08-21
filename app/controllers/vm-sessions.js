/*
 * Copyright 2013-2014 The MITRE Corporation, All Rights Reserved.
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
 * author Dave Bryson, Joe Portner
 *
 */

'use strict';

var
    svmp = require('../../lib/svmp'),
    toDate = require('to-date');

// CREATE
// POST /services/vm-session
// body {username: '', token: ''}
// Response 200 {msg: msg}
// 400 missing parameter(s)
// 500 other errors
exports.createSession  = function(req,res){
    if (!req.body.sid || !req.body.username || !req.body.expireAt) {
        res.json(400, {msg: 'Missing parameter(s)'});
        return;
    }

    var args = {
        'sid': req.body.sid,
        'username': req.body.username,
        'expireAt': req.body.exp,
        'lastAction': new Date(0) // This sets to 1969
    };

    try {
        new svmp.VMSession(args).save(function (err, sess) {
                if (err) {
                    res.json(500, {msg:'Error creating the session' });
                } else {
                    var query = {'username': sess.username, 'sid': {'$ne': sess.sid}};
                    // before we return the result, remove any orphaned sessions that may exist that are tied to this username
                    svmp.VMSession.remove(query, function (err, result) {
                        if (err) {
                            res.json(500, {msg:'Could not remove orphaned sessions: ' + err});
                        } else {
                            res.json(200, {msg:'Created session successfully'});
                        }
                    });
                }
            });

    } catch (err) {
        res.json(500, {msg:'Error creating the session' });
    }
};

// UPDATE
// PUT /services/vm-session
// body {sid: '', lastAction: ''}
// Response 200 {msg: msg}
// 400 missing parameter(s)
// 500 other errors
exports.updateSession = function (req, res) {
    if (!req.body.sid || !req.body.lastAction) {
        res.json(400, {msg: 'Missing parameter(s)'});
        return;
    }

    var query = {'sid': req.body.sid};
    var update = {'lastAction': req.body.lastAction};

    try {
        svmp.VMSession.update(query, update, function (err) {
            if (err) {
                res.json(500, {msg:'Error updating the session'});
            } else {
                res.json(200, {msg:'Updated session successfully'});
            }
        });
    } catch (err) {
        res.json(500, {msg:'Error updating the session'});
    }
};
