/**
 * This file contains all of the web and hybrid functions for interacting with
 * the basic chat bot dialog pane.
 *
 * @summary   Functions for Chat Bot.
 *
 * @since     0.0.1
 *
 */

"use strict";

// Variables for chat and stored context specific events
var watson = 'watson';
var manager = 'manager';
var designer = 'designer';
var developer = 'developer';
var user = 'user';
var context;  // Very important. Holds all the data for the current point of the chat.
var progress = false;

/**
 * @summary Enter Keyboard Event.
 *
 * When a user presses enter in the chat input window it triggers the service interactions.
 *
 * @function newEvent
 * @param {Object} e - Information about the keyboard event.
 */
function newEvent(e) {
  	// Only check for a return/enter press - Event 13
    if (e.which === 13 || e.keyCode === 13) {
        var userInput = document.getElementById('chatMessage');
        var text = userInput.value;  // Using text as a recurring variable through functions
        text = text.replace(/(\r\n|\n|\r)/gm, ""); // Remove erroneous characters

        // If there is any input then check if this is a claim step
    		// Some claim steps are handled in newEvent and others are handled in userMessage
    		if (text) {
            // Display the user's text in the chat box and null out input box
            displayMessage(text, user);
            userInput.value = '';
            userMessage(text);
        } else {
            // Blank user message. Do nothing.
  			    console.error("No message.");
            userInput.value = '';
            return false;
        }
    }
}

/**
 * @summary Main User Interaction with Service.
 *
 * Primary function for parsing the conversation context  object.
 *
 * @function userMessage
 * @param {String} message - Input message from user or page load.
 */
function userMessage(message, nextPerson, previousPerson) {
    var params = {  // Object for parameters sent to the Watson Conversation service
        input : {
            text: ''
        },
        context : {}
    };

    // Add variables to the context as more options are chosen
    if (context) {
        params.context = context; // Add a context if there is one previously stored
    }

    var switchBot = false;
    if (message === '@manager' || nextPerson === manager) {
        params.context.currentPerson = manager;
        switchBot = true;
    } else if (message === '@designer' || nextPerson === designer) {
        params.context.currentPerson = designer;
        switchBot = true;
    } else if (message === '@developer' || nextPerson === developer) {
        params.context.currentPerson = developer;
        switchBot = true;
    } else if (message === '@watson' || nextPerson === watson) {
        params.context.currentPerson = watson;
        switchBot = true;
    }

    // Set parameters for payload to Watson Conversation
    if (switchBot) {
        params.input.conversationRestart = true;

        if (previousPerson) {
            params.input.previousPerson = previousPerson;
        }
    } else {
        params.input.text = message; // User defined text to be sent to service
    }

    var xhr = new XMLHttpRequest();
    var uri = '/api/bot';

    xhr.open('POST', uri, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.onload = function() {
		    // Verify if there is a success code response and some text was sent
        if (xhr.status === 200 && xhr.responseText) {

            var response = JSON.parse(xhr.responseText);
            var text = response.output.text;
            var messageFrom = response.output.messageFrom;
            context = response.context; // Store the context for next round of questions

            console.log("Got response from Bot: ", JSON.stringify(response));

            checkContext(context);

            if (!response.output.forwardOutput) {
                displayMessage(text, messageFrom, context[messageFrom]);
            }

            if (response.output.nextPerson) {
                userMessage(response.input.text, response.output.nextPerson, context.currentPerson);
            }
        } else {
            console.error('Server error for Conversation. Return status of: ', xhr.statusText);
        }
    };

    xhr.onerror = function() {
        console.error('Network error trying to send message!');
    };

	  console.log(JSON.stringify(params));
    xhr.send(JSON.stringify(params));
}

/**
 * @summary Display Chat Bubble.
 *
 * Formats the chat bubble element based on if the message is from the user or from Bot.
 *
 * @function displayMessage
 * @param {String} text - Text to be dispalyed in chat box.
 * @param {String} user - Denotes if the message is from Bot or the user.
 * @return null
 */
function displayMessage(text, user, name) {

    var chat = document.getElementById('chatBox');
    var bubble = document.createElement('div');

    bubble.className = 'message';  // Wrap the text first in a message class for common formatting

    // Set chat bubble color and position based on the user parameter
    var messageClass = user;
	if (user === manager) {
        var messageClass = manager;
    } else if (user === designer) {
        var messageClass = designer;
    } else if (user === developer) {
        var messageClass = developer;
    } else if (user === watson) {
        var messageClass = watson;
    }

    var messageText;
    if (Array.isArray(text)) {
        messageText = text.join(' ');
    } else {
        messageText = text;
    }

    if (name) {
        bubble.innerHTML = "<div class='" + messageClass + "'><span class='name'>" + name + ":</span> " + messageText + "</div>";
    } else {
        bubble.innerHTML = "<div class='" + messageClass + "'>" + messageText + "</div>";
    }

    if (messageText.length > 0) {
        chat.appendChild(bubble);
        chat.scrollTop = chat.scrollHeight;  // Move chat down to the last message displayed
        document.getElementById('chatMessage').focus();
    }

    return null;
}

/**
 * @summary Check conversation context for signs of progress
 *
 * Checks the conversation context for variables that indicate motive, means and opportunity.
 *
 * @function checkContext
 * @param {Object} context - Conversation context object
 * @return null
 */
function checkContext(context) {
    var element;
    // Manager
    if (context.managerMotive) {
      element = document.getElementById('manager-motive');
      element.className = 'checked';
      element.title = 'Take Dr Redshirt\'s job';
    }
    if (context.managerOpportunity) {
      element = document.getElementById('manager-opportunity');
      element.className = 'checked';
      element.title = 'Has badge access to room';
    }
    // Designer
    if (context.affair) {
      element = document.getElementById('designer-motive');
      element.className = 'checked';
      element.title = 'Dr Redshirt was having an affair';
    }
    if (context.designerOpportunity) {
      element = document.getElementById('designer-opportunity');
      element.className = 'checked';
      element.title = 'Has Dr Redshirt\'s badge to access the room';
    }
    // Developer
    if (context.stealing) {
      element = document.getElementById('developer-motive');
      element.className = 'checked';
      element.title = 'Dr Redshirt found out that he was stealing robot technology';
    }
    if (context.virus) {
      element = document.getElementById('developer-means');
      element.className = 'checked';
      element.title = 'Could create a virus to kill Dr Redshirt';
    }
    if (context.affair) {
      element = document.getElementById('developer-opportunity');
      element.className = 'checked';
      element.title = 'Has cloned badge to access room';
    }
}

/**
 * @summary Show/hide progress area
 *
 * Shows and hides the progress area of the UI
 *
 * @function toggleProgress
 * @return null
 */
function toggleProgress() {
    // Toggle progress indicator and adjust view
    progress = !progress;
    var progressContainer = document.getElementById('progress-container');
    var progressLink = document.getElementById('progress-link');
    if (progress) {
        progressContainer.className = '';
        progressLink.className = 'active';
    } else {
        progressContainer.className = 'hidden';
        progressLink.className = '';
    }


    // Ensure it stays scrolled to bottom
    var chatBox = document.getElementById('chatBox');
    chatBox.scrollTop = chatBox.scrollHeight;
}
