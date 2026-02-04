// Author: Daniel Rudaev (D1DX) | Version: 1.0.0
try {  const { recordId, tableId } = input.config();  const table = base.getTable(tableId);  const record = await table.selectRecordAsync(recordId);  if (record) {    output.set('result', true);  } else {    output.set('result', false);  }} catch (error) {  console.error(error);  output.set('result', false);}
