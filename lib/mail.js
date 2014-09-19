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
    svmp = require('./svmp'),
    smtpTransport = require('nodemailer').createTransport("SMTP", {
        host: svmp.config.get("smtp:host"),
        port: svmp.config.get("smtp:port"),
        secureConnection: svmp.config.get("smtp:secure_connection"),
        auth: {
            user: svmp.config.get("smtp:username"),
            pass: svmp.config.get("smtp:password")
        }
    });


/**
 * Helper to send the mail...
 * @param options
 */
function mailIt(options) {
    /**
     * We only send email if the host field is defined
     */
    if (svmp.config.get("smtp:host")) {
        smtpTransport.sendMail(options, function (error, responseStatus) {
            if (error) {
                console.log("Error sending email to user: ", error);
            }
        });
    }
}

/**
 * Send mail to the User (usually on a 'signup' an account approval)
 * @param email
 */
exports.sendToUser = function (email) {
    var opts = {
        from: 'noreplay@svmpadmin', // sender address
        to: email, // list of receivers
        subject: "SVMP Account Approved",
        text: "Your SVMP account has been approved."
    };
    mailIt(opts);
};

/**
 *  Send email to admin as set on the config file.  Usually sent when a user signs up
 */
exports.sendToAdmin = function () {
    var opts = {
        from: 'noreplay@svmpadmin', // sender address
        to: svmp.config.get("smtp:admin_email"),
        subject: "SVMP: Pending user account",
        text: "A User has registered with SVMP. Please check the SVMP admin console for pending SVMP accounts"
    };
    mailIt(opts);
};