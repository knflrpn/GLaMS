import os
import re

# Change this to the directory your files are in
dir_path = os.path.dirname(os.path.realpath(__file__))

# Create a dictionary to track the fastest times for each base filename
fastest_files = {}

# Iterate over every file in the directory
for filename in os.listdir(dir_path):
    # Split the filename into parts based on the underscore
    parts = filename.split('_')
    
    # If this file follows the expected naming convention (e.g. "Bees_1m_31s_2fpc.txt")
    if len(parts) == 4 and 'm' in parts[1] and 's' in parts[2]:
        base_name = parts[0]
        time_parts = re.findall(r'\d+', parts[1] + parts[2])
        
        # Convert the time to total seconds
        total_seconds = int(time_parts[0]) * 60 + int(time_parts[1])

        # If we haven't seen this base filename before, or this file is faster than the previous fastest
        if base_name not in fastest_files or total_seconds < fastest_files[base_name][0]:
            # If we had a previous fastest file, delete it
            if base_name in fastest_files:
                os.remove(os.path.join(dir_path, fastest_files[base_name][1]))
                #print(os.path.join(dir_path, fastest_files[base_name][1]))
            
            # Record this file as the fastest so far
            fastest_files[base_name] = (total_seconds, filename)
        else:
            # This file isn't the fastest, so delete it
            #print(os.path.join(dir_path, filename))
            os.remove(os.path.join(dir_path, filename))
