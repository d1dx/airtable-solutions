//Version 2.1
//Copyright (c) 2025 D1DX. All rights reserved.

// ------------------------------------------------------
// 1) USER CONFIG & DICTIONARIES
// ------------------------------------------------------

/*****************************************************************
 *  TABLE-SELECTION LOGIC
 *****************************************************************/
let selectedTableIds = [];

// 1) Ask up-front whether to process all tables
let allOrNot = await input.buttonsAsync(
    "Process all tables in the base?",
    [
        { label: "Yes – include everything", value: "all", variant: "primary" },
        { label: "No – let me pick manually", value: "pick" }
    ]
);

if (allOrNot === "all") {
    // Simple – grab every table ID
    selectedTableIds = base.tables.map(t => t.id);
} else {
    // 2) Manual picker – Method 1
    while (true) {
        // Build a list of tables that haven’t been picked yet
        let remaining = base.tables.filter(t => !selectedTableIds.includes(t.id));

        // Safety – if none remain we are done
        if (remaining.length === 0) break;

        // Button set: one button per remaining table
        let buttons = remaining.map(t => ({ label: t.name, value: t.id }));

        // Show a DONE button **only after one or more selections**
        if (selectedTableIds.length > 0) {
            buttons.push({ label: "Done", value: 'DONE', variant: "primary" });
        }

        // Prompt the user
        let choice = await input.buttonsAsync(
            selectedTableIds.length === 0
                ? "Select at least one table, then press Done"
                : "Add another table or press Done",
            buttons
        );

        // When DONE is pressed (choice === null) exit the loop
        if (choice === 'DONE') break;

        // Otherwise store the selected table ID and continue
        selectedTableIds.push(choice);
    }
}

let showIds = await input.buttonsAsync('Do you want to include table and field IDs in the output?', [
    { label: 'Yes', value: true },
    { label: 'No', value: false }
]);

let includeOptions = await input.buttonsAsync('Do you want to include field options in the output?', [
    { label: 'Yes', value: true },
    { label: 'No', value: false }
]);

let tableIdMap = {};
let fieldIdMap = {};

// Build dictionaries for table and field IDs
function buildDictionaries() {
    for (let t of base.tables) {
        tableIdMap[t.id] = t.name;
        for (let f of t.fields) {
            fieldIdMap[f.id] = {
                name: f.name,
                tableName: t.name,
                tableId: t.id
            };
        }
    }
}

// ------------------------------------------------------
// 2) UTILITY FUNCTIONS
// ------------------------------------------------------

/** Convert a table ID to its name, or "Unknown Table" if not found. */
function getTableName(tableId) {
    return tableIdMap[tableId] || 'Unknown Table';
}

/** Describe a field ID as "FieldName (ID: ...)" if showIds is true, else "FieldName". */
function describeField(fieldId) {
    if (!fieldId) return 'Unknown Field';
    let info = fieldIdMap[fieldId];
    if (!info) {
        return showIds ? `Unknown Field (ID: ${fieldId})` : 'Unknown Field';
    }
    return showIds ? `${info.name} (ID: ${fieldId})` : info.name;
}

/** Join array of field IDs in a comma-delimited list. */
function describeFieldIds(fieldIds) {
    if (!Array.isArray(fieldIds) || fieldIds.length === 0) return '(none)';
    let mapped = fieldIds.map(id => describeField(id));
    return mapped.join(', ');
}

/** Indent every line of a string by N spaces. */
function indentString(str, spaces = 2) {
    let pad = ' '.repeat(spaces);
    return str
        .split('\n')
        .map(line => pad + line)
        .join('\n');
}

/** Print leftover JSON as an indented block, preceded by a short label. */
function unrecognizedSubOptions(type, obj) {
    let raw = JSON.stringify(obj, null, 2);
    let indented = indentString(raw, 2);
    return `(Unrecognized sub-options for type=${type}:\n${indented}\n)`;
}

/**
 * For collaborator arrays, produce lines like:
 *  - Name: X, Email: Y, Permission: Z, ID: ...
 */
