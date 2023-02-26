// The Switch controller data
let swCon = Array(0, 0, 8, 128, 128, 128, 128);
let swCon_p = Array(0, 0, 0, 0, 0, 0, 0); // previous value sent
// The data last read from the game controller
let curCon = Array(17).fill(false);
let curToggle = Array(17).fill(false);
let curStick = Array(4).fill(128); // already converted to bytes
// The modification array
let modArray = Array(16).fill(0);
let modArrayStale = true;
// The modified gamepad data
let modCon = Array(17).fill(false);
let modStick = Array(4).fill(128);
// Gamepad data to force
let forceCon = Array(16).fill(false);

let gamepad_connected = false;
let gamepad_num = 0;
let stick_to_dpad = 0;
let lag_enabled = false;
let autojump_enabled = false;
const STICK_DEADZONE = 0.08;

let serial_connected = false;
let swicc_detected = false;
let queue_playing = false;

/* Pack the provided controller data into the Switch data format */
function packSwitchCon(skipMod=false) {
    const sendCon = skipMod ? curCon : modCon;
    const sendStick = skipMod ? curStick : modStick;
    // Low byte
    swCon[1] = 0;
    if (sendCon[2]) swCon[1] += 1;   // Y
    if (sendCon[0]) swCon[1] += 2;   // B
    if (sendCon[1]) swCon[1] += 4;   // A
    if (sendCon[3]) swCon[1] += 8;   // X
    if (sendCon[4]) swCon[1] += 16;  // L
    if (sendCon[5]) swCon[1] += 32;  // R
    if (sendCon[6]) swCon[1] += 64;  // ZL
    if (sendCon[7]) swCon[1] += 128; // ZR
    // High byte
    swCon[0] = 0;
    if (sendCon[8]) swCon[0] += 1;   // -
    if (sendCon[9]) swCon[0] += 2;   // +
    if (sendCon[10]) swCon[0] += 4;  // LS
    if (sendCon[11]) swCon[0] += 8;  // RS
    if (sendCon[16]) swCon[0] += 16; // home
    //		if(sendCon[]) swCon[0] += 32;   // capture

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

    // Sticks
    swCon[3] = sendStick[0];
    swCon[4] = sendStick[1];
    swCon[5] = sendStick[2];
    swCon[6] = sendStick[3];

}

/* Send data to SwiCC */
function sendConToSwiCC() {
    let stale = false;
    for (let i = 0; i < 3; i++) { // Check buttons for updated data
        if (swCon[i] !== swCon_p[i]) stale = true; // need to send updated data
        swCon_p[i] = swCon[i];
    }
    if (!stick_to_dpad) { // Also check sticks for updated data
        for (let i = 3; i < swCon.length; i++) {
            if (swCon[i] !== swCon_p[i]) stale = true; // need to send updated data
            swCon_p[i] = swCon[i];
        }
    }
    if (serial.isOpen() && stale) {
        // console.log(swCon);
        let ctype = lag_enabled ? "QL" : "IMM";
        if (stick_to_dpad === 3) {
            // Just send digital button data
            serial.writeLine("+" + ctype + " " + byte2hex(swCon[0]) + byte2hex(swCon[1]) + byte2hex(swCon[2]));
        } else {
            // Include analog sticks
            serial.writeLine("+" + ctype + " " + byte2hex(swCon[0]) + byte2hex(swCon[1]) + byte2hex(swCon[2])
                + byte2hex((stick_to_dpad & 1) ? 128 : swCon[3])
                + byte2hex((stick_to_dpad & 1) ? 128 : swCon[4])
                + byte2hex((stick_to_dpad & 2) ? 128 : swCon[5])
                + byte2hex((stick_to_dpad & 2) ? 128 : swCon[6]));
        }
    }
}

/* Convert a byte into two hex characters. */
function byte2hex(d) {
    if (d > 255) d = 255;
    if (d < 0) d = 0;
    var hex = Number(d).toString(16).toUpperCase();

    if (hex.length < 2) {
        hex = "0" + hex;
    }

    return hex;
}

/* Convert analog stick value [-1,1] to byte centered at 128 */
function stick2Byte(sval) {
    if (Math.abs(sval) <= STICK_DEADZONE) return 128;
    if (sval >= 0) {
        return Math.floor(128 + 128 * (sval - STICK_DEADZONE) / (1 - STICK_DEADZONE));
    } else {
        return Math.floor(128 + 127 * (sval + STICK_DEADZONE) / (1 - STICK_DEADZONE));
    }
}

