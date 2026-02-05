# Webhooks API

Author: Daniel Rudaev (D1DX)

Complete webhook lifecycle management for Airtable bases.

## Scripts

- `create-webhook.js` - Create webhooks with configurable filters
- `delete-webhook.js` - Delete webhooks by ID
- `recreate-webhook.js` - Recreate webhooks (delete old, create new)
- `refresh-webhook.js` - Refresh webhook expiration time

## Setup

1. Create an Airtable extension in your base
2. Copy desired script from `src/` folder
3. Paste into extension code editor
4. Configure personal access token in script
5. Run the extension

## Parameters

Each script requires:
- `token` - Your Airtable personal access token (PAT)
- `webhookId` - Webhook ID (for delete, recreate, refresh operations)
- `webhookUrl` - Target URL for webhook notifications (for create/recreate)
- `viewId` - View ID for record change scope (for create/recreate)
- `fieldIds` - Comma-separated field IDs to watch (for create/recreate)

## Features

- Create webhooks with filters (dataTypes, changeTypes, fromSources)
- Delete existing webhooks
- Recreate webhooks in one operation
- Refresh webhook expiration dates
- Interactive prompts for configuration

