
let stick2dpad = 0; // 1=left, 2=right, 3=both
let autojump_enabled = false;
let randIntervalId = null;
let buttonMapStale = true;
let spamEnabled = 0; // 0, 1, or 2 for disabled, enabled, or enabled and on
let turboEnabled = false;
let ws_ws = null; // sync websocket
let ws_broadcast, ws_listen = false;

/**
 * Build the button mapping table and append it to the "mapping-container" element.
 */
function buildMappingTable() {
	const mappingContainer = document.getElementById("mapping-container");

	// Create table header
	const tableHeader = document.createElement("div");
	tableHeader.classList.add("tablerow");

	const IN = 16;
	const OUT = 18;
	// Add top labels to the table header
	for (let i = 0; i < IN; i++) {
		const labelCell = document.createElement("div");
		labelCell.classList.add("tablecell-label");
		labelCell.id = `lin-${i}`;
		labelCell.innerText = mapSymbols[i];
		tableHeader.appendChild(labelCell);
	}

	// Create corner cell
	const cornerCell = document.createElement("div");
	cornerCell.classList.add("tablecell-invisible");
	tableHeader.appendChild(cornerCell);

	// Append table header to mapping container
	mappingContainer.appendChild(tableHeader);

	// Create rows for the mapping table
	for (let i = 0; i < OUT; i++) {
		const row = document.createElement("div");
		row.classList.add("tablerow");

		// Create cells for each row
		for (let j = 0; j < IN; j++) {
			const cell = document.createElement("div");
			cell.classList.add("tablecell", "mapcell");
			// Make cells of the diagonal active by default
			if (i === j) {
				cell.classList.add("mapcell-active", "tablecell-active");
			}
			cell.id = `${i}-${j}`;
			cell.onclick = () => tableCellClicked(cell.id);
			row.appendChild(cell);
		}

		// Add label to the right of the row
		const labelCell = document.createElement("div");
		labelCell.classList.add("tablecell-label");
		labelCell.id = `lout-${i}`;
		labelCell.innerText = mapSymbols[i];
		row.appendChild(labelCell);

		// Append the row to the mapping container
		mappingContainer.appendChild(row);
	}
}

let toRandomize = Array(0, 1, 2, 3, 4, 5, 6, 7, 12, 13, 14, 15);
/**
 * Build the randomize table and append it to the "randomize-container" element.
 */
function buildRandomizeTable() {
	const mappingContainer = document.getElementById("randomize-container");

	// Create table header
	const tableHeader = document.createElement("div");
	tableHeader.classList.add("tablerow");

	const N = 16;
	// Add top labels to the table header
	for (let i = 0; i < N; i++) {
		const labelCell = document.createElement("div");
		labelCell.classList.add("tablecell-label");
		labelCell.innerText = mapSymbols[i];
		tableHeader.appendChild(labelCell);
	}

	// Append table header to mapping container
	mappingContainer.appendChild(tableHeader);

	// Create row for the randomize table
	const row = document.createElement("div");
	row.classList.add("tablerow");

	// Create cells for the row
	for (let i = 0; i < N; i++) {
		const cell = document.createElement("div");
		cell.classList.add("tablecell", "randcell");
		if (toRandomize.indexOf(i) !== -1) {
			cell.classList.add("randcell-active", "tablecell-active");
		}
		cell.id = `rand-${i}`;
		cell.onclick = () => tableCellClicked(cell.id);
		row.appendChild(cell);
	}

	// Append the row to the mapping container
	mappingContainer.appendChild(row);
}

/**
 * Build the auto table and append it to the "auto-container" element.
 */
function buildAutoTable() {
	const mappingContainer = document.getElementById("auto-container");

	// Create table header
	const tableHeader = document.createElement("div");
	tableHeader.classList.add("tablerow");

	const N = 16;
	// Add top labels to the table header
	for (let i = 0; i < N; i++) {
		const labelCell = document.createElement("div");
		labelCell.classList.add("tablecell-label");
		labelCell.innerText = mapSymbols[i];
		tableHeader.appendChild(labelCell);
	}

	// Append table header to mapping container
	mappingContainer.appendChild(tableHeader);

	// Create row for the auto table
	const row = document.createElement("div");
	row.classList.add("tablerow");

	// Create cells for the row
	for (let i = 0; i < N; i++) {
		const cell = document.createElement("div");
		cell.classList.add("tablecell", "autocell");
		cell.id = `auto-${i}`;
		cell.onclick = () => tableCellClicked(cell.id);
		row.appendChild(cell);
	}

	// Append the row to the mapping container
	mappingContainer.appendChild(row);
}



