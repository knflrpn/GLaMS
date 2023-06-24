class CommandBot {
	constructor(rate = 5) {
		this.botParams = JSON.parse(localStorage.getItem("tc_bot_file") || '{"groups":{}}');
		this.confirmParams();
		this.groupCooldowns = {}; // Cooldown tracking
		this.lastMessageTime = Date.now(); // Cooldown tracking
		this.messageCooldown = 1 / rate * 1000; // Cooldown for the bot to send messages
	}

	// Load bot parameters
	confirmParams() {

		// Loop through each group and ensure all parameters have a value
		for (let group in this.botParams.groups) {
			if (!('min' in this.botParams.groups[group])) {
				this.botParams.groups[group].min = 0; // Default min value
			}

			if (!('max' in this.botParams.groups[group])) {
				this.botParams.groups[group].max = 100; // Default max value
			}

			if (!('probability' in this.botParams.groups[group])) {
				this.botParams.groups[group].probability = 1; // Default probability value
			}

			if (!('exclusive' in this.botParams.groups[group])) {
				this.botParams.groups[group].exclusive = false; // Default exclusive value
			}

			if (!('cooldown' in this.botParams.groups[group])) {
				this.botParams.groups[group].cooldown = 0; // Default cooldown value
			}

			if (!('commands' in this.botParams.groups[group]) || !Array.isArray(this.botParams.groups[group].commands)) {
				this.botParams.groups[group].commands = []; // Default commands value
			}
		}
	}

	// Set the rate
	set rate(rate) {
		this.messageCooldown = 1 / rate * 1000;
	}

	// Check if a group is on cooldown
	isGroupOnCooldown(groupName) {
		let cooldown = this.groupCooldowns[groupName] || 0;
		let now = Date.now() / 1000; // seconds since epoch
		return (now - cooldown) < this.botParams.groups[groupName].cooldown;
	}

	// Choose commands from a group, respecting min, max, and uniqueness
	chooseCommands(groupName) {
		let group = this.botParams.groups[groupName];
		let commandCount = Math.floor(Math.random() * (group.max - group.min + 1)) + group.min;
		let commands = [...group.commands]; // Copy commands
		let chosenCommands = [];

		for (let i = 0; i < commandCount; i++) {
			if (commands.length === 0) break; // No more unique commands left
			let chosenIndex = Math.floor(Math.random() * commands.length);
			let chosenCommand = commands[chosenIndex];
			commands.splice(chosenIndex, 1); // Remove the chosen command
			chosenCommands.push(chosenCommand);
		}
		return chosenCommands;
	}

	// Attempt to fire a group
	fireGroup(groupName) {
		let group = this.botParams.groups[groupName];
		if (Math.random() < group.probability && !this.isGroupOnCooldown(groupName)) {
			this.groupCooldowns[groupName] = Date.now() / 1000; // Update cooldown
			return this.chooseCommands(groupName);
		}
		return []; // Group did not fire
	}

	// Get a message from the bot
	getMessage() {
		if (Date.now() - this.lastMessageTime < this.messageCooldown) return null; // Cooldown not met
		this.lastMessageTime = Date.now(); // Update cooldown
		let message = [];
		let exclusiveFired = false;

		for (let groupName in this.botParams.groups) {
			let group = this.botParams.groups[groupName];

			if (group.exclusive && !exclusiveFired) {
				let commands = this.fireGroup(groupName);
				if (commands.length > 0) {
					exclusiveFired = true;
					message = commands;
					break; // Exit the loop since nothing can be added after an exclusive group fires
				}
			} else if (!group.exclusive && !exclusiveFired) {
				let commands = this.fireGroup(groupName);
				if (commands.length > 0) {
					message = message.concat(commands);
				}
			}
		}

		return message.join(' ');
	}
}
