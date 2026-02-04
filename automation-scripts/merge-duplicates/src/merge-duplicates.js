// Author: Daniel Rudaev (D1DX) | Version: 1.0.0
//Merge original record and duplicates into one array 

let config = input.config();
let array = config.duplicates.concat(config.record);
array = array.filter(function (item, index) {
	return array.indexOf(item) === index;
});;

//Finding the oldest record in the array

let table = base.getTable(config.table);
let query = await table.selectRecordsAsync({recordIds: array});
let record = query.records.reduce((prev, curr) => prev.getCellValue('Created Date') <= curr.getCellValue('Created Date') ? prev : curr);
let duplicates = query.records.filter(rec => rec.id != record.id);

//Sending webhooks to the bases to relink to the old record
/*
let webhooks = config.webhooks.split(', ');
let status;

for (webhook of webhooks)
{
    let [url, name] = webhook.split('#');
    var data = {
        'record': record,
        'duplicates': duplicates
      };
    let response = await fetch(url, {
        method: 'POST',
        body: JSON.stringify(data),
        headers: {
        'Content-Type': 'application/json',
        },
    });
    if (response.status != 200)
        throw new Error('Error in webhook '+name);
    else
        console.log('Success in webhook '+name)
}
*/

//Merge the duplicates into the record

let fields = table.fields.filter(field => field.isComputed == false);
let idFields = fields.filter(field => field.name.includes(' ID'));
let otherFields = fields.filter(field => !field.name.includes(' ID'));
fields = idFields.concat(otherFields);

for (let duplicate of duplicates)
{
    for (let field of fields) { 
        if (duplicate.getCellValue(field) != null)
        {
            let newValue; let newValueString;
            if(field.type.startsWith('multiple'))
            {
                var arrValue = new Array;
                arrValue[0] = record.getCellValue(field);
                arrValue[1] = duplicate.getCellValue(field);
                arrValue = arrValue.flat().filter(item => {return item !== null;}).filter((value, index, self) =>
                 index === self.findIndex((t) => (
                 t.place === value.place && t.name === value.name
                 ))
                )
                if(field.name.includes('Duplicates'))
                    arrValue = arrValue.filter(item => item.id != record.id)
                newValue = arrValue;
                newValueString = arrValue.map(item => item.name).join(', ');
            }
            else
            {
                newValue = duplicate.getCellValue(field);
                newValueString = duplicate.getCellValueAsString(field);
            }
            if (newValueString != record.getCellValueAsString(field))
            {
                await table.updateRecordAsync(record, {
                    [field.id]: newValue
                    })
                console.log(field.name + ' updated to ' + newValueString);
            }
        }
    }
}

//Deletion of duplicates

await table.deleteRecordsAsync(duplicates);
