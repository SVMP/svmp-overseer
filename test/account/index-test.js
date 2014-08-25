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
 * author Dave Bryson, Joe Portner
 *
 */

'use strict';

var
    svmp = require('../../lib/svmp'),
    assert = require('assert'),
    app = require('supertest')(svmp.config.get('settings:use_tls') ? 'https://localhost:3000' : 'http://localhost:3000'),
    tokenHelper = require('../../lib/authentication').makeToken,
    user_token = tokenHelper({username: 'dave', role: 'user'});

describe("Client Account", function () {

    /**
     * Test login
     */
    describe("Authentication/Login", function () {
        it('should login user with password and return token in body', function (done) {
            app.post('/login')
                .send({username: 'dave', password: 'dave12345678'})
                .expect(function (res) {
                    assert.ok(res.body.sessionInfo.token);
                    assert.ok(res.body.webrtc);
                })
                .expect(200, done);
        });

        it('should login user with token and return token in body', function (done) {
            app.post('/login')
                .send({username: 'dave', sessionToken: user_token})
                .expect(function (res) {
                    assert.ok(res.body.sessionInfo.token);
                    assert.ok(res.body.webrtc);
                })
                .expect(200, done);
        });

        it('should fail if missing a required field (400)', function (done) {
            app.post('/login')
                .send({username: 'dave'})
                .expect(400, done)
        });

        it('should fail on bad username/password combination (401)', function (done) {
            app.post('/login')
                .send({username: 'bob', password: 'bad'})
                .expect(401, done);
        });

        it('should fail on unknown username (401)', function (done) {
            app.post('/login')
                .send({username: 'joe', password: 'joe'})
                .expect(401, done);
        });

        it('should send 403 on password_needs_changed = true', function (done) {
            app.post('/login')
                .send({username: 'bob', password: 'bob12345678'})
                .expect(403, done);
        });
    });

    /**
     * Test changing password
     */
    describe("Password change", function () {
        it('should change users password, then login with new password', function (done) {
            app.post('/changePassword')
                .send({
                    username: 'dave',
                    password: 'dave12345678',
                    newPassword: 'dave22222222'
                })
                .expect(200, function() {
                    // at this point, we have changed the password; see if we can log in now
                    app.post('/login')
                        .send({username: 'dave', password: 'dave22222222'})
                        .expect(200, done);
                });
        });

        it('should fail on password change with bad current password', function (done) {
            app.post('/changePassword')
                .send({
                    username: 'dave',
                    password: 'dave11111111',
                    newPassword: 'dave33333333'
                })
                .expect(401, done);
        });

        it('should fail on password change with invalid new password', function (done) {
            app.post('/changePassword')
                .send({
                    username: 'dave',
                    password: 'dave12345678',
                    newPassword: '2short'
                })
                .expect(400, done);
        });

    });
});