function parseCollaboratorChoices(choices) {
    let lines = ['Collaborator choices:'];
    for (let c of choices) {
        let parts = [];
        parts.push(`Name: ${c.name || '(unnamed)'}`);
        if (c.email) {
            parts.push(`Email: ${c.email}`);
        }
        if (c.permissionLevel) {
            parts.push(`Permission: ${c.permissionLevel}`);
        }
        if (showIds && c.id) {
            parts.push(`ID: ${c.id}`);
        }
        lines.push('  - ' + parts.join(', '));
    }
    return lines;
}

// ------------------------------------------------------
// 3) RESULT TYPE PARSING FOR FORMULAS/ROLLUPS/LOOKUPS
// ------------------------------------------------------
function parseResultType(resultType, resultOptions) {
    if (!resultOptions) return [];
    let lines = [];

    switch (resultType) {
        case 'number':
        case 'percent':
        case 'currency': {
            // e.g. "Precision: 5", "Symbol: $"
            if (typeof resultOptions.precision === 'number') {
                lines.push(`Precision: ${resultOptions.precision}`);
            }
            if (resultType === 'currency' && resultOptions.symbol) {
                // No quotes for enumerations: We'll treat the currency symbol as user text, so we keep quotes
                // but the user specifically wants no quotes for enumerations. It's ambiguous.
                // We'll remove quotes here anyway for consistency with the request.
                lines.push(`Symbol: ${resultOptions.symbol}`);
            }
            break;
        }
        case 'rating': {
            // "Rating: icon=heart, max=9, color=redBright"
            let icon = resultOptions.icon || 'star';
            let max = resultOptions.max ?? 5;
            let color = resultOptions.color || 'yellowBright';
            lines.push(`icon=${icon}, max=${max}, color=${color}`);
            break;
        }
        case 'checkbox': {
            // "Checkbox: icon=xCheckbox, color=redBright"
            let icon = resultOptions.icon || 'check';
            let color = resultOptions.color || 'greenBright';
            lines.push(`icon=${icon}, color=${color}`);
            break;
        }
        case 'duration': {
            if (resultOptions.durationFormat) {
                // "Duration format: h:mm"
                lines.push(`durationFormat=${resultOptions.durationFormat}`);
            }
            break;
        }
        case 'date':
        case 'dateTime': {
            // "Date format: name=european, format=D/M/YYYY, timeFormat: name=24hour, format=HH:mm, timeZone=client"
            let pairs = [];
            if (resultOptions.dateFormat && typeof resultOptions.dateFormat === 'object') {
                let { name, format } = resultOptions.dateFormat;
                if (name && format) {
                    pairs.push(`name=${name}, format=${format}`);
                } else if (name) {
                    pairs.push(`name=${name}`);
                }
            }
            if (resultOptions.timeFormat && typeof resultOptions.timeFormat === 'object') {
                let { name, format } = resultOptions.timeFormat;
                pairs.push(`timeFormat: name=${name}, format=${format}`);
            }
            if (resultOptions.timeZone) {
                pairs.push(`timeZone=${resultOptions.timeZone}`);
            }
            if (pairs.length > 0) {
                lines.push(pairs.join(', '));
            }
            break;
        }
        case 'singleCollaborator':
        case 'multipleCollaborators': {
            // If there's a "choices" array, parse them
            if (Array.isArray(resultOptions.choices) && resultOptions.choices.length > 0) {
                lines.push(...parseCollaboratorChoices(resultOptions.choices));
            }
            break;
        }
        case 'multipleRecordLinks': {
            // Could parse isReversed, prefersSingleRecordLink if present
            let leftover = { ...resultOptions };
            let sub = [];
            if (typeof leftover.isReversed === 'boolean') {
                sub.push(`isReversed=${leftover.isReversed}`);
                delete leftover.isReversed;
            }
            if (typeof leftover.prefersSingleRecordLink === 'boolean') {
                sub.push(`prefersSingleRecordLink=${leftover.prefersSingleRecordLink}`);
                delete leftover.prefersSingleRecordLink;
            }
            if (sub.length > 0) {
                lines.push(sub.join(', '));
            }
            let keys = Object.keys(leftover);
            if (keys.length > 0) {
                lines.push(unrecognizedSubOptions('multipleRecordLinks', leftover));
            }
            break;
        }
        default: {
            // If leftover keys, show them
            let keys = Object.keys(resultOptions);
            if (keys.length > 0) {
                lines.push(unrecognizedSubOptions(resultType, resultOptions));
            }
        }
    }

    return lines;
}

