// Global variables
let currentMsgIndex = 0;

function tc_connect(channel) {
	setLocalStorageItem('GLaMS-tcChannel', channel);
	tc_ws = new WebSocket('wss://irc-ws.chat.twitch.tv:443');
	tc_ws.onopen = function () {
		tc_ws.send('PASS null');
		let enumerator = Math.floor(100000 + Math.random() * 900000);
		tc_ws.send('NICK justinfan' + enumerator);
		tc_ws.send('JOIN #' + channel);
	};

	tc_ws.onmessage = function (event) {
		let msg = event.data;

		// Extract the command from the message
		const commandMatch = msg.match(/(?:^PING|:(.*?) (.*?) )/);
		const command = commandMatch ? commandMatch[2] : '';

		// PING message
		if (msg.startsWith('PING')) {
			tc_ws.send('PONG :tmi.twitch.tv');
		}

		// JOIN message
		else if (command === 'JOIN') {
			console.log("Successfully joined channel");
			document.getElementById('tc-connect').classList.add('indicator-active');
		}

		// PRIVMSG (chat message)
		else if (command === 'PRIVMSG') {
			// Extract the username and the message from the string using regular expressions
			let username = msg.match(/:(.*?)!/)[1];
			let message = msg.match(/PRIVMSG[^:]*:(.*)/)[1];

			// Give to message manager
			const isCommand = messageManager.insertMessage(username, message);

		}

		// Unknown message type
		else {
			console.log("Unknown message type: ", msg);
		}
	};
}

function updateMessageDisplay() {
	let messageContainer = document.getElementById('message-container');

	// Remove messages not in tc_messages
	Array.from(messageContainer.children).forEach(child => {
		const id = parseInt(child.id.replace('message-', ''));
		if (!tc_messages.some(msg => msg.id === id)) {
			child.remove();
		}
	});

	// Add new messages
	tc_messages.forEach(msg => {
		if (!document.getElementById('message-' + msg.id)) {
			const messageElement = document.createElement('div');
			messageElement.classList.add('tc-message');
			if (msg.isCommand) {
				messageElement.classList.add('tc-command');
			} else {
				messageElement.classList.add('tc-chat');
			}
			messageElement.id = 'message-' + msg.id;
			messageElement.innerText = msg.username + ': ' + msg.message;
			messageContainer.prepend(messageElement);
		}
	});
}

function populateCommands() {
	const commandContainer = document.getElementById('command-list');
	commandContainer.innerHTML = '';
	for (let keyword in messageManager.commandMap) {
		const commandElement = document.createElement('div');
		commandElement.classList.add('keyword');
		commandElement.id = 'command-' + keyword;
		commandElement.innerText = keyword;
		commandElement.addEventListener('click', () => { testMessage(keyword); });
		commandContainer.appendChild(commandElement);
	}

}

function populateGroups() {
	const commandContainer = document.getElementById('group-list');
	commandContainer.innerHTML = '';
	for (let keyword in bot.botParams.groups) {
		const commandElement = document.createElement('div');
		commandElement.classList.add('keyword');
		commandElement.innerText = keyword;
		commandContainer.appendChild(commandElement);
	}

}

function testMessage(keyword) {
	messageManager.insertMessage('TestMessage', "Injected " + keyword + "...");
}



/* Mostly editing page functions */

let commandMap = {};
let commandParams = {};
let botParams = { "groups": {} };
const defaultGroupsFile = { groups: {} };

function loadGroupsFromStorage() {
	// Check if there is a saved groups file
	let groupsFile = getLocalStorageItem("tc_bot_file", '{"groups":{}}');
	if (groupsFile) {
		try {
			// Attempt to parse the saved groups file
			groupsFile = JSON.parse(groupsFile);

			// Check if the retrieved object has the right fields
			if (groupsFile && typeof groupsFile === 'object' && 'groups' in groupsFile) {
				botParams = groupsFile;
			} else {
				// Replace the retrieved object with the default version
				setLocalStorageItem("tc_bot_file", JSON.stringify(defaultGroupsFile));
				botParams = defaultGroupsFile;
			}
		} catch (error) {
			// An error occurred while parsing the saved groups file
			console.error("Error parsing saved groups file:", error);
			resetGroupsFile();
		}
	} else {
		// No saved groups file found, initialize with the default version
		resetGroupsFile();
	}
}

