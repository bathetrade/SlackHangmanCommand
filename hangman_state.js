var util = require("./utility.js");

module.exports = function(hangmanWord, userId) {
	
	//Private variables
	var word = hangmanWord;
	var remainingLetters = new Set(hangmanWord);
	var guessedLetters = new Set();
	var guessedWords = new Set();
	var hangmanRep = CreateHangmanRep(word);
	var hangmanAscii = CreateHangmanAscii();
	var creator = userId;
	var lastGuessValid = null;
	
	return {
		guessLetter : function(letter) {
			if (this.gameOver()) {
				return false;
			}
			
			var matchIndices = util.multiSearch(word, new RegExp(letter, "g"));
			var isValidGuess = false;
			
			lastGuessValid = (matchIndices != null);
			
			if (remainingLetters.has(letter)) {
				hangmanRep.setLetter(letter, matchIndices);
				remainingLetters.delete(letter);
				isValidGuess = true;
			}
			else {
				if (!guessedLetters.has(letter)) {
					hangmanAscii.nextState();
				}
				isValidGuess = false;
			}
			guessedLetters.add(letter);
			return isValidGuess;
		},
		guessWord : function(theWord) {
			if (word === theWord) {
				lastGuessValid = true;
				remainingLetters.clear();
			}
			else {
				if (!guessedWords.has(theWord)) {
					hangmanAscii.nextState();
				}
				lastGuessValid = false;
			}
			guessedWords.add(theWord);
		},
		getState : function() {
			return hangmanAscii.currentState() + "\n" + hangmanRep.getRepresentationWithSpaces() + "\nGuessed letters: " + util.setToString(guessedLetters) + "\nGuessed words: " + util.setToString(guessedWords);
		},
		getCreator : function() {
			return creator;
		},
		getWord : function() {
			return word;
		},
		gameOver : function() {
			return remainingLetters.size == 0 || hangmanAscii.finalState();
		},
		lastGuessValid : function() {
			return lastGuessValid;
		}
	};
}
	
function CreateHangmanRep(word, separator = '*') {
	if (word == null || word.length == 0) {
		return null;
	}
	
	var rep = Array(word.length).fill(separator);
	return {
		
		getRepresentation : function() { 
			return rep.join("");
		},
		
		setLetter : function(letter, posArray) {
			for(var i=0; i<posArray.length; ++i) {
				if (i < rep.length) {
					rep[posArray[i]] = letter;
				}
			}
		},
		
		getRepresentationWithSpaces : function() {
			return rep.join(" ");
		}
	};
}
	
function CreateHangmanAscii() {
		var state0 = `
        ________     
        |      |     
        |            
        |            
        |            
        |            
  ______|__________  
 /      |         /| 
/________________/ / 
                | /  
________________ /   `;

		var state1 = `
        ________     
        |      |     
        |      @     
        |            
        |            
        |            
  ______|__________  
 /      |         /| 
/________________/ / 
                | /  
________________ /   `;

		var state2 = `
        ________     
        |      |     
        |      @     
        |     /      
        |            
        |            
  ______|__________  
 /      |         /| 
/________________/ / 
                | /  
________________ /   `;

		var state3 = `
        ________     
        |      |     
        |      @     
        |     /|     
        |            
        |            
  ______|__________  
 /      |         /| 
/________________/ / 
                | /  
________________ /   `;

		var state4 = `
        ________     
        |      |     
        |      @     
        |     /|\\   
        |            
        |            
  ______|__________  
 /      |         /| 
/________________/ / 
                | /  
________________ /   `;

		var state5 = `
        ________     
        |      |     
        |      @     
        |     /|\\   
        |      |     
        |            
  ______|__________  
 /      |         /| 
/________________/ / 
                | /  
________________ /   `;

		var state6 = `
        ________     
        |      |     
        |      @     
        |     /|\\   
        |      |     
        |     /      
  ______|__________  
 /      |         /| 
/________________/ / 
                | /  
________________ /   `;

		var state7 = `
        ________     
        |      |     
        |      @     
        |     \\|/   
        |      |     
        |     / \\   
  ______|__________  
 /      |         /| 
/________________/ / 
                | /  
________________ /   `;
	var states = [state0,state1,state2,state3,state4,state5,state6,state7];
	var state = 0;
	return {
		nextState : function() {
			if (state < states.length - 1) {
				++state;
			}
		},
		currentState : function() {
			return states[state];
		},
		finalState : function() {
			return state == states.length - 1;
		}
	};
}