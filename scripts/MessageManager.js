/**
 * MessageManager class handles insertion, deletion, and random selection of messages, 
 * as well as conversion of command keywords to gamepad input sequences.
 */
class MessageManager {
	constructor() {
		this.commandMessages = []; // array of message objects that contain commands
		this.allMessages = []; // array of all message objects
		this.messageLifetime = 2000; // default to 2 seconds
		this.currentMessageID = 0; // ID of the current message

		// Check if there is a saved command file, else initialize with empty object
		let commandsFile = JSON.parse(getLocalStorageItem("tc_commands_file", '{"commands":{},"params":{}}'));
		this.commandMap = commandsFile.commands;
		this.commandParams = commandsFile.params;
		// Initialize keywords and keywordRegex based on the loaded command map
		this.keywords = Object.keys(this.commandMap);
		if (this.keywords.length > 0) {
			this.keywordRegex = new RegExp("\\b(" + this.keywords.join('|') + ")\\b", 'gi');
		} else {
			this.keywordRegex = new RegExp("\\b(applebottomleans)\\b", 'gi');
		}

		this.currentMessage = null;
		this.currentControllerState = { buttons: "" };
		this.currentSequence = [];
		this.currentSequenceIndex = 0;
		this.desiredTime = 0;
		this.runningTime = 0;

		this.commandPeriod = 2; // default to two ticks
		this.messageCounts = [0,0,0,0,0,0,0,0,0,0]; // Half-second buckets for counting messages
		this.lastCountTime = 0; // Timestamp of the last bucket time
		this.maxCommandPeriod = 30;

	}

	/**
	 * Insert a new message into the messages array.
	 * Discards messages that don't contain any command keywords.
	 *
	 * @param {string} user - The username.
	 * @param {string} content - The content of the message.
	 * @returns {boolean}} - Whether or not the message contained a command.
	 */
	insertMessage(user, content) {
		const now = Date.now();
		this.currentMessageID++;
		this.currentMessageID %= 1000;

		let commands = [];
		let match;
		let actionable = false;
		while (match = this.keywordRegex.exec(content)) {
			// Insert the match if it's not already there.
			if (commands.indexOf(match[1]) === -1) {
				commands.push(match[1].toLowerCase());  // The keyword is in the first capture group
			}
		}
		// Roll the die against the command probability on each command in commands.
		commands = commands.filter(command => {
			let probability = this.commandParams[command.toLowerCase()]?.probability || 1;
			return (probability >= 1) || (Math.random() <= probability);
		});

		
		// If there are commands, add the message to the pool
		if (commands.length > 0) {
			this.commandMessages.push({commands, id: this.currentMessageID, timestamp: now});
			// Update the message bucket count
			this.messageCounts[9]++;
			actionable = true;
		}
		// Insert full chat message
		this.allMessages.push({user, content, id: this.currentMessageID, timestamp: now, handled: false, actionable, expired: false});
		return actionable;
	}
	/**
	 * "tick" method, to be called periodically. Deletes messages older than the configured messageLifetime.
	 */
	tick() {
		let now = Date.now();
		// Delete old messages (messages with msg.timestamp older than messageLifetime)
		while(this.commandMessages.length > 0 && now - this.commandMessages[0].timestamp > this.messageLifetime) {
			this.commandMessages.shift();
		}
		// Delete chat messages older than messageLifetime*2, mark messages older than messageLifetime as expired
		while(this.allMessages.length > 0 && now - this.allMessages[0].timestamp > this.messageLifetime*2) {
			this.allMessages.shift();
		}
		for (let i = 0; i < this.allMessages.length; i++) {
			if (now - this.allMessages[i].timestamp > this.messageLifetime) {
				this.allMessages[i].expired = true;
			} else {
				break;
			}
		}
		
		// Update the message bucket counts
		if (now - this.lastCountTime > 500) {
			// Get rid of entry 0
			this.messageCounts.shift();
			this.messageCounts.push(0);
			this.lastCountTime = now;
		}
		// Use the message counts to determine a reasonable command period.
		// Weight entries 8 and 7 highest, 6 and 5 medium, and 4 and below low.
		let weightedCount = 0;
		for (let i = 0; i <= 8; i++) {
			weightedCount += this.messageCounts[i] * (i <= 4 ? 1 : i <= 6 ? 2 : 3);
		}
		weightedCount += 1; // Add 1 to avoid divide by zero
		if (this.currentMessage == null) {
			// If there is no current message, set a short command period
			this.commandPeriod = 1;
		} else {
			this.commandPeriod = Math.min(250 / weightedCount * 0.9, this.maxCommandPeriod); 
		}

		// Track the running time
		this.runningTime++;
		// Check if time is up (sequence done and period expired)
		if (this.runningTime >= Math.max(this.desiredTime, this.commandPeriod)) {
			// If so, pull a new message
			this.runningTime = 0;
			this.currentMessage = this.selectRandomMessage();
			if (this.currentMessage !== null) {
				// If there is a message, start a new sequence
				this.currentSequence = this.combineCommands(this.currentMessage.commands);
				this.currentSequenceIndex = 0;
				this.desiredTime = this.getMaxLength(this.currentMessage.commands);
				// Mark the message as handled
				this.allMessages[this.allMessages.findIndex(m => m.id === this.currentMessage.id)].handled = true;
			} else {
				// Otherwise, clear the sequence
				this.currentSequence = [];
				this.currentSequenceIndex = 0;
				this.desiredTime = 0;
			}
		}
		// If there is a current sequence, update the controller state
		if (this.currentSequence.length > 0) {
			this.currentControllerState = this.currentSequence[this.currentSequenceIndex];
			this.currentSequenceIndex = (this.currentSequenceIndex + 1) % this.currentSequence.length;
		} else {
			this.currentControllerState = { buttons: "" };
		}
	}

