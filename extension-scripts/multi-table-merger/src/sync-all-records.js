/***********************************************************************
 * Airtable Multi-Table ➜ Results synchroniser   •   v2.7 (2025-06-06)
 * --------------------------------------------------------------------
 * Mirrors records from every table in the base (except excluded ones)
 * into a single “Results” table.
 *
 * Behaviour
 * - New source record        ➜ create new Results row
 * - Any field change
 *     • If key field (Status, Users) changed ➜
 *           mark old Results row Destroyed? = true
 *           create fresh Results row
 *     • Else if any other field changed     ➜
 *           update existing Results row
 * - Source record removed    ➜ mark Results row Destroyed? = true
 * - No change                ➜ do nothing (skip write)
 *
 * Prerequisites
 * - Secret “token” (PAT) stored in scripting environment.
 * - Results table contains:
 *       • “-Source Record ID-”  (text)
 *       • “Destroyed?”          (checkbox)
 * - Optional input variable     nonSyncedTables = comma-separated list
 **********************************************************************/

/* ========== CONFIG ========== */
const token = input.secret('token');
const REFRESH_FIELDS = ['Status', 'Users']; // key, high-impact
const TABLES_TO_NOT_SYNC = ['Results', 'Settings']; // always skip
const DESTROYED_FIELD = 'Destroyed?';
const BATCH_SIZE = 50;

/* merge hard-coded and runtime exclusions */
const cfg = input.config();
const nonSyncedTables = new Set(
    [...TABLES_TO_NOT_SYNC, ...(cfg.nonSyncedTables || '')
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
    ]
);
console.log(`Initialised – Excluded tables: ${[...nonSyncedTables].join(', ') || 'none'}`);

/* ========== UTILITIES ========== */
const initAuthHeader = t => ({
    Authorization: `Bearer ${t}`,
    'Content-Type': 'application/json'
});

const fetchJSON = async (url, opt) => {
    console.log(`GET ${url}`);
    return (await (await fetch(url, opt)).json());
};

const batchOperate = async (op, payload, size = BATCH_SIZE) => {
    if (!payload.length) return;
    console.log(`Batch op – ${op.name} – rows: ${payload.length}`);
    for (let i = 0; i < payload.length; i += size) {
        const slice = payload.slice(i, i + size);
        console.log(`  Slice ${i}-${i + slice.length - 1}`);
        await op(slice);
    }
};

/* ========== EXTERNAL API HELPERS ========== */
const fetchBaseSchema = async baseId =>
    fetchJSON(
        `https://api.airtable.com/v0/meta/bases/${baseId}/tables`, {
            method: 'GET',
            headers: initAuthHeader(token)
        }
    );

const fetchTableRecords = async tableId => {
    const tbl = base.getTable(tableId);
    const rs = await tbl.selectRecordsAsync();
    console.log(`Fetched ${rs.records.length} from '${tbl.name}'`);
    return rs.records;
};

/* ========== RECORD HELPERS ========== */

/**
 * Extract a simple value from Airtable cell data.
 */
const extractFieldValue = v => {
    if (!v) {
        return null;
    }

    // Step 2: pick label, name, url, or raw value
    const candidate = v.label || v.name || v.url || v;

    // Step 3: if text, strip leading backslashes and trim
    if (typeof candidate === 'string') {
        // Remove one or more '\' characters at the start, then trim spaces
        return candidate.replace(/^\\+/, '').trim();
    }

    // Non-string values remain unchanged
    return candidate;
};

/**
 * Check if a particular field’s value changed between source and target.
 */
const hasFieldChanged = (src, tgt, field) => {
    const srcVal = extractFieldValue(src.getCellValue(field)) || "";
    const tgtVal = extractFieldValue(tgt.getCellValue(field)) || "";

    // Determine if this looks like a date/datetime string (YYYY-MM-DD or YYYY-MM-DDThh:mm:ss)
    const isDateString = (val) =>
        typeof val === "string" && /^\d{4}-\d{2}-\d{2}(T.*)?$/.test(val);

    let normalizedSrc = srcVal;
    let normalizedTgt = tgtVal;

    // Only strip off the “T…” portion when it’s actually a date or datetime string
    if (isDateString(srcVal) || isDateString(tgtVal)) {
        normalizedSrc = ("" + srcVal).split("T")[0];
        normalizedTgt = ("" + tgtVal).split("T")[0];
    }

    if (normalizedSrc !== normalizedTgt) {
        console.log(
            `hasFieldChanged → field: "${field}", ` +
            `raw src: "${srcVal}", raw tgt: "${tgtVal}", ` +
            `normalized src: "${normalizedSrc}", normalized tgt: "${normalizedTgt}"`
        );
        return true;
    }

    return false;
};

