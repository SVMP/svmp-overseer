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
 * author Joe Portner
 *
 */

'use strict';

var
    svmp = require('../../lib/svmp'),
    Q = require('q'),
    toDate = require('to-date');

/**
 * Runs an interval to terminate expired VMs (those that have been idle for too long)
 * This ensures that resources are freed up when users aren't using their VMs
 */
exports.startExpirationInterval = function () {
    setInterval(
        function () {
            // Get an array of all sessions whose VMs are expired
            getExpiredVmSessions()
                .then(function (obj) {
                    svmp.logger.debug("getExpiredVmSessions returned %d result(s)", obj.length);
                    // loop through each session in the collection:
                    for (var i = 0; i < obj.length; i++) {
                        // record the session information
                        var sess = obj[i],
                            query = {'username': sess.username};

                        // remove the session
                        sess.removeQ()
                            .then(function (result) {
                                svmp.logger.verbose("Removed VM session for '%s'", result.username)
                            }).catch(function (err) {
                                svmp.logger.error("Couldn't remove VM session:", err.message);
                            }).done();

                        // obtain and remove the user's VM information, then destroy the VM
                        svmp.User.findOneQ(query)
                            .then(removeUserVM)
                            .then(svmp.cloud.destroyVM)
                            .catch(function (err) {
                                svmp.logger.error("Failed to destroy expired VM:", err.message);
                            }).done();
                    }
                }).catch(function (err) {
                    svmp.logger.error("Failed to process expired VMs:", err.message);
                }).done();
        },
            svmp.config.get('vm_check_interval') * 1000
    );
};

// private function, returns a promise
function getExpiredVmSessions(req, res) {
    var query = {
        'lastAction': {
            '$lt': toDate(svmp.config.get('vm_idle_ttl')).seconds.ago,
            '$gt': new Date(0) // the lastAction has to be > 0, otherwise the session is active
        }};

    return svmp.VMSession.findQ(query);
    // omit rejection handler, send result or error to output promise
};

// private function, returns a promise
function removeUserVM(user) {
    if (!user.vm_id || user.vm_id.length == 0) {
        return Q.reject(new Error("removeUserVM failed, user '" + user.username
            + "' has no vm_id defined (was this user's vm_ip manually assigned?)"));
    }

    var obj = {
        'vm_id': user.vm_id,
        'vm_ip': user.vm_ip,
        'vm_ip_id': user.vm_ip_id
    };

    // clear the user's VM info and save it
    user.vm_id = user.vm_ip = user.vm_ip_id = "";
    return user.saveQ()
        .then(function (result) {
            // after we finish saving, return an object with the info that's been removed
            return obj;
        });
    // omit rejection handler, send result or error to output promise
};