	get conState() {
		return this.currentControllerState;
	}

	get message() {
		return this.currentMessage;
	}

	get messages() {
		return this.allMessages;
	}


	/**
	 * Randomly select a message from the pool.
	 *
	 * @param {boolean} keepInPool - Whether to keep the selected message in the pool.
	 * @returns {Object|null} - The randomly selected message object or null if no messages exist.
	 */
	selectRandomMessage(keepInPool = false) {
		// If there are no messages, return null
		if (this.commandMessages.length === 0) {
			return null;
		}

		// Generate a random index
		const randomIndex = Math.floor(Math.random() * this.commandMessages.length);

		// If keepInPool is true, simply return the message without removing it
		if (keepInPool) {
			return this.commandMessages[randomIndex];
		}

		// Otherwise, remove the message from the array and return it
		return this.commandMessages.splice(randomIndex, 1)[0];

	}

	/**
	 * Get the maximum length of provided commands.
	 *
	 * @param {Array} commands - An array of command keywords.
	 * @returns {number} - The maximum length of the commands.
	 */
	getMaxLength(commands) {
		if (!commands || commands.length === 0) {
			return 0;
		}

		return commands.reduce((max, command) => {
			let length = this.commandParams[command.toLowerCase()].length || 0;
			return Math.max(max, length);
		}, 0);
	}

	/**
	 * Combine an array of commands into a single sequence of controller states.
	 *
	 * @param {Array} commands - An array of command keywords.
	 * @returns {Array} - An array of controller state objects.
	 */
	combineCommands(commands) {
		let result = [];

		const expandCommand = (command) => {
			let states = this.commandMap[command];
			let expandedStates = [];

			for (let state of states) {
				for (let i = 0; i < state.frames; i++) {
					expandedStates.push({ ...state, frames: 1 });
				}
			}

			// Repeat states until reaching 60 frames
			while (expandedStates.length < 60) {
				expandedStates = [...expandedStates, ...expandedStates];
			}

			// Truncate to exactly 60 frames
			expandedStates.length = 60;

			return expandedStates;
		};

		const mergeStates = (state1, state2) => {
			const buttons1 = state1.buttons.split(' ');
			const buttons2 = state2.buttons.split(' ');
			const mergedButtons = Array.from(new Set([...buttons1, ...buttons2])).join(' ');

			const maxAnalogStickValue = (value1, value2) => {
				const absVal1 = Math.abs(value1);
				const absVal2 = Math.abs(value2);
				return absVal1 > absVal2 ? value1 : value2;
			};

			return {
				buttons: mergedButtons,
				lx: maxAnalogStickValue(state1.lx, state2.lx),
				ly: maxAnalogStickValue(state1.ly, state2.ly),
				rx: maxAnalogStickValue(state1.rx, state2.rx),
				ry: maxAnalogStickValue(state1.ry, state2.ry),
				frames: 1  // Operating with expanded commands, so frame count is always 1
			};
		};

		for (let command of commands) {
			let expandedCommand = expandCommand(command);

			if (result.length === 0) {
				result = expandedCommand;
			} else {
				for (let i = 0; i < 60; i++) {
					result[i] = mergeStates(result[i], expandedCommand[i]);
				}
			}
		}

		return result;
	}

	get commands() {
		if (!this.currentMessage) {
			return [];
		}
		return this.currentMessage.commands;
	}

	get timeLeft() {
		return Math.max(Math.max(this.desiredTime, this.commandPeriod) - this.runningTime, 0);
	}
}
