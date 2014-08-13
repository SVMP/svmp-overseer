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
 *
 */

var
    svmp = require('../svmp'),
    Model = require('svmp-user-model')(svmp.mongoose),
    Q = require('q'),
    filtered_fields = '_id username email password_change_needed approved device_type volume_id vm_ip vm_ip_id vm_id roles';

/**
 * List all Users filtering out sensitve fields
 * @param {Function} {function (err, result)}
 */
exports.listUsers = function (callback) {
    Model.find({})
        .select(filtered_fields)
        .exec(function (err, users) {
            if (users) {
                callback(undefined, users);
            } else {
                callback(500); // Server Error
            }
        });
};

/**
 * Return a User with sensitive fields such as password, etc... removed
 * @param username
 * @param callback
 */
exports.getUserWithFilteredData = function (username, callback) {
    Model.findOne({username: username},filtered_fields,callback);
};

// Used for Authentication No Promise returned
exports.findByUsername = function (username, callback) {
    Model.findOne({username: username}, callback);
};
// Used for Authentication
exports.findByEmail = function (email, callback) {
    Model.findOne({email: email}, callback);
};

/**
 * Find a User by username: Mainly used by CLI and cloud 'stuff
 * Returns a promise
 *
 * @param {Object} in the form {username: value}
 * @returns {Promise}
 */
exports.findUser = function (obj) {
    var deferred = Q.defer();
    Model.findOne({username: obj.username}, function (err, user) {
        if (err) {
            deferred.reject(new Error("User '" + obj.username + "' not found"));
        } else {
            deferred.resolve(user);
        }
    });
    return deferred.promise;
};

/**
 * Update a user
 * @param {Object} user
 * @returns {Promise}
 */
exports.updateUser = function (user) {
    var deferred = Q.defer();
    user.save(function (err, updateduser) {
            if (updateduser) {
                deferred.resolve(updateduser);
            } else {
                deferred.reject(new Error('Failed updating user: ' + user.username));
            }
        }
    );
    return deferred.promise;
};


/**
 * Delete all users (not exposed to the API)
 *
 * @param callback {function (err, result)}
 */
exports.clearUsers = function (callback) {
    Model.remove({}, callback);
};


/**
 * Used by Authenticate to process a change password request.
 */
exports.changeUserPassword = function (un, oldPw, newPw, callback) {

    Model.findOne({username: un}, function (err, user) {
        if (err) {
            callback(400); // Bad Request
        }
        else if (user && user.authenticate(oldPw)) {

            user.password = newPw;
            user.password_change_needed = false;

            user.save(function (err1, r) {
                if (err1) {
                    // user model validation failed
                    callback(400);
                } else {
                    callback(undefined, {username: un});
                }
            });
        }
        else {
            // failed authentication, reject
            callback(401); // UnAuth
        }
    });
};



/**
 * Create a new User
 * @param username
 * @param password
 * @param email
 * @param device_type
 * @param callback {function (err, result)}
 */
exports.createUser = function (username, password, email, device_type, callback) {
    // note: vm_ip and vm_id MUST be empty for the "setupuser" module to create a new VM when this user logs in
    var user = new Model({
        username: username,
        password: password,
        email: email,
        password_change_needed: true,
        device_type: device_type,
        volume_id: ''
    });
    user.save(callback);
};

exports.addUserToDb = function (user_obj, callback) {
    var user = new Model(user_obj);
    user.save(callback);
};

exports.createAdminUser = function (username, password, email, device_type, callback) {
    // note: vm_ip and vm_id MUST be empty for the "setupuser" module to create a new VM when this user logs in
    var user = new Model({
        username: username,
        password: password,
        email: email,
        password_change_needed: true,
        device_type: device_type,
        volume_id: '',
        roles: ['admin']
    });
    user.save(callback);
};


/*
 * Removes a user's vm information
 * @param {obj} the user object
 * @returns {Promise} with an object {vm_id: value, vm_ip: value}
 */
exports.removeUserVM = function (user) {
    var deferred = Q.defer();

    if (!user.vm_id || user.vm_id.length == 0)
        deferred.reject(new Error("removeUserVM failed, user '" + user.username + "' has no vm_id defined (was this user's vm_ip manually assigned?)"));
    else {
        var obj = {vm_id: user.vm_id, vm_ip: user.vm_ip, vm_ip_id: user.vm_ip_id};
        user.vm_id = "";
        user.vm_ip = "";
        user.vm_ip_id = "";
        user.save(function (err, user, numberAffected) {
            if (err)
                deferred.reject(new Error("removeUserVM failed, couldn't save user: " + err));
            else
                deferred.resolve(obj);
        })
    }

    return deferred.promise;
};
