import re
import sys

def process_line(line):
    # If the line starts with a semicolon, just return it as is
    if line.strip().startswith(';'):
        return line.strip()

    # Extract the string inside curly brackets and the list of integers
    match = re.match(r'\{(.*?)\}\s+([\d\s]+)', line)
    if not match:
        print(f"Warning: Couldn't parse line '{line.strip()}'. Skipping.")
        return None

    # Extract matched groups
    str_inside_brackets = match.group(1).strip()
    numbers = list(map(int, match.group(2).split()))

    if not numbers:
        print(f"Warning: No numbers found in line '{line.strip()}'. Skipping.")
        return None

    frames = numbers[0]
    remaining_numbers = numbers[1:]

    # Format the line as per the new specification
    result = f"{{{str_inside_brackets}}} "
    if remaining_numbers:
        result += f"({' '.join(map(str, remaining_numbers))}) "
    result += str(frames)

    return result

def convert_file(input_filename, output_filename):
    with open(input_filename, 'r') as infile, open(output_filename, 'w') as outfile:
        for line in infile:
            new_line = process_line(line)
            if new_line:
                outfile.write(new_line + "\n")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python script_name.py input_file output_file")
        sys.exit(1)

    input_file = sys.argv[1]
    output_file = sys.argv[2]
    convert_file(input_file, output_file)
