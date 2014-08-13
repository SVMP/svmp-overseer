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
    svmp = require('../../lib/svmp');

exports.setUpVm = function(req,res) {

};


exports.listUsers = function(req,res) {
    svmp.users.listUsers(function(errCode,users) {
        if(errCode) {
            res.json(errCode,{msg: "Encountered an error listing users"});
        } else {
            res.json(200,{users: users});
        }
    })
};

exports.getUser = function(req,res) {
    var username = req.params.username;
    if(username) {
        svmp.users.getUserWithFilteredData(username,function(err,user){
            if(err) {
                res.json(500,{msg: 'Error finding User'});
            } else {
                res.json(200,{user: user});
            }
        });
    } else {
        res.json(400,{msg: 'Bad request'});
    }
};