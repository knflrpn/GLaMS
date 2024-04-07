// Version: 2023-06-24

class WackyGamepad {
	constructor() {
		this.isActive = false;
		this.lastTickTime = Date.now();
		this.realtimeButtons = Array(18).fill(false);
		this.realtimeSticks = Array(4).fill(0.0);
		this.delayedButtons = Array(18).fill(false);
		this.delayedSticks = Array(4).fill(0.0);
		this.modifiedButtons = Array(18).fill(false);
		this.modifiedSticks = Array(4).fill(0.0);
		this.toggledButtons = Array(18).fill(false);
		this.turboButtons = Array(18).fill(false);
		this.turboDisables = Array(18).fill(false);
		this.spamButtons = Array(18).fill(false);
		this.spamIndex = -1;
		this.spamDelay = 0;
		this.spamTimer = 0;
		this.timeBuffer = [];
		this.cooldowns = Array(18).fill(0);
		this.globalCooldown = false;
		this.localCooldown = false;
		this.cooldownTime = 1000;
		this.blockedButtons = Array(18).fill(false);
		this.delayAmount = 0.0;
		// Map matrix for button remapping; diagonal starts as true
		this.mapMatrix = Array.from({ length: 18 }, (_, i) =>
			Array.from({ length: 18 }, (_, j) => i === j));
		this.rotateAngle = [0.0, 0.0];
		this.a2dL = false; // analog (stick) to digital (buttons) left
		this.a2dR = false; // analog (stick) to digital (buttons) right
		this.isStale = false;

		this.buttonNames = ['B', 'A', 'Y', 'X', 'L1', 'R1', 'L2', 'R2', '-', '+', 'L3', 'R3', 'U', 'D', 'L', 'R', 'H', 'C'];

		this.gamepadNum = 0;
	}

