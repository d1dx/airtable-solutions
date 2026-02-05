# Last Modified (Sync-Related)

Author: Daniel Rudaev (D1DX)

Finds the latest date across multiple date fields, including sync-related tables.

## Formula

```
IF(
  OR({date a}, {date b}, {date c}, {date d}, {date e}),
  DATETIME_PARSE(
    MAX(
      IF({date a} != FALSE(), VALUE(DATETIME_FORMAT({date a}, 'X')), 0),
      IF({date b} != FALSE(), VALUE(DATETIME_FORMAT({date b}, 'X')), 0),
      IF({date c} != FALSE(), VALUE(DATETIME_FORMAT({date c}, 'X')), 0),
      IF({date d} != FALSE(), VALUE(DATETIME_FORMAT({date d}, 'X')), 0),
      IF({date e} != FALSE(), VALUE(DATETIME_FORMAT({date e}, 'X')), 0)
    ),
    'X'
  )
)
```

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

Version: 1.0.0
