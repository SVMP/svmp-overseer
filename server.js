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
    express = require('express'),
    bodyParser = require('body-parser'),
    auth = require('./lib/authentication'),
    vmManager = require('./lib/cloud/vm-manager'),
    app = express();

// Bootup SVMP object
svmp.init();

// Run an interval to terminate expired VMs (those that have been idle for too long)
vmManager.startExpirationInterval();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded());

// Check Token for requests to /api/*
app.all('/api/*', auth.checkToken);

// Check Token for admin role to /services/*
app.all('/services/*', auth.checkAdminToken);

// Load routes
require('./app/routes/index')(app);

// Fall through: on Error, 500.  Otherwise 404
app.use(function (err, req, res, next) {
    // If the error object doesn't exists
    if (!err) return next();

    // Log it
    svmp.logger.error(err.stack);

    return res.json(500, {
        msg: "Oops, there was an error.  Please try again."
    });
});

// Assume 404 since no middleware responded
app.use(function (req, res) {
    res.json(404, {msg: 'Not Found'});
});

var port = svmp.config.get('settings:port');

if (svmp.config.isEnabled('settings:use_tls')) {
    var https = require('https');
    var fs = require('fs');

    var options = {
        key: fs.readFileSync(svmp.config.get('settings:tls_private_key')),
        cert: fs.readFileSync(svmp.config.get('settings:tls_certificate'))
    };

    var server = https.createServer(options, app);
    server.listen(port);

    svmp.logger.info('SVMP REST API running on port %d with SSL', port);

} else {

    app.listen(port);
    svmp.logger.info('SVMP REST API running on port %d', port);
}



