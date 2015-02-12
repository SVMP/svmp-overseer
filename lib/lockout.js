/*
 * Copyright 2015 The MITRE Corporation, All Rights Reserved.
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
    svmp = require('./svmp'),
    toDate = require('to-date');

// used to lock out users who fail authentication too many times; contains key/value pairs
// key: username
// value: {lastAttempt, total}
var failedAttempts = {};

/**
 * @brief Checks to see if a user is currently "locked", e.g. they have failed to login 3 times within the past hour
 * Called in any authentication portions of the Overseer
 *
 * @param username
 * @returns error if the user is locked, or undefined if the user is not locked
 */
exports.checkForLock = function(username) {
    var error = undefined;

    // we allow up to three failed attempts per hour
    var attemptObj = failedAttempts[username];
    if (attemptObj && attemptObj.total >= 3) {
        // the user has failed to log in three times
        if (attemptObj.lastAttempt > toDate(1).hours.ago) {
            // the last failed attempt was sooner than one hour ago
            // reject this attempt (don't change lastAttempt though)
            var unlockDate = new Date(attemptObj.lastAttempt);
            unlockDate.setTime(unlockDate.getTime() + (60*60*1000)); // lastAttempt + 1 hour
            error = 'Too many failed login attempts for user "' + username + '", account is locked until ' + unlockDate;
            svmp.logger.error(error);
        } else {
            // the last failed attempt was over one hour ago
            // clear the attemptObj object
            failedAttempts[username] = attemptObj = undefined;
        }
    }
    return error;
};

/**
 * @brief Reports a failed login attempt, increments the total and updates the last attempt
 *
 * @param username
 */
exports.failedAttempt = function(username) {
    var attemptObj = failedAttempts[username];
    if (!attemptObj) {
        attemptObj = {total: 0};
    }
    attemptObj.lastAttempt = new Date();
    attemptObj.total++;
    failedAttempts[username] = attemptObj;
};