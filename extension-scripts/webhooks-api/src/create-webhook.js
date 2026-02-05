// Author: Daniel Rudaev (D1DX) | Version: 1.0.0
/******************************************************************
 * Webhook management
 * – constants configured once via the Extension Settings panel
 * – creates a new webhook and can delete an old one in one run
 ******************************************************************/

/**************************************************************
 * 1. SETTINGS  (single input.config call)
 **************************************************************/
const cfg = input.config({
    title: 'Webhook – constants',
    description: 'Populate once in the sidebar. No code edits required.',
    items: [
        input.config.text('token', {
            label: 'Personal access token',
            placeholder: 'patXXXXXXXXXXXXXX',
        }),
        input.config.text('webhookUrl', {
            label: 'Webhook URL',
            placeholder: 'https://example.com/webhook',
        }),
        input.config.text('dataTypes', {
            label: 'Data types (CSV)',
            default: 'tableData',
        }),
        input.config.text('changeTypes', {
            label: 'Change types (CSV)',
            default: 'add,update,remove',
        }),
        input.config.text('fromSources', {
            label: 'From sources (CSV)',
            default: 'client,formSubmission,formPageSubmission,sync,system',
        }),
        input.config.text('recordScopeViewId', {
            label: 'Record-change scope VIEW-ID',
            placeholder: 'viwXXXXXXXXXXXXXX',
        }),
        input.config.text('fieldIds', {
            label: 'Field IDs to watch (CSV)',
            placeholder: 'fldA1B2C3,fldD4E5F6',
        }),
    ],
});

/**************************************************************
 * 2. HELPERS
 **************************************************************/
const csv = (s) => s.split(',').map((v) => v.trim()).filter(Boolean);

/**************************************************************
 * 3. CONSTANTS FROM SETTINGS
 **************************************************************/
const token                     = cfg.token.trim();
const webhookUrl                = cfg.webhookUrl.trim();
const dataTypesInput            = csv(cfg.dataTypes);
const changeTypesInput          = csv(cfg.changeTypes);
const fromSourcesInput          = csv(cfg.fromSources);
const recordChangeScopeInput    = cfg.recordScopeViewId.trim();   // view ID
const watchDataInFieldIdsInput  = csv(cfg.fieldIds);

/**************************************************************
 * 4. OPTIONAL RUNTIME INPUT
 **************************************************************/
const webhookIdToDelete = await input.textAsync(
    "Enter existing webhook ID to delete (or '-' to skip):"
);

/**************************************************************
 * 5. MAIN LOGIC
 **************************************************************/
const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
};

// List current webhooks
const listRes = await fetch(
    `https://api.airtable.com/v0/bases/${base.id}/webhooks`,
    { method: 'GET', headers }
);
const { webhooks = [] } = await listRes.json();

// Identify webhook to delete
const webhookToDelete = webhookIdToDelete !== '-'
    ? webhooks.find((w) => w.id === webhookIdToDelete)
    : null;

// Build payload for the new webhook
const payload = {
    notificationUrl: webhookUrl,
    specification: {
        options: {
            filters: {
                dataTypes: dataTypesInput,
                changeTypes: changeTypesInput,
                fromSources: fromSourcesInput,
                recordChangeScope: recordChangeScopeInput,
                watchDataInFieldIds: watchDataInFieldIdsInput,
            },
        },
    },
};

// Create the webhook
console.log('Creating webhook…');
const createRes = await fetch(
    `https://api.airtable.com/v0/bases/${base.id}/webhooks`,
    { method: 'POST', headers, body: JSON.stringify(payload) }
);

if (createRes.ok) {
    const data = await createRes.json();
    output.text(
        `Webhook created\nID: ${data.id}\nMAC secret: ${data.macSecretBase64}\nExpires: ${data.expirationTime}`
    );

    // Delete the old webhook if requested
    if (webhookToDelete) {
        const delRes = await fetch(
            `https://api.airtable.com/v0/bases/${base.id}/webhooks/${webhookToDelete.id}`,
            { method: 'DELETE', headers }
        );
        console.log(
            delRes.ok
                ? `Deleted old webhook ${webhookIdToDelete}`
                : `Failed to delete webhook ${webhookIdToDelete}`
        );
    }
} else {
    const err = await createRes.json();
    output.text(`Failed to create webhook\n${JSON.stringify(err, null, 2)}`);
}
