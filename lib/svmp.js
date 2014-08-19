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
 * @author Dave Bryson
 */

/**
 * Main namespace object used through-out the app.
 *
 * @exports svmp
 */
var svmp = {};

module.exports = svmp;

/**
 * Current version used. Read from package.json
 * @type {String}
 */
svmp.VERSION = require('../package.json').version;

/**
 * Called at start of App.  Initializes the core modules
 */
svmp.init = function() {

    /**** Setup ****/

    // Winston and wrap in out global name space
    svmp.logger = require('./logger');
    svmp.logger.beforeConfig();


    // Config with validation
    var Config = require('./config').Configuration;
    svmp.config = new Config();

    svmp.logger.afterConfig();

    var cloud = svmp.config.get('settings:cloud_platform');
    if (cloud === "openstack") {
        svmp.cloud = require('./cloud/openstack');
    } else if (cloud === "aws") {
        svmp.cloud = require('./cloud/aws');
    }
    svmp.cloud.init();

    // Mongoose
    svmp.mongoose = require('mongoose');

    if(!svmp.mongoose.connection.db) {
        var dbname;

        if(process.env.NODE_ENV === 'production') {
            dbname = svmp.config.get('settings:db:production');
        } else {
            dbname = svmp.config.get('settings:db:test');
        }
        svmp.mongoose.connect(dbname);
        svmp.logger.info("Mongoose:  connected to: " + dbname);

        svmp.mongoose.connection.on('error',function (err) {
            svmp.logger.error("Problem connecting to mongdb. Is it running? " + err );
            process.exit(1);
        });
        svmp.mongoose.connection.on('disconnected', function () {
            svmp.logger.info("Mongoose:  disconnected connection");
        });

    }
    // Model
    svmp.User = require('svmp-user-model')(svmp.mongoose);
    svmp.Session = require('./sessions')(svmp.mongoose);
};

/**
 * Shut down. Closes DB connection and cleans up any temp config settings
 */
svmp.shutdown = function() {
    svmp.config.reset();

    if(svmp.mongoose.connection){
        svmp.mongoose.connection.close();
    }
}





