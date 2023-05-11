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

function setPlaybackProgressBar(percentage) {
  const progressBar = document.getElementById('progress-playback');
  const progressLabel = document.getElementById('progress-label-playback');

  progressBar.style.width = percentage + '%';
  progressLabel.textContent = Math.round(percentage*10)/10 + '%';
}

function setRecordingProgressBar(percentage) {
  const progressBar = document.getElementById('progress-record');
  const progressLabel = document.getElementById('progress-label-record');

  progressBar.style.width = percentage + '%';
  progressLabel.textContent = Math.round(percentage*10)/10 + '%';
}

function populateFromGET() {
  // Check if the "filename" GET parameter is set
  var urlParams = new URLSearchParams(window.location.search);
  var filenameParam = urlParams.get('filename');
  if (filenameParam) {
    // Set the currently-selected item in the select box to the filenameParam value
    retrieveCommands(filenameParam);
  }
}

function retrieveCommands(selectedFilename) {
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
      document.getElementById("executeCommands").click();
    }
    else {
      console.log('Request failed.  Returned status of ' + xhr.status);
    }
  };
  xhr.send();
}

function saveCommandsToLocalStorage() {
  var text = encodeURIComponent(document.getElementById("commands").value);
  if (text.length > 10000) { return; }
  localStorage.setItem("savedCommands", text);
}

function loadCommandsFromLocalStorage() {
  var savedCommands = localStorage.getItem("savedCommands");
  if (savedCommands) {
    document.getElementById("commands").value = decodeURIComponent(savedCommands);
  }
}

function saveToLocalStorage(name, data) {
  localStorage.setItem(name.toString(), data);
}

function loadFromLocalStorage(name) {
  var savedData = localStorage.getItem(name.toString());
  if (savedData) {
    return savedData;
  } else {
    return 0;
  }
}

