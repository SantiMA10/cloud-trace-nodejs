/**
 * Copyright 2015 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

var OpaqueSpan = require('./lib/opaque-span.js');

/**
 * Phantom implementation of the trace agent. This allows API users to decouple
 * the enable/disable logic from the calls to the tracing API. The phantom API
 * has a lower overhead than isEnabled checks inside the API functions.
 * @private
 */
var phantomTraceAgent = {
  startSpan: function() { return OpaqueSpan.nullSpan; },
  setTransactionName: function() {},
  addTransactionLabel: function() {}
};

/** @private */
var agent = phantomTraceAgent;

/**
 * The singleton public agent. This is the public API of the module.
 */
var publicAgent = {
  startSpan: function(name, labels) {
    return agent.startSpan(name, labels);
  },

  setTransactionName: function(name) {
    return agent.setTransactionName(name);
  },

  addTransactionLabel: function(key, value) {
    return agent.addTransactionLabel(key, value);
  },

  start: function(projectConfig) {
    if (agent === phantomTraceAgent) {
      var util = require('util');
      var config = {};
      util._extend(config, require('./config.js'));
      util._extend(config, projectConfig);
      agent = require('./lib/trace-agent.js').get(config);

      if (!config.projectId) {
        // Queue the work to acquire the projectNumber (potentially from the
        // network.)
        require('./lib/utils.js').getProjectNumber(function(err, project) {
          if (err) {
            // Fatal error. Disable the agent.
            publicAgent.stop();
            config.enabled = false;
            return;
          }
          config.projectId = project;
        });
      }
    }
    return publicAgent; // for chaining
  },

  stop: function() {
    if (agent !== phantomTraceAgent) {
      agent.stop();
      agent = phantomTraceAgent;
    }
  },

  /**
   * For use in tests only.
   * @private
   */
  private_: function() { return agent; }
};

// TODO: if the module was --require'd on the command line, auto-start the agent

module.exports = publicAgent;
