/**
 * Copyright (c) 2017, Foothill-De Anza Community College District
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

/**
 * Utility functions to dynamically generate course names and course codes
 * for new Canvas sites using a custom string template format. Templates
 * support async lookups for running queries against Banner to collect data
 * necessary to generating accurate and useful names.
 * @license BSD-3-Clause
 * @module
 */

'use strict';
let BannerOperations = require('./BannerOperations');
let Case = require('case');
let Common = require('./Common');
let Config = require('config');
let StringReplaceAsync = require('string-replace-async');

// Define a regex for parsing template variables
let templateVarRegex = /[\x5B]([A-Za-z]+)[\x5D]+/g;

/**
 * Given a context and template string, use an async modification of String.replace
 * to identify each token, and execute an async function to replace its value
 * with a "real world" data point from Banner.
 * @param {Object} context Contextual data to pass to each variable function
 * @param {String} template The template to execute
 * @returns {Promise|Async} Resolved with output String when template has been executed
 */
async function executeTemplate(context, template) {
    // Use an async String replace to execute long running operations for each substitution
    return StringReplaceAsync(template, templateVarRegex, async (match, varName) => {
        if(typeof fnLibrary[varName] === 'function') {
            return await fnLibrary[varName](context);
        }
        return match;        
    });    
}

/**
 * Generate a new course name for a Canvas site.
 * @param {String} parentTerm Banner term code of the parent/root course
 * @param {String} parentCrn Banner CRN of the parent/root course
 * @param {Array|Object} sections Array of sections for the course
 * @param {String} [template=Config.common.courseNameTemplate] Template string (or resolves to common default shared by all colleges)
 * @returns {Promise|Async} Resolved with new course name string
 */
async function generateCourseName(parentTerm, parentCrn, sections, template=Config.common.courseNameTemplate) {
    // Create a data context (mapping data from Banner as needed)
    let context = {
        instructors: await BannerOperations.getInstructors(parentTerm, parentCrn),
        parentCourse: await BannerOperations.getCourse(parentTerm, parentCrn),
        parentTerm: parentTerm,
        parentCrn: parentCrn,
        sections: await Promise.map(
            sections,
            section => BannerOperations.getCourseSection(section.term, section.crn))
    };

    // Execute template
    return await executeTemplate(context, template);
}

/**
 * Generate a new course code for a Canvas site.
 * @param {String} parentTerm Banner term code of the parent/root course
 * @param {String} parentCrn Banner CRN of the parent/root course
 * @param {Array|Object} sections Array of sections for the course
 * @param {String} [template=Config.common.courseNameTemplate] Template string (or resolves to common default shared by all colleges)
 * @returns {Promise|Async} Resolved with new course code string
 */
async function generateCourseCode(parentTerm, parentCrn, sections, template=Config.common.courseCodeTemplate) {
    // Create a data context (mapping data from Banner as needed)
    let context = {
        parentCourse: await BannerOperations.getCourse(parentTerm, parentCrn),
        parentTerm: parentTerm,
        parentCrn: parentCrn,
        sections: await Promise.map(
            sections,
            section => BannerOperations.getCourseSection(section.term, section.crn))
    };

    // Execute template
    return await executeTemplate(context, template);
}

/**
 * Library of substitution functions for executing templates
 */
let fnLibrary = {
    allCrns: function(context) {
        // Get section CRNs, sort, and join into one string
        return context.sections
            .sort(Common.compareBySectionNumber)
            .map(section => section.crn)
            .join(', ');
    },

    instLastName: function(context) {
        return context.instructors[0].lastName;
    },

    parentCourseNum: function(context) {
        // Return sanitized course number
        return Common.sanitizeSubjectCode(context.parentCourse.courseNumber);  
    },

    parentCrn: function(context) {
        return context.parentCrn;
    },

    parentSubj: function(context) {
        // Return sanitized subject code
        return Common.sanitizeSubjectCode(context.parentCourse.subjectCode);  
    },

    parentTitle: function(context) {
        // Return sanitized subject code
        return Case.capital(context.parentCourse.title);
    },

    parentTitleUpper: function(context) {
        return context.parentCourse.title.toUpperCase();
    },

    sections: function(context) {
        // Get section numbers, sort, and join into one string
        return context.sections
            .sort(Common.compareBySectionNumber)
            .map(section => section.sectionNumber)            
            .join(', ');
    },

    termAbbrev: function(context) {
        // Parse year
        let year = parseInt(context.parentTerm.substr(0, 4));
        
        // Evaluate term
        if(context.parentTerm[4] === '1') {
            let adjustedYear = String(year - 1).substr(2, 2);
            return `Su${adjustedYear}`;
        }
        else if(context.parentTerm[4] === '2') {
            let adjustedYear = String(year - 1).substr(2, 2);
            return `F${adjustedYear}`;
        }
        else if(context.parentTerm[4] === '3') {
            let adjustedYear = String(year).substr(2, 2);
            return `W${adjustedYear}`;
        }
        else if(context.parentTerm[4] === '4') {
            let adjustedYear = String(year).substr(2, 2);
            return `Sp${adjustedYear}`;
        }
    }
};

// Module exports
module.exports = {
	generateCourseCode: generateCourseCode,
	generateCourseName: generateCourseName
};