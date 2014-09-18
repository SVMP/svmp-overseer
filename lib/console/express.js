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
    svmp = require('../svmp'),
    express = require('express'),
    bodyParser = require('body-parser'),
    methodOverride = require('method-override'),
    cookieParser = require('cookie-parser'),
    passport = require('passport'),
    session = require('express-session'),
    mongoStore = require('connect-mongo')({
        session: session
    }),
    config = require('./../config'),
    consolidate = require('consolidate'),
    path = require('path'),
    csrf = require('csurf');


module.exports = function () {
    var app = express();

    app.use(function (req, res, next) {
        res.locals.url = req.protocol + ':// ' + req.headers.host + req.url;
        next();
    });

    // Set swig as the template engine
    app.engine('server.view.html', consolidate['swig']);

    // Set views path and view engine
    app.set('view engine', 'server.view.html');
    app.set('views', './app/views');

    // Setup middleware
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded());
    app.use(methodOverride());

    // CookieParser should be above session
    app.use(cookieParser());

    // Express MongoDB session storage
    app.use(session({
        secret: svmp.config.get('session_secret'),
        cookie: { path: '/', httpOnly: true, secure: false, maxAge: new Date(Date.now() + 3600000) },
        resave: false,
        saveUninitialized: true,
        store: new mongoStore({
            db: svmp.mongoose.connection.db,
            collection: 'webconsole_sessions'
        })
    }));


    var morgan = require('morgan');
    morgan.token('remote-user', function(req, res){
        if( req.user && req.user.sub) {
            return req.user.sub;
        } else {
            return 'anonymous_token';
        }
    });
    morgan.token('message', function(req, res) {
        if (res.statusCode == 401) {
            return 'Authentication failed: ' + res.error;
        }
    });
    app.use(morgan(':remote-addr - :remote-user [:date] ":method :url" :status :message', { "stream": svmp.logger.stream }));
    // debug logger

    // use passport session
    app.use(passport.initialize());
    app.use(passport.session());


    app.use(express.static(path.resolve('./public')));

    // Load routes
    require('../../app/routes/log')(app);
    require('../../app/routes/api')(app);
    require('../../app/routes/console')(app);


    // Fall through: on Error, 500.  Otherwise 404
    /*app.use(function (err, req, res, next) {
        // If the error object doesn't exists
        if (!err) return next();
        // Log it
        svmp.logger.error(err.stack);

        return res.json(500, {
            msg: "Oops, there was an error.  Please try again."
        });
    });*/

   // Assume 404 since no middleware responded
    app.use(function (req, res) {
        res.json(404, {msg: 'Not Found'});
    });

    require('./passport')();

    return app;
};