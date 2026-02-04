// Author: Daniel Rudaev (D1DX) | Version: 1.0.0
// Personal access token
const token = 'YOUR-AIRTABLE-PAT-HERE';

// Initialize the API authorization
const authorizationHeader = {
    "Authorization": `Bearer ${token}`,
    "Content-Type": "application/json"
};

// Prompt the user for the ID of the webhook to delete
const webhookIdToDelete = await input.textAsync(
    "Please enter the ID of the webhook to delete:"
);

if (!webhookIdToDelete) {
    console.log("No webhook ID provided. Exiting.");
    output.text("No webhook ID provided. Exiting.");
    return;
}

console.log(`Attempting to delete webhook with ID: ${webhookIdToDelete}`);

// Make the DELETE request
const deleteResponse = await fetch(`https://api.airtable.com/v0/bases/${base.id}/webhooks/${webhookIdToDelete}`, {
    method: 'DELETE',
    headers: authorizationHeader
});

if (deleteResponse.ok) {
    console.log(`Webhook with ID ${webhookIdToDelete} has been successfully deleted.`);
    output.text(`Webhook with ID ${webhookIdToDelete} has been successfully deleted.`);
} else {
    const errorData = await deleteResponse.json();
    console.log(`Failed to delete webhook. Error:`, errorData);
    output.text(`Failed to delete webhook. Error: ${JSON.stringify(errorData)}`);
}
