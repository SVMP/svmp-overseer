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
        svmp.User.findUserWithPromise({username: un})
            .then(function (userObj) {
                // before we proceed, validate some user properties first
                if (svmp.config.get('new_vm_defaults:images')[userObj.device_type] === undefined)
                    throw new Error("User '" + userObj.username + "' has an unknown device type '" + userObj.device_type + "'");
                else if (userObj.volume_id === '')
                    throw new Error("User '" + userObj.username + "' does not have a Volume ID");
                return userObj;
            }).then(svmp.cloud.setUpUser)
            .then(function (userObj) {
                //userObj.vm_port = svmp.config.get('vm_port');
                // for some reason, setting a property on userObj doesn't stick - make a new object instead
                var obj = {
                    'vm_ip': userObj.vm_ip,
                    'vm_port': svmp.config.get('vm_port')
                };
                res.json(200, obj);
            }).catch(function (err) {
                svmp.logger.error("setUpVm failed:", err);
                res.send(500);
            }).done();
    }
};


// GET /services/cloud/images (TESTED)
exports.listImages = function (req, res) {
    var result = {flavors: [], images: []};

    svmp.cloud.getFlavors(function (err, allflavors) {

        if (err) {
            svmp.logger.error("listImages failed to get flavors:", err);
            res.json(500, {msg: "Error listing Cloud Flavors"});
        } else {
            for (var i = 0; i < allflavors.length; i++) {
                var o = allflavors[i];
                result.flavors.push([ o._id , o.name]);
            }
            svmp.cloud.getImages(function (err, r) {

                if (err) {
                    svmp.logger.error("listImages failed to get images:", err);
                    res.json(500, {msg: "Error listing Cloud Images"});
                } else {
                    for (i = 0; i < r.length; i++) {
                        var o = r[i];
                        result.images.push([o._id, o.name]);
                    }

                    res.json(200, result);
                }
            });
        }
    });
};

/**
 * GET /services/cloud/devices (TESTED)
 * Returns and object of the device types: {note2:"1234,....}
 * @param req
 * @param res
 */
exports.listDevices = function (req,res) {
    var obj = svmp.config.get("new_vm_defaults:images");
    res.json(200,obj);
};

// GET /services/cloud/volumes   (TESTED)
exports.listVolumes = function (req, res) {
    var results = [];
    svmp.cloud.getVolumes(function (err, r) {
        if (err) {
            svmp.logger.error("listVolumes failed:", err);
            res.json(500, {msg: "Problem listing volumes"});
        } else {
            //console.log(r);
            for (var i = 0; i < r.length; i++) {
                var name = r[i].name || 'unk';
                results.push([ name, r[i].status, r[i].id]);
            }
            res.json(200, {volumes: results});
        }
    });
};

/**
 * Creates a volume for a user.
 * POST /services/cloud/volume/create (TESTED)
 * Request: body: {username: 'some username'}
 *
 */
exports.createVolume = function (req, res) {
    var jsonObj = req.body;
    svmp.User.findUserWithPromise(jsonObj)
        .then(svmp.cloud.createVolumeForUser)
        .then(function(userObj) {
            var u = userObj.user;
            svmp.User.update({username: u.username}, {volume_id: u.volume_id}, function (err, numberAffected, raw) {
                if (err) {
                    svmp.logger.error("createVolume failed to find user:", err);
                    res.json(404, {msg: "User not found"});
                } else {
                    if (numberAffected === 1) {
                        res.send(200);
                    }
                }
            })
        })
        .catch(function (err){
            svmp.logger.error("createVolume failed:", err);
            res.json(500, {msg: "Problem creating Volume for user"});
        }).done();
};

/**
 * Assign a volume to a user.  Assumes the volume and user already exist
 * POST /services/cloud/assignvolume (TESTED)
 * Request: body: {username: 'some username', volid: 'volid' }
 *
 */
exports.assignVolume = function (req, res) {
    var requestObj = req.body;
    if( requestObj.username && requestObj.volid) {
        svmp.User.findUserWithPromise({username: requestObj.username})
            .then(function (user) {
                user.volume_id = requestObj.volid;
                return svmp.User.updateUserWithPromise(user);
            })
            .then(function (u) {
                res.send(200);
            }).catch(function (err) {
                svmp.logger.error("assignVolume failed:", err);
                res.json(500,{msg: "Error assigning volume"});
            }).done();

    } else {
        res.json(400, {msg: 'Missing required fields'});
    }
};