/**
 * Toggle the "tablecell-active" class on the clicked cell and any related classes.
 * @param {string} id - The ID of the clicked cell.
 */
function tableCellClicked(id) {
	const cell = document.getElementById(id);

	// Toggle the "tablecell-active" class on the clicked cell
	cell.classList.toggle("tablecell-active");

	// Toggle the "randcell-active" class on the clicked cell if it is a randomize table cell
	if (cell.classList.contains("randcell")) {
		cell.classList.toggle("randcell-active");
	}

	// Toggle the "mapcell-active" class on the clicked cell if it is a mapping table cell
	// and mark the mod array as stale
	if (cell.classList.contains("mapcell")) {
		cell.classList.toggle("mapcell-active");
		// Flag that button map needs to be reparsed.
		buttonMapStale = true;
	}

	// Toggle the "autocell-active" class on the clicked cell if it is an automatic mapping table cell
	if (cell.classList.contains("autocell")) {
		cell.classList.toggle("autocell-active");
	}
}

function broadcastMapping() {
	// Build the mapping array
	const mapping = [];
	for (let i = 0; i < 16; i++) {
		let found = false;
		for (let j = 0; j < 16; j++) {
			const cell = document.getElementById(`${i}-${j}`);
			if (cell && cell.classList.contains("mapcell-active")) {
				mapping.push(j);
				found = true;
				break;
			 }
		}
		if (!found) {
			mapping.push(-1);
		}
	}
	// Save in local storage
	setLocalStorageItem("btn-mapping", JSON.stringify(mapping));
}

/**
 * Reset the mapping table.
 */
function resetMap() {
	buttonMapStale = true;
	// Reset the mapping table to its default state
	for (let i = 0; i < 18; i++) {
		for (let j = 0; j < 16; j++) {
			const cell = document.getElementById(`${i}-${j}`);
			if (i === j) {
				cell.classList.add("mapcell-active", "tablecell-active");
			} else {
				cell.classList.remove("mapcell-active", "tablecell-active");
			}
		}
	}
}

/**
 * Randomize the mapping table by shuffling the active cells in the randomize table.
 * @param {boolean} reset - Whether to reset the mapping table to its default state.
 * @param {number} shuffleLimit - The number of cells to shuffle. If not provided, all cells will be shuffled.
 */
function randomizeMap(shuffleLimit = null) {
	const cells = document.querySelectorAll(".mapcell");

	// Flag that button map needs to be reparsed.
	buttonMapStale = true;

	// Get the active cells from the randomize table
	const enRand = document.querySelectorAll(".randcell-active");
	let eligible = [];
	for (let i = 0; i < enRand.length; i++) {
		const cell = enRand[i];
		const ind = Number(cell.id.split("-")[1]);
		eligible.push(ind);
	}

	// Shuffle the active cells before picking the ones to shuffle
	let toRandomize = shuffleArray_FY(eligible);
	// Limit the number of cells to be shuffled
	if (shuffleLimit !== null) {
		if (shuffleLimit < 2) shuffleLimit = 2;
		toRandomize = toRandomize.slice(0, shuffleLimit);
	}

	// Shuffle the indices to be randomly correlated
	//	const shuffled = shuffleArray(eligible);
	const shuffled = shuffleArray_forceChange([...toRandomize]);

	// Temporary storage to hold the new column data 
	let tempColumns = new Array(toRandomize.length).fill(null).map(() => new Array(16).fill(false));

	// Store the column data we want to move in the temporary storage
	for (let i = 0; i < toRandomize.length; i++) {
		for (let y = 0; y < 16; y++) {
			const cellFrom = document.getElementById(`${y}-${toRandomize[i]}`);
			tempColumns[i][y] = cellFrom.classList.contains("tablecell-active");
		}
	}

	// Apply the stored data from temporary storage to the new columns
	for (let i = 0; i < toRandomize.length; i++) {
		for (let y = 0; y < 16; y++) {
			const cellTo = document.getElementById(`${y}-${shuffled[i]}`);
			cellTo.classList.remove("tablecell-active", "mapcell-active");  // Clear any existing classes

			// If the stored data is active, add the required classes
			if (tempColumns[i][y]) {
				cellTo.classList.add("tablecell-active", "mapcell-active");
			}
		}
	}

}

