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
    crypto = require('crypto'),
    Q = require('q'),
    filtered_fields = '_id username email password_change_needed approved device_type volume_id vm_ip vm_ip_id vm_id roles';

module.exports = ProxyModel;

/**
 *  Define the ProxyUser functionality and Schema.
 *
 */
function ProxyModel(mongoose) {

    var Schema = mongoose.Schema;
    // Validation helpers

    var validateNotEmpty = function (property) {
        return property && property.length > 0;
    };

    var validatePassword = function (pwd) {
        return pwd && pwd.length >= 8;
    };

    // Schema definition
    var ProxyUserSchema = new Schema({
        // Username. Must be unique
        username: {
            type: String,
            unique: true,
            index: true,
            required: true
        },
        // Password at least 8 characters
        password: {
            type: String,
            default: '',
            validate: [validatePassword, 'Password should be at least 8 characters']
        },
        // Optional, true if user needs to reset password
        password_change_needed: {
            type: Boolean,
            default: false
        },
        // Salt used by password
        salt: {
            type: String
        },
        // User's email
        email: {
            type: String,
            trim: true,
            unique: true,
            default: '',
            validate: [validateNotEmpty, 'Please enter your email address'],
            match: [/.+\@.+\..+/, 'Please enter a valid email address']
        },
        // User's role
        roles: {
            type: [
                {
                    type: String,
                    enum: ['user', 'admin']
                }
            ],
            default: ['user']
        },
        // VM assigned to User
        vm_id: {
            type: String,
            default: ''
        },
        // IP of the VM
        vm_ip: {
            type: String,
            default: ''
        },
        // ID of the floating IP address (optional)
        vm_ip_id: {
            type: String,
            default: ''
        },
        // Volume ID
        volume_id: {
            type: String,
            default: ''
        },
        // User's device type
        device_type: {
            type: String,
            default: ''
        },
        // Account approved for use?
        approved: {
            type: Boolean,
            default: false
        },
        // When account created
        created: {
            type: Date,
            default: Date.now
        }
    });

    /**
     * Create hash of password
     * @param password
     * @returns {String}
     */
    ProxyUserSchema.methods.hashPassword = function (password) {
        var that = this;
        if (that.salt && password) {
            return crypto.pbkdf2Sync(password, that.salt, 10000, 64).toString('base64');
        } else {
            return password;
        }
    };

    /**
     * Save hook. Hash password on save IF password was changed
     */
    ProxyUserSchema.pre('save', function (next) {
        var that = this;

        if (that.isModified('password')) {
            // validated by validatePassword function
            that.salt = new Buffer(crypto.randomBytes(16).toString('base64'), 'base64');
            that.password = that.hashPassword(that.password);
        }
        next();
    });

    /**
     * Get the User's role
     * @returns {String} the role
     */
    ProxyUserSchema.methods.getRole = function () {
        return this.roles[0];
    };

    /**
     * Does the User have the admin role?
     * @returns {boolean} true if the user has the role 'admin'
     */
    ProxyUserSchema.methods.isAdmin = function () {
        return this.roles[0] === 'admin';
    };

    /**
     * Authenticate Password
     * @param password
     * @returns {boolean}
     */
    ProxyUserSchema.methods.authenticate = function (password) {
        return this.password === this.hashPassword(password);
    };


    /**
     * Finds a user wrapped in a promise
     * @param userObj = {username: 'some username'}
     * @returns {adapter.deferred.promise|*|promise|Promise.deferred.promise|Q.promise}
     */
    ProxyUserSchema.statics.findUserWithPromise = function (userObj) {
        var deferred = Q.defer();
        this.findOne(userObj, filtered_fields, function (err, user) {
            if (err) {
                deferred.reject(new Error("User '" + userObj.username + "' not found"));
            } else {
                deferred.resolve(user);
            }
        });
        return deferred.promise;
    };

    ProxyUserSchema.statics.updateUserWithPromise = function (user) {
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


    return mongoose.model('ProxyUser', ProxyUserSchema);
}