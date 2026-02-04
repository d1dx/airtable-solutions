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
const refreshWebhook = async (baseId, webhookId) => {
    const token = 'YOUR-AIRTABLE-PAT-HERE';
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

// Executing the refreshWebhook function
const baseId = base.id;
const webhookId = input.config().webhookId;

await refreshWebhook(baseId, webhookId);
