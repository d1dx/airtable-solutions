# Conditional Date Concatenation

Author: Daniel Rudaev (D1DX)

Python script that generates date range checking formulas for forecast operations.

## Usage

```python
python src/conditional-date-concatenation.py

# Call the function:
combine_date_formulas(n)
# or
combine_date_formulas_with_regex(n)
```

## Parameters

- `n` - Maximum number of days to forecast
- Output is printed or saved to file

## Output

Generates an Airtable formula that:
- Checks date ranges from TODAY() to TODAY()+n
- Validates against {forecast} field
- Checks if dates exist in ARRAYJOIN(values)
- Concatenates missing dates with commas

## Use Cases

- Building forecast date validation formulas
- Generating date range checks
- Conditional date concatenation based on existing values

Version: 1.0.0
