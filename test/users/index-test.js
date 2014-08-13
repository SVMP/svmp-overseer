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
    assert = require('assert'),
    app = require('supertest')('http://localhost:3000'),
    tokenHelper = require('../../lib/authentication').makeToken,
    user_token = tokenHelper({username: 'dave', role: 'user'});

describe("Client Users", function () {

    /**
     * Test login
     */
    describe("Authentication/Login", function () {
        it('should login user and return token in body', function (done) {
            app.post('/login')
                .send({username: 'dave', password: 'dave12345678'})
                .expect(function (res) {
                    assert.ok(res.body.authtoken);
                    assert.ok(res.body.webrtc);
                })
                .expect(200, done);
        });

        it('should fail if missing a required field (400)', function (done) {
            app.post('/login')
                .send({username: 'dave'})
                .expect(400, done)
        });

        it('should fail on bad username or password (401)', function (done) {
            app.post('/login')
                .send({username: 'bob', password: 'bad'})
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
     * Uses token for authenticating
     */
    describe("Password change", function () {
        it('should change users password', function (done) {

            app.post('/api/user/changePasswd')
                .set('svmp-authtoken', user_token)
                .send({
                    old_password: 'dave12345678',
                    new_password: 'dave22222222'
                })
                .expect(function (res) {
                    assert.equal(res.statusCode, 200);
                })
                .end(done);
        });

        it('should fail on password change with bad old_password', function (done) {

            // Now check they can access stuff with token
            app.post('/api/user/changePasswd')
                .set('svmp-authtoken', user_token)
                .send({
                    old_password: 'dave11111111',
                    new_password: 'dave33333333'
                })
                .expect(function (res) {
                    assert.equal(res.statusCode, 401);
                })
                .end(done);

        });

    });
});
