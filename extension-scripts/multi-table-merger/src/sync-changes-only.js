/**************************************************************************
* Webhook Payload Processor - version 3.6 Name-Based Version
**************************************************************************/

/*────────────────────────── Globals ──────────────────────────*/
const API_KEY          = input.secret('PAT');
const WEBHOOK_ID       = input.config().webhookId;

// Changed from IDs to Names
const SETTINGS_TABLE_NAME = 'Settings';
const SETTINGS_RECORD_NAME = 'Cursor'; // The value in the 'Name' field
const CURSOR_FIELD_NAME    = 'Value';

const RESULTS_TABLE_NAME   = 'Results';
const SOURCE_FIELD_NAME    = '-Synced Record ID-'; // Updated per ERD

/* tables that never participate */
const IGNORED_TABLE_NAMES  = []; 

/* When ANY of these field names change → delete+create instead of update */
const RECREATE_TRIGGER_FIELDS = [];

/* In-memory stores */
let resultsCache       = {};   
let initialCache       = {};   
let sourceRecordsCache = {};   
let GLOBAL_BASE_SCHEMA = null;

/*───────────────────────── Helpers ──────────────────────────*/
const log = (level, msg, data = {}) =>
  console.log(`[${new Date().toISOString()}] [${level}] ${msg}: ${JSON.stringify(data, null, 2)}`);

const traceIn  = (fn, args) => log('TRACE', `${fn} → in`,  args);
const traceOut = (fn, out)  => log('TRACE', `${fn} → out`, out);

const extractFieldValue = v => v?.name ?? v?.url ?? v ?? null;

function buildCellValuesByFieldId(record, tableMeta) {
  const out = {};
  for (const f of tableMeta.fields) out[f.id] = record.getCellValue(f.id);
  return out;
}

/*────────────────────── Airtable fetches ───────────────────*/
async function fetchPayloads(webhookId, cursor) {
  traceIn('fetchPayloads', { webhookId, cursor });
  const params = cursor ? `?cursor=${cursor}` : '';
  let output;
  try {
    const res = await fetch(
      `https://api.airtable.com/v0/bases/${base.id}/webhooks/${webhookId}/payloads${params}`,
      { headers: { Authorization: `Bearer ${API_KEY}` } }
    );
    if (!res.ok) throw new Error(res.statusText);
    output = await res.json();
  } catch (err) {
    log('ERROR', 'fetchPayloads', { message: err.message });
    output = null;
  }
  return output;
}

async function getBaseSchema() {
  let tables;
  try {
    const res = await fetch(
      `https://api.airtable.com/v0/meta/bases/${base.id}/tables`,
      { headers: { Authorization: `Bearer ${API_KEY}` } }
    );
    if (!res.ok) throw new Error(res.statusText);
    tables = (await res.json()).tables;
  } catch (err) {
    log('ERROR', 'getBaseSchema', { message: err.message });
  }
  return tables;
}

/*──────────────────── Settings table cursor ──────────────────*/
async function getSettingsRecord() {
    const tbl = base.getTable(SETTINGS_TABLE_NAME);
    const query = await tbl.selectRecordsAsync({fields: ['Name', CURSOR_FIELD_NAME]});
    return query.records.find(r => r.getCellValue('Name') === SETTINGS_RECORD_NAME);
}

async function getCursor() {
  traceIn('getCursor', {});
  let cursor = null;
  try {
    const rec = await getSettingsRecord();
    cursor = rec ? rec.getCellValue(CURSOR_FIELD_NAME) : null;
  } catch (err) {
    log('ERROR', 'getCursor', { message: err.message });
  }
  traceOut('getCursor', { cursor });
  return cursor;
}

async function updateCursor(prevCursor) {
  try {
    const tbl = base.getTable(SETTINGS_TABLE_NAME);
    const rec = await getSettingsRecord();
    if (rec) {
        await tbl.updateRecordAsync(rec.id, {
            [CURSOR_FIELD_NAME]: String(prevCursor + 1),
        });
    }
  } catch (err) {
    log('ERROR', 'updateCursor', { message: err.message });
  }
}

/*────────────────── Results table cache load ─────────────────*/
async function loadResultsCache() {
  traceIn('loadResultsCache', {});
  const tbl = base.getTable(RESULTS_TABLE_NAME);
  const q   = await tbl.selectRecordsAsync();
  q.records.forEach(r => {
    const sid = r.getCellValue(SOURCE_FIELD_NAME);
    if (sid) resultsCache[sid] = { id: r.id, fields: r.fields };
  });
  initialCache = JSON.parse(JSON.stringify(resultsCache));
}

async function loadSourceCache(baseSchema) {
  for (const tblMeta of baseSchema) {
    if (IGNORED_TABLE_NAMES.includes(tblMeta.name)) continue;

    const tableObj = base.getTable(tblMeta.name);
    const query    = await tableObj.selectRecordsAsync();

    query.records.forEach(rec => {
      sourceRecordsCache[rec.id] = {
        tableId: tblMeta.id,
        cellValuesByFieldId: buildCellValuesByFieldId(rec, tblMeta)
      };
    });
  }
}