function shuffleArray_forceChange(array) {
    for (let i = 0; i < (array.length-1); i++) {
        // Generate a random index between i and the end of the array
        const randomIndex = i + 1 + Math.floor(Math.random() * (array.length - i - 1));
        // Swap the current element with the randomly picked element
        [array[i], array[randomIndex]] = [array[randomIndex], array[i]];
    }
    return array;
}


function shuffleArray_FY(array) {
	for (let i = array.length - 1; i > 0; i--) {
		let j = Math.floor(Math.random() * (i + 1));
		[array[i], array[j]] = [array[j], array[i]];
	}
	return array;
}




function toggleStick2Dpad(side) {
	stick2dpad ^= side;
	let LR = [false, false];
	const elL = document.getElementById('status-stick2dpad');
	if (stick2dpad & 1) {
		elL.classList.add('indicator-active');
		LR[0] = true;
	} else {
		elL.classList.remove('indicator-active');
	}
	const elR = document.getElementById('status-stick2abxy');
	if (stick2dpad & 2) {
		elR.classList.add('indicator-active');
		LR[1] = true;
	} else {
		elR.classList.remove('indicator-active');
	}
	gamepad.stickToButtons(LR[0], LR[1]);
}



function getButtonMap() {
	const cells = document.querySelectorAll(".mapcell-active");
	let modArray = new Array(18).fill(false).map(() => new Array(18).fill(false));
	for (let i = 0; i < cells.length; i++) {
		const id = cells[i].id;
		const [x, y] = id.split("-").map(x => parseInt(x, 10));
		modArray[x][y] = true;
	}
	// Home and capture are always mapped to themselves
	modArray[16][16] = true;
	modArray[17][17] = true;
	return modArray;
}



function getSpamEnables() {
	const cells = document.querySelectorAll(".autocell-active");
	let spamArray = new Array(16).fill(false);
	for (let i = 0; i < cells.length; i++) {
		const id = cells[i].id;
		const x = parseInt(id.split("-")[1], 10);
		spamArray[x] = true;
	}
	return spamArray;
}



function highlightOnMap(ins, outs) {
	for (let i = 0; i < 16; i++) {
		const linCell = document.getElementById(`lin-${i}`);

		if (ins[i]) {
			linCell.classList.add('tablecell-highlight');
		} else {
			linCell.classList.remove('tablecell-highlight');
		}
	}
	for (let i = 0; i < 18; i++) {
		const loutCell = document.getElementById(`lout-${i}`);
		if (outs[i]) {
			loutCell.classList.add('tablecell-highlight');
		} else {
			loutCell.classList.remove('tablecell-highlight');
		}
	}
}

/**
 * Toggles the auto button spam setting
 */
function toggleButtonSpam() {
	const statusElement = document.getElementById("status-buttonspam");
	statusElement.classList.toggle("indicator-active");
}

function addDelay(addAmount = 0) {
	const delayInput = document.getElementById("delay-num");
	let delayAmount = parseFloat(delayInput.value);
	if (isNaN(delayAmount)) { delayAmount = 0; }
	delayAmount += addAmount;
	if (delayAmount <= 0) {
		delayAmount = 0;
	} else {
		if (delayAmount > 2000) delayAmount = 2000;
	}
	delayInput.value = Math.round(delayAmount * 100) / 100;
	gamepad.setDelay(delayAmount);
}


