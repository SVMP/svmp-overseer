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
    Q = require('q'),
    filtered_fields = '_id username email password_change_needed approved device_type volume_id vm_ip vm_ip_id vm_id roles';

// GET /services/cloud/setupVm/:username
exports.setUpVm = function (req, res) {
    var un = req.params.username;

    if(un) {
        Q.ninvoke(svmp.User, 'findOne', {username: un}, filtered_fields)
        .then(svmp.cloud.setUpUser)
        .then(function (userObj) {
            //userObj.vm_port = svmp.config.get('settings:vm_port');
            // for some reason, setting a property on userObj doesn't stick - make a new object instead
            var obj = {
                'vm_ip': userObj.vm_ip,
                'vm_port': svmp.config.get('settings:vm_port')
            };
            res.json(200, obj);
        }).catch(function (err) {
            res.send(500);
            svmp.logger.error("setup.onLogin failed:", err.message);
        }).done();
    }
};


exports.listUsers = function (req, res) {
    svmp.User.find({})
        .select(filtered_fields)
        .exec(function (err, users) {
            if (users) {
                res.json(200, {users: users});
            } else {
                callback(500); // Server Error
            }
        });
};

// GET /services/user/:username
exports.getUser = function (req, res) {
    var username = req.params.username;
    if (username) {
        svmp.User.findOne({username: username}, filtered_fields,
            function (err, user) {
                if (err) {
                    res.json(404, {msg: 'Error finding User'});
                } else {
                    res.json(200, {user: user});
                }
            });
    } else {
        res.json(400, {msg: 'Bad request'});
    }
};

// POST /services/user
exports.addUser = function (req, res) {
    var user = req.body.user;
    if (user && user.username && user.password && user.email && user.device_type) {
        new svmp.User({
            username: user.username,
            password: user.password,
            email: user.email,
            password_change_needed: true,
            device_type: user.device_type,
            volume_id: ''
        }).save(function (err) {
                if (err) {
                    res.json(500, {msg: "Error adding user"});
                } else {
                    res.send(200);
                }
            });
    } else {
        res.json(400, {msg: 'Missing required fields'});
    }
};

// DELETE /services/user/:username
exports.deleteUser = function (req, res) {
    var username = req.params.username;
    if (username) {
        svmp.User.findOne({username: username}, function (err, user) {
            if (err) {
                res.json(404, {msg: "User not found"});
            } else {
                user.remove();
                res.send(200);
            }
        });
    } else {
        res.json(400, {msg: 'Missing required fields'});
    }
};

exports.updateUser = function (req, res) {
    var username = req.params.username;
    var updates = req.body.update;

    if (username && updates) {
        svmp.User.update({username: username}, updates, function (err, numberAffected, raw) {
            if (err) {
                res.json(404, {msg: "User not found"});
            } else {
                if (numberAffected === 1) {
                    res.send(200);
                }
            }
        });
    } else {
        res.json(400, {msg: 'Missing required fields'});
    }

};