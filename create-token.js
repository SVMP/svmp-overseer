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
*/

'use strict'

var
    program = require('commander'),
    svmp = require('./lib/svmp'),
    shell = require('shelljs'),
    ms = require('ms'),
    toDate = require('to-date'),
    uuid = require('node-uuid'),
    jwt = require('jsonwebtoken');

program.version(require('./package.json').version)
       .usage('[options] <username>')
       .option('-a --admin', 'Create a token with the admin role')
       .option('-e --expires <n>', 'Token validity time. Ex: 1d, 3h, 30m, 60s, etc.');

program.parse(process.argv);

if (process.argv.length <= 2) {
    program.help();
}

if (program.args.length != 1) {
    program.help();
}
var username = program.args[0];

svmp.init();
var pass = svmp.config.get('private_key_pass');
var file = svmp.config.get('private_key');
process.env.passphrase = pass;
var command = 'openssl rsa -in ' + file + ' -passin env:passphrase';
var privKey = shell.exec(command, {silent: true}).output;
delete process.env.passphrase;

var options = {
    sub: username,
    jti: uuid.v4(),
    iss: require('os').hostname()
};
if (program.admin) options.role = 'admin';
if (program.expires) options.exp = Math.floor((Date.now() + ms(program.expires)) / 1000);
//if (program.expires) options.exp = Math.floor(toDate(ms(program.expires) / 1000).seconds.fromNow / 1000);

console.log("Creating token: ", JSON.stringify(options));
var token = jwt.sign(options, privKey, {algorithm: svmp.config.get('jwt_signing_alg')});
console.log(token);

process.exit();
