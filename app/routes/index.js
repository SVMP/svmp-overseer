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

    var users = require('../controllers/users'),
        services = require('../controllers/services'),
        sessions = require('../controllers/sessions');


    /******  User Clients ******/

    app.route('/login')
        .post(users.login);

    // auth token required in header for access
    app.route('/api/user/changePasswd')
        .post(users.changeUserPassword);


    /****** Services ******/

    /** User **/
    app.route('/services/users')
        .get(services.listUsers);

    app.route('/services/user/:username')
        .get(services.getUser)
        .delete(services.deleteUser)
        .put(services.updateUser);

    app.route('/services/user')
        .post(services.addUser);

    /** Sessions **/
    app.route('/services/session/create')
        .post(sessions.createSession);

    app.route('/services/session/remove')
        .delete(sessions.clearSessions);

    app.route('/services/session/:username')
        .delete(sessions.clearSessionsForUser);

    app.route('/services/session/expired/:sid')
        .get(sessions.getExpired);

    app.route('/services/session/expired_vm_session')
        .get(sessions.getExpiredVmSessions);


    /** Cloud **/
    app.route('/services/cloud/setupVm/:username')
        .get(services.setUpVm);

};