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
    app = require('supertest')(svmp.config.get('enable_ssl') ? 'https://localhost:3000' : 'http://localhost:3000'),
    tokenHelper = require('../../lib/authentication').makeToken,
    user_token = tokenHelper({username: 'dave', role: 'user'}),
    admin_token = tokenHelper({username: 'bob', role: 'admin'});

describe("Services", function () {

    describe("Authentication check", function() {
        it('should allow access with token and role of admin', function(done) {
            app.get('/services/users')
                .set('svmp-authtoken',admin_token)
                .expect(200,done);
        });

        it('should should NOT allow access without admin role', function(done) {
            app.get('/services/users')
                .set('svmp-authtoken',user_token)
                .expect(401,done);
        });
    });

    describe("Users CRUD", function(){
        it('should list Users', function(done) {
            app.get('/services/users')
                .set('svmp-authtoken',admin_token)
                .expect(function(res) {
                    assert.strictEqual(res.statusCode,200);
                    assert.ok(res.body.users);
                    assert.strictEqual(res.body.users.length,2);
                }).end(done);
        });

        it('should get a User by username', function(done) {
            app.get('/services/user/bob')
                .set('svmp-authtoken',admin_token)
                .expect(function(res) {
                    assert.strictEqual(res.statusCode,200);
                    assert.ok(res.body.user);
                    assert.strictEqual(res.body.user.username,'bob');
                    assert.strictEqual(res.body.user.email,'bob@here.com');
                }).end(done);
        });

        it('should add a user', function(done) {
            app.post('/services/user')
                .set('svmp-authtoken',admin_token)
                .send({user: {username: 'carl', password: 'carl12345678', email: 'carl@here.com', device_type: 'abc'}})
                .expect(function(res) {
                    app.get('/services/users')
                        .set('svmp-authtoken',admin_token)
                        .expect(function(res) {
                            assert.strictEqual(res.statusCode,200);
                            assert.ok(res.body.users);
                            assert.strictEqual(res.body.users.length,3);
                        });
                }).end(done);

        });

        it('should fail to add a user when missing fields', function(done) {
            app.post('/services/user')
                .set('svmp-authtoken',admin_token)
                .send({user: {username: 'carl', password: 'carl12345678',device_type: 'abc'}})
                .expect(400,done);

        });

        it('should delete a User', function(done){
            app.delete('/services/user/bob')
                .set('svmp-authtoken',admin_token)
                .expect(function(res) {
                    assert.equal(res.statusCode, 200);
                    app.get('/services/users')
                        .set('svmp-authtoken',admin_token)
                        .expect(function(res) {
                            assert.strictEqual(res.statusCode,200);
                            assert.ok(res.body.users);
                            assert.strictEqual(res.body.users.length,1);
                        });
                }).end(done);

        });

        it('should update a User', function(done){
            app.put('/services/user/bob')
                .set('svmp-authtoken',admin_token)
                .send({update: {email: 'bob1@there.com'}})
                .expect(function(res) {
                    assert.equal(res.statusCode, 200);
                    app.get('/services/user/bob')
                        .set('svmp-authtoken',admin_token)
                        .expect(function(res) {
                            assert.strictEqual(res.statusCode,200);
                            assert.strictEqual(res.body.user.email,'bob1@there.com');
                        });
                }).end(done);

        });
    });

    describe("VM Session Management", function(){
        it('should fail to add a new VM session when missing fields', function(done) {
            app.post('/services/vm-session')
                .set('svmp-authtoken',admin_token)
                .send({username: 'dave'})
                .expect(400, done);
        });

        it('should add a new VM session with correct fields', function(done) {
            app.post('/services/vm-session')
                .set('svmp-authtoken',admin_token)
                .send({username: 'dave', expireAt: require('to-date')(6).hours.fromNow})
                .expect(200, done);
        });

        it('should fail to update a new VM session when missing fields', function(done) {
            app.put('/services/vm-session')
                .set('svmp-authtoken',admin_token)
                .send({username: 'dave'})
                .expect(400, done);
        });

        it('should update a new VM session with correct fields', function(done) {
            app.put('/services/vm-session')
                .set('svmp-authtoken',admin_token)
                .send({username: 'dave', lastAction: new Date()})
                .expect(200, done);
        });

    });

});
