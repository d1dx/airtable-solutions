# Merge Flat Arrays

Author: Daniel Rudaev (D1DX)

Combines three arrays into a structured array of objects.

## Usage

Configure in automation with three arrays: array1, array2, array3

## Setup

1. Copy `src/merge-flat-arrays.js`
2. Create automation in Airtable
3. Add "Run a script" action
4. Paste the code
5. Configure three array input variables

## Parameters

- `array1` (required) - First array
- `array2` (required) - Second array
- `array3` (required) - Third array

## Output

Array of objects combining values from all three arrays at each index.

Example output: `[{key1: "a", key2: 1, key3: "x"}, ...]`

