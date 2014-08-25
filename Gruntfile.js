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


module.exports = function (grunt) {

    // Project Configuration
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        mochaTest: {
            src: ['test/**/*.js'],
            options: {
                reporter: 'spec',
                require: 'server.js'
            }
        }
    });

    // Load NPM tasks
    require('load-grunt-tasks')(grunt);

    // Making grunt default to force in order not to break the project.
    grunt.option('force', true);

    // Run like: > grunt create-server-token:dave
    grunt.registerTask('create-service-token', 'Make Token', function (username) {
        var
            fs = require('fs'),
            config = require('./config/config-local'),
            jwt = require('jsonwebtoken');
        var privKey = fs.readFileSync(config.settings.tls_private_key);

        console.log("Create token for: ", username);
        var token = jwt.sign({username: username, expires: '', role: 'admin'}, privKey);
        console.log(token);
    });

    // Default task(s).
    grunt.registerTask('default', ['mochaTest']);
};
