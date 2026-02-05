# Send HTTP Request

Author: Daniel Rudaev (D1DX)

Sends webhook HTTP requests with retry mechanism and error handling.

## Usage

Configure in automation: webhookUrl: "https://your-webhook-endpoint.com" and payload: your JSON data

## Setup

1. Copy `src/send-http-request.js`
2. Create automation in Airtable
3. Add "Run a script" action
4. Paste the code
5. Configure input variables for webhook URL and payload
6. Test with sample trigger

## Parameters

- `webhookUrl` (required) - Target webhook endpoint
- `payload` (optional) - JSON data to send
- `method` (optional) - HTTP method (default: POST)

## Features

- Automatic retry logic for failed requests
- Error handling and logging
- Supports custom headers and methods