/* Check gamepad connection */
function checkGamepads() {
    const gamepads = navigator.getGamepads();
    let newStat = false;
    for (let i = 0; i < 4; i++) {
        if (gamepads[i]) {
            gamepad_num = i;
            newStat = true;
            break;
        }
    }

    const gpstat = document.getElementById("status-gamepad");
    if (!gamepad_connected && newStat) { // just connected
        gpstat.classList.add("indicator-active");
        gpstat.innerHTML = "- Gamepad -<br/>Active."
        gamepad_connected = true;
    }
    if (gamepad_connected && !newStat) { // just disconnected
        gpstat.classList.remove("indicator-active");
        gpstat.innerHTML = "- Gamepad -<br/>Use gamepad to connect."
        gamepad_connected = false;
    }
}

/* Read the active controller and put the data into curCon */
function readGamepad(con_index) {
    if (gamepad_connected) {
        const gamepad = navigator.getGamepads()[con_index];
        // Put all the buttons into an array.
        curToggle.fill(false);
        for (let i = 0; i < gamepad.buttons.length; i++) {
            if ((gamepad.buttons[i].value > 0.3) && !curCon[i]) {
                curToggle[i] = true; // new pressed this frame
            }
            curCon[i] = gamepad.buttons[i].value > 0.3;
        }
        // Convert stick values to bytes
        curStick[0] = stick2Byte(gamepad.axes[0]);
        curStick[1] = stick2Byte(gamepad.axes[1]);
        curStick[2] = stick2Byte(gamepad.axes[2]);
        curStick[3] = stick2Byte(gamepad.axes[3]);
    }
    // Convert stick to dpad if desired.
    if (stick_to_dpad & 1) {
        if (curStick[0] < 128 - (0.45 * 128)) curCon[14] = true;
        if (curStick[0] > 128 + (0.45 * 128)) curCon[15] = true;
        if (curStick[1] < 128 - (0.45 * 128)) curCon[12] = true;
        if (curStick[1] > 128 + (0.45 * 128)) curCon[13] = true;
    }
    // Convert stick to abxy if desired.
    if (stick_to_dpad & 2) {
        if (curStick[2] < 128 - (0.45 * 128)) curCon[2] = true;
        if (curStick[2] > 128 + (0.45 * 128)) curCon[1] = true;
        if (curStick[3] < 128 - (0.45 * 128)) curCon[3] = true;
        if (curStick[3] > 128 + (0.45 * 128)) curCon[0] = true;
    }
}


function createMap(N) {
    modArray.fill(0);
    const cells = document.querySelectorAll(".mapcell-active");
    for (let i = 0; i < cells.length; i++) {
        const id = cells[i].id;
        const [x, y] = id.split("-").map(x => parseInt(x, 10));
        modArray[y] += 2 ** x;
    }
}

function applyMap() {
    let modVal = 0;
    for (let i = 0; i < 16; i++) { // for each entry of curCon
        // If this curCon button is pressed, merge the number with modVals
        if (curCon[i]) modVal |= modArray[i];
    }
    //    console.log(modVal);
    // Parse the modVal into the per-button modCon
    modCon.fill(false);
    for (let i = 0; i < 16; i++) { // for each entry of modCon
        if (modVal & 1) modCon[i] = true;
        modVal >>= 1;
    }
    modCon[16] = curCon[16]; // home

    modStick[0] = curStick[0];
    modStick[1] = curStick[1];
    modStick[2] = curStick[2];
    modStick[3] = curStick[3];
}

function applyForce() {
    for (let i = 0; i < 16; i++) { // for each entry of modCon
        if (forceCon[i]) modCon[i] = true;
    }
}

const serial = new Serial();
serial.on(SerialEvents.CONNECTION_OPENED, onSerialConnectionOpened);
serial.on(SerialEvents.CONNECTION_CLOSED, onSerialConnectionClosed);
serial.on(SerialEvents.DATA_RECEIVED, onSerialDataReceived);
serial.on(SerialEvents.ERROR_OCCURRED, onSerialErrorOccurred);

/* Prompt user to connect to serial device */
async function connectToSerialDevice() {
    if (!serial.isOpen()) {
        await serial.connectAndOpen(portFilters = null, serialOptions = { baudRate: 115200 });
    }
}

