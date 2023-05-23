// The Switch controller data
let swCon = Array(0, 0, 8, 128, 128, 128, 128);
let swCon_p = Array(0, 0, 0, 0, 0, 0, 0); // previous value sent
// The data last read from the game controller
let curCon = Array(17).fill(false);
let curToggle = Array(17).fill(false);
let curStick = Array(4).fill(0.0); // Stick [-1,1]
// The modification information
let modArray = Array(16).fill(0);  // Button-to-button mapping array
let modArrayStale = true;       // Flag that array needs to be re-pulled from page.
let stick_rotation = 0.0;  // Amount to rotate stick movement (in degrees CW)
// The modified gamepad data
let modCon = Array(17).fill(false);
let modStick = Array(4).fill(0.0);
// Gamepad data to force
let forceCon = Array(16).fill(false);

let gamepad_connected = false;
let gamepad_num = 0;
let stick_to_dpad = 0;  // bitmask; 0th=left, 1st=right
let recording = false;
let lag_enabled = false;
let autojump_enabled = false;
const STICK_DEADZONE = 0.08;

let serial_connected = Array(4).fill(false);
let swicc_detected = Array(4).fill(false);
let swicc_enables = Array(4).fill(true);
let queue_playing = false;

let rec_buff_len = 16384;
let recorded_amt = 0;
let record_amt_rcvd = 0;

const serials = [];
for (let i = 0; i < 4; i++) {
    const serial = new Serial();
    serial.on(SerialEvents.CONNECTION_OPENED, onSerialConnectionOpened);
    serial.on(SerialEvents.CONNECTION_CLOSED, onSerialConnectionClosed);
    serial.on(SerialEvents.DATA_RECEIVED, onSerialDataReceived);
    serial.on(SerialEvents.ERROR_OCCURRED, onSerialErrorOccurred);
    serials.push(serial);
}



