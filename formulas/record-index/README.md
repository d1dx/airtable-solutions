# Record Index

Author: Daniel Rudaev (D1DX)

Calculates record position in parent-child relationships.

## Formula

IF(values,(FIND(RECORD_ID(),ARRAYJOIN(values,''))-1)/LEN(RECORD_ID())+1)

## Setup

1. Add formula field "Record ID" in children table with formula: RECORD_ID()
2. Add lookup field "Record ID (from Children)" in parent table (you can sort this lookup field to control the index order)
3. Add rollup field "index" in children table
4. Paste formula from `formula.txt` into rollup
5. Select "Custom" aggregation function

## Result

Each child record gets its position number (1, 2, 3...) within its parent.

## Sorting

To control the order of the index numbers, sort the lookup field in step 2. The index will follow the sort order of the lookup field.
