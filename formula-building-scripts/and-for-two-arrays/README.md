# AND for Two Arrays

Author: Daniel Rudaev (D1DX)

Builds an Airtable formula that performs AND operation on items from two arrays.

## What It Does

Takes items from array A and array B, and creates a formula that combines them with comma separation. The formula checks if each position exists in both arrays before including it in the result.

## Usage

Run the Python script with:
- x = number of items to check in the arrays
- output_file = path to save the generated formula (e.g., "output.txt")

Call: generate_combined_formula_no_spaces_with_comma_check(x, "output.txt")

## Output

Generates an Airtable formula that:
- Checks each position (1 through x) in both arrays
- Only includes items where both arrays have values at that position
- Adds commas between items automatically
- Handles array boundaries and empty values