function toggleCooldown(style) {
	const statusLocal = document.getElementById("local-cooldown");
	const statusGlobal = document.getElementById("global-cooldown");
	if (style === "local") {
		statusLocal.classList.toggle("indicator-active");
		statusGlobal.classList.remove("indicator-active");
	} else if (style === "global") {
		statusGlobal.classList.toggle("indicator-active");
		statusLocal.classList.remove("indicator-active");
	}
	gamepad.localCooldown = statusLocal.classList.contains("indicator-active");
	gamepad.globalCooldown = statusGlobal.classList.contains("indicator-active");

	const timeinput = document.getElementById("cooldown-num");
	let cooldownAmount = parseFloat(timeinput.value);
	if (isNaN(cooldownAmount)) { cooldownAmount = 0; }
	if (cooldownAmount <= 0) {
		cooldownAmount = 0;
	} else {
		if (cooldownAmount > 10000) cooldownAmount = 10000;
	}
	timeinput.value = Math.round(cooldownAmount);
	gamepad.cooldownTime = cooldownAmount;
}


/**
 * Set the rotation amount for the sticks.
 */
function setRotation(addAmount = 0) {
	// Get the rotation amount from the input field
	const rotInput = document.getElementById("rotate-amt");
	stick_rotation = parseInt(rotInput.value);
	if (isNaN(stick_rotation)) {
		stick_rotation = 0;
	}
	stick_rotation += addAmount;
	if (stick_rotation < -180) {
		stick_rotation = -180;
	}
	else if (stick_rotation > 180) {
		stick_rotation = 180;
	}
	rotInput.value = stick_rotation;
	gamepad.setRotation(stick_rotation);
}


/**
 * Perform a single randomization with the specified number of buttons
 */
function singleLimitedRandomize() {
	let num = parseInt(document.querySelector('#rand-num').value);

	// If user input is invalid or less than or equal to zero, return the default interval.
	if (isNaN(num) || num <= 2) {
		num = 2;  // reset invalid input
		document.querySelector('#rand-num').value = 2;
	}

	randomizeMap(num);
}

/**
 * Enable or disable the periodic randomization based on the current button state.
 * If active, disables randomization; if inactive, enables randomization.
 */
function timedRandomize() {
	const button = document.getElementById('enable-timed-random');

	// If randomization is currently active, disable it.
	if (button.classList.contains('indicator-active')) {
		button.classList.remove('indicator-active');
		button.textContent = 'Enable Periodic Randomization';
		clearInterval(randIntervalId);
		randIntervalId = null;
	} else {
		// If randomization is currently inactive, enable it.
		button.classList.add('indicator-active');
		button.textContent = 'Disable Periodic Randomization';
		randIntervalId = setInterval(timedRandHelper, getRandInterval());
	}
}

/**
 * Helper function to be called periodically.
 * Randomizes the map, then reschedules itself to maintain the updated interval.
 */
function timedRandHelper() {
	let num = parseInt(document.querySelector('#rand-num').value);

	// If user input is invalid or less than or equal to zero, return the default interval.
	if (isNaN(num) || num <= 2) {
		num = 2;  // reset invalid input
		document.querySelector('#rand-num').value = 2;
	}

	randomizeMap(num);
	if (randIntervalId) {
		clearInterval(randIntervalId);
		randIntervalId = setInterval(timedRandHelper, getRandInterval());
	}
}

/**
 * Get the interval from the input box, in milliseconds.
 * If the input is invalid or less than or equal to zero, resets it to '10' and returns the default value of 10000 milliseconds.
 * @return {number} - Interval in milliseconds.
 */
function getRandInterval() {
	const timeInput = document.querySelector('#rand-time');
	const time = parseFloat(timeInput.value);

	// If user input is invalid or less than or equal to zero, return the default interval.
	if (isNaN(time) || time <= 0) {
		timeInput.value = '10';  // reset invalid input
		return 10000;  // default to 10 seconds
	}

	// Convert the valid user input from seconds to milliseconds and return it.
	return time * 1000;
}

function updateProgressBar(percentage) {
	const progressBar = document.getElementById('progress-playback');
	const progressLabel = document.getElementById('progress-label-playback');

	progressBar.style.width = percentage + '%';
	progressLabel.textContent = Math.round(percentage * 10) / 10 + '%';
}

function toggleButtonSpam() {
	if (spamEnabled > 0) {
		spamEnabled = 0;
		gamepad.disableSpam();
	} else {
		spamEnabled = 1;
	}
	const statusElement = document.getElementById("toggle-button-spam");
	if (spamEnabled > 0) {
		statusElement.classList.add("indicator-active");
	} else {
		statusElement.classList.remove("indicator-active");
		const spamstat = document.getElementById("status-spam");
		spamstat.classList.remove("indicator-active");
		spamstat.innerHTML = "off";
	}
}

