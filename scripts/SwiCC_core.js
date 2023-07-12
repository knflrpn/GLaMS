const STICK_DEADZONE = 0.08;

let serialConnected = Array(4).fill(false);
let swiccDetected = Array(4).fill(false);
let swiccEnables = Array(4).fill(true);
const serials = [];
let SwiCCIndicators = Array(4).fill(null);  // The HTML elements that indicate SwiCC status

for (let i = 0; i < 4; i++) {
	const serial = new Serial();
	serial.on(SerialEvents.CONNECTION_OPENED, onSerialConnectionOpened);
	serial.on(SerialEvents.CONNECTION_CLOSED, onSerialConnectionClosed);
	serial.on(SerialEvents.DATA_RECEIVED, onSerialDataReceived);
	serial.on(SerialEvents.ERROR_OCCURRED, onSerialErrorOccurred);
	serials.push(serial);
}


function onSerialDataReceived(eventSender, newData) {
	//console.log("Received: " + newData);

	// Response of "+SwiCC" is from an ID request.
	if (newData.startsWith("+SwiCC")) {
		for (let i = 0; i < 4; i++) {
			if (eventSender == serials[i]) {
				if (SwiCCIndicators[i] != null) {
					SwiCCIndicators[i].classList.add("indicator-active");
					SwiCCIndicators[i].innerHTML = "- SwiCC -<br/>Active.";
				}
				swiccDetected[i] = true;
			}
		}
	}
	// Firmware version
	if (newData.startsWith("+VER ")) {
		console.log(newData);
	}

	// A request for queue fill amount will result in newData being in the form "+GQF NNNN" where the queue fill amount is the number in hex.  When that happens, populate queueFillResponses with the response.
	if (newData.startsWith("+GQF ")) {
		let response = parseInt(newData.substring(5).trim(), 16);
		queueFillResponses.push(response);
	}

	// A recorded controller state
	if (newData.startsWith("+R ")) {
		recordAmtRcvd++;
		processAndAppendRecording(newData);
	}

	// There is still recorded data to get
	if (newData.startsWith("+GR 1")) {
		setRecordingProgressBar(recordAmtRcvd / recorded_amt * 100)
		// Request next data
		sendTextToSwiCC("+GR 1\n")
	}

	// There is still recorded data to get
	if (newData.startsWith("+GR 0")) {
		setRecordingProgressBar(100);
	}

	// SwiCC is sending record buffer size
	if (newData.startsWith("+GRB ")) {
		rec_buff_len = parseInt(newData.slice(5, 9), 16);
	}
	// SwiCC is sending record buffer fill
	if (newData.startsWith("+GRF ")) {
		recorded_amt = parseInt(newData.slice(5, 9), 16);
		setRecordingProgressBar(recorded_amt / rec_buff_len * 100)
	}
}

// Version: 2023-06-24

function registerSwiCCIndicator(indicator, index) {
	SwiCCIndicators[index] = indicator;
}

/* Pack the provided controller data into the Switch data format */
function packSwitchCon(conState) {
	let swCon = [0,0,0,0,0,0];
	const sendCon = conState['buttons'];
	// Low byte
	if (sendCon[2]) swCon[1] += 1;   // Y
	if (sendCon[0]) swCon[1] += 2;   // B
	if (sendCon[1]) swCon[1] += 4;   // A
	if (sendCon[3]) swCon[1] += 8;   // X
	if (sendCon[4]) swCon[1] += 16;  // L
	if (sendCon[5]) swCon[1] += 32;  // R
	if (sendCon[6]) swCon[1] += 64;  // ZL
	if (sendCon[7]) swCon[1] += 128; // ZR
	// High byte
	if (sendCon[8]) swCon[0] += 1;   // -
	if (sendCon[9]) swCon[0] += 2;   // +
	if (sendCon[10]) swCon[0] += 4;  // LS
	if (sendCon[11]) swCon[0] += 8;  // RS
	if (sendCon[16]) swCon[0] += 16; // home
	if (sendCon[17]) swCon[0] += 32;   // capture

	// D-pad
	let dpval = sendCon[12] * 1 + sendCon[15] * 2 + sendCon[13] * 4 + sendCon[14] * 8
	switch (dpval) {
		case 1: // up
			swCon[2] = 0;
			break;
		case 3: // up-right
			swCon[2] = 1;
			break;
		case 2: // etc.
			swCon[2] = 2;
			break;
		case 6:
			swCon[2] = 3;
			break;
		case 4:
			swCon[2] = 4;
			break;
		case 12:
			swCon[2] = 5;
			break;
		case 8:
			swCon[2] = 6;
			break;
		case 9:
			swCon[2] = 7;
			break;
		default:
			swCon[2] = 8;
	}

	const sendStick = conState['sticks'];
	// Sticks
	swCon[3] = stick2Byte(sendStick[0]);
	swCon[4] = stick2Byte(sendStick[1]);
	swCon[5] = stick2Byte(sendStick[2]);
	swCon[6] = stick2Byte(sendStick[3]);

	return swCon;

}

