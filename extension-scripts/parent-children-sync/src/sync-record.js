let config = input.config();
let tableId = config.table;
let source = config.source;
let dest = config.dest;
let recordId = config.record;

const syncOneRecord = async (tableId, source, dest, recordId) => {
    const table = base.getTable(tableId);
    console.log(`\n==== SINGLE RECORD SYNC STARTED ====\nTable: '${table.name}'\nRecord ID: '${recordId}'\nField: '${source}' -> '${dest}'`);

    const record = await table.selectRecordAsync(recordId);
    if (!record) {
        console.log(`Record not found: ${recordId}`);
        return;
    }

    const parents = record.getCellValue(source);

    if (!parents || !parents.length) {
        console.log("No parents found in source field.");
        return;
    }

    console.log(`Found ${parents.length} parent(s). Updating each parent to include this record as a child...`);

    let updates = [];

    for (let i = 0; i < parents.length; i++) {
        const parentId = parents[i].id;
        const parentRecord = await table.selectRecordAsync(parentId);
        const existingChildren = parentRecord.getCellValue(dest) || [];

        // Prevent duplicate
        const alreadyLinked = existingChildren.some(child => child.id === record.id);
        if (!alreadyLinked) {
            updates.push({
                id: parentId,
                fields: {
                    [dest]: [...existingChildren, { id: record.id }]
                }
            });
        } else {
            console.log(`Parent ${parentId} already linked to this record.`);
        }
    }

    if (updates.length) {
        await table.updateRecordsAsync(updates);
        console.log(`Updated ${updates.length} parent record(s).`);
    } else {
        console.log("No updates needed. All parents already linked.");
    }

    console.log("==== SINGLE RECORD SYNC COMPLETED ====");
};

await syncOneRecord(tableId, source, dest, recordId);
