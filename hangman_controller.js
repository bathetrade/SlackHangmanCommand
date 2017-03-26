/* This class is designed to handle requests from a slack server (or any server that follows the same HTTP protocol). See the comments in the "handleRequest()" function for more information on the type of requests it can process. A user of the class can register callbacks for various events:

Events:

The "newgame" event callback accepts one argument, which is a hangman game state object that encapsulates a hangman game. See "hangman_state.js" for information on this object.

The "guess" event is fired when a guess is made. The callback accepts two arguments: the hangman state game object, and the guess string.

The "staterequest" event is made when a user makes a request to check the state of an existing game. The callback accepts one argument, the hangman game state object (see "hangman_state.js").

The "invalidrequest" event is fired when a valid command is made, but a game has not yet been started. The callback accepts a "context" parameter (string) which is one of the event types. It also accepts a string which contains the exact comamnd that was sent. For instance, if the request is to check the state of the game, but a game was never started, this event is fired with the "context" argument set to "staterequest", and the second argument set to "state".

The "unknownrequest" event is fired when an unrecognized request is made. The callback accepts one argument, which is a string containing the unrecognized command.

*/


/*
Includes
*/
var EventEmitter = require("events");
var gamestateFactory = require("./hangman_state");

/*
Globals
*/
var newgamePattern = /^[ ]*newgame[ ]+[a-z]+[ ]*$/i;
var guessPattern = /^[ ]*[a-z]+[ ]*$/i;
var statePattern = /^[ ]*state[ ]*$/i;

var newGameEvent = "newgame";
var guessEvent = "guess";
var stateRequestEvent = "staterequest";
var invalidRequestEvent = "invalidrequest";
var unknownRequestEvent = "unknownrequest";

module.exports = function() {
	
	//Private state
	var emitter = new EventEmitter();
	var gameStates = {};
	
	//Private methods
	function checkActiveGame(game) {
		return game != null;
	}
	
	return {
		
		on : function(eventType, callback) {
			emitter.on(eventType, callback);
		},
		
		handleRequest : function(command, commandIssuer, gameId, customState) {
			var game = gameStates[gameId];
			command = command.toLowerCase();
			
			//Four possible formats: "newgame <word>", "state", "<word>", or "<letter>". The user types the former when starting a new game in a channel. The user types "state" when they want to print the current state of the game. The user types a word when they want to guess a word. The user types a letter when an existing game is going on, and they want to guess a letter. Only one game can be active per channel. If a user types "newgame <word>" while an existing game is going on, a new game will be started, and the old one abandoned.
			var newgamePatternMatch = command.match(newgamePattern);
			var guessPatternMatch = command.match(guessPattern);
			var statePatternMatch = command.match(statePattern);
			var newgameRequest = newgamePatternMatch != null;
			var guess = guessPatternMatch != null;
			var stateRequest = statePatternMatch != null;
			
			//Handle new game request
			if (newgameRequest) {
				
				//Parse the word
				var hangmanWord = command.match(/[a-z]+$/i)[0];
				
				//Initialize (or reinitialize) the game state for the given channel.
				game = gamestateFactory(hangmanWord, commandIssuer);
				gameStates[gameId] = game;
				
				//Notify listeners
				emitter.emit(newGameEvent, game, customState);
			}
			
			//State request
			else if (stateRequest) {
				if (!checkActiveGame(game)) {
					emitter.emit(invalidRequestEvent, stateRequestEvent, command, customState);
					return;
				}
				emitter.emit(stateRequestEvent, game, customState);
				return;
			}
			
			//Handle guess for existing game
			else if (guess) {
				
				//Tell the invoker to start a new game if there isn't an active game right now.
				if (!checkActiveGame(game)) {
					emitter.emit(invalidRequestEvent, guessEvent, command, customState)
					return;
				}
				
				//Extract the actual letter from the command.
				var guessText = command.match(/[a-z]+/i)[0];
				if (guessText.length == 1) {
					game.guessLetter(guessText);
				}
				else if (guessText.length > 1) {
					game.guessWord(guessText);
				}
				
				if (game.gameOver()) {
					gameStates[gameId] = null;
				}
				
				//Notify listeners a guess was made (the game object will contain information such as whether the game is over, whether the last request was valgameId, etc.)
				emitter.emit(guessEvent, game, guessText, customState);
				return;
			}
			
			//Unrecognized command
			else {
				emitter.emit(unknownRequestEvent, command, customState);
			}
		}
	};
}