function toggleTurbo() {
	turboEnabled = !turboEnabled;
	const statusElement = document.getElementById("toggle-turbo");
	if (turboEnabled) {
		statusElement.classList.add("indicator-active");
	} else {
		statusElement.classList.remove("indicator-active");
		const spamstat = document.getElementById("status-spam");
		spamstat.classList.remove("indicator-active");
		spamstat.innerHTML = "off";
	}
}

/* Queues the level ID entered in the box. */
function queueID() {
	const idbox = document.getElementById("level-id");
	queueIDPath(idbox.value);
	initiateQueueTransfer();
	idbox.value = "";
}

/* Calculates the optimal path around the keyboard to enter some text. */
function queueIDPath(idText) {
	const syms = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '', '', 'Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', '', '', 'A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', '&', '', '', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', '*', '#', '!', '', ''];
	const keys_per_row = 12; // 12 per row
	const frames_per_press = 4;
	idText = idText.replaceAll('-', '').toUpperCase();

	let cx = 0;
	let cy = 0;

	// press 'A' to enter the keyboard
	//    queueConData('A', 2);
	// wait a second before starting to type the code
	//    queueConData(' ', 70);
	for (const c of idText) {
		// find the x,y coordinate of the symbol on the keyboard
		const dx = syms.indexOf(c) % keys_per_row;
		const dy = Math.floor(syms.indexOf(c) / keys_per_row);
		// calculate the difference in x and y from the current position to the symbol's position
		let ex = dx - cx;
		let ey = dy - cy;
		console.log(`${ex},${ey}`);

		let udb;
		let uds;
		// decide up or down to move to the symbol
		if (ey < 0) {
			udb = 'U';
			uds = 0;
			ey = -ey;
		} else {
			udb = 'D';
			uds = 255;
		}
		// press the up or down button and move the stick to move up or down by 2 units at a time
		for (let i = 0; i < Math.floor(ey / 2); i++) {
			queueConData(udb, frames_per_press);
			queueConData(' ', frames_per_press, 128, uds);
		}
		// if there's a remainder, move one more unit in the same direction
		if (ey % 2 === 1) {
			queueConData(udb, frames_per_press);
		}

		// Check if left or right is better.
		if (Math.abs(ex) > keys_per_row / 2) {
			ex -= ex > 0 ? keys_per_row : -keys_per_row;
		}
		console.log(ex);
		// decide left or right to move to the symbol
		if (ex < 0) {
			udb = 'L';
			uds = 0;
			ex = -ex;
		} else {
			udb = 'R';
			uds = 255;
		}
		// press the left or right button and move the stick to move left or right by 2 units at a time
		for (let i = 0; i < Math.floor(ex / 2); i++) {
			queueConData(udb, frames_per_press);
			queueConData(' ', frames_per_press, uds);
		}
		// if there's a remainder, move one more unit in the same direction
		if (ex % 2 === 1) {
			queueConData(udb, frames_per_press);
		}

		// update the current position to the symbol's position
		cx = dx;
		cy = dy;
		// press 'A' to select the symbol
		queueConData('A', frames_per_press);
		// wait nfrm before pressing the next button
		queueConData(' ', frames_per_press);
	}

}

/**
 * Encode active cells into a comma-separated string.
 * @returns {string} - A string of cell IDs separated by commas.
 */
function encodeActiveCells() {
    const mappingContainer = document.getElementById("mapping-container");
    const activeCells = Array.from(mappingContainer.querySelectorAll(".tablecell-active"))
                             .map(cell => cell.id);
    return activeCells.join(",");
}

/**
 * Set the state of the table cells using an encoded string of active cells.
 * @param {string} encodedString - A string of cell IDs separated by commas.
 */
