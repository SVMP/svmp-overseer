#!/usr/bin/env node

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
    svmp = require('./lib/svmp'),
    config = require('./lib/config'),
    path = require('path'),
    vmManager = require('./lib/cloud/vm-manager');

// Bootup SVMP object
svmp.init();

var app = require('./lib/console/express')();

// Run an interval to terminate expired VMs (those that have been idle for too long)
vmManager.startExpirationInterval();

var port = svmp.config.get('port');

if (svmp.config.isEnabled('enable_ssl')) {
    var https = require('https');
    var fs = require('fs');

    var options = svmp.config.get('tls_options');

    var server = https.createServer(options, app);
    server.listen(port);

    svmp.logger.info('SVMP REST API running on port %d with SSL', port);
} else {
    app.listen(port);
    svmp.logger.info('SVMP REST API running on port %d', port);
}