	pollGamepad() {
		// Track timing.
		const nowTime = Date.now();
		const deltaT = nowTime - this.lastTickTime;
		this.lastTickTime = nowTime;

		// Access the gamepads
		const gamepads = navigator.getGamepads();

		// Get gamepad state
		const gamepad = gamepads[this.gamepadNum];

		if (gamepad) {
			this.isActive = true;
			// Create a snapshot of the initial state
			const initialModifiedButtons = [...this.modifiedButtons];
			const initialModifiedSticks = [...this.modifiedSticks];

			// Update the internal sticks state
			this.realtimeSticks = [
				gamepad.axes[0],
				gamepad.axes[1],
				gamepad.axes[2],
				gamepad.axes[3]
			];

			// Check for button toggles
			let new_buttons = gamepad.buttons.map(button => button.pressed);
			while (new_buttons.length < 18) {
				// Fill any missing entries with known value (false)
				new_buttons.push(false);
			}

			for (let i = 0; i < new_buttons.length; i++) {
				// Update cooldowns
				this.cooldowns[i] = Math.max(0, this.cooldowns[i]-deltaT);
				// Check if pressed
				if (new_buttons[i]) {
					// Check if *just now* pressed
					if (!this.realtimeButtons[i]) {
						// This is a just-pressed button.  If it's on cooldown, don't let it be pressed.
						if(this.cooldowns[i] > 0) {
							new_buttons[i] = false;
							this.blockedButtons[i] = true;
						} else {
							this.toggledButtons[i] = true;
							this.blockedButtons[i] = this.cooldowns[i] > 0;
							// Put on cooldown
							if(this.localCooldown) {
								this.cooldowns[i] = this.cooldownTime;
								this.blockedButtons[i] = false;
							} else if(this.globalCooldown) {
								this.cooldowns.fill(this.cooldownTime);
							}
						}
					} else {
						this.toggledButtons[i] = false;
					}
				} else {
					this.blockedButtons[i] = this.cooldowns[i] > 0;
				}
			}
			this.realtimeButtons = new_buttons;

			let possibleSpamButtons;
			if (this.spamTimer === 0) {
				// Prepare for spam.  First find possible buttons: not pressed in the old delayedButtons, and true in spamButtons.
				possibleSpamButtons = this.delayedButtons.map((button, index) => !button && this.spamButtons[index]);
				// Prepare for turbo: pressed in old delayedButtons and true in turboButtons.
				this.turboDisables = this.delayedButtons.map((button, index) => button && this.turboButtons[index]);
			}

			if (this.delayAmount > 0.0) {
				// Save current data
				const timestamp = Date.now();
				this.timeBuffer.push({
					timestamp,
					buttons: JSON.stringify(this.realtimeButtons),
					sticks: JSON.stringify(this.realtimeSticks)
				});
				// Check for changes that are older than delayAmount and apply them to delayed state
				if (this.timeBuffer.length > 0) {
					while (timestamp - this.timeBuffer[0].timestamp >= this.delayAmount) {
						const delayedValues = this.timeBuffer.shift();
						this.delayedSticks = JSON.parse(delayedValues.sticks);
						this.delayedButtons = JSON.parse(delayedValues.buttons);
					}
				}
			} else {
				// No delay, just copy realtime to delayed
				this.delayedSticks = this.realtimeSticks.slice();
				this.delayedButtons = this.realtimeButtons.slice();
			}

			// Recalculate spam if the timer has expired
			if (this.spamTimer === 0) {
				// Choose a random spam button, if any is possible.
				this.spamTimer = this.spamDelay;
				if (possibleSpamButtons.includes(true)) {
					this.spamTimer = this.spamDelay;
					const spamButtonIndices = possibleSpamButtons.flatMap((canSpam, index) => canSpam ? index : []);
					this.spamIndex = spamButtonIndices.length > 0 ? spamButtonIndices[Math.floor(Math.random() * spamButtonIndices.length)] : -1;
				} else {
					this.spamIndex = -1;
				}
			} else {
				this.spamTimer = Math.max(0, this.spamTimer - deltaT);
			}
			// Apply spam to the random button
			if (this.spamIndex >= 0) {
				this.delayedButtons[this.spamIndex] = true;
			}
			// Apply turbo disables
			this.delayedButtons = this.delayedButtons.map((btn, index) => this.turboDisables[index] ? false : btn);

			// New data is in, so start with a copy of delayed into modified
			this.modifiedSticks = this.delayedSticks.slice();
			this.modifiedButtons = this.delayedButtons.slice();

			// Apply stick rotation
			this.rotateStick(this.rotateAngle[0], "left");
			this.rotateStick(this.rotateAngle[1], "right");

			// Appply stick-to-button mapping
			if (this.a2dL) {
				if (this.delayedSticks[0] < -0.55) { this.delayedButtons[14] = true; }
				if (this.delayedSticks[0] > 0.55) { this.delayedButtons[15] = true; }
				if (this.delayedSticks[1] < -0.55) { this.delayedButtons[12] = true; }
				if (this.delayedSticks[1] > 0.55) { this.delayedButtons[13] = true; }
				this.modifiedSticks[0] = 0.0;
				this.modifiedSticks[1] = 0.0;
			}
			if (this.a2dR) {
				if (this.delayedSticks[2] < -0.55) { this.delayedButtons[2] = true; }
				if (this.delayedSticks[2] > 0.55) { this.delayedButtons[1] = true; }
				if (this.delayedSticks[3] < -0.55) { this.delayedButtons[3] = true; }
				if (this.delayedSticks[3] > 0.55) { this.delayedButtons[0] = true; }
				this.modifiedSticks[2] = 0.0;
				this.modifiedSticks[3] = 0.0;
			}

			// Apply button mapping
			this.applyButtonMap();

			// Compare current state with the initial snapshot
			const isModifiedButtonsChanged = !this.arraysAreEqual(this.modifiedButtons, initialModifiedButtons);
			const isModifiedSticksChanged = !this.arraysAreEqual(this.modifiedSticks, initialModifiedSticks);
			// Set isStale if any changes are detected
			if (isModifiedButtonsChanged || isModifiedSticksChanged) {
				this.isStale = true;
			}
		} else {
			this.isActive = false;
			// neutral gamepad state
			this.realtimeButtons = [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false];
			this.realtimeSticks = [0.0, 0.0, 0.0, 0.0];
			this.delayedButtons = [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false];
			this.delayedSticks = [0.0, 0.0, 0.0, 0.0];
			this.modifiedButtons = [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false];
			this.modifiedSticks = [0.0, 0.0, 0.0, 0.0];
		}
	}