function extractAdvancedMeta(opts) {
    let lines = [];
    let combined = [];
    if (typeof opts.isValid === 'boolean') {
        combined.push(`isValid=${opts.isValid}`);
    }
    if (Array.isArray(opts.referencedFieldIds) && opts.referencedFieldIds.length > 0) {
        combined.push(`Referenced fields=${describeFieldIds(opts.referencedFieldIds)}`);
    }
    if (combined.length > 0) {
        // e.g. "isValid=true, Referenced fields=Priority (ID: fldAbcd)"
        lines.push(combined.join(', '));
    }
    if (opts.result) {
        let rType = opts.result.type || 'unknown';
        lines.push(`Result type=${rType}`);
        if (opts.result.options && typeof opts.result.options === 'object') {
            let sub = parseResultType(rType, opts.result.options);
            if (sub.length > 0) {
                sub = sub.map(x => '  ' + x);
                lines.push(`=> Result ${rType} details:\n${sub.join('\n')}`);
            }
        }
    }
    return lines;
}

// ------------------------------------------------------
// 4) MAIN FIELD OPTIONS PARSING
// ------------------------------------------------------

function formatCollaboratorField(fieldOptions) {
    let lines = parseCollaboratorChoices(fieldOptions.choices || []);
    let adv = extractAdvancedMeta(fieldOptions);
    lines.push(...adv);
    return lines;
}

