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

function testMessage(keyword) {
	messageManager.insertMessage('TestMessage', "Testing command " + keyword + "...");
}



/* Mostly editing page functions */

let commandMap = {};
let commandParams = {};

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

function addRow() {
	let row = document.getElementById('stateRowTemplate').cloneNode(true);
	row.id = '';
	row.style = '';
	document.getElementById('stateRows').appendChild(row);
}

function removeRow(button) {
	let row = button.parentNode;
	row.parentNode.removeChild(row);
}

function saveCommand() {
	let keyword = document.getElementById('keyword').value.trim().toLowerCase();
	if ((keyword === "") || !(/^\w+$/.test(keyword))) {
		alert("Keyword must be letters, numbers, and/or underscore.");
		return;
	}
	let length = parseInt(document.getElementById('length').value);
	if (isNaN(length) || (length < 1)) {
		length = 1;
	}
	let probability = parseFloat(document.getElementById('probability').value);
	if (isNaN(probability) || (probability < 0)) {
		probability = 1;
	}

	let rows = document.getElementById('stateRows').children;
	let sequence = Array.from(rows).map(row => {
		let inputs = row.getElementsByTagName('input');
		return {
			buttons: (inputs[0].value || "").toUpperCase(),
			lx: parseFloat(inputs[1].value) || 0,
			ly: parseFloat(inputs[2].value) || 0,
			rx: parseFloat(inputs[3].value) || 0,
			ry: parseFloat(inputs[4].value) || 0,
			frames: parseInt(inputs[5].value) || 1
		};
	});
	commandMap[keyword] = sequence;
	commandParams[keyword] = { length, probability };
	// Save commands file
	setLocalStorageItem("tc_commands_file", JSON.stringify({ commands: commandMap, params: commandParams }));
	// Repopulate display
	loadAllCommands();
	// Empty the form
	loadCommand();
}

function loadCommand(keyword = "", sequence = [{}], params = { length: 1, probability: 1 }) {
	document.getElementById('keyword').value = keyword;
	document.getElementById('length').value = params.length;
	document.getElementById('probability').value = params.probability;
	let stateRows = document.getElementById('stateRows');
	while (stateRows.firstChild) {
		stateRows.removeChild(stateRows.firstChild);
	}
	sequence.forEach(state => {
		addRow();
		let row = stateRows.lastChild;
		let inputs = row.getElementsByTagName('input');
		inputs[0].value = state.buttons || "";
		inputs[1].value = state.lx || 0;
		inputs[2].value = state.ly || 0;
		inputs[3].value = state.rx || 0;
		inputs[4].value = state.ry || 0;
		inputs[5].value = state.frames || 1;
	});
}

function deleteCommand(keyword) {
	delete commandMap[keyword];
	delete commandParams[keyword];
	// Save commands file
	setLocalStorageItem("tc_commands_file", JSON.stringify({ commands: commandMap, params: commandParams }));
	// Repopulate display
	loadAllCommands();
	// Empty the form
	loadCommand();
}

// Initialization function to load all existing commands
function loadAllCommands() {
	const existingCommands = document.getElementById('existingCommands');
	// Empty the div before repopulating it
	existingCommands.innerHTML = '';
	for (let keyword in commandMap) {
		const div = document.createElement('div');
		div.className = 'edit-row';
		const span = document.createElement('span');
		span.className = 'keyword';
		span.textContent = keyword;
		div.appendChild(span);
		const editButton = document.createElement('button');
		editButton.textContent = 'Edit';
		editButton.onclick = () => loadCommand(keyword, commandMap[keyword], commandParams[keyword]);
		div.appendChild(editButton);
		const deleteButton = document.createElement('button');
		deleteButton.textContent = 'Delete';
		deleteButton.className = 'delete-button';
		deleteButton.onclick = () => deleteCommand(keyword);
		div.appendChild(deleteButton);
		existingCommands.appendChild(div);
	}
}

function downloadCommandFile() {
	const element = document.createElement('a');
	const data = getLocalStorageItem("tc_commands_file", '{"commands":{},"params":{}}');
	element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(data));
	element.setAttribute('download', 'commands.json');

	element.style.display = 'none';
	document.body.appendChild(element);

	element.click();

	document.body.removeChild(element);
}

// Existing file upload handling...
function handleFileUpload(event) {
	const file = event.target.files[0];

	if (file) {
		const reader = new FileReader();

		reader.onload = function (event) {
			const fileContent = event.target.result;
			setLocalStorageItem("tc_commands_file", fileContent);
			console.log('File uploaded and saved to localStorage.');
			// Reload page
			location.reload();
		};

		reader.readAsText(file);
	}
}
