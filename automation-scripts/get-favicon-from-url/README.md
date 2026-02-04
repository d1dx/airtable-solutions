# Get Favicon from URL

Author: Daniel Rudaev (D1DX)

Fetches website favicons and uploads them to tmpfiles.org for temporary hosting.

## Usage

```javascript
// Configure in automation:
// siteUrl: "https://www.example.com"
```

## Setup

1. Copy `src/get-favicon.js`
2. Create automation in Airtable
3. Add "Run a script" action
4. Paste the code
5. Configure `siteUrl` input variable
6. Output will be set to `faviconUrl`

## Parameters

- `siteUrl` (required) - Website URL to fetch favicon from

## Output

- `faviconUrl` - Direct download URL on tmpfiles.org (expires in 60 minutes)

## How It Works

1. Constructs Google's favicon URL from input site
2. Fetches favicon as binary data
3. Uploads to tmpfiles.org via multipart form-data
4. Returns direct download link

Version: 1.0.0