function resetGroupsFile() {
	const defaultCommandsFile = { groups: {} };
	setLocalStorageItem("tc_bot_file", JSON.stringify(defaultGroupsFile));
	botParams = defaultCommandsFile;
	location.reload();
}

function loadCommandsFromStorage() {
	// Check if there is a saved commands file
	let commandsFile = getLocalStorageItem("tc_commands_file", '{"commands":{},"params":{}}');
	if (commandsFile) {
		try {
			// Attempt to parse the saved commands file
			commandsFile = JSON.parse(commandsFile);

			// Check if the retrieved object has the right fields
			if (commandsFile && typeof commandsFile === 'object' && 'commands' in commandsFile && 'params' in commandsFile) {
				commandMap = commandsFile.commands;
				commandParams = commandsFile.params;
			} else {
				// Replace the retrieved object with the default version
				const defaultCommandsFile = { commands: {}, params: {} };
				setLocalStorageItem("tc_commands_file", JSON.stringify(defaultCommandsFile));
				commandMap = defaultCommandsFile.commands;
				commandParams = defaultCommandsFile.params;
			}
		} catch (error) {
			// An error occurred while parsing the saved commands file
			console.error("Error parsing saved commands file:", error);
			resetCommandsFile();
		}
	} else {
		// No saved commands file found, initialize with the default version
		resetCommandsFile();
	}
}

function resetCommandsFile() {
	const defaultCommandsFile = { commands: {}, params: {} };
	setLocalStorageItem("tc_commands_file", JSON.stringify(defaultCommandsFile));
	commandMap = defaultCommandsFile.commands;
	commandParams = defaultCommandsFile.params;
	location.reload();
}



function remote_connect() {
	remote_ws = new WebSocket('wss://rollsocket.com/socket_chat/');
	
	remote_ws.onopen = function () {
		const channelname = document.getElementById("remote-input").value;
		setLocalStorageItem('GLaMS-remoteChannel', channelname);
		const joincommand = {
			"action": "join",
			"room": channelname
		}		
		remote_ws.send(JSON.stringify(joincommand));
	};

	remote_ws.onmessage = function (event) {
		let msg = JSON.parse(event.data);  // Convert the received JSON string into an object

		if (msg.type === "status") {
			if (msg.message === "joined") {
				document.getElementById("remote-input").classList.add("indicator-active")
			}
			if (msg.message === "left") {
				document.getElementById("remote-input").classList.remove("indicator-active")
			}
		} else if (msg.type === "message") {
			if ("command" in msg) {
				console.log(msg.command);
				handleRemoteCommand(msg.command);
			}
		}
	};

	remote_ws.onclose = function (event) {
		document.getElementById("remote-input").classList.remove("indicator-active")
		document.getElementById("remote-input").disabled = false;
	};

}

function handleRemoteCommand(commandString) {
	const commandData = JSON.parse(commandString);
	
	const command = commandData.command;
	const parameter = commandData.parameter || null;
	//console.log(command, parameter);

	if (command === "bot_start") {
		if(!botEnabled) toggleBot();
	}
	if (command === "bot_stop") {
		if(botEnabled) toggleBot();
	}
	if (command === "mpssbot_select") {
		// Load a server bot
		if (parameter) {
			fetch(`./command_files/MPSS/${parameter}.json?2`)
				.then(response => response.text())
				.then(content => {
					setLocalStorageItem("tc_bot_file", content);
					// Reload bot
					bot = new CommandBot();
					botRateChange(document.getElementById("bot-rate").value);
					populateGroups();
				});
		}
	}
	if (command === "bot_select") {
		// Load a server bot
		if (parameter) {
			fetch(`./command_files/${parameter}.json?2`)
				.then(response => response.text())
				.then(content => {
					setLocalStorageItem("tc_bot_file", content);
					// Reload bot
					bot = new CommandBot();
					botRateChange(document.getElementById("bot-rate").value);
					populateGroups();
				});
		}
	}
	if (command === "chat_start") {
		if(!chatEnabled) toggleChat();
	}
	if (command === "chat_stop") {
		if(chatEnabled) toggleChat();
	}
	if (command === "chat_connect") {
		if(parameter) {
			document.getElementById("channel-input").value = parameter;
			tc_connect(parameter);
		}
	}
	if (command === "chat_inject") {
		if(parameter) {
			testMessage(parameter);
		}
	}

}