/**
 * Build the “fields” object for Results record based on source record.
 */
const buildFieldsObject = (schemaFields, srcRec) => {
    const fields = {
        '-Source Record ID-': srcRec.id
    };
    schemaFields.forEach(f => {
        fields[f.name] = extractFieldValue(srcRec.getCellValue(f.name));
    });
    return fields;
};

/**
 * Determine if any non-key data changed or if “Destroyed?” was true.
 */
const hasAnyDataChanged = (srcRec, resRec, schemaFields) => {
    for (const f of schemaFields) {
        if (hasFieldChanged(srcRec, resRec, f.name)) {
            const oldVal = extractFieldValue(resRec.getCellValue(f.name)) || "";
            const newVal = extractFieldValue(srcRec.getCellValue(f.name)) || "";
            console.log(
                `Field "${f.name}" changed: "${oldVal}" → "${newVal}"`
            );
            return true;
        }
    }

    const resDestroyed = resRec.getCellValue(DESTROYED_FIELD) || false;
    if (resDestroyed) {
        console.log(
            `Destroyed? flag is true for Results record ID "${resRec.id}" (will be “un-destroyed”)`
        );
        return true;
    }

    return false;
};

/**
 * Compare a source record with its existing Results counterpart. 
 */
const compareWithExisting = (srcRec, resRec, schemaFields) => {
    const mustRefresh = REFRESH_FIELDS.some(f =>
        schemaFields.some(sf => sf.name === f) && hasFieldChanged(srcRec, resRec, f)
    );
    const anyChange = mustRefresh ?
        true // already know key field differs
        :
        hasAnyDataChanged(srcRec, resRec, schemaFields);
    return {
        mustRefresh,
        anyChange,
        record: {
            id: resRec.id,
            fields: buildFieldsObject(schemaFields, srcRec)
        }
    };
};

/**
 * Prepare lists of records to create, update, or refresh/destroy 
 * based on diff between source and existing Results.
 */
const prepareTableDiff = (srcRecs, existingMap, schemaFields) => {
    const toCreate = [];
    const toUpdate = [];
    const toRefresh = [];
    const seenIds = new Set();

    srcRecs.forEach(src => {
        const existing = existingMap.get(src.id);
        console.log(
            `Looking up source ID ${src.id} in existingMap →`,
            existing ? 'FOUND a Results row ' + existing.id : 'NO MATCH'
        );
        if (existing) {
            // Call compareWithExisting to detect field changes:
            const {
                mustRefresh,
                anyChange,
                record
            } = compareWithExisting(src, existing, schemaFields);
            if (mustRefresh) {
                toRefresh.push(record);
            } else if (anyChange) {
                toUpdate.push(record);
            }
        } else {
            toCreate.push({
                fields: buildFieldsObject(schemaFields, src)
            });
        }
        seenIds.add(src.id);
    });

    return {
        toCreate,
        toUpdate,
        toRefresh,
        seenIds
    };
};

/* ========== TYPE-FORMATTING HELPERS ========== */

/**
 * Convert a raw value into the structure Airtable’s API expects
 * for the given Results-table field type.
 */
const formatForFieldType = (val, type) => {
    if (val === undefined || val === null) return null;

    switch (type) {
        /* Text fields */
        case 'singleLineText':
        case 'richText':
        case 'multilineText':
            return String(val);

            /* Single select */
        case 'singleSelect':
            return typeof val === 'string' ? {
                name: val
            } : val;

            /* Multiple select */
        case 'multipleSelects':
            if (Array.isArray(val)) {
                return val.map(v => (typeof v === 'string' ? {
                    name: v
                } : v));
            }
            return [{
                name: String(val)
            }];

            /* Linked records (array of record IDs) */
        case 'multipleRecordLinks':
            return Array.isArray(val) ? val : [];

            /* Single collaborator (user) */
        case 'singleCollaborator':
            return typeof val === 'string' ? {
                id: val
            } : val;

            /* Multiple collaborators */
        case 'multipleCollaborators':
            return Array.isArray(val) ? val.map(id => ({
                id
            })) : [];

            /* Checkbox */
        case 'checkbox':
            return Boolean(val);

            /* Number-based fields */
        case 'number':
        case 'percent':
        case 'currency':
            return Number(val) || 0;

            /* Date/time fields – convert Date → ISO string */
        case 'date':
        case 'dateTime':
            return val instanceof Date ? val.toISOString() : val;

        default:
            // For attachments, formulas, rollups, etc., pass through
            return val;
    }
};

