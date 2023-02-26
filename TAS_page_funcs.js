function getExamples() {
  // Retrieve the list of filenames from the PHP script
  var xhr = new XMLHttpRequest();
  xhr.open('GET', 'get_examples.php');
  xhr.onload = function () {
    if (xhr.status === 200) {
      // Parse the JSON-encoded string into an array of filenames
      var filenames = JSON.parse(xhr.responseText);

      // Loop through the filenames and add them to the select element
      var selectEl = document.getElementById('filename-select');
      for (var i = 0; i < filenames.length; i++) {
        var optionEl = document.createElement('option');
        optionEl.value = filenames[i];
        optionEl.textContent = filenames[i];
        selectEl.appendChild(optionEl);
      }
    }
    else {
      console.log('Request failed.  Returned status of ' + xhr.status);
    }
  };
  xhr.send();

  // Add a click event listener to the "View Contents" button
  document.getElementById('view-contents-btn').addEventListener('click', function () {
    // Get the selected filename from the select element
    var selectedFilename = document.getElementById('filename-select').value;

    // Send an AJAX request to the PHP script to get the file contents
    var xhr = new XMLHttpRequest();
    xhr.open('GET', 'get_file_contents.php?filename=' + selectedFilename);
    xhr.onload = function () {
      if (xhr.status === 200) {
        // Set the contents of the "commands" box to the file contents
        document.getElementById('commands').value = xhr.responseText;
        // Load the image with the same filename as the selected file
        var imageEl = document.createElement('img');
        imageEl.src = './imageExamples/' + selectedFilename.replace('.txt', '.gif');
        const imageholder = document.getElementById('image-container');
        while (imageholder.firstChild) {
          imageholder.removeChild(imageholder.firstChild);
        }
        imageholder.appendChild(imageEl);
      }
      else {
        console.log('Request failed.  Returned status of ' + xhr.status);
      }
    };
    xhr.send();
  });
}

function saveCommandsToCookie() {
  var text = encodeURIComponent(document.getElementById("commands").value);
  if (text.length > 500) { return; }
  var d = new Date();
  d.setTime(d.getTime() + (30 * 24 * 60 * 60 * 1000));
  var expires = "expires=" + d.toUTCString();
  document.cookie = "savedCommands=" + text + ";" + expires + ";SameSite=Strict;path=/";
}

function loadCommandsFromCookie() {
  var name = "savedCommands=";
  var decodedCookie = decodeURIComponent(document.cookie);
  var ca = decodedCookie.split(';');
  for (var i = 0; i < ca.length; i++) {
    var c = ca[i];
    while (c.charAt(0) == ' ') {
      c = c.substring(1);
    }
    if (c.indexOf(name) == 0) {
      document.getElementById("commands").value = c.substring(name.length, c.length);
    }
  }
}

