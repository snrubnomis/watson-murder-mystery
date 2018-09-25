/*************************************************************************************************

  Define global variables for NPM packages and Cloud Foundry environment

*************************************************************************************************/
"use strict";

require('dotenv').config();

var _ = require('lodash'),
    async = require('async'),
    express = require('express'),
    cfenv = require("cfenv"),
    appEnv = cfenv.getAppEnv(),
    app = express(),
    bodyParser = require('body-parser'),
    watson = require('watson-developer-cloud');

var localVCAP = undefined;
try {
  localVCAP = require('./local-vcap.json');
} catch (err) {
  // local-vcap file won't exist when deployed
}

/************************************************************************************************* 
  
  Start the server 
  
*************************************************************************************************/
app.use(bodyParser()); 

app.use(express.static(__dirname + '/public'));
var appEnv = cfenv.getAppEnv({
  vcap : localVCAP || {}
});
app.listen(appEnv.port, '0.0.0.0', function() {
    console.log("server starting on " + appEnv.url);
});

/*************************************************************************************************

 Watson Conversation

*************************************************************************************************/
var config = {
  username: process.env.USERNAME,
  password: process.env.PASSWORD,
  version_date : '2017-02-03',
  version : 'v1'
};
var ConversationV1 = require('watson-developer-cloud/conversation/v1');
var conversation = new ConversationV1(config);


var workspaces = {
    manager : process.env.WORKSPACE_MANAGER,
    designer : process.env.WORKSPACE_DESIGNER,
    developer : process.env.WORKSPACE_DEVELOPER,
    watson : process.env.WORKSPACE_WATSON
}

function sendMessage (bot, input, context, callback) {

    var params = {
        context : context,
        input : input || ''
    };
    params.context.currentPerson = params.context.currentPerson || bot,
    params.context.botStates = params.context.botStates || {}

    params.workspace_id = workspaces[bot];
    if (!params.workspace_id) {
        callback("No workspace detected. Cannot run the Watson Conversation service.");
    }

    // Use the bot's current state if it has one
    if (params.context.botStates[bot]) {
        var botContext = params.context.botStates[bot];
        params.context.conversation_id = botContext.conversation_id;
        params.context.system = botContext.system;
    }

    console.log("Conversarion request: ", params);

    // Send message to the conversation service with the current context
    conversation.message(params, function(err, response) {
        if (err) {
            callback(err);
        }

        // Context should be shared but maintain separate bot states
        var state = _.pick(response.context, ['conversation_id', 'system']);
        var sharedContext = _.omit(response.context, ['conversation_id', 'system']);
        if (!sharedContext.botStates) {
            sharedContext.botStates = {};
        }
        sharedContext.botStates[sharedContext.currentPerson] = state;
        response.context = sharedContext;

        return callback(null, response);
    });
}

// Allow clients to interact with the bot
app.post('/api/message', function(req, res) {
    
    console.log("Got request for Le Bot");
    console.log("Request is: ",req);

    var bot = 'watson'
    var input = '';
    var context = {}

    if (req.body) {
        if (req.body.input) {
            input = req.body.input;
        }
        
        if (req.body.context) {
            context = req.body.context;
        }
    }

    if (context.currentPerson) {
        bot = context.currentPerson;
    }

    // Make sure Dr Watson is always listening!
    async.parallel({
        watson: function(callback) {
            if (bot !== 'watson') {
                var watsonContext = _.cloneDeep(context);
                sendMessage('watson', input, watsonContext, callback);
            } else {
                callback();
            }
        },
        currentPerson: function(callback) {
            var currentPersonContext = _.cloneDeep(context);
            sendMessage(bot, input, currentPersonContext, callback);
        }
    }, function(err, results) {
        if (err) {
            console.log("Error in sending message: ", err);
            return res.status(err.code || 500).json(err);
        }

        // Pick which result to respond with
        var response;
        if (results.watson && results.watson.output.interruptSuspect) {
            response = results.watson;
            response.output.messageFrom = 'watson';

            console.log("Watson is interrupting!");
        } else {
            response = results.currentPerson;
            response.output.messageFrom = response.context.currentPerson;
        }

        console.log("Conversarion response: ", response);

        return res.json(response);
    });

}); // End app.post '/api/message'

