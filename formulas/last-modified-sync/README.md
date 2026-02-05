# Last Modified (Sync-Related)

Author: Daniel Rudaev (D1DX)

Finds the latest date across multiple date fields, including sync-related tables.

## Formula

See formula.txt file for copy-paste ready formula.

## Setup

1. Add formula field in your table
2. Copy formula from `formula.txt`
3. Replace `{date a}`, `{date b}`, etc. with your actual date field names
4. Adjust number of date fields as needed

## How It Works

- Checks all date fields for values
- Converts dates to Unix timestamps
- Finds maximum timestamp
- Returns most recent date

## Use Cases

- Track last update across multiple date fields
- Find most recent activity in related tables
- Determine latest modification time