function onSerialErrorOccurred(eventSender, error) {
    console.log("onSerialErrorOccurred", error);
    serial_connected = false;
    document.getElementById("status-serial").classList.remove("indicator-active");
    document.getElementById("status-serial").innerHTML = "- Comm Port -</br>Click here to connect.";
    swicc_detected = false;
    document.getElementById("status-swicc").classList.remove("indicator-active");
    document.getElementById("status-swicc").innerHTML = "- SwiCC -<br/>Not detected.";
    alert("Could not connect to serial.  Make sure something else (like another page) doesn't have a lock on it.");
}

function onSerialConnectionOpened(eventSender) {
    console.log("onSerialConnectionOpened", eventSender);
    serial_connected = true;
    document.getElementById("status-serial").classList.add("indicator-active");
    document.getElementById("status-serial").innerHTML = "- Comm Port -</br>Active.";
    sendTextToSwiCC("+ID \n");
    setTimeout(checkForSwiCC, 1000);
}
function checkForSwiCC() {
    if (serial_connected && (!swicc_detected)) {
        sendTextToSwiCC("+ID \n");
        setTimeout(checkForSwiCC, 1000);
    }
}

function onSerialConnectionClosed(eventSender) {
    console.log("onSerialConnectionClosed", eventSender);
    serial_connected = false;
    document.getElementById("status-serial").classList.remove("indicator-active");
    document.getElementById("status-serial").innerHTML = "- Comm Port -</br>Click here to connect.";
    swicc_detected = false;
    document.getElementById("status-swicc").classList.remove("indicator-active");
    document.getElementById("status-swicc").innerHTML = "- SwiCC -<br/>Not detected.";
}

function onSerialDataReceived(eventSender, newData) {
    //    console.log(newData);
    // Response of "+SwiCC" is from an ID request.
    if (newData === "+SwiCC") {
        swicc_detected = true;
        document.getElementById("status-swicc").classList.add("indicator-active");
        document.getElementById("status-swicc").innerHTML = "- SwiCC -<br/>Active.";
    }
    // A request for queue fill amount will result in newData being in the form "+GQF NNNN" where the queue fill amount is the number in hex.  When that happens, populate queueFillResponses with the response.
    if (newData.startsWith("+GQF")) {
        let response = parseInt(newData.substring(5).trim(), 16);
        queueFillResponses.push(response);
    }
}

// Send text data over serial
function sendTextToSwiCC(textData) {
    if (serial.isOpen()) {
        serial.writeLine(textData);
    }
}

function convertButtonString(btns) {
    let fButtnL = 0;
    let fButtnH = 0;
    let fHAT = 8;
    const btnArr = btns.split(/[\s,]+/);

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
    if (btnArr.includes('s')) {
        fButtnH += 8;
    }
    if (btnArr.includes('h')) {
        fButtnH += 16;
    }
    if (btnArr.includes('c')) {
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
/* Begins the queue transfer by sending an initial batch and scheduling the fill amount checking. */
function initiateQueueTransfer() {
    queue_playing = true;
    if (commandQueue.length > 0) {
        let numToSend = Math.min(60, commandQueue.length);
        if (numToSend > 0) {
            sendQueueToSwicc(60);
            sendTextToSwiCC("+GQF \n");
            // Wait for 0.25 seconds to get the response from the switch
            setTimeout(continueQueueTransfer, 250);
        }
    }
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
            } else {
                // All done
                console.log("Done sending.");
                queue_playing = false;
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

function playbackMonitor() {
    if (queue_playing) {
        setTimeout(playbackMonitor, 1000);
    } else {
        document.getElementById("run-btn").innerText = "Run";
    }
}

function runTAS() {
    if (queue_playing) {
        // Cancel the queued commands
        commandQueue = [];
        updateRunButtonLabel("Run");
    } else {
        saveCommandsToCookie();

        const inputText = document.getElementById("commands").value;

        // Split the input text into lines
        const lines = inputText.split("\n");

        // Iterate over each line and add commands to the queue
        for (let line of lines) {
            line = line.trim();
            if (!line) continue;

            const btnsRegex = /{(.*?)}(.*)/g;
            const btnsMatch = btnsRegex.exec(line);

            if (!btnsMatch) continue;

            const btns = btnsMatch[1].trim();
            const remaining = btnsMatch[2].trim() || "";
            const frameCount = parseInt(remaining.trim().split(" ")[0]) || 1;
            const [LX, LY, RX, RY] = remaining.split(" ").slice(1, 5).map(s => parseInt(s) || 128);

            queueConData(btns, frameCount, LX, LY, RX, RY);
        }

        // Add a neutral state at the end of the queue
        queueConData("");

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