/* Send data to SwiCC */
function sendConToSwiCC(swCon, command="IMM") {
	for (let i = 0; i < 4; i++) {
		if (serials[i].isOpen() && swiccEnables[i]) {
			serials[i].writeLine(
				"+" + command + " "
				+ byte2hex(swCon[0])
				+ byte2hex(swCon[1])
				+ byte2hex(swCon[2])
				+ byte2hex(swCon[3])
				+ byte2hex(swCon[4])
				+ byte2hex(swCon[5])
				+ byte2hex(swCon[6])
			);
		}
	}
}

/* Convert a byte into two hex characters. */
function byte2hex(d) {
	if (d > 255) d = 255;
	if (d < 0) d = 0;
	var hex = d.toString(16).toUpperCase();

	if (hex.length < 2) {
		hex = "0" + hex;
	}

	return hex;
}

/* Convert analog stick value [-1,1] to byte centered at 128 */
function stick2Byte(sval) {
	if (Math.abs(sval) <= STICK_DEADZONE) return 128;
	let byte = 0;
	if (sval >= 0) {
		byte = Math.floor(128 + 128 * (sval - STICK_DEADZONE) / (1 - STICK_DEADZONE));
	} else {
		byte = Math.floor(128 + 127 * (sval + STICK_DEADZONE) / (1 - STICK_DEADZONE));
	}
	if (byte > 255) byte = 255;
	if (byte < 0) byte = 0;
	return byte;
}

function toggleSwiCC(num) {
	// Check if this serial is already connected
	if (serials[num].isOpen()) {
		// Pause / play
		swiccEnables[num] = !swiccEnables[num];
		if (SwiCCIndicators[num] == null) {
			return;
		}
		if (swiccEnables[num]) {
			SwiCCIndicators[num].classList.remove("indicator-stop");
		} else {
			SwiCCIndicators[num].classList.add("indicator-stop");
		}
	} else {
		connectToSerialDevice(num);
	}

}

/* Prompt user to connect to serial device */
async function connectToSerialDevice(num) {
	if (!serialConnected[num] && !serials[num].isOpen() && (SwiCCIndicators[num] != null)) {
		await serials[num].connectAndOpen(portFilters = null, serialOptions = { baudRate: 115200 });
		return;
	}
}

function onSerialErrorOccurred(eventSender, error) {
	console.error("onSerialErrorOccurred", error);
	for (let i = 0; i < 4; i++) {
		if (serials[i] == eventSender) {
			serialConnected[i] = false;
			swiccDetected[i] = false;
			if (SwiCCIndicators[i] != null) {
				SwiCCIndicators[i].classList.remove("indicator-active");
				SwiCCIndicators[i].innerHTML = "- SwiCC -<br/>Not detected.";
			}
		}
	}
//	alert("Could not connect to serial.  Make sure something else (like another page) doesn't have a lock on it.");
}

function onSerialConnectionOpened(eventSender) {
	for (let i = 0; i < 4; i++) {
		if (serials[i] == eventSender) {
			serialConnected[i] = true;
			checkForSwiCC(i);
		}
	}
}
function checkForSwiCC(num) {
	if (serialConnected[num] && (!swiccDetected[num])) {
		sendTextToSwiCC("+ID \n", num);
		setTimeout(function () { checkForSwiCC(num); }, 1000);
	}
}

function onSerialConnectionClosed(eventSender) {
	console.log("onSerialConnectionClosed", eventSender);
	for (let i = 0; i < 4; i++) {
		if (serials[i] == eventSender) {
			serialConnected[i] = false;
			swiccDetected[i] = false;
			if (SwiCCIndicators[i] != null) {
				SwiCCIndicators[i].classList.remove("indicator-active");
				SwiCCIndicators[i].innerHTML = "- SwiCC -<br/>Not detected.";
			}
		}
	}
}

function setVSYNCDelay(amount) {
    console.log("Setting VSYNC delay to " + amount);
    // Ensure the input amount is a number
    if (typeof amount !== 'number') {
        console.error('The amount must be a number.');
        return;
    }

    // Check if the input amount is within the acceptable range (0 to 65535)
    if (amount < 0 || amount > 15000) {
        console.error('The amount must be within the range of 0 to 15000.');
        return;
    }

    // Convert the amount to a 4-digit hexadecimal string with zero-padding
    const hexAmount = amount.toString(16).padStart(4, '0').toUpperCase();

    // Prepare the string to be sent
    const command_string = `+VSD ${hexAmount}\n`;

    // Call the sendTextToSwiCC function with the prepared string
    sendTextToSwiCC(command_string);
}

// Send text data over serial
function sendTextToSwiCC(textData, sernum = -1) {
	if (sernum < 0) { // All SwiCCs
		for (let i = 0; i < 4; i++) {
			if (swiccDetected[i] && serials[i].isOpen()) {
				serials[i].writeLine(textData);
			}
		}
	} else { //one SwiCC
		if (serials[sernum].isOpen()) {
			serials[sernum].writeLine(textData);
		}
	}
}

