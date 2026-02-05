# HTML Table to TOON

Author: Daniel Rudaev (D1DX)

Converts HTML tables to TOON text format.

## Usage

```javascript
// Configure in automation:
// htmlTable: "<table>...</table>"
```

## Setup

1. Copy `src/html-table-to-toon.js`
2. Create automation in Airtable
3. Add "Run a script" action
4. Paste the code
5. Configure `htmlTable` input variable with HTML table string

## Parameters

- `htmlTable` (required) - HTML table markup as string

## Output

- TOON formatted text representation of table data
- Preserves table structure and content

Version: 1.0.0
