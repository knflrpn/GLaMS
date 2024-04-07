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
let curCon = Array(16).fill(false);
let modCon = Array(16).fill(false);
let curStick = Array(4).fill(128);
let modStick = Array(4).fill(128);
let gamepad_connected = true;
// User-preferred colors for highlighting buttons
let out_btn_highlight = "rgba(0,128,0,1)";
let in_btn_highlight = "rgba(0,128,0,1)";
let blocked_btn_highlight = "rgba(255,0,0,1)";


function changeColors(event) {
	let newvalue = document.getElementById("bg-col-sel").value;
	document.body.style.backgroundColor = newvalue;
	setLocalStorageItem("bg-col-sel-color", newvalue);

	newvalue = document.getElementById("box-col-sel").value;
	document.getElementById("ConBGBox").setAttribute("fill", newvalue);
	setLocalStorageItem("box-col-sel" + "-color", newvalue);

	newvalue = document.getElementById("active-in-col-sel").value;
	in_btn_highlight = newvalue;
	setLocalStorageItem("active-in-col-sel" + "-color", newvalue);

	newvalue = document.getElementById("active-out-col-sel").value;
	out_btn_highlight = newvalue
	setLocalStorageItem("active-out-col-sel" + "-color", newvalue);

	newvalue = document.getElementById("blocked-col-sel").value;
	blocked_btn_highlight = newvalue
	setLocalStorageItem("blocked-col-sel" + "-color", newvalue);

	newvalue = document.getElementById("stroke-col-sel").value;
	document.getElementById("SwiCC-disp").setAttribute("stroke", newvalue);
	document.getElementById("texts").setAttribute("fill", newvalue);
	document.getElementById("accent-fills").setAttribute("fill", newvalue);
	setLocalStorageItem("stroke-col-sel" + "-color", newvalue);

	newvalue = document.getElementById("accent-col-sel").value;
	document.getElementById("accents").setAttribute("stroke", newvalue);
	setLocalStorageItem("accent-col-sel" + "-color", newvalue);

}


/**
 * Update the display of the virtual controller to reflect the state of the connected gamepad.
 * @param {boolean[]} inBtns - An array of boolean values indicating the state of each input button.
 * @param {boolean[]} outBtns - An array of boolean values indicating whether each output button should be highlighted.
 * @param {number[]} stickPos - An array of four values representing the position of the two sticks on the gamepad.
 */
function updateConDisplay(buttons, inStickPos, outStickPos) {
	// Do not update the display if a gamepad is not connected
	if (!gamepad_connected) { return; }

	// Update the display for each input button and its corresponding output button
	for (let i = 0; i < Math.min(conDispMap.length, buttons.length); i++) {
		// 'buttons' %1 is output, %2 is inputs, %4 is blocked
		// Update the stroke color and width for the output button
		if (buttons[i] & 1) {
			document.getElementById(conDispMap[i]).setAttribute("stroke", out_btn_highlight);
			document.getElementById(conDispMap[i]).setAttribute("stroke-width", "8");
		} else {
			document.getElementById(conDispMap[i]).removeAttribute("stroke");
			document.getElementById(conDispMap[i]).setAttribute("stroke-width", "3");
		}
		// Update the fill color for the input button
		if (buttons[i] & 2) {
			document.getElementById(conDispMap[i]).setAttribute("fill", in_btn_highlight);
		} else {
			document.getElementById(conDispMap[i]).setAttribute("fill", "rgba(255,255,255,0)");
		}
		// Update the color for blocked buttons
		if (buttons[i] & 4) {
			document.getElementById(conDispMap[i]).setAttribute("stroke", blocked_btn_highlight);
			document.getElementById(conDispMap[i]).setAttribute("fill", blocked_btn_highlight);
		}
	}

	// Move the left and right sticks to their updated positions
	const dlx = (outStickPos[0] * 15);
	const dly = (outStickPos[1] * 15);
	const drx = (outStickPos[2] * 15);
	const dry = (outStickPos[3] * 15);
	document.getElementById("LeftStick").setAttribute("transform", `translate(${dlx},${dly})`);
	document.getElementById("RightStick").setAttribute("transform", `translate(${drx},${dry})`);
	// Move the left and right sticks to their updated positions
	const dlxb = (inStickPos[0] * 15);
	const dlyb = (inStickPos[1] * 15);
	const drxb = (inStickPos[2] * 15);
	const dryb = (inStickPos[3] * 15);
	document.getElementById("LeftStickBack").setAttribute("transform", `translate(${dlxb},${dlyb})`);
	document.getElementById("RightStickBack").setAttribute("transform", `translate(${drxb},${dryb})`);
}

