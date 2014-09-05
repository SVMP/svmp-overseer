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

    var account = require('../controllers/account'),
        services = require('../controllers/services'),
        vmSessions = require('../controllers/vm-sessions'),
        cloud = require('../controllers/cloud');


    /******  User Account ******/

    app.route('/login')
        .post(account.login);

    // auth token required in header for access
    app.route('/changePassword')
        .post(account.changeUserPassword);


    /****** Admin Services ******/
   /** Any url prefixed with /services/* requires admin privs **/


    /** Users **/
    app.route('/services/users')
        .get(services.listUsers);

    app.route('/services/user/:username')
        .get(services.getUser)
        .delete(services.deleteUser)
        .put(services.updateUser);

    app.route('/services/user')
        .post(services.addUser);

    /** VM Sessions **/
    app.route('/services/vm-session')
        .post(vmSessions.createSession)
        .put(vmSessions.updateSession);
        // no need to read or delete from proxy


    /** Cloud **/
    app.route('/services/cloud/setupVm/:username')
        .get(services.setUpVm);

    app.route('/services/cloud/devices')
        .get(cloud.listDevices);

    app.route('/services/cloud/assignvolume')
        .post(cloud.assignVolume);

    app.route('/services/cloud/volumes')
        .get(cloud.listVolumes);

    app.route('/services/cloud/volume/create')
        .post(cloud.createVolume);

    app.route('/services/cloud/images')
        .get(cloud.listImages);

};