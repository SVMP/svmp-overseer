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
 * author Joe Portner
 *
 */

'use strict'

var express = require('express');

module.exports = function (app) {
    // compresses static content with gzip
//    app.use(express.compress());

    // This adds two page routes:
    //   GET /webclient-login
    //   GET /webclient-video
    // This also adds the "/static" directory and all of its content
    app.use(express.static(__dirname + '/../webclient'));
}