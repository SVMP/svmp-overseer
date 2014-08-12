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

module.exports = function (app) {

    var auth = require('../../app/controllers/authentication');
    var users = require('../../app/controllers/users');
    var admin = require('../../app/controllers/admin');

    // authentication
    app.route('/login')
        .post(auth.login);

    app.route('/api/user/passwd')
        .post(users.changeUserPassword);


    // For testing right now
    app.route('/admin/test').get(admin.testAdmin);


    // Users
    //app.route('/api/users')
    //    .get(users.listUsers);

    //app.route('/api/user/vm')
    //    .get(users.setUpVm);



};