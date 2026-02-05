# Conditional Date Concatenation

Author: Daniel Rudaev (D1DX)

Generates formulas for checking date ranges in forecast scenarios.

## What It Does

Creates an Airtable formula that looks at a forecast period (number of days) and generates dates that are missing from an existing list. Useful for identifying which forecast dates still need to be added to your records.

## Usage

Run the Python script with:
- n = number of days ahead to check (e.g., 30 for a 30-day forecast)

Call: combine_date_formulas(n) or combine_date_formulas_with_regex(n)

The script will generate a formula that you can paste into Airtable.

## How It Works

The generated formula:
1. Checks each day from TODAY() through TODAY()+n days
2. For each day, checks if that day number is within your {forecast} field value
3. Converts the date to a string format (DATESTR)
4. Checks if that date string already exists in your ARRAYJOIN(values) field
5. If the date is missing, adds it to the output with comma separation
6. Returns a comma-separated list of missing forecast dates

## Example Use Case

You have a {forecast} field set to "14" (14 days ahead) and existing forecast dates in a linked field. The formula will check days 0-14 and return only the dates that don't exist yet, like "2024-01-15, 2024-01-18, 2024-01-20" for dates that need to be added.
