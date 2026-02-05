# Parent-Children Sync

Author: Daniel Rudaev (D1DX)

Maintains bidirectional parent-child links in Airtable tables.

## Note: No Longer Needed

Airtable has updated their platform. When creating a linked record field to the same table, Airtable now automatically creates the opposite bidirectional link that syncs automatically. This script is preserved for legacy bases or specific edge cases.

## Scripts

- `sync-all.js` - Sync all parent-child relationships in the table
- `sync-record.js` - Sync a single record's parent-child relationships

## Usage

Interactive extension scripts that manage hierarchical table relationships.

## Setup

1. Create an Airtable extension in your base
2. Copy desired script from `src/` folder
3. Paste into extension code editor
4. Configure table and field mappings
5. Run the extension

## Features

- Bidirectional relationship maintenance
- Automatic parent-child linking
- Single record or bulk sync options
- Preserves data integrity

Version: 1.0.0
