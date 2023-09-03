const penSizes = [1, 2, 3, 4];
let canvas;
let ctx;
let cursorCanvas;
let cursorCtx;
let currentX = 0;
let currentY = 0;
let selectedIndex = 0;
let penSizeIndex = 0;

const palette = [
	'#FE0000', '#BC0000', '#FFF5D1', '#AD8145',
	'#FFFF00', '#FFC100', '#00FF00', '#00BC00',
	'#00FFFF', '#0000FE', '#BC63FF', '#8900BC',
	'#FFC1FF', '#BC0089', '#BDBDBD', '#000000',
	'#FFFFFF'
];
let buttonState = {
	A: false,
	R1: false,
	L1: false,
	R2: false,
	L2: false,
	U: false,
	R: false,
	D: false,
	L: false
};

let animationFrameId;
function executeCommands() {
	const commandInput = document.getElementById('commands');
	const commands = commandInput.value.trim().split('\n');
	const commandsPerFrame = parseInt(document.getElementById('commandsPerFrame').value, 10) || 10;

	// Cancel previous animation if any
	if (animationFrameId) {
		cancelAnimationFrame(animationFrameId);
		animationFrameId = null;
	}

	// Reset state
	currentX = 0;
	currentY = 0;
	selectedIndex = 0;
	penSizeIndex = 0;
	buttonState = {
		A: false,
		R1: false,
		L1: false,
		R2: false,
		L2: false,
		U: false,
		R: false,
		D: false,
		L: false
	};
	// Erase canvas
	ctx.clearRect(0, 0, canvas.width, canvas.height);

	let commandIndex = 0;

	function parseNextCommands() {
		for (let i = 0; i < commandsPerFrame && commandIndex < commands.length; i++) {
			const command = commands[commandIndex++].split(';')[0];

			// Extracting buttonString within curly braces.
			const matched = command.match(/{([^}]*)}/);
			if (!matched || matched.length === 0) {
				continue;
			}
			const buttonString = matched[0];

			// Removing buttonString to facilitate further extraction.
			const remainingCommand = command.replace(buttonString, '').trim();

			// Extracting xMagnitude and yMagnitude within parentheses.
			const magnitudesMatched = remainingCommand.match(/\(([^)]+)\)/);
			let xMagnitude = 128;
			let yMagnitude = 128;
			if (magnitudesMatched && magnitudesMatched.length > 0) {
				const [x, y] = magnitudesMatched[1].split(' ').map(val => parseInt(val, 10));
				if (!isNaN(x)) xMagnitude = x;
				if (!isNaN(y)) yMagnitude = y;
			}

			// Extracting repeat.
			const repeatMatched = remainingCommand.replace(magnitudesMatched ? magnitudesMatched[0] : '', '').trim();
			const repeat = repeatMatched ? parseInt(repeatMatched, 10) : 1;

			for (let j = 0; j < repeat; j++) {
				// Apply X movement
				if (xMagnitude !== 128) {
					const direction = xMagnitude < 128 ? 'L' : 'R';
					moveCursor(direction, 2);
				}

				// Apply Y movement
				if (yMagnitude !== 128) {
					const direction = yMagnitude < 128 ? 'U' : 'D';
					moveCursor(direction, 2);
				}

				parseCommand(buttonString);
			}
		}

		drawCursor(currentX, currentY);

		if (commandIndex < commands.length) {
			animationFrameId = requestAnimationFrame(parseNextCommands);
		} else {
			animationFrameId = null;
		}
	}

	animationFrameId = requestAnimationFrame(parseNextCommands);


}

function changeSize(direction) {
	if (direction === 'smaller') {
		penSizeIndex--;
		if (penSizeIndex < 0) {
			penSizeIndex = penSizes.length - 1;
		}
	} else if (direction === 'bigger') {
		penSizeIndex++;
		if (penSizeIndex >= penSizes.length) {
			penSizeIndex = 0;
		}
	}
}

function setColor(color) {
	ctx.fillStyle = color;
}

function drawPixel(x, y, color) {
	setColor(color);

	const radius = penSizes[penSizeIndex];
	if (radius === 1) {
		ctx.fillRect(x, y, 1, 1);
	} else {
		ctx.beginPath();
		ctx.arc(x, y, radius, 0, 2 * Math.PI, false);
		ctx.fill();
	}
}

