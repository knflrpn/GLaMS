const mapSymbols = Array("B", "A", "Y", "X", "L1", "R1", "L2", "R2", "-", "+", "SL", "SR", "U", "D", "L", "R")
/**
 * Build the button mapping table and append it to the "mapping-container" element.
 * @param {number} N - The number of rows and columns in the table. Default value is 16.
 */
function buildMappingTable(N = 16) {
    const mappingContainer = document.getElementById("mapping-container");

    // Create table header
    const tableHeader = document.createElement("div");
    tableHeader.classList.add("tablerow");

    // Add top labels to the table header
    for (let i = 0; i < N; i++) {
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
    for (let i = 0; i < N; i++) {
        const row = document.createElement("div");
        row.classList.add("tablerow");

        // Create cells for each row
        for (let j = 0; j < N; j++) {
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
 * @param {number} N - The number of cells in the table. Default value is 16.
 */
function buildRandomizeTable(N = 16) {
    const mappingContainer = document.getElementById("randomize-container");

    // Create table header
    const tableHeader = document.createElement("div");
    tableHeader.classList.add("tablerow");

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
 * @param {number} N - The number of cells in the table. Default value is 16.
 */
function buildAutoTable(N = 16) {
    const mappingContainer = document.getElementById("auto-container");

    // Create table header
    const tableHeader = document.createElement("div");
    tableHeader.classList.add("tablerow");

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
        modArrayStale = true;
    }

    // Toggle the "autocell-active" class on the clicked cell if it is an automatic mapping table cell
    if (cell.classList.contains("autocell")) {
        cell.classList.toggle("autocell-active");
    }
}

/**
 * Randomize the mapping table by shuffling the active cells in the randomize table.
 * @param {boolean} reset - Whether to reset the mapping table to its default state.
 */
function randomizeMap(reset = false) {
    const cells = document.querySelectorAll(".mapcell");

    if (reset) {
        // Reset the mapping table to its default state
        for (let i = 0; i < 16; i++) {
            for (let j = 0; j < 16; j++) {
                const cell = document.getElementById(`${i}-${j}`);
                if (i === j) {
                    cell.classList.add("mapcell-active", "tablecell-active");
                } else {
                    cell.classList.remove("mapcell-active", "tablecell-active");
                }
            }
        }
        return;
    }

    // Get the active cells from the randomize table
    const enRand = document.querySelectorAll(".randcell-active");
    const toRandomize = [];
    for (let i = 0; i < enRand.length; i++) {
        const cell = enRand[i];
        const ind = Number(cell.id.split("-")[1]);
        toRandomize.push(ind);
    }

    // Remove the active class from cells that are potentially affected by the randomization
    for (let i = 0; i < cells.length; i++) {
        const cell = cells[i];
        const [x, y] = cell.id.split("-").map(Number);
        if (toRandomize.includes(x) || toRandomize.includes(y)) {
            cell.classList.remove("mapcell-active", "tablecell-active");
        }
    }

    // Shuffle the indices to be randomized
    const shuffled = shuffleArray(toRandomize.slice());

    // Apply the active class to the matching cells
    for (let i = 0; i < toRandomize.length; i++) {
        const mapcell = document.getElementById(`${toRandomize[i]}-${shuffled[i]}`);
        mapcell.classList.add("mapcell-active", "tablecell-active");
    }
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        let j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function toggleStick2Dpad(side) {
    stick_to_dpad ^= side;
    const elL = document.getElementById('status-stick2dpad');
    if (stick_to_dpad & 1) {
        elL.classList.add('indicator-active');
        elL.textContent = "enabled";
    } else {
        elL.classList.remove('indicator-active');
        elL.textContent = "disabled";
    }
    const elR = document.getElementById('status-stick2abxy');
    if (stick_to_dpad & 2) {
        elR.classList.add('indicator-active');
        elR.textContent = "enabled";
    } else {
        elR.classList.remove('indicator-active');
        elR.textContent = "disabled";
    }
}

// List of IDs for the SVG
const conDispMap = Array(
    "BBottom",
    "BRight",
    "BLeft",
    "BTop",
    "L1",
    "R1",
    "L2",
    "R2",
    "Minus",
    "Plus",
    "LeftStick",
    "RightStick",
    "DUp",
    "DDown",
    "DLeft",
    "DRight",
);

// Define user-preferred colors for highlighting buttons
let out_btn_highlight = "rgba(0,128,0,1)";
let in_btn_highlight = "rgba(0,128,0,1)";
/**
 * Update the display of the virtual controller to reflect the state of the connected gamepad.
 * @param {boolean[]} inBtns - An array of boolean values indicating the state of each input button.
 * @param {boolean[]} outBtns - An array of boolean values indicating whether each output button should be highlighted.
 * @param {number[]} stickPos - An array of four values representing the position of the two sticks on the gamepad.
 */
function updateConDisplay(inBtns, outBtns, stickPos) {
    // Do not update the display if a gamepad is not connected
    if (!gamepad_connected) { return; }

    // Update the display for each input button and its corresponding output button
    for (let i = 0; i < Math.min(conDispMap.length, inBtns.length); i++) {
        // Update the stroke color and width for the output button
        if (outBtns[i]) {
            document.getElementById(conDispMap[i]).setAttribute("stroke", out_btn_highlight);
            document.getElementById(conDispMap[i]).setAttribute("stroke-width", "8");
        } else {
            document.getElementById(conDispMap[i]).removeAttribute("stroke");
            document.getElementById(conDispMap[i]).setAttribute("stroke-width", "3");
        }
        // Update the fill color for the input button
        if (inBtns[i]) {
            document.getElementById(conDispMap[i]).setAttribute("fill", in_btn_highlight);
        } else {
            document.getElementById(conDispMap[i]).setAttribute("fill", "rgba(255,255,255,0)");
        }
    }

    // Move the left and right sticks to their updated positions
    const dlx = (stickPos[0] - 128) / 10;
    const dly = (stickPos[1] - 128) / 10;
    const drx = (stickPos[2] - 128) / 10;
    const dry = (stickPos[3] - 128) / 10;
    document.getElementById("LeftStick").setAttribute("transform", `translate(${dlx},${dly})`);
    document.getElementById("RightStick").setAttribute("transform", `translate(${drx},${dry})`);
}

function updateMapDisplay() {
    for (let i = 0; i < 16; i++) {
        const linCell = document.getElementById(`lin-${i}`);
        const loutCell = document.getElementById(`lout-${i}`);

        if (curCon[i]) {
            linCell.classList.add('tablecell-highlight');
        } else {
            linCell.classList.remove('tablecell-highlight');
        }

        if (modCon[i]) {
            loutCell.classList.add('tablecell-highlight');
        } else {
            loutCell.classList.remove('tablecell-highlight');
        }
    }
}

/**
 * Toggles the auto jump setting if the right stick is pressed.
 */
function toggleAutoJump() {
    if (curToggle[11]) { // Check if right stick was just pressed
        autojump_enabled = !autojump_enabled;
        const statusElement = document.getElementById("status-autojump");
        if (autojump_enabled) {
            statusElement.classList.add("indicator-active");
            statusElement.innerText = "on";
        } else {
            statusElement.classList.remove("indicator-active");
            statusElement.innerText = "off";
        }
    }
}

/**
 * Applies the auto jump setting to forceCon.
 */
function applyAutoJump() {
    let enAuto = document.querySelectorAll(".autocell-active");
    toAuto = Array.from(enAuto, el => Number(el.id.split("-")[1]));

    if (toAuto.length === 0) {
        forceCon.fill(false); // Nothing enabled, disable auto click
        return;
    }

    const anyTrue = forceCon.some(value => value);
    if (!anyTrue) {
        // Nothing being force-pushed last frame, so enable something
        const randomIndex = Math.floor(Math.random() * toAuto.length);
        forceCon[toAuto[randomIndex]] = true;
    } else { // Something was being force-pushed last frame
        if (toAuto.length === 1) {
            // Only one thing being spammed, so need to turn it off.
            forceCon.fill(false);
        } else { // multiple things being forced, so pick one that isn't currently forced
            // Pick one that isn't true
            const falseIndices = toAuto.filter(index => !forceCon[index]);
            const randomIndex = falseIndices[Math.floor(Math.random() * falseIndices.length)];
            forceCon.fill(false);
            forceCon[randomIndex] = true;
        }
    }
}

let lagAmount = 0;
function changeLag(amt) {
    lagAmount += amt;
    if (lagAmount <= 0) {
        lagAmount = 0;
        lag_enabled = false;
    } else {
        if (lagAmount > 120) lagAmount = 120;
        lag_enabled = true;
    }
    sendTextToSwiCC("+SLAG " + lagAmount + "\n");
    document.getElementById("lag-num").value = lagAmount;
}

/**
 * Set the lag amount for input commands sent to the gamepad.
 */
function setLag() {
    // Get the lag amount from the input field
    const lagInput = document.getElementById("lag-num");
    lagAmount = parseInt(lagInput.value);
    if (isNaN(lagAmount)) lagAmount = 0;

    // Set the lag amount and update the lag status based on the input value
    lag_enabled = false;
    if (lagAmount > 0) {
        if (lagAmount > 120) {
            lagAmount = 120;
        }
        lag_enabled = true;
    }

    // Send the lag amount to the gamepad
    sendTextToSwiCC("+SLAG " + lagAmount + "\n");

    // Update the input field value to match the actual lag amount
    lagInput.value = lagAmount;
}

/**
 * Set a cookie with the given name and value.
 * @param {string} name - The name of the cookie to be set.
 * @param {string} value - The value to be stored in the cookie.
 */
function setCookie(name, value) {
    // Encode the value to ensure it can be safely stored in the cookie
    const encodedValue = encodeURIComponent(value);

    // Set the cookie with the specified name, value, and expiration date
    document.cookie = `${name}=${encodedValue}; expires=Fri, 31 Dec 9999 23:59:59 GMT; path=/; SameSite=Strict`;
}

/**
 * Retrieve the value of a cookie with the specified name.
 * @param {string} name - The name of the cookie to retrieve.
 * @returns {string|null} The value of the cookie, or null if the cookie does not exist.
 */
function getCookie(name) {
    // Split the document cookie into individual cookies
    const cookies = document.cookie.split(';');

    // Iterate over each cookie to find the one with the specified name
    for (const cookie of cookies) {
        const [cookieName, cookieValue] = cookie.split('=');
        const trimmedName = cookieName.trim();
        if (trimmedName === name) {
            // Decode the value to retrieve the original value
            return decodeURIComponent(cookieValue);
        }
    }
    // Return null if the cookie was not found
    return null;
}