	// Helper function to compare arrays
	arraysAreEqual(array1, array2) {
		if (array1.length !== array2.length) {
			return false;
		}
		for (let i = 0; i < array1.length; i++) {
			if (array1[i] !== array2[i]) {
				return false;
			}
		}
		return true;
	}


	/**
	 * Uses the current mapMatrix to transform the state of delayedButtons 
	 * into a new state in modifiedButtons.
	 */
	applyButtonMap() {
		for (let i = 0; i < this.mapMatrix.length; i++) {
			for (let j = 0; j < this.mapMatrix[i].length; j++) {
				// If the mapping matrix has a 'true' at this position, 
				// and the corresponding delayed button is 'true', 
				// set the modified button to 'true'
				if (this.mapMatrix[i][j] && this.delayedButtons[j]) {
					this.modifiedButtons[i] = true;
					// No need to check other buttons if we've already determined 
					// the modified button should be 'true'
					break;
				}
				else {
					// In case the button was previously set to true, 
					// we need to make sure it gets set to false 
					// if there are no 'true' conditions this round
					this.modifiedButtons[i] = false;
				}
			}
		}
	}


	/**
	 * Sets which buttons will get spammed.
	 * 
	 * @param {Array<boolean>} spamButtons - Which buttons to enable spam on.
	 */
	enableSpam(spamButtons) {
		this.spamButtons = spamButtons;
	}

	/**
	 * Turns off all spamming.
	 */
	disableSpam() {
		this.spamButtons = Array(18).fill(false);
	}

	/**
	 * Sets which buttons will get turbo applied.
	 * 
	 * @param {Array<boolean>} turboButtons - Which buttons to enable spam on.
	 */
	enableTurbo(turboButtons) {
		this.turboButtons = turboButtons;
	}

	/**
	 * Turns off all turbo.
	 */
	disableTurbo() {
		this.turboButtons = Array(18).fill(false);
	}

	/**
	 * Sets the button map to a new matrix.
	 *
	 * @param {Array<Array<boolean>>} mapMatrix - The new button mapping matrix.
	 */
	setButtonMap(mapMatrix) {
		this.mapMatrix = mapMatrix;
	}

	/**
	 * Changes the value of a specific cell in the button map.
	 *
	 * @param {number} row - The row index of the cell to change.
	 * @param {number} col - The column index of the cell to change.
	 * @param {boolean} value - The new value for the cell. Defaults to true.
	 */
	setButtonMapCell(row, col, value = true) {
		this.mapMatrix[row][col] = value;
	}

	/**
	 * Resets the button map to its initial state, 
	 * with true values along the diagonal (buttons map to themselves).
	 */
	resetButtonMap() {
		this.mapMatrix = Array.from({ length: 18 }, (_, i) =>
			Array.from({ length: 18 }, (_, j) => i === j));
	}

