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
    Q = require('q');


// GET /services/cloud/devices
exports.listDevices = function (req, res) {
    var images = svmp.config.get('new_vm_defaults:images');
    res.json(200, {devices: images});
};

// GET /services/cloud/images
exports.listImages = function (req, res) {
    var result = {flavors: [], images: []};

    svmp.cloud.getFlavors(function (err, allflavors) {

        if (err) {
            res.json(500, {msg: "Error listing Cloud Flavors"});
        } else {
            for (i = 0; i < allflavors.length; i++) {
                var o = allflavors[i];
                result.flavors.push([ o._id , o.name]);
            }
            svmp.cloud.getImages(function (err, r) {

                if (err) {
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
 * GET /services/cloud/devices
 * Returns and object of the device types: {note2:"1234,....}
 * @param req
 * @param res
 */
exports.getDevices = function (req,res) {
    var obj = svmp.config.get("new_vm_defaults:images");
    res.json(200,obj);
};

// GET /services/cloud/volumes
exports.listVolumes = function (req, res) {
    var results = [];
    svmp.cloud.getVolumes(function (err, r) {
        if (err) {
            res.json(500, {msg: "Problem listing volumes"});
        } else {
            for (var i = 0; i < r.length; i++) {
                var name = r[i].name || 'unk';
                results.push([ name, r[i].status, r[i].id]);
            }
            res.json(200, {volumes: result});
        }
    });
};

// POST /services/cloud/volume/create
exports.createVolume = function (req, res) {
    var un = req.body;
    Q.ninvoke(svmp.User, 'findOne', {username: un})
        .then(svmp.cloud.createVolumeForUser)
        .then(function(userObj) {
            var u = userObj.user;
            svmp.User.update({username: u.username}, u, function (err, numberAffected, raw) {
                if (err) {
                    res.json(404, {msg: "User not found"});
                } else {
                    if (numberAffected === 1) {
                        res.send(200);
                    }
                }
            })
        })
        .catch(function (err){
            res.json(404, {msg: "Problem creating Volume for user"});
        }).done();
};

/**
 * Assign a volume to a user.  Assumes the volume and user already exist
 * POST /services/cloud/assignvolume
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
            })
            .catch(function (err) {
                console.log("ERROR: ", err);
                res.json(500,{msg: "Error assigning volume"});
            });

    } else {
        res.json(400, {msg: 'Missing required fields'});
    }
};