function convertButtonString(btns) {
	let fButtnL = 0;
	let fButtnH = 0;
	let fHAT = 8;
	const btnArr = btns.toUpperCase().split(/[\s,]+/);

	if (btnArr.includes('Y')) {
		fButtnL |= 1;
	}
	if (btnArr.includes('B')) {
		fButtnL |= 2;
	}
	if (btnArr.includes('A')) {
		fButtnL |= 4;
	}
	if (btnArr.includes('X')) {
		fButtnL |= 8;
	}
	if (btnArr.includes('L1')) {
		fButtnL |= 16;
	}
	if (btnArr.includes('R1')) {
		fButtnL |= 32;
	}
	if (btnArr.includes('L2')) {
		fButtnL |= 64;
	}
	if (btnArr.includes('R2')) {
		fButtnL |= 128;
	}

	if (btnArr.includes('-')) {
		fButtnH += 1;
	}
	if (btnArr.includes('+')) {
		fButtnH += 2;
	}
	if (btnArr.includes('SL')) {
		fButtnH += 4;
	}
	if (btnArr.includes('SR')) {
		fButtnH += 8;
	}
	if (btnArr.includes('H')) {
		fButtnH += 16;
	}
	if (btnArr.includes('C')) {
		fButtnH += 32;
	}

	let hatDiag = false;
	if (btnArr.includes('U') && btnArr.includes('R')) {
		fHAT = 1;
		hatDiag = true;
	}
	if (btnArr.includes('D') && btnArr.includes('R')) {
		fHAT = 3;
		hatDiag = true;
	}
	if (btnArr.includes('D') && btnArr.includes('L')) {
		fHAT = 5;
		hatDiag = true;
	}
	if (btnArr.includes('U') && btnArr.includes('L')) {
		fHAT = 7;
		hatDiag = true;
	}

	if (!hatDiag) {
		if (btnArr.includes('U')) {
			fHAT = 0;
		}
		if (btnArr.includes('R')) {
			fHAT = 2;
		}
		if (btnArr.includes('D')) {
			fHAT = 4;
		}
		if (btnArr.includes('L')) {
			fHAT = 6;
		}
	}

	return { fButtnH, fButtnL, fHAT };
}


let commandQueue = Array();
let queueFillResponses = Array()
let initialQueueLength = 1;
let queuePlaying = false;
let playbackProgress = 0;
/* Begins the queue transfer by sending an initial batch and scheduling checking the fill amount. */
function initiateQueueTransfer() {
	queuePlaying = true;
	if (commandQueue.length > 0) {
		initialQueueLength = commandQueue.length;
		let numToSend = Math.min(60, commandQueue.length);
		if (numToSend > 0) {
			sendQueueToSwicc(60);
			sendTextToSwiCC("+GQF \n");
			// Wait for 0.25 seconds to get the response from the switch
			setTimeout(continueQueueTransfer, 250);
		}
	}
	setPlaybackProgress(0);
}

function setPlaybackProgress(percent) {
	queueProgress = percent;
}

/* Checks the returned queue fill amount and sends the next batch if needed. */
function continueQueueTransfer() {
	// Check if there has been a response
	let response;
	if (queueFillResponses.length > 0) {
		// Get the latest fill amount
		while (queueFillResponses.length > 0) response = queueFillResponses.shift();
		if (response < 60) {
			// Need to send some more
			if (commandQueue.length > 0) {
				sendQueueToSwicc(60);
				setTimeout(continueQueueTransfer, 250);
				setPlaybackProgress(Math.min((initialQueueLength - commandQueue.length) / initialQueueLength * 100, 99))
			} else {
				// Done sending; wait for the queue to empty
				if (response <= 1) {
					console.log("Done sending.");
					setPlaybackProgress(100);
					queuePlaying = false;
					return;
				} else {
					setPlaybackProgress(99);
					setTimeout(continueQueueTransfer, 100);
				}
			}
		} else {
			// Queue decently full.
			setTimeout(continueQueueTransfer, 200);
		}
	} else {
		// Haven't heard back yet.
		setTimeout(continueQueueTransfer, 100);
	}
	// Ask for queue amount again
	sendTextToSwiCC("+GQF \n");
}

/* Sends (at most) the specified number of queue entries to the switch */
function sendQueueToSwicc(maxNumToSend) {
	while ((maxNumToSend > 0) && (commandQueue.length > 0)) {
		const element = commandQueue.shift();
		sendTextToSwiCC(element);
		maxNumToSend--;
	}
}

/* Queues a controller state for frameCount frames */
function queueConData(btns, frameCount = 1, LX = 128, LY = 128, RX = 128, RY = 128) {
	while (frameCount > 0) {
		const { fButtnH, fButtnL, fHAT } = convertButtonString(btns);
		commandQueue.push("+Q " + byte2hex(fButtnH) + byte2hex(fButtnL) + byte2hex(fHAT)
			+ byte2hex(LX) + byte2hex(LY) + byte2hex(RX) + byte2hex(RY) + "\n");

		frameCount--;
	}
}

