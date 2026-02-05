// Author: Daniel Rudaev (D1DX) | Version: 1.0.0
// Personal access token
const token = 'YOUR-AIRTABLE-PAT-HERE';

// Initialize the API authorization
const authorizationHeader = {
    "Authorization": `Bearer ${token}`,
    "Content-Type": "application/json"
};

// List current webhooks
const listWebhooksResponse = await fetch(`https://api.airtable.com/v0/bases/${base.id}/webhooks`, {
    method: 'GET',
    headers: authorizationHeader
});

const listWebhooksData = await listWebhooksResponse.json();

// Prompt the user for the ID of the webhook to delete
const webhookIdToDelete = await input.textAsync(
    "Please enter the ID of the webhook to delete (or '-' to skip):"
);

// Find the webhook in the list that matches the provided ID
let webhookToDelete = null;
if (webhookIdToDelete !== '-') {
    webhookToDelete = listWebhooksData.webhooks.find(webhook => webhook.id === webhookIdToDelete);
    if (!webhookToDelete) {
        console.log(`No webhook found with the ID ${webhookIdToDelete}. Proceeding without deletion.`);
    }
}

// Ask the user for the new Webhook URL
let webhookUrl = await input.textAsync('Please enter the Webhook URL:');

// Validate the input URL
if (!webhookUrl || !webhookUrl.startsWith('http')) {
    console.log('Invalid URL entered');
    output.text('Invalid URL. Exiting.');
    return;
}

const dataTypesInput = ['tableData'];
const changeTypesInput = ['add', 'update', 'remove'];
const fromSourcesInput = ['client','formSubmission','formPageSubmission','sync','system'];

const recordChangeScopeInput = await input.textAsync('Please enter the View ID:');
const watchDataInFieldIdsInput = (await input.textAsync('Please enter the field IDs to watch, separated with commas only:')).split(',');

// Define the Webhook payload with dynamic inputs
const webhookPayload = {
    "notificationUrl": webhookUrl,
    "specification": {
        "options": {
            "filters": {
                "dataTypes": dataTypesInput,
                "changeTypes": changeTypesInput,
                "fromSources": fromSourcesInput,
                "recordChangeScope": recordChangeScopeInput,
                "watchDataInFieldIds": watchDataInFieldIdsInput
            }
        }
    }
};

console.log('Sending webhook creation request to Airtable API');

try {
    // Create the Webhook
    const createWebhookResponse = await fetch(`https://api.airtable.com/v0/bases/${base.id}/webhooks`, {
        method: 'POST',
        headers: authorizationHeader,
        body: JSON.stringify(webhookPayload)
    });

    console.log(`Received response with status: ${createWebhookResponse.status}`);

    if (createWebhookResponse.ok) {
        const webhookData = await createWebhookResponse.json();
        console.log(`Webhook created successfully!`);
        output.text('Webhook ID:\n' + webhookData.id + '\n');
        output.text('MAC Secret:\n' + webhookData.macSecretBase64 + '\n');
        output.text('Expiration Time:\n' + webhookData.expirationTime);

        // Delete the old webhook if it exists and was specified
        if (webhookToDelete) {
            const deleteResponse = await fetch(`https://api.airtable.com/v0/bases/${base.id}/webhooks/${webhookToDelete.id}`, {
                method: 'DELETE',
                headers: authorizationHeader
            });
            if (deleteResponse.ok) {
                console.log(`Webhook with ID ${webhookIdToDelete} has been deleted.`);
            } else {
                console.log(`Failed to delete webhook with ID ${webhookIdToDelete}.`);
            }
        }
    } else {
        const errorData = await createWebhookResponse.json();
        console.log('Failed to create the webhook. Error:', errorData);
        output.text(`Failed to create the webhook. Error: ${JSON.stringify(errorData)}`);
    }
} catch (error) {
    console.log('An error occurred:', error);
    output.text(`An error occurred: ${error}`);
}
