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
      // Check if the "filename" GET parameter is set
      var urlParams = new URLSearchParams(window.location.search);
      var filenameParam = urlParams.get('filename');
      if (filenameParam) {
        // Set the currently-selected item in the select box to the filenameParam value
        selectEl.value = filenameParam;
        document.getElementById("view-contents-btn").click();
      }
    }
    else {
      console.log('Request failed.  Returned status of ' + xhr.status);
    }
  };
  xhr.send();

}

function retrieveExample() {
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
        imageEl.src = './imageExamples/' + selectedFilename.split('_')[0] + '.gif';
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
}

function saveCommandsToLocalStorage() {
  var text = encodeURIComponent(document.getElementById("commands").value);
  if (text.length > 500) { return; }
  localStorage.setItem("savedCommands", text);
}

function saveCommandsToCookie() {
  var text = "a";
  if (text.length > 500) { return; }
  var d = new Date();
  d.setTime(d.getTime() - (30));
  var expires = "expires=" + d.toUTCString();
  document.cookie = "savedCommands=" + text + ";" + expires + ";SameSite=Strict;path=/";
}

function loadCommandsFromLocalStorage() {
  var savedCommands = localStorage.getItem("savedCommands");
  if (savedCommands) {
    document.getElementById("commands").value = decodeURIComponent(savedCommands);
  }
}


