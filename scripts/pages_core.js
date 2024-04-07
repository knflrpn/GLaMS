const mapSymbols = Array("B", "A", "Y", "X", "L1", "R1", "L2", "R2", "-", "+", "L3", "R3", "U", "D", "L", "R", "H", "C")

let gamepadNum = 0;

function updateGamepad() {
	// Get new gamepad state
	let prevGamepadState = gamepad.isActive;
	gamepad.pollGamepad();

	if (!gamepad.isActive && prevGamepadState) { // just disconnected
		const gpstat = document.getElementById("status-gamepad");
		gpstat.classList.remove("indicator-active");
		gpstat.innerHTML = "- Gamepad "+gamepadNum+" -<br/>Use gamepad to connect."
		gamepad.isActive = false;
	}
	if (gamepad.isActive && !prevGamepadState) { // just connected
		const gpstat = document.getElementById("status-gamepad");
		gpstat.classList.add("indicator-active");
		gpstat.innerHTML = "- Gamepad "+gamepadNum+" -<br/>Active."
		gamepad.isActive = true;
	}
}

function incrementGamepadNum() {
	gamepadNum++;
	if (gamepadNum > 3) {
		gamepadNum = 0;
	}
	gamepad.gamepadNum = gamepadNum;
	const gpstat = document.getElementById("status-gamepad");
	if (!gamepad.isActive) { // just disconnected
		gpstat.classList.remove("indicator-active");
		gpstat.innerHTML = "- Gamepad "+gamepadNum+" -<br/>Inactive."
	} else {
		gpstat.classList.add("indicator-active");
		gpstat.innerHTML = "- Gamepad "+gamepadNum+" -<br/>Active."
	}
}

function broadcastControllerState(buttons, inSticks, outSticks) {
	let state = {
		'GLaMS-buttons': buttons,
		'GLaMS-curStick': inSticks,
		'GLaMS-modStick': outSticks
	};

	// Send the state to the iframe
	const iframe = document.getElementById('gamepad-iframe');
	iframe.contentWindow.postMessage(state, '*');
}


/**
 * Set a value in local storage.
 * @param {string} name - The name of the item to be set.
 * @param {string} value - The value to be stored.
 */
function setLocalStorageItem(name, value) {
	// Store the value in local storage
	localStorage.setItem(name.toString(), value);
}

/**
 * Retrieve the value of an item in local storage.
 * @param {string} name - The name of the item to retrieve.
 * @param {any} defaultValue - The default valye to return if the item does not exist.
 * @returns {string|null} The value of the item, or default if the item does not exist.
 */
function getLocalStorageItem(name, defaultValue = 0) {
	// Return the value from local storage
	let item = localStorage.getItem(name);
	if (item == null) {
		return defaultValue;
	} else {
		return item;
	}

}
