// Author: Daniel Rudaev (D1DX) | Version: 1.0.0
// Create User Selectable Settings for Table and Select Field
const config = input.config({
  title: 'Get Single or Multiple Select Options',
  description: 'This script outputs all options for a single or multiple select field.',
  items: [
      input.config.table('slctTbl', {
          label: 'Table with the single or multiple select field'
      }),
      input.config.field('slctField', {
          label: 'Single or Multiple Select Field',
          parentTable: 'slctTbl'
      }),
      input.config.select('outputType', {
          label: 'Output Type',
          description: 'Pick how you want each option to be output.',
          options: [
              {label: 'List', value: 'list'},
              {label: 'Table', value: 'table'},
              {label: 'Comma Separated', value: 'commaSeparated'}
          ]
      })
  ]
})
// Assign Variables
let tbl = config.slctTbl;
let slctField = config.slctField;
let outputType = config.outputType;
// Output each of the select field options depending on the output type selected:
switch(outputType) {
  case 'list':
      // @ts-ignore
      for (let choices of slctField.options.choices) {
          output.markdown(`**Name:** ${choices.name} **ID:** ${choices.id}`);
      }
      break;
  case 'table':
      let choiceArray = [];
       // @ts-ignore
      for (let choices of slctField.options.choices) {
          choiceArray.push({ 'Name': choices.name, 'ID': choices.id });
      }
      output.table(choiceArray);
      break;
  case 'commaSeparated':
      let choiceString ='';
       // @ts-ignore
      for (let choices of slctField.options.choices) {
          choiceString = choiceString.concat(`(${choices.name}, ${choices.id})`, ', ')
      }
      let trimmedString = choiceString.substr(0,choiceString.length-2);
      output.markdown(trimmedString);
}