	/**
	 * Rotates the joystick inputs by a specified number of degrees.
	 * Internal use only.
	 *
	 * @param {number} degrees - The number of degrees to rotate the joystick input.
	 * @param {string} side - Which joystick(s) to rotate. Should be "left", "right", or "both". Defaults to "both".
	 */
	rotateStick(degrees, side = "both") {
		let rot_rads = degrees * (Math.PI / 180);
		// rotate stick values
		if (side == "left" || side == "both") {
			this.modifiedSticks[0] = this.delayedSticks[0] * Math.cos(rot_rads) - this.delayedSticks[1] * Math.sin(rot_rads);
			this.modifiedSticks[1] = this.delayedSticks[0] * Math.sin(rot_rads) + this.delayedSticks[1] * Math.cos(rot_rads);
		}
		if (side == "right" || side == "both") {
			this.modifiedSticks[2] = this.delayedSticks[2] * Math.cos(rot_rads) - this.delayedSticks[3] * Math.sin(rot_rads);
			this.modifiedSticks[3] = this.delayedSticks[2] * Math.sin(rot_rads) + this.delayedSticks[3] * Math.cos(rot_rads);
		}
	}

	/**
	 * Forces a button press.
	 *
	 * @param {number} buttonIndex - The index or name of the button to press.
	 */
	pressButton(buttonIndex) {
		if (typeof buttonIndex === "string") {
			buttonIndex = this.buttonNames.indexOf(buttonIndex.toUpperCase());
			if (buttonIndex === -1) {
				return;
			}
			this.modifiedButtons[buttonIndex] = true;
		} else if (typeof buttonIndex !== "number") {
			this.modifiedButtons[buttonIndex] = true;
		}
		this.isStale = true;
	}

	/**
	 * Forces a button release.
	 *
	 * @param {number} buttonIndex - The index or name of the button to press.
	 */
	releaseButton(buttonIndex) {
		if (typeof buttonIndex === "string") {
			buttonIndex = this.buttonNames.indexOf(buttonIndex);
			if (buttonIndex === -1) {
				return;
			}
			this.modifiedButtons[buttonIndex] = false;
		} else if (typeof buttonIndex !== "number") {
			this.modifiedButtons[buttonIndex] = false;
		}
		this.isStale = true;
	}

	/**
	 * Manually sets the left analog stick values.
	 * 
	 * @param {number} leftX - The x value of the left stick.
	 * @param {number} leftY - The y value of the left stick.
	 */
	setLeftStick(leftX, leftY) {
		this.modifiedSticks[0] = leftX;
		this.modifiedSticks[1] = leftY;
		this.isStale = true;
	}

	/**
	 * Manually sets the right analog stick values.
	 * 
	 * @param {number} rightX - The x value of the right stick.
	 * @param {number} rightY - The y value of the right stick.
	 */
	setRightStick(rightX, rightY) {
		this.modifiedSticks[2] = rightX;
		this.modifiedSticks[3] = rightY;
		this.isStale = true;
	}

	/**
	 * Sets the controller delay amount,
	 *
	 * @param {number} delayAmount - The time to delay, in seconds.
	 */
	setDelay(delayAmount) {
		this.delayAmount = delayAmount;
	}

	/**
	 * Sets the controller rotation amount.
	 * 
	 * @param {number} degreesLeft - The number of degrees to rotate the left joystick.
	 * @param {number} degreesRight - The number of degrees to rotate the right joystick. Defaults to degreesLeft.
	 */
	setRotation(degreesLeft, degreesRight = null) {
		if (degreesRight == null) {
			degreesRight = degreesLeft;
		}
		this.rotateAngle = [degreesLeft, degreesRight];
	}

	stickToButtons(left, right) {
		this.a2dL = left;
		this.a2dR = right;
	}

	/**
	 * @param {number} delay
	 */
	set spamSlowdown(delay) {
		let newDelay = parseInt(delay);
		if (isNaN(newDelay)) newDelay = 0;
		if (newDelay < 0) newDelay = 0;
		if (newDelay > 60) newDelay = 60;
		this.spamDelay = newDelay;
	}
	
	get realtimeState() {
		return {
			buttons: this.realtimeButtons,
			blocked: this.blockedButtons,
			sticks: this.realtimeSticks
		};
	}
	get state() {
		return {
			buttons: this.modifiedButtons,
			sticks: this.modifiedSticks
		};
	}
	get justPressed() {
		return this.toggledButtons;
	}
}