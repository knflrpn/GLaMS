<?php
if (isset($_GET['filename'])) {
  $filename = $_GET['filename'];

  // Check that the filename is valid to avoid security issues
  if (preg_match('/^[a-z0-9_-]+\.txt$/i', $filename)) {

    // Read the contents of the file
    $contents = file_get_contents('./imageExamples/' . $filename);

    // Send the contents as a plain text response
    header('Content-Type: text/plain');
    echo $contents;
  }
  else {
    // Invalid filename
    http_response_code(400); // Bad Request
    echo 'Invalid filename.';
  }
}
else {
  // Missing filename parameter
  http_response_code(400); // Bad Request
  echo 'Missing filename parameter.';
}
?>