function decodeActiveCells(encodedString) {
    // First, reset all cells to inactive state
    const mappingContainer = document.getElementById("mapping-container");
    const allCells = Array.from(mappingContainer.querySelectorAll(".mapcell"));
    allCells.forEach(cell => {
        cell.classList.remove("tablecell-active");
        cell.classList.remove("mapcell-active");
    });

    // Set the cells from the encoded string to active state
    const activeCellIDs = encodedString.split(",");
    activeCellIDs.forEach(id => {
        const cell = document.getElementById(id);
        if (cell) {
            cell.classList.add("tablecell-active");
            cell.classList.add("mapcell-active");
        }
    });
	buttonMapStale = true;
}


function websync_connect() {
	ws_ws = new WebSocket('wss://rollsocket.com/socket_chat/');
	
	ws_ws.onopen = function () {
		const channelname = document.getElementById("sync-channel").value;
		const joincommand = {
			"action": "join",
			"room": channelname
		}		
		ws_ws.send(JSON.stringify(joincommand));
		// issue a pull on connect
		const pullcommand = {
			"action": "pull",
		}		
		ws_ws.send(JSON.stringify(pullcommand));
	};

	ws_ws.onmessage = function (event) {
		let msg = JSON.parse(event.data);  // Convert the received JSON string into an object

		if (msg.type === "status") {
			if (msg.message === "joined") {
				document.getElementById("sync-channel").classList.add("indicator-active")
			}
			if (msg.message === "left") {
				document.getElementById("sync-channel").classList.remove("indicator-active")
			}
			if (msg.message === "pull" && ws_broadcast) { // I'm the broadcaster and a pull is issued
				broadcastMapSync();
			}
		} else if (msg.type === "message") {
			if (ws_listen && "map" in msg) { 
				decodeActiveCells(msg.map);
			}
		}
	};

	ws_ws.onclose = function (event) {
		document.getElementById("enable-sync-send").classList.remove("indicator-active");
		document.getElementById("enable-sync-rcv").classList.remove("indicator-active");
		document.getElementById("sync-channel").classList.remove("indicator-active")
		document.getElementById("sync-channel").disabled = false;
		ws_broadcast = false;
		ws_listen = false;
	};

}

function onChannelChanged() {
	if (ws_ws !== null && ws_ws.readyState === ws_ws.OPEN) {
		ws_ws.send('{"action":"leave"}');
	}
}

function broadcastMapSync() {
	if (ws_broadcast && ws_ws !== null && ws_ws.readyState === ws_ws.OPEN) {
		const channelname = document.getElementById("sync-channel").value;
		const message = {
			"action": "message",
			"room": channelname,
			"map": encodeActiveCells(),
		}		
		ws_ws.send(JSON.stringify(message));
	}
}

function toggleSync(broadcast) {
	if (broadcast) { // clicked broadcast
		// need to turn off listening
		const listenBtn = document.getElementById("enable-sync-rcv");
		listenBtn.classList.remove("indicator-active");
		ws_listen = false;
		if (ws_broadcast) { // already broadcasting; turn off
			const broadcastBtn = document.getElementById("enable-sync-send");
			broadcastBtn.classList.remove("indicator-active");
			const channelBox = document.getElementById("sync-channel");
			channelBox.disabled = false;
			ws_broadcast = false;						
		} else { // not broadcasting; turn on
			const broadcastBtn = document.getElementById("enable-sync-send");
			broadcastBtn.classList.add("indicator-active");
			const channelBox = document.getElementById("sync-channel");
			channelBox.disabled = true;
			ws_broadcast = true;
			broadcastMapSync();
		}
	} else { // clicked listen
		// need to turn off sending
		const broadcastBtn = document.getElementById("enable-sync-send");
		broadcastBtn.classList.remove("indicator-active");
		ws_broadcast = false;
		if (ws_listen) { // already listening; turn off
			const listenBtn = document.getElementById("enable-sync-rcv");
			listenBtn.classList.remove("indicator-active");
			const channelBox = document.getElementById("sync-channel");
			channelBox.disabled = false;
			ws_listen = false;						
		} else { // not listening; turn on
			const listenBtn = document.getElementById("enable-sync-rcv");
			listenBtn.classList.add("indicator-active");
			const channelBox = document.getElementById("sync-channel");
			channelBox.disabled = true;
			ws_listen = true;								
		}
	}

	if (!(ws_ws !== null && ws_ws.readyState === ws_ws.OPEN)) {
		websync_connect();
	} else {
		ws_ws.onopen();
	}

}