function changeColor(direction) {
	if (direction === 'left') {
		selectedIndex--;
		if (selectedIndex < 0) {
			selectedIndex = palette.length - 1;
		}
	} else if (direction === 'right') {
		selectedIndex++;
		if (selectedIndex >= palette.length) {
			selectedIndex = 0;
		}
	}
}

function moveCursor(direction, amount = 1) {
	switch (direction) {
		case 'U':
			currentY = currentY - amount;
			if (currentY < 0) {
				if (amount === 1) {
					console.log('Cursor out of bounds: ' + currentX + ', ' + currentY);
				}
				currentY = 0;
			}
			break;
		case 'R':
			currentX = currentX + amount;
			if (currentX >= canvas.width) {
				if (amount === 1) {
					console.log('Cursor out of bounds: ' + currentX + ', ' + currentY);
				}
				currentX = canvas.width - 1;
			}
			break;
		case 'D':
			currentY = currentY + amount;
			if (currentY >= canvas.height) {
				if (amount === 1) {
					console.log('Cursor out of bounds: ' + currentX + ', ' + currentY);
				}
				currentY = canvas.height - 1;
			}
			break;
		case 'L':
			currentX = currentX - amount;
			if (currentX < 0) {
				if (amount === 1) {
					console.log('Cursor out of bounds: ' + currentX + ', ' + currentY);
				}
				currentX = 0;
			}
			break;
	}
}

// Cursor display function
function drawCursor(x, y) {
	// Clear previous cursor
	cursorCtx.clearRect(0, 0, cursorCanvas.width, cursorCanvas.height);

	// Draw new cursor
	// Outer black box
	cursorCtx.fillStyle = 'black';
	cursorCtx.fillRect(x - 3, y - 3, 7, 7); // Centered at (x, y)
	// Inner white box
	cursorCtx.fillStyle = palette[selectedIndex];
	cursorCtx.fillRect(x - 2, y - 2, 5, 5); // Centered at (x, y)}
	// Clear center
	cursorCtx.clearRect(x - 1, y - 1, 3, 3); // Centered at (x, y)
}

let justChangedColor = false;
function parseCommand(command) {
	const buttons = command.match(/{([^}]*)}/) ? command.match(/{([^}]*)}/)[1].split(' ').filter(Boolean) : [];

	// Cursor size changes.
	if (buttons.includes('R1') && !buttonState.R1) {
		changeSize('bigger');
	}
	if (buttons.includes('L1') && !buttonState.L1) {
		changeSize('smaller');
	}

	// Color changes
	if (!justChangedColor) {
		if (buttons.includes('R2') && !buttonState.R2) {
			changeColor('right');
			justChangedColor = true;
		}
		else if (buttons.includes('L2') && !buttonState.L2) {
			changeColor('left');
			justChangedColor = true;
		}
	} else {
		justChangedColor = false;
	}
	if (justChangedColor) {
		if (buttons.includes('A') && buttonState.A) {
			// A color change while A is held affects the current pixel, before movement.
			drawPixel(currentX, currentY, palette[selectedIndex]);
		}
	}

	// Need to account for various combinations, so first convert current buttons to a number.
	let pressedDirs = 0;
	let di = 1;
	for (const direction of ['U', 'R', 'D', 'L']) {
		if (buttons.includes(direction) && !buttonState[direction]) {
			pressedDirs += di;
		}
		di *= 2;
	}
	// Then move based on how the game would move.
	// Single directions:
	if (pressedDirs === 1) moveCursor("U");
	if (pressedDirs === 2) moveCursor("R");
	if (pressedDirs === 4) moveCursor("D");
	if (pressedDirs === 8) moveCursor("L");
	// Diagonals
	if (pressedDirs === 3) moveCursor("U");
	if (pressedDirs === 6) moveCursor("D");
	if (pressedDirs === 12) moveCursor("D");
	if (pressedDirs === 9) moveCursor("U");

	if (buttons.includes('A')) {
		drawPixel(currentX, currentY, palette[selectedIndex]);
	}

	buttonState = {
		A: buttons.includes('A'),
		R1: buttons.includes('R1'),
		L1: buttons.includes('L1'),
		R2: buttons.includes('R2'),
		L2: buttons.includes('L2'),
		U: buttons.includes('U'),
		R: buttons.includes('R'),
		D: buttons.includes('D'),
		L: buttons.includes('L')
	};
}