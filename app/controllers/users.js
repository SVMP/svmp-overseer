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
    svmp = require('../../lib/svmp');


/*exports.listUsers = function(req,res) {
    svmp.users.listUsers(function(err,results) {
        if(err) {
            res.json(404,{msg: 'Error'})
        } else {
            res.json(200,{users: results})
        }
    })
};*/

exports.changeUserPassword = function(req,res) {
    var un = req.username;
    var oldPassword = req.body.old_password;
    var newPassword = req.body.new_password;
    svmp.users.changeUserPassword(un,oldPassword,newPassword,function(err,result) {
        if(err) {
            res.json(404,{msg: 'Error'})
        } else {
            res.json(200,{users: result})
        }
    });
};


