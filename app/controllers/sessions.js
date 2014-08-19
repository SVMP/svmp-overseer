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
 * author Dave Bryson
 *
 */

'use strict';

var
    svmp = require('../../lib/svmp'),
    crypto = require('crypto'),
    toDate = require('to-date'),
    UID_SIZE = 64; // Size of the session id

// POST /services/session/create
// body {username: ''}
// Response 200 {session: session, username: username}
// 400 missing username
// 500 other errors
exports.createSession  = function(req,res){
    var username = req.body.username,
        max_session = svmp.config.get('settings:max_session_length');
    try {
        var token = crypto.randomBytes(UID_SIZE).toString('hex');
        new svmp.Session({
            sid: token,
            username: username,
            expireAt: toDate(max_session).seconds.fromNow,
            lastAction: new Date(0) // This sets to 1969
        }).save(function (err, sess) {
                if (err) {
                    res.json(500, {msg:'Error creating the session' });
                } else {
                    // before we return the result, remove any orphaned sessions that may exist that are tied to this username
                    SessionModel.remove({ username: username, sid: { $ne: sess.sid }}, function (err, result) {
                        if (err) {
                            res.json(500, {msg:'Could not remove orphaned sessions: ' + err});
                        } else {
                            res.json(200,{session: sess, username: username } )
                        }
                    });
                }
            });

    } catch (err) {
        res.json(500, {msg:'Error creating the session' });
    }
};

// DELETE
exports.clearSessions = function(req,res) {
    svmp.Session.remove({}, function(err,r) {
        if(err) {
            res.json(500,{msg: 'Error removing sessions'});
        } else {
            res.send(200);
        }
    });
};

// DELETE/:username
exports.clearSessionsForUser = function(req,res) {
    var username = req.params.username;
    SessionModel.remove({username: username}, function (err) {
        if (err) {
            res.json(500,{msg: "clearSessionsForUser failed: " + err});
        } else {
            res.send(200);
        }
    });
};

// GET /services/sessions/expired
exports.getExpired = function(req,res) {

    var session_ttl = svmp.config.get('settings:session_token_ttl') * 1000;
    var sessionId = req.params.sid;
    SessionModel.findOne({sid: sessionId}, function (err, sess) {
        if (sess) {
            var expired = sess.expireAt < new Date();
            var timedOut = (new Date(sess.lastAction.getTime() + (session_ttl)) < new Date());

            if (!expired && !timedOut) {
                // set the session 'lastAction' to 0, signifies the connection is active
                sess.lastAction = new Date(0);
                // save the session and return it
                sess.save(function (err, updated) {
                    if (updated) {
                        res.json(200,{session: updated})
                    } else {
                        res.json(500,{msg: "Could not update session"});
                    }
                });
            }
            else {
                if (expired) {
                    res.json(500, {msg: "Session is expired for user " + sess.username});
                } else if (timedOut) {
                    res.json(500, {msg: "Session is timed out for user " + sess.username});
                }
            }
        }
        else {
            res.json(404, {msg: "Session not found"});
        }
    });
};

// GET /services/sessions/expired_vm_session
exports.getExpiredVmSessions = function(req,res) {
    var idle_ttl = svmp.config.get('settings:vm_idle_ttl');
    SessionModel.find({
            'lastAction': {
                $lt: toDate(idle_ttl).seconds.ago,
                $gt: new Date(0) // the lastAction has to be > 0, otherwise the session is active
            }},
        function (err, sessions) {
            if (err) {
                res.json(500,"getExpiredVmSessions failed: " + err);
            } else {
                res.json(200,{sessions: sessions});
            }
        }
    );
};


