# Sleep

Author: Daniel Rudaev (D1DX)

Controlled delays in Airtable automations with validation.

## Usage

In your automation script action, configure delaySeconds: 5 (for 5-second delay)

## Setup

1. Copy `src/sleep.js`
2. Create automation in Airtable
3. Add "Run a script" action
4. Paste the code
5. Configure `delaySeconds` input variable
6. Test and enable

## Parameters

- `delaySeconds` (required) - Delay duration in seconds (max: 20)

## How It Works

Uses busy-wait loop to create delays in Airtable automations where `setTimeout` is not available. Validates input and enforces maximum delay limits.
