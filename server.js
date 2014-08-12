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
    app = express();

svmp.init();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded());

// Set global token check on all URLs prefixed with /api
app.all('/api/*',auth.checkToken);

app.all('/admin/*',auth.checkAdminToken);

// Load routes
require('./app/routes/index')(app);

// Fall through: on Error, 500.  Otherwise 404
app.use(function (err, req, res, next) {
    // If the error object doesn't exists
    if (!err) return next();

    // Log it
    console.error(err.stack);

    return res.json(500, {
        msg: "Oops, there was an error.  Please try again."
    });
});

// Assume 404 since no middleware responded
app.use(function (req, res) {
    res.json(404, {msg: 'Not Found'});
});

var port = svmp.config.get('settings:port');

app.listen(port);
svmp.logger.info('SVMP REST API running on port %d',port);