function formatOptions(field) {
    if (!field || typeof field !== 'object') return '';

    const type = field.type || 'unknown';
    const o = field.options || {};
    let lines = [];

    switch (type) {
        case 'singleSelect':
        case 'multipleSelects': {
            // "Choices: - name..., Color=..., ID=..."
            if (Array.isArray(o.choices) && o.choices.length > 0) {
                lines.push('Choices:');
                for (let c of o.choices) {
                    let extras = [];
                    if (c.color) extras.push(`Color=${c.color}`);
                    if (showIds && c.id) extras.push(`ID=${c.id}`);
                    let suffix = extras.length > 0 ? ` (${extras.join(', ')})` : '';
                    lines.push(`  - ${c.name}${suffix}`);
                }
            }
            break;
        }
        case 'singleCollaborator':
        case 'multipleCollaborators':
        case 'createdBy':
        case 'lastModifiedBy': {
            lines.push(...formatCollaboratorField(o));
            break;
        }
        case 'multipleRecordLinks': {
            // We do it on one line: "Links to: TableName, isReversed=false, prefersSingleRecordLink=true, inverseLinkField=..."
            let items = [];
            if (o.linkedTableId) {
                let tName = getTableName(o.linkedTableId);
                items.push(`Links to=${tName}${showIds ? ` (ID=${o.linkedTableId})` : ''}`);
            }
            if (typeof o.isReversed === 'boolean') {
                items.push(`isReversed=${o.isReversed}`);
            }
            if (typeof o.prefersSingleRecordLink === 'boolean') {
                items.push(`prefersSingleRecordLink=${o.prefersSingleRecordLink}`);
            }
            if (o.inverseLinkFieldId) {
                items.push(`inverseLinkField=${describeField(o.inverseLinkFieldId)}`);
            }
            if (o.viewIdForRecordSelection) {
                items.push(`viewIdForRecordSelection=${o.viewIdForRecordSelection}`);
            }
            if (items.length > 0) {
                lines.push(items.join(', '));
            }
            break;
        }
        case 'date':
        case 'dateTime':
        case 'createdTime':
        case 'lastModifiedTime': {
            // build all enumerations in one line if possible
            let combos = [];
            if (o.dateFormat) {
                let { name, format } = o.dateFormat;
                if (name && format) {
                    combos.push(`name=${name}`, `format=${format}`);
                } else if (name) {
                    combos.push(`name=${name}`);
                }
            }
            if (o.timeFormat) {
                let { name, format } = o.timeFormat;
                combos.push(`timeFormat: name=${name}`, `format=${format}`);
            }
            if (o.timeZone) {
                combos.push(`timeZone=${o.timeZone}`);
            }
            if (combos.length > 0) {
                lines.push(combos.join(', '));
            }
            lines.push(...extractAdvancedMeta(o));
            break;
        }
        case 'checkbox': {
            // e.g. "Checkbox: icon=heart, color=redBright"
            let icon = o.icon || 'check';
            let color = o.color || 'greenBright';
            lines.push(`icon=${icon}, color=${color}`);
            break;
        }
        case 'rating': {
            // "Rating: icon=heart, max=9, color=redBright"
            let icon = o.icon || 'star';
            let max = o.max || 5;
            let color = o.color || 'yellowBright';
            lines.push(`icon=${icon}, max=${max}, color=${color}`);
            break;
        }
        case 'duration': {
            if (o.durationFormat) {
                lines.push(`durationFormat=${o.durationFormat}`);
            }
            break;
        }
        case 'number':
        case 'percent':
        case 'currency': {
            if (typeof o.precision === 'number') {
                lines.push(`Precision=${o.precision}`);
            }
            if (type === 'currency' && o.symbol) {
                // Remove quotes from symbol as well
                lines.push(`Symbol=${o.symbol}`);
            }
            break;
        }
        case 'formula': {
            let txt = o.formula?.formula || 'N/A';
            lines.push(`Formula text=${txt}`);
            lines.push(...extractAdvancedMeta(o));
            break;
        }
        case 'rollup': {
            let singleLine = [];
            if (typeof o.recordLinkFieldId === 'string') {
                singleLine.push(`recordLinkField=${describeField(o.recordLinkFieldId)}`);
            }
            if (typeof o.fieldIdInLinkedTable === 'string') {
                singleLine.push(`fieldInLinkedTable=${describeField(o.fieldIdInLinkedTable)}`);
            }
            if (o.rollupFunction) {
                singleLine.push(`rollupFunction=${o.rollupFunction}`);
            }
            if (o.recordLinkFieldName) {
                singleLine.push(`recordLinkFieldName=${o.recordLinkFieldName}`);
            }
            if (o.fieldName) {
                singleLine.push(`fieldName=${o.fieldName}`);
            }
            if (singleLine.length > 0) {
                lines.push(singleLine.join(', '));
            }
            lines.push(...extractAdvancedMeta(o));
            break;
        }
        case 'lookup': {
            let singleLine = [];
            if (typeof o.recordLinkFieldId === 'string') {
                singleLine.push(`recordLinkField=${describeField(o.recordLinkFieldId)}`);
            }
            if (typeof o.fieldIdInLinkedTable === 'string') {
                singleLine.push(`fieldInLinkedTable=${describeField(o.fieldIdInLinkedTable)}`);
            }
            if (o.recordLinkFieldName) {
                singleLine.push(`recordLinkFieldName=${o.recordLinkFieldName}`);
            }
            if (o.fieldName) {
                singleLine.push(`fieldName=${o.fieldName}`);
            }
            if (singleLine.length > 0) {
                lines.push(singleLine.join(', '));
            }
            lines.push(...extractAdvancedMeta(o));
            break;
        }
        case 'count': {
            let singleLine = [];
            if (typeof o.recordLinkFieldId === 'string') {
                singleLine.push(`recordLinkField=${describeField(o.recordLinkFieldId)}`);
            }
            if (typeof o.isValid === 'boolean') {
                singleLine.push(`isValid=${o.isValid}`);
            }
            if (singleLine.length > 0) {
                lines.push(singleLine.join(', '));
            }
            break;
        }
        case 'multipleLookupValues': {
            // "Multiple lookup details:\n  - ..."
            let detail = [];
            if (o.fieldIdInLinkedTable) {
                detail.push(`fieldInLinkedTable=${describeField(o.fieldIdInLinkedTable)}`);
            }
            if (o.recordLinkFieldId) {
                detail.push(`recordLinkField=${describeField(o.recordLinkFieldId)}`);
            }
            if (typeof o.isValid === 'boolean') {
                detail.push(`isValid=${o.isValid}`);
            }
            if (o.result) {
                detail.push(`result.type=${o.result.type}`);
                if (o.result.options) {
                    let sub = parseResultType(o.result.type, o.result.options);
                    if (sub.length > 0) {
                        sub = sub.map(x => '    ' + x);
                        detail.push(`result.options:\n${sub.join('\n')}`);
                    }
                }
            }
            if (detail.length > 0) {
                lines.push('Multiple lookup details:\n  - ' + detail.join('\n  - '));
            }
            break;
        }
        case 'multipleAttachments': {
            let singleLine = [];
            if (typeof o.isReversed === 'boolean') {
                singleLine.push(`isReversed=${o.isReversed}`);
            }
            if (singleLine.length > 0) {
                lines.push(singleLine.join(', '));
            }
            break;
        }
        case 'button': {
            let singleLine = [];
            if (o.label) {
                singleLine.push(`label=${o.label}`);
            }
            if (o.icon) {
                singleLine.push(`icon=${o.icon}`);
            }
            if (singleLine.length > 0) {
                lines.push(singleLine.join(', '));
            }
            break;
        }
        case 'externalSyncSource': {
            // "External Sync Choices:"
            if (Array.isArray(o.choices) && o.choices.length > 0) {
                lines.push('External Sync Choices:');
                for (let c of o.choices) {
                    let extras = [];
                    if (c.color) extras.push(`Color=${c.color}`);
                    if (showIds && c.id) extras.push(`ID=${c.id}`);
                    let suffix = extras.length > 0 ? ` (${extras.join(', ')})` : '';
                    lines.push(`  - ${c.name}${suffix}`);
                }
            }
            break;
        }
        case 'aiText': {
            // "Prompt: []", "Referenced fields=..."
            if (o.prompt) {
                lines.push(`Prompt=${JSON.stringify(o.prompt, null, 2)}`);
            }
            if (Array.isArray(o.referencedFieldIds) && o.referencedFieldIds.length > 0) {
                lines.push(`Referenced fields=${describeFieldIds(o.referencedFieldIds)}`);
            }
            break;
        }
        case 'barcode':
            // typically no extra options
            break;
        default: {
            let leftoverKeys = Object.keys(o);
            if (leftoverKeys.length > 0) {
                let raw = JSON.stringify(o, null, 2);
                let indented = indentString(raw, 2);
                lines.push(`Other options:\n${indented}`);
            }
        }
    }

    return lines.join('\n');
}

// ------------------------------------------------------
// 5) MAIN SCRIPT EXECUTION
// ------------------------------------------------------
buildDictionaries();

output.markdown(`# Base: **${base.name}**`);
if (showIds) {
    output.markdown(`Base ID: \`${base.id}\``);
}
output.markdown('\n---');
output.markdown('\n---');

for (let table of base.tables.filter(t => selectedTableIds.includes(t.id))) {
    output.markdown(`## Table: **${table.name}**`);
    if (showIds) {
        output.markdown(`Table ID: \`${table.id}\``);
    }

    for (let field of table.fields) {
        output.markdown(`\n### Field: **${field.name}**`);
        if (showIds) {
            output.markdown(`Field ID: \`${field.id}\``);
        }

        output.markdown(`Type: \`${field.type}\``);

        if (field.description) {
            output.markdown(`Description: ${field.description}`);
        }

        if (includeOptions) {
            let opts = formatOptions(field);
            if (opts.trim().length > 0) {
                output.markdown(`\n**Options**:\n${opts}`);
            }
        }
    }   // end field loop

    output.markdown('\n---');
}       // end table loop

output.markdown('\n**End of ERD Output**');
