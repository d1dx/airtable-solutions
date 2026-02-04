let inputConfig = input.config();

// Check if the required input (recordId) is provided
if (!inputConfig.recordId) {
  console.error("No recordId provided in the input.");
  throw new Error("No recordId provided in the input.");
}

let recordId = inputConfig.recordId;
let webhookUrl = inputConfig.webhookURL;

// Log the webhook URL and payload for debugging
console.log("Webhook URL:", webhookUrl);
console.log("Payload:", JSON.stringify({ recordId }));

// Function to add delay between retry attempts (Airtable-compatible)
async function sleep(ms) {
  let start = Date.now();
  while (Date.now() - start < ms) {
    // Airtable does not support setTimeout, so we use a blocking loop
  }
}

// Function to send webhook request with retry mechanism
async function sendWebhookWithRetry(url, payload, retries = 3, delay = 5000) {
  let lastError = null; // Store the last error for final logging

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`Attempt ${attempt}: Sending payload...`);
      let response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        console.log("Payload sent successfully.");
        return; // Exit function immediately if successful
      }

      // Log error for this failed attempt
      lastError = new Error(`Attempt ${attempt}: Failed to send the payload. Status: ${response.status} ${response.statusText}`);
      console.error(lastError.message);

      if (attempt < retries) {
        console.log(`Retrying in ${delay / 1000} seconds...`);
        await sleep(delay); // Wait before retrying
      }
    } catch (error) {
      // Log error for this failed attempt
      lastError = error;
      console.error(`Attempt ${attempt} failed with error: ${error.message}`);

      if (attempt < retries) {
        console.log(`Retrying in ${delay / 1000} seconds...`);
        await sleep(delay); // Wait before retrying
      }
    }
  }

  // If all retries fail, log the final error message and throw an error
  console.error("All retry attempts failed. Could not send the payload.");
  throw lastError || new Error("All retry attempts failed. Could not send the payload.");
}

// Execute the function to send the webhook request
await sendWebhookWithRetry(webhookUrl, { recordId });
