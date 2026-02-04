// Author: Daniel Rudaev (D1DX) | Version: 1.0.0
let config = input.config();
let table = config.table;
let source = config.source;
let dest = config.dest;

const sync = async (tableId, source, dest, viewName = '') => {
    let table = base.getTable(tableId);
    console.log(`\n==== SYNC STARTED ====\nTable: '${table.name}'\nField: '${source}' -> '${dest}'`);

    let view = viewName ? table.getView(viewName) : null;
    let recordsFull = view ? await view.selectRecordsAsync() : await table.selectRecordsAsync();
    let records = recordsFull.records;
    let len = records.length;
    console.log(`Total records fetched: ${len}`);

    const findChildren = async () => {
        let tree = {};

        const setTree = (parent, kid) => {
            if (!tree[parent]) tree[parent] = [];
            tree[parent].push({ id: kid });
        };

        for (let t = 0; t < records.length; t++) {
            let rec = records[t];
            let parents = rec.getCellValue(source);

            if (parents && parents.length) {
                for (let p = 0; p < parents.length; p++) {
                    setTree(parents[p].id, rec.id);
                }
            }
        }

        console.log("\nTree structure built.");
        console.log("Updating child relationships...");

        let parentKeys = Object.keys(tree);
        let queue = [];

        for (let i = 0; i < parentKeys.length; i++) {
            let pKey = parentKeys[i];
            let kids = tree[pKey];

            queue.push({ id: pKey, fields: { [dest]: kids } });

            if (queue.length === 50) {
                await table.updateRecordsAsync(queue);
                console.log(`Batch updated (${i + 1}/${parentKeys.length})`);
                queue = [];
            }
        }

        if (queue.length) {
            await table.updateRecordsAsync(queue);
            console.log(`Final batch updated (${parentKeys.length}/${parentKeys.length})`);
        }

        console.log("\n==== SYNC COMPLETED ====");
    };

    await findChildren();
};

await sync(table, source, dest);