function onSerialDataReceived(eventSender, newData) {
    // Response of "+SwiCC" is from an ID request.
    if (newData.startsWith("+SwiCC")) {
        for ( let i=0; i<4; i++ ) {
            if (eventSender == serials[i]) {
                document.getElementById("status-swicc-"+i).classList.add("indicator-active");
                document.getElementById("status-swicc-"+i).innerHTML = "- SwiCC -<br/>Active.";
                swicc_detected[i] = true;
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
        record_amt_rcvd++;
        processAndAppendRecording(newData);
    }

    // There is still recorded data to get
    if (newData.startsWith("+GR 1")) {
        setRecordingProgressBar(record_amt_rcvd / recorded_amt * 100)
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


/* Pack the provided controller data into the Switch data format */
function packSwitchCon(skipMod = false) {
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
    swCon[3] = stick2Byte(sendStick[0]);
    swCon[4] = stick2Byte(sendStick[1]);
    swCon[5] = stick2Byte(sendStick[2]);
    swCon[6] = stick2Byte(sendStick[3]);

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
    for (let i=0; i<4; i++) {
        if (serials[i].isOpen() && swicc_enables[i] && stale) {
            // console.log(swCon);
            let ctype = lag_enabled ? "QL" : "IMM";
            if (stick_to_dpad === 3) {
                // Just send digital button data
                serials[i].writeLine("+" + ctype + " " + byte2hex(swCon[0]) + byte2hex(swCon[1]) + byte2hex(swCon[2]));
            } else {
                // Include analog sticks
                serials[i].writeLine("+" + ctype + " " + byte2hex(swCon[0]) + byte2hex(swCon[1]) + byte2hex(swCon[2])
                    + byte2hex((stick_to_dpad & 1) ? 128 : swCon[3])
                    + byte2hex((stick_to_dpad & 1) ? 128 : swCon[4])
                    + byte2hex((stick_to_dpad & 2) ? 128 : swCon[5])
                    + byte2hex((stick_to_dpad & 2) ? 128 : swCon[6]));
            }
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
        // Retrieve stick values
        curStick[0] = gamepad.axes[0];
        curStick[1] = gamepad.axes[1];
        curStick[2] = gamepad.axes[2];
        curStick[3] = gamepad.axes[3];
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

    let rot_rads = stick_rotation * (Math.PI / 180);
    // Use global stick_rotation to rotate stick values
    modStick[0] = curStick[0] * Math.cos(rot_rads) - curStick[1] * Math.sin(rot_rads);
    modStick[1] = curStick[0] * Math.sin(rot_rads) + curStick[1] * Math.cos(rot_rads);
    modStick[2] = curStick[2] * Math.cos(rot_rads) - curStick[3] * Math.sin(rot_rads);
    modStick[3] = curStick[2] * Math.sin(rot_rads) + curStick[3] * Math.cos(rot_rads);

    // Convert stick to dpad if desired.
    if (stick_to_dpad & 1) {
        if (modStick[0] < -0.45) curCon[14] = true;
        if (modStick[0] > 0.45) curCon[15] = true;
        if (modStick[1] < -0.45) curCon[12] = true;
        if (modStick[1] > 0.45) curCon[13] = true;
    }
    // Convert stick to abxy if desired.
    if (stick_to_dpad & 2) {
        if (modStick[2] < -0.45) curCon[2] = true;
        if (modStick[2] > 0.45) curCon[1] = true;
        if (modStick[3] < -0.45) curCon[3] = true;
        if (modStick[3] > 0.45) curCon[0] = true;
    }

}

function applyForce() {
    for (let i = 0; i < 16; i++) { // for each entry of modCon
        if (forceCon[i]) modCon[i] = true;
    }
}

function toggleSwiCC(num) {
    swicc_enables[num] = !swicc_enables[num];
    if (swicc_enables[num]) {
        document.getElementById("status-swicc-"+num).classList.remove("indicator-stop");
    } else {
        document.getElementById("status-swicc-"+num).classList.add("indicator-stop");
    }
}

/* Prompt user to connect to serial device */
async function connectToSerialDevice() {
    for (let i=0; i<4; i++) {
        if (!serial_connected[i] && !serials[i].isOpen()) {
            await serials[i].connectAndOpen(portFilters = null, serialOptions = { baudRate: 115200 });
            return;
        }
    }
}

function onSerialErrorOccurred(eventSender, error) {
    console.log("onSerialErrorOccurred", error);
    for (let i=0; i<4; i++) {
        if (serials[i]==eventSender) {
            serial_connected[i] = false;
            document.getElementById("status-serial-"+i).classList.remove("indicator-active");
            document.getElementById("status-serial-"+i).innerHTML = "- COM Port -</br>Click here to connect.";
            swicc_detected[i] = false;
            document.getElementById("status-swicc-"+i).classList.remove("indicator-active");
            document.getElementById("status-swicc-"+i).innerHTML = "- SwiCC -<br/>Not detected.";
        }
    }
    alert("Could not connect to serial.  Make sure something else (like another page) doesn't have a lock on it.");
}

function onSerialConnectionOpened(eventSender) {
    for (let i=0; i<4; i++) {
        if (serials[i]==eventSender) {
            serial_connected[i] = true;
            document.getElementById("status-serial-"+i).classList.add("indicator-active");
            document.getElementById("status-serial-"+i).innerHTML = "- COM Port -</br>Active.";
            checkForSwiCC(i);
        }
    }
}
function checkForSwiCC(num) {
    if (serial_connected[num] && (!swicc_detected[num])) {
        sendTextToSwiCC("+ID \n", num);
        setTimeout(function(){checkForSwiCC(num);}, 1000);
    }
}

function onSerialConnectionClosed(eventSender) {
    console.log("onSerialConnectionClosed", eventSender);
    for (let i=0; i<4; i++) {
        if (serials[i]==eventSender) {
            serial_connected[i] = false;
            document.getElementById("status-serial-"+i).classList.remove("indicator-active");
            document.getElementById("status-serial-"+i).innerHTML = "- COM Port -</br>Click here to connect.";
            swicc_detected[i] = false;
            document.getElementById("status-swicc-"+i).classList.remove("indicator-active");
            document.getElementById("status-swicc-"+i).innerHTML = "- SwiCC -<br/>Not detected.";
        }
    }
}

// Send text data over serial
function sendTextToSwiCC(textData, sernum=-1) {
    if (sernum < 0) { // All SwiCCs
        for ( let i=0; i<4; i++) {
            if (swicc_detected[i] && serials[i].isOpen()) {
                serials[i].writeLine(textData);
            }
        }
    } else { //one SwiCC
        if (serials[sernum].isOpen()) {
            serials[sernum].writeLine(textData);
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
    if (amount < 0 || amount > 65535) {
        console.error('The amount must be within the range of 0 to 65535.');
        return;
    }

    // Convert the amount to a 4-digit hexadecimal string with zero-padding
    const hexAmount = amount.toString(16).padStart(4, '0').toUpperCase();

    // Prepare the string to be sent
    const command_string = `+VSD ${hexAmount}\n`;

    // Call the sendTextToSwiCC function with the prepared string
    sendTextToSwiCC(command_string);
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

let commandQueue = Array();
let queueFillResponses = Array()
let initialQueueLength = 1;
/* Begins the queue transfer by sending an initial batch and scheduling the fill amount checking. */
function initiateQueueTransfer() {
    queue_playing = true;
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
    setPlaybackProgressBar(0);
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
                setPlaybackProgressBar(100);
                return;
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
    setPlaybackProgressBar((initialQueueLength - commandQueue.length) / initialQueueLength * 100)
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
            line = line.trim();
            if (!line) continue;

            const btnsRegex = /{(.*?)}(.*)/g;
            const btnsMatch = btnsRegex.exec(line);

            if (!btnsMatch) continue;

            const btns = btnsMatch[1].trim();
            const remaining = btnsMatch[2].trim() || "";
            const frameCount = parseInt(remaining.trim().split(" ")[0]) || 1;
            const [LX, LY, RX, RY] = remaining.split(" ").slice(1, 5).map(s => {
                const parsed = parseInt(s);
                return isNaN(parsed) ? 128 : parsed;
            });

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

function extractRecordingParams(hexStr) {
    const headerPattern = /^\+R /;

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
    const leftStickString = (params.sLX !== 128 || params.sLY !== 128 || rightStickString !== '') ? ` ${params.sLX} ${params.sLY}` : '';

    const formattedString = `{${buttonString}} ${params.count}${leftStickString}${rightStickString}`;

    const textarea = document.getElementById('recorded-inputs');
    textarea.value += formattedString + '\n';
}

function toggleRecordingState() {
    const recBtn = document.getElementById("toggle-recording");
    recording = !recording;
    lag_enabled = recording;

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
    record_amt_rcvd = 0;
    sendTextToSwiCC("+GR 0\n");
}