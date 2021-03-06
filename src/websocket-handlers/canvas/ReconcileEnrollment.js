/**
 * Copyright (c) 2016, Foothill-De Anza Community College District
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice,
 * this list of conditions and the following disclaimer.
 *
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 * this list of conditions and the following disclaimer in the documentation and/or
 * other materials provided with the distribution.
 *
 * 3. Neither the name of the copyright holder nor the names of its contributors
 * may be used to endorse or promote products derived from this software without
 * specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
 * IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT,
 * INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING,
 * BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
 * LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE
 * OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF
 * ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

'use strict';
let CollegeManager = require('../../CollegeManager.js');
let Logger = require('fhda-pubsub-logging')('ws.action.reconcile-enrollment');
let WebsocketUtils = require('../../WebsocketUtils.js');

/**
 * Execute an an enrollment reconciliation operation to look for and correct
 * variances between the Banner and Canvas rosters.
 * @param  {Object} data Event data payload
 * @param  {Function} respond Callback function to send a response back to the client
 * @return {Promise} Resolved when the operation is complete
 */
module.exports = async function (data, respond) {
    // Lookup college configuration
    let college = CollegeManager[data.college];

    // Execute
    try {
        let report = await college.reconcileEnrollment();
        Logger.verbose('Preparing to deliver reconciliation report back to calling client', report);
        respond(report);
    }
    catch(error) {
        WebsocketUtils.handleAsyncError(
            `A serious error occurred while attempting to reconcile enrollment for '${data.college}'`,
            Logger,
            respond,
            error);
    }
};
