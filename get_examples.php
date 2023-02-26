<?php
// Define the directory to scan
$dir = './imageExamples';

// Open the directory
if ($handle = opendir($dir)) {

    // Initialize an array to hold the filenames
    $files = array();

    // Loop through the directory
    while (false !== ($entry = readdir($handle))) {

        // Ignore "." and ".." entries
        if ($entry == "." || $entry == ".." || pathinfo($entry, PATHINFO_EXTENSION) !== 'txt') {
            continue;
        }

        // Add the filename to the array
        $files[] = $entry;
    }

    // Close the directory
    closedir($handle);

    // Send the list of filenames as a JSON-encoded string
    echo json_encode($files);
}
?>