/**
 * Wrap a record payload so that every field value is formatted 
 * according to the Results-table’s schema before sending.
 */
let resultsFieldTypes; // will be assigned in sync()
const adaptForResults = rec => {
    const out = {
        ...rec,
        fields: {
            ...rec.fields
        }
    };
    for (const [fieldName, value] of Object.entries(out.fields)) {
        const t = resultsFieldTypes.get(fieldName);
        out.fields[fieldName] = formatForFieldType(value, t);
    }
    return out;
};

/* ========== MAIN SYNC ========== */
const sync = async () => {
    const resultsTable = base.getTable('Results');

    /* --- cache current Results rows --- */
    // 1. Fetch every row from “Results”
    const resRecords = await resultsTable.selectRecordsAsync();

    // 2. Keep only rows where “Destroyed?” is false
    const activeRows = resRecords.records.filter(row =>
        !row.getCellValue(DESTROYED_FIELD)
    );

    // 3. Build lookup maps from activeRows only
    const byResultId = new Map(activeRows.map(r => [r.id, r]));
    const bySourceRecordId = new Map(
        activeRows.map(r => [r.getCellValue('-Source Record ID-'), r])
    );
    console.log(`Cached ${resRecords.records.length} rows from 'Results'`);

    /* --- map Results field names → field types --- */
    resultsFieldTypes = new Map(
        resultsTable.fields.map(f => [f.name, f.type])
    );

    /* --- aggregate diffs --- */
    let createPayload = [];
    let updatePayload = [];
    let refreshDestroyUpdates = [];
    let seenSourceIds = new Set();

    const schema = await fetchBaseSchema(base.id);
    console.log(`Schema contains ${schema.tables.length} tables`);

    for (const t of schema.tables) {
        if (nonSyncedTables.has(t.name)) {
            console.log(`Skipping '${t.name}' – excluded`);
            continue;
        }

        const srcRecs = await fetchTableRecords(t.id);
        const {
            toCreate,
            toUpdate,
            toRefresh,
            seenIds
        } =
        prepareTableDiff(srcRecs, bySourceRecordId, t.fields);

        /* active rows must have Destroyed? = false */
        toUpdate.forEach(r => {
            r.fields[DESTROYED_FIELD] = false;
        });

        /* handle refreshes: mark old as destroyed, then create new */
        refreshDestroyUpdates = refreshDestroyUpdates.concat(
            toRefresh.map(r => ({
                id: r.id,
                fields: {
                    [DESTROYED_FIELD]: true
                }
            }))
        );
        createPayload = createPayload.concat(
            toRefresh.map(r => ({
                fields: r.fields
            }))
        );

        /* accumulate create & update */
        createPayload = createPayload.concat(toCreate);
        updatePayload = updatePayload.concat(toUpdate);
        seenSourceIds = new Set([...seenSourceIds, ...seenIds]);

        console.log(
            `Processed '${t.name}' – create ${toCreate.length}, ` +
            `update ${toUpdate.length}, refresh ${toRefresh.length}`
        );
    }

    /* rows no longer present in any table ➜ soft-delete */
    const obsoleteUpdates = Array.from(byResultId.values())
        .filter(r =>
            !seenSourceIds.has(r.getCellValue('-Source Record ID-')) &&
            !r.getCellValue(DESTROYED_FIELD)
        )
        .map(r => ({
            id: r.id,
            fields: {
                [DESTROYED_FIELD]: true
            }
        }));

    console.log(updatePayload);

    /* ========== FORMAT ALL PENDING RECORDS FOR Results TABLE ========== */
    createPayload = createPayload.map(adaptForResults);
    updatePayload = updatePayload.map(adaptForResults);
    refreshDestroyUpdates = refreshDestroyUpdates.map(adaptForResults);
    const obsoleteFormatted = obsoleteUpdates.map(adaptForResults);

    /* --- batched writes --- */
    await batchOperate(batch => resultsTable.createRecordsAsync(batch), createPayload);
    await batchOperate(batch => resultsTable.updateRecordsAsync(batch), updatePayload);
    await batchOperate(batch => resultsTable.updateRecordsAsync(batch), refreshDestroyUpdates);
    await batchOperate(batch => resultsTable.updateRecordsAsync(batch), obsoleteFormatted);

    /* --- summary --- */
    console.log(
        `Summary – created ${createPayload.length}, ` +
        `updated ${updatePayload.length}, ` +
        `refresh-destroyed ${refreshDestroyUpdates.length}, ` +
        `obsolete-destroyed ${obsoleteFormatted.length}`
    );
};

/* ========== EXECUTE ========== */
await sync();
