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
    svmp = require('../lib/svmp');

/** Wrapper for all tests */

beforeEach(function(done){


    svmp.User.remove({}, function (err) {

        new svmp.User({
            username: 'dave',
            password: 'dave12345678',
            email: 'dave@here.com',
            password_change_needed: false,
            device_type: 'a_device',
            volume_id: ''
        }).save(function(){
                new svmp.User({
                    username: 'bob',
                    password: 'bob12345678',
                    email: 'bob@here.com',
                    password_change_needed: true,
                    device_type: 'a_device',
                    volume_id: ''
                }).save(function(){
                done();
            })
        });


        // Add 2 users for testing...
        /*svmp.users.addUserToDb(goodUser, function() {
            svmp.users.addUserToDb(passwordChangeNeededUser, function() {
                done();
            });
        });*/

    });

});

before(function (done) {
    svmp.VMSession.remove({}, function (err) {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
        done();
    });
});

after(function (done) {
    svmp.shutdown();
    done();
});