/*
Includes
*/
var express = require("express");
var parser = require("body-parser");
var https = require("https");
var url = require("url");
var fs = require("fs");
var gamestateFactory = require("./hangman_state");
var logger = require("./logging");
var hangmanControllerFactory = require("./hangman_controller");

/*
Setup
*/
var tokenFile = "./token.txt";
var port = 15000;
var token = getToken(tokenFile);
if (token == null) {
	logger.log(`Could not start server because the token file '${tokenFile}' could not be loaded.`);
	return;
}
logger.log(`Loaded token ${token}`);

var gameStates = {};
var server = express();
var hangmanController = hangmanControllerFactory();
server.use(parser.urlencoded({extended:true}));

/*
Register handlers
*/
registerHandlers(hangmanController);

/*
Configure routes
*/

server.post('/hangman', function(req, res) {
	var body = req.body;
	
	//Make sure body is not null
	if (body == null) {
		logger.log("Expecting x-www-form-urlencoded payload");
		res.status(400).send("Expecting x-www-form-urlencoded payload");
		return;
	}
	
	//Return error and exit if token is unrecognized
	if (body.token != token) {
		logger.log("Unrecognized token!");
		res.status(401).send("Unauthorized request");
		return;
	}
	
	//Return error if channel_id field is null
	if (body.channel_id == null) {
		logger.log("No channel_id value was sent");
		res.status(400).send("No channel_id value was sent");
		return;
	}
	
	//Return error if text field is null
	if (body.text == null) {
		logger.log("Expecting text field");
		res.status(400).send("Expecting text field");
		return;
	}
	
	hangmanController.handleRequest(body.text, body.user_name, body.channel_id, {
		request : req,
		response : res
	});
});

//Start the server
server.listen(port);
logger.log("Server running at http://127.0.0.1:"+port+"/");


/*
Function/object definitions
*/

function buildEphemResponse(txt, markdown = true) {
	return {
		text : txt,
		response_type : "ephemeral",
		markdown : markdown
	};
}
function buildVisibleResponse(txt, markdown = true) {
	return {
		text : txt,
		response_type : "in_channel",
		markdown : markdown
	};
}

function delayedResponse(responseUrl, json) {
	var options = url.parse(responseUrl);
	options.method = "POST";
	var req = https.request(options);
	req.end(JSON.stringify(json));
}

function getToken(tokenFilename, encoding = "utf8") {
	if (!fs.existsSync(tokenFilename)) {
		return null;
	}
	var contents = fs.readFileSync(tokenFilename, { encoding : encoding });
	var tokenPattern = /token[ ]*=[ ]*[a-zA-Z1-9]+/;
	var tokenMatch = contents.match(tokenPattern);
	if (!tokenMatch) {
		return null;
	}
	var tokenString = tokenMatch[0];
	var tokenSubPattern = /=([a-zA-Z1-9]+)/;
	return tokenString = tokenString.match(tokenSubPattern)[1];
}

function registerHandlers(hangmanController) {
	//New game handler
	hangmanController.on("newgame", function(game, customState) {
		var body = customState.request.body;
		logger.log(`${body.user_name} initiated a new game with '${game.getWord()}' as the word`);
		
		//Inform the user the game was successfully started
		customState.response.json(buildEphemResponse(`A new game of hangman has been started with \`${game.getWord()}\` as the word.`));
		
		//Inform everyone in the channel that a new game was started
		delayedResponse(body.response_url, buildVisibleResponse(`A new game of hangman has been started by ${body.user_name}`));
	});

	//Letter guess handler
	hangmanController.on("guess", function(game, guess, customState) {
		var body = customState.request.body;
		var logText = `${body.user_name} guessed '${guess}'. `;
		
		//Guess was a good guess
		if (game.lastGuessValid()) {
			logText += "Correct. ";
			if (game.gameOver()) {
				logText += "Game over.";
				customState.response.json(buildVisibleResponse(`Congratulations! You won. The word was \`${game.getWord()}\`. :clapping:`));
			}
			else {
				customState.response.json(buildVisibleResponse("```" + game.getState() + "```"));
			}
		}
		
		//Guess was not a good guess
		else {
			logText += "Incorrect. ";
			if (game.gameOver()) {
				logText += "Game over.";
				customState.response.json(buildVisibleResponse("Sorry, you died. :danduck: The word was `" + game.getWord() + "`.\n```" + game.getState() + "```"));
			}
			else {
				customState.response.json(buildVisibleResponse("```" + game.getState() + "```"));
			}
		}
		logger.log(logText);
	});
	
	hangmanController.on("staterequest", function(game, customState) {
		var body = customState.request.body;
		logger.log(`${body.user_name} sent state request.`);
		customState.response.json(buildVisibleResponse("```" + game.getState() + "```"));
	});

	//Invalid request handler
	hangmanController.on("invalidrequest", function(context, command, customState) {
		var body = customState.request.body;
		logger.log(`${body.user_name} sent command '${command}', but there was no active game for the channel.`);
		var response = buildEphemResponse("There is no active game in this channel! Type `/hangman newgame <word>` to start a new game.");
		customState.response.json(response);
	});

	//Unknown request handler
	hangmanController.on("unknownrequest", function(command, customState) {
		var body = customState.request.body;
		logger.log(`${body.user_name} sent unrecognized request '${command}'.`);
		customState.response.json(buildEphemResponse("Unrecognized command. Type `/hangman newgame <word>` to start a new game, `/hangman state' to check the state of an existing game, or `/hangman <letter>` to guess a letter for an in-progress game."));
	});
}