# GLaMS - Gamepad Listen-and-Manipulate System

GLaMS is a browser-based system that allows you to use a gamepad to control and manipulate inputs sent to a Nintendo Switch console. It was designed to work with SwiCC, a hardware device that allows you to connect your computer to the Switch and send controller inputs to it.  You can find more information about how to set up and use SwiCC at https://github.com/knflrpn/SwiCC_RP2040.

## Usage

Once you have your SwiCC device set up and the GLaMS site hosted somewhere (or served locally),

- open the GLaMS website,
- use your gamepad to confirm that the webpage can see it, and
- click the "Serial Connect" button and select the SwiCC connection.

## Features

- On-the-fly input remapping with optional randomization.
- Artificially increasing input delay up to 2 seconds.
- Automatically typing level ID codes in Mario Maker 2.
- Button-spam for selected inputs (similar to "turbo").

## Files

- index.html: The main HTML file for GLaMS.
- inOutCon.html: A customizable input display page.  The main page must be open and visible for the input display to receive controller state.
- TAS.html: A rudimentary input playback system, mainly tailored to drawing comments in the Mario Maker 2 comment system.

## Compatibility

GLaMS requires a Chromium-based browser.  Chrome is recommended because Edge has some additional restrictions on external communication.

The controller must be XInput-compatible.  If the button display shows wrong buttons being pressed as you use the controller, your controller uses a different mapping than XInput and is currently not supported.

## License

GLaMS is released under the MIT license. You can find a copy of the license in the LICENSE file.
