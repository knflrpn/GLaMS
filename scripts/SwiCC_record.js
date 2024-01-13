let recording = false;
let recordAmtRcvd = 0;

function extractRecordingParams(hexStr) {
	const headerPattern = /^\+[RQ] /;
	const hexPart = hexStr.replace(headerPattern, '');

	const fButtnH = parseInt(hexPart.slice(0, 2), 16);
	const fButtnL = parseInt(hexPart.slice(2, 4), 16);
	const fHAT = parseInt(hexPart.slice(4, 6), 16);
	const sLX = parseInt(hexPart.slice(6, 8), 16);
	const sLY = parseInt(hexPart.slice(8, 10), 16);
	const sRX = parseInt(hexPart.slice(10, 12), 16);
	const sRY = parseInt(hexPart.slice(12, 14), 16);
	const count = parseInt(hexPart.slice(15, 17), 16);

	return { fButtnH, fButtnL, fHAT, sLX, sLY, sRX, sRY, count };
}

function processAndAppendRecording(hexStr) {
	const params = extractRecordingParams(hexStr);

	const buttonString = reverseConvertButtonString(params.fButtnH, params.fButtnL, params.fHAT);

	const rightStickString = (params.sRX !== 128 || params.sRY !== 128) ? ` ${params.sRX} ${params.sRY}` : '';
	const leftStickString = (params.sLX !== 128 || params.sLY !== 128 || rightStickString !== '') ? `${params.sLX} ${params.sLY}` : '';

	const formattedString = `{${buttonString}} (${leftStickString}${rightStickString}) ${params.count}`;

	const textarea = document.getElementById('recorded-inputs');
	textarea.value += formattedString + '\n';
}

function byteStickToFloat(input) {
    return (input - 127.5) / 127.5;
}

function reverseConvertButtonString(fButtnH, fButtnL, fHAT) {
    let btns = [];

    if (fButtnL & 1) {
        btns.push('Y');
    }
    if (fButtnL & 2) {
        btns.push('B');
    }
    if (fButtnL & 4) {
        btns.push('A');
    }
    if (fButtnL & 8) {
        btns.push('X');
    }
    if (fButtnL & 16) {
        btns.push('L1');
    }
    if (fButtnL & 32) {
        btns.push('R1');
    }
    if (fButtnL & 64) {
        btns.push('L2');
    }
    if (fButtnL & 128) {
        btns.push('R2');
    }

    if (fButtnH & 1) {
        btns.push('-');
    }
    if (fButtnH & 2) {
        btns.push('+');
    }
    if (fButtnH & 4) {
        btns.push('SL');
    }
    if (fButtnH & 8) {
        btns.push('SR');
    }
    if (fButtnH & 16) {
        btns.push('H');
    }
    if (fButtnH & 32) {
        btns.push('C');
    }

    switch (fHAT) {
        case 0:
            btns.push('U');
            break;
        case 1:
            btns.push('U', 'R');
            break;
        case 2:
            btns.push('R');
            break;
        case 3:
            btns.push('D', 'R');
            break;
        case 4:
            btns.push('D');
            break;
        case 5:
            btns.push('D', 'L');
            break;
        case 6:
            btns.push('L');
            break;
        case 7:
            btns.push('U', 'L');
            break;
        default:
            // No action needed for fHAT = 8 as it's the neutral position
            break;
    }

    return btns.join(' ');
}

function unpackSwitchCon(swCon) {
    let sendCon = Array(18).fill(false); // Initialize with all false

    // Low byte
    sendCon[2] = (swCon[1] & 1) !== 0;    // Y
    sendCon[0] = (swCon[1] & 2) !== 0;    // B
    sendCon[1] = (swCon[1] & 4) !== 0;    // A
    sendCon[3] = (swCon[1] & 8) !== 0;    // X
    sendCon[4] = (swCon[1] & 16) !== 0;   // L
    sendCon[5] = (swCon[1] & 32) !== 0;   // R
    sendCon[6] = (swCon[1] & 64) !== 0;   // ZL
    sendCon[7] = (swCon[1] & 128) !== 0;  // ZR

    // High byte
    sendCon[8] = (swCon[0] & 1) !== 0;    // -
    sendCon[9] = (swCon[0] & 2) !== 0;    // +
    sendCon[10] = (swCon[0] & 4) !== 0;   // LS
    sendCon[11] = (swCon[0] & 8) !== 0;   // RS
    sendCon[16] = (swCon[0] & 16) !== 0;  // home
    sendCon[17] = (swCon[0] & 32) !== 0;  // capture

    // D-pad
    switch (swCon[2]) {
        case 0: // up
            sendCon[12] = true;
            sendCon[13] = sendCon[14] = sendCon[15] = false;
            break;
        case 1: // up-right
            sendCon[12] = sendCon[15] = true;
            sendCon[13] = sendCon[14] = false;
            break;
        case 2: // etc.
            sendCon[15] = true;
            sendCon[12] = sendCon[13] = sendCon[14] = false;
            break;
        case 3:
            sendCon[15] = sendCon[13] = true;
            sendCon[12] = sendCon[14] = false;
            break;
        case 4:
            sendCon[13] = true;
            sendCon[12] = sendCon[14] = sendCon[15] = false;
            break;
        case 5:
            sendCon[13] = sendCon[14] = true;
            sendCon[12] = sendCon[15] = false;
            break;
        case 6:
            sendCon[14] = true;
            sendCon[12] = sendCon[13] = sendCon[15] = false;
            break;
        case 7:
            sendCon[14] = sendCon[12] = true;
            sendCon[13] = sendCon[15] = false;
            break;
        default:
            sendCon[12] = sendCon[13] = sendCon[14] = sendCon[15] = false;
    }
    return sendCon;
}

function toggleRecordingState() {
	const recBtn = document.getElementById("toggle-recording");
	recording = !recording;

	if (recording) {
		sendTextToSwiCC("+REC 1\n");
		recBtn.textContent = "Stop recording";
		recBtn.classList.add("indicator-active");
		checkRecordingFill();
	} else {
		sendTextToSwiCC("+REC 0\n");
		recBtn.textContent = "Start recording";
		recBtn.classList.remove("indicator-active");
	}
}

function checkRecordingFill() {
	if (recording) {
		sendTextToSwiCC("+GRF \n");
		setTimeout(checkRecordingFill, 500);
	}
}

function getRecording() {
	const textarea = document.getElementById('recorded-inputs');
	textarea.value = "";
	recordAmtRcvd = 0;
	sendTextToSwiCC("+GR 0\n");
}