function setVSYNCDelayFromInput() {
	const inputElement = document.getElementById('vsync-delay');
	if (!inputElement) {
		console.error('Element with id "vsync-delay" not found.');
		return;
	}

	// Get the value of the inputElement and convert it to a number
	let amount = parseInt(inputElement.value, 10);

	// Check if the value is a valid number
	if (isNaN(amount)) {
		console.error('Invalid input value. Please enter a valid number.');
		amount = 0;
	}
	if (amount > 15000) {
		amount = 15000;
		inputElement.value = 15000;
	}

	if (amount < 0) {
		inputElement.value = -1;
		amount = -1;
		sendTextToSwiCC("+VSYNC 0\n")
	} else {
		sendTextToSwiCC("+VSYNC 1\n")
		// Call the setVSYNCDelay function with the parsed amount
		setVSYNCDelay(amount);
	}

	// Save it for next time.
	setLocalStorageItem("vsync_delay", amount);

}

function setRecordingProgressBar(percentage) {
	const progressBar = document.getElementById('progress-record');
	const progressLabel = document.getElementById('progress-label-record');

	progressBar.style.width = percentage + '%';
	progressLabel.textContent = Math.round(percentage * 10) / 10 + '%';
}

function setPlaybackProgressBar(percentage) {
	const progressBar = document.getElementById('progress-playback');
	const progressLabel = document.getElementById('progress-label-playback');

	progressBar.style.width = percentage + '%';
	progressLabel.textContent = Math.round(percentage * 10) / 10 + '%';
}


function playbackMonitor() {
	if (queuePlaying) {
		setTimeout(playbackMonitor, 1000);
		setPlaybackProgressBar(queueProgress);
	} else {
		document.getElementById("run-btn").innerText = "Run";
		setPlaybackProgressBar(0);
	}
}

function runTAS() {
	if (queuePlaying) {
		// Cancel the queued commands
		commandQueue = [];
		queueConData("", 2, 128, 128, 128, 128);
		updateRunButtonLabel("Run");
	} else {
		saveCommandsToLocalStorage();

		// Clear queue
		commandQueue = [];
		// Initial controller state to get SwiCC into buffer mode.
		queueConData("", 2, 128, 128, 128, 128);

		const inputText = document.getElementById("commands").value;

		// Split the input text into lines
		const lines = inputText.split("\n");

		// Iterate over each line and add commands to the queue
		for (let line of lines) {
			line = line.split(";")[0].trim();
			if (!line) continue;

			// The regex captures:
			// 1. Buttons inside {} (optional)
			// 2. LX, LY, RX, RY inside () if present
			// 3. An optional integer for frameCount
			const regex = /(?:{(.*?)}\s*)?(?:\((\d+)?\s*(\d+)?\s*(\d+)?\s*(\d+)?\))?\s*(\d*)?/g;
			const match = regex.exec(line);

			if (!match) continue;

			const btns = match[1] ? match[1].trim() : "";
			const frameCount = parseInt(match[6]) || 1;

			// Extract and parse LX, LY, RX, RY values or use 128 as default
			const [LX, LY, RX, RY] = [match[2], match[3], match[4], match[5]].map(s => {
				const parsed = parseInt(s);
				return isNaN(parsed) ? 128 : parsed;
			});

			console.log(btns);
			console.log(frameCount);
			console.log(LX, LY, RX, RY);

			queueConData(btns, frameCount, LX, LY, RX, RY);
		}

		// Add a neutral state at the end of the queue
		queueConData("", 2, 128, 128, 128, 128);

		// Send the queued commands to the Switch
		initiateQueueTransfer();

		// Update the display
		updateRunButtonLabel("Cancel");
		// Start the playback monitor
		setTimeout(playbackMonitor, 1000);
	}
}

// Update the label of the "Run" button
function updateRunButtonLabel(label) {
	document.getElementById("run-btn").innerText = `Click to ${label}`;
}

// Update the label of the "Run" button
function updateRunButtonLabel(label) {
	document.getElementById("run-btn").innerText = `Click to ${label}`;
}

function saveCommandsToLocalStorage() {
	var text = encodeURIComponent(document.getElementById("commands").value);
	if (text.length > 10000) { return; }
	setLocalStorageItem("savedCommands", text);
}

function loadCommandsFromLocalStorage() {
	var savedCommands = getLocalStorageItem("savedCommands", "");
	document.getElementById("commands").value = decodeURIComponent(savedCommands);
}
