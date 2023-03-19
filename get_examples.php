<?php
// Define the directory to scan
$dir = './imageExamples';

// Open the directory
if ($handle = opendir($dir)) {

    // Initialize an array to hold the filenames and their corresponding "12m" values
    $files = array();

    // Loop through the directory
    while (false !== ($entry = readdir($handle))) {

        // Ignore "." and ".." entries
        if ($entry == "." || $entry == ".." || pathinfo($entry, PATHINFO_EXTENSION) !== 'txt') {
            continue;
        }

        // Extract the "12m" value from the filename
        preg_match('/^[^_]+_([0-9]+)m_/', $entry, $matches);
        $value = isset($matches[1]) ? (int)$matches[1] : 0;

        // Add the filename and value to the array
        $files[] = array('filename' => $entry, 'value' => $value);
    }

    // Sort the array by the "12m" value
    usort($files, function($a, $b) {
        return $a['value'] - $b['value'];
    });

    // Get an array of just the filenames
    $filenames = array_map(function($file) {
        return $file['filename'];
    }, $files);

    // Send the list of filenames as a JSON-encoded string
    echo json_encode($filenames);
}
?>
