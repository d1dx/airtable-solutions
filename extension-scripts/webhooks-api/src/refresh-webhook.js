// Author: Daniel Rudaev (D1DX) | Version: 1.0.0
// Utility Functions
const initAuthHeader = (token) => ({
    "Authorization": `Bearer ${token}`,
    "Content-Type": "application/json"
});

const fetchJSON = async (url, options) => {
    const response = await fetch(url, options);
    console.log('Fetch response status: ', response.status);
    return await response.json();
};

// Function to refresh webhook
const refreshWebhook = async (baseId, webhookId, token) => {
    const url = `https://api.airtable.com/v0/bases/${baseId}/webhooks/${webhookId}/refresh`;
    const options = {
        method: 'POST',
        headers: initAuthHeader(token)
    };
    console.log('Initiating webhook refresh...');
    const jsonResponse = await fetchJSON(url, options);
    console.log('Webhook refresh response: ', jsonResponse);
    return jsonResponse.expirationTime;
};

// Prompt for token and webhook ID
const token = await input.textAsync("Please enter your Airtable personal access token:");

if (!token) {
    console.log("No token provided. Exiting.");
    return;
}

const webhookId = await input.textAsync("Please enter the webhook ID:");

if (!webhookId) {
    console.log("No webhook ID provided. Exiting.");
    return;
}

// Executing the refreshWebhook function
const baseId = base.id;

await refreshWebhook(baseId, webhookId, token);