/*──────────────── Utility: non-destructive batching ──────────*/
async function processBatch(batch, fn) {
  for (let idx = 0; idx < batch.length; idx += 10) {
    const slice = batch.slice(idx, idx + 10);
    if (slice.length) await fn(slice);
  }
}

function mapFields(fieldsById, mapping) {
  return Object.entries(fieldsById).reduce((out, [fid, val]) => {
    const name = mapping[fid];
    if (name) out[name] = extractFieldValue(val);
    return out;
  }, {});
}

async function getFullRecordFields(tableId, recordId, mapping) {
  let cells = sourceRecordsCache[recordId]?.cellValuesByFieldId;
  if (!cells) {
    const tblMeta = GLOBAL_BASE_SCHEMA.find(t => t.id === tableId);
    if (!tblMeta) return {};
    const rec = await base.getTable(tblMeta.name).selectRecordAsync(recordId);
    if (!rec) return {};
    cells = buildCellValuesByFieldId(rec, tblMeta);
    sourceRecordsCache[recordId] = { tableId, cellValuesByFieldId: cells };
  }
  return mapFields(cells, mapping);
}

async function handleRecords(recordsObj, mapping, processType, tableId) {
  for (const [recId] of Object.entries(recordsObj)) {
    if (processType === 'delete') {
      if (resultsCache[recId]) delete resultsCache[recId];
      continue;
    }
    const fullFields = await getFullRecordFields(tableId, recId, mapping);
    if (!Object.keys(fullFields).length) continue;
    if (processType === 'create' && !resultsCache[recId]) {
      resultsCache[recId] = { id: null, fields: fullFields };
    } else if (processType === 'update') {
      resultsCache[recId] = resultsCache[recId] || { id: null, fields: {} };
      resultsCache[recId].fields = fullFields;
    }
  }
}

async function processPayload(payload, baseSchema) {
  for (const [tableId, tblChanges] of Object.entries(payload.changedTablesById)) {
    const meta = baseSchema.find(t => t.id === tableId);
    if (!meta || IGNORED_TABLE_NAMES.includes(meta.name)) continue;
    
    const mapping = Object.fromEntries(meta.fields.map(f => [f.id, f.name]));
    if (tblChanges.createdRecordsById)
      await handleRecords(tblChanges.createdRecordsById, mapping, 'create', tableId);
    if (tblChanges.changedRecordsById)
      await handleRecords(tblChanges.changedRecordsById, mapping, 'update', tableId);
    if (tblChanges.destroyedRecordIds) {
      const del = {}; tblChanges.destroyedRecordIds.forEach(id => del[id] = {});
      await handleRecords(del, mapping, 'delete', tableId);
    }
  }
}

async function commitChanges() {
  const tbl = base.getTable(RESULTS_TABLE_NAME);
  const createBatch = [], updateBatch = [], deleteBatch = [];

  for (const srcId in resultsCache) {
    const newFields = resultsCache[srcId].fields || {};
    const existed   = initialCache[srcId];

    if (existed) {
      const oldFields = existed.fields || {};
      if (JSON.stringify(newFields) !== JSON.stringify(oldFields)) {
        const mustRecreate = RECREATE_TRIGGER_FIELDS.some(f => oldFields[f] !== newFields[f]);
        if (mustRecreate) {
          deleteBatch.push(existed.id);
          createBatch.push({ fields: { [SOURCE_FIELD_NAME]: srcId, ...newFields } });
        } else {
          updateBatch.push({ id: resultsCache[srcId].id, fields: newFields });
        }
      }
      delete initialCache[srcId];
    } else {
      createBatch.push({ fields: { [SOURCE_FIELD_NAME]: srcId, ...newFields } });
    }
  }
  for (const srcId in initialCache) deleteBatch.push(initialCache[srcId].id);

  await Promise.all([
    processBatch(createBatch, async b => tbl.createRecordsAsync(b)),
    processBatch(updateBatch, async b => tbl.updateRecordsAsync(b)),
    processBatch(deleteBatch, async b => tbl.deleteRecordsAsync(b)),
  ]);
}

const calculatePayloadCursor = (baseCursor, len, idx) => baseCursor - (len - idx);

/*────────────────────────── Main ─────────────────────────────*/
(async () => {
  const baseSchema = await getBaseSchema();
  if (!baseSchema) return;

  GLOBAL_BASE_SCHEMA = baseSchema; 
  await loadSourceCache(baseSchema);
  await loadResultsCache();

  let cursor = await getCursor();
  let cycle = 0, processed = false, mightHaveMore = false;

  while (cycle < 30) {
    cycle++;
    const data = await fetchPayloads(WEBHOOK_ID, cursor);
    if (!data || !data.payloads || !data.payloads.length) break;
    processed = true;
    const len = data.payloads.length;
    for (const [idx, payload] of data.payloads.entries()) {
      const payCursor = calculatePayloadCursor(data.cursor, len, idx);
      await processPayload(payload, baseSchema);
      await updateCursor(payCursor);
      cursor = payCursor;
    }
    if (!data.mightHaveMore) break;
    mightHaveMore = true;
  }

  if (processed) await commitChanges();
  output.set('mightHaveMore', mightHaveMore);
})();
