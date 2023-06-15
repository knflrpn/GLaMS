<?php
// Define the directory to scan
$dir = './../precompiled_images';

// Open the directory
if ($handle = opendir($dir)) {

    // Initialize an array to hold the filenames and their corresponding "m" and "s" values
    $files = array();

    // Loop through the directory
    while (false !== ($entry = readdir($handle))) {

        // Ignore "." and ".." entries
        if ($entry == "." || $entry == ".." || pathinfo($entry, PATHINFO_EXTENSION) !== 'txt') {
            continue;
        }

        // Extract the "m" and "s" value from the filename
        preg_match('/^[^_]+_([0-9]+)m_([0-9]+)s_/', $entry, $matches);
        $minuteValue = isset($matches[1]) ? (int)$matches[1] : 0;
        $secondValue = isset($matches[2]) ? (int)$matches[2] : 0;

        // Add the filename and values to the array
        $files[] = array('filename' => $entry, 'minuteValue' => $minuteValue, 'secondValue' => $secondValue);
    }

    // Sort the array by the "m" value, then by "s" value
    usort($files, function($a, $b) {
        if ($a['minuteValue'] == $b['minuteValue']) {
            return $a['secondValue'] - $b['secondValue'];
        }
        return $a['minuteValue'] - $b['minuteValue'];
    });

    // Get an array of just the filenames
    $filenames = array_map(function($file) {
        return $file['filename'];
    }, $files);

    // Send the list of filenames as a JSON-encoded string
    echo json_encode($filenames);
}
?>
