# Author: Daniel Rudaev (D1DX) | Version: 1.0.0
def generate_date_formula(offset, add_comma):
    """
    Generate an IF snippet for a given offset in days.

    Checks if the literal offset (i) is <= {forecast}. If yes, it then checks if
    the formatted date (TODAY()+offset) does not already exist in ARRAYJOIN(values).
    If missing, it outputs the date string. Optionally appends a comma and space.

    Args:
        offset (int): The day offset (0 for today, 1 for today+1, etc.).
        add_comma (bool): Whether to append a comma and space after the date.

    Returns:
        str: A snippet of an Airtable formula.
    """
    date_expr = f"DATESTR(SET_TIMEZONE(DATEADD(TODAY(),{offset},'days'),Timezone))"
    inner_if = f"IF(FIND({date_expr}, ARRAYJOIN(values)), {date_expr}"
    if add_comma:
        inner_if += " & \", \""
    inner_if += ")"
    snippet = f"IF({offset} <= {{forecast}}, {inner_if})"
    return snippet

def combine_date_formulas(n):
    """
    Combine the individual IF snippets from offset 0 to offset n into one Airtable formula.

    For each day i (0 <= i <= n), if i is <= {forecast} then it checks whether the date
    (TODAY()+i) is missing from ARRAYJOIN(values). Each missing date is output; otherwise, nothing is added.
    The snippets are concatenated with CONCATENATE.

    Args:
        n (int): Maximum offset (in days) to check.

    Returns:
        str: The base Airtable formula as a concatenated string.

    Raises:
        ValueError: If n is not a non-negative integer.
    """
    if not isinstance(n, int) or n < 0:
        raise ValueError("n must be a non-negative integer")

    snippets = []
    for offset in range(n + 1):
        add_comma = (offset < n)
        snippets.append(generate_date_formula(offset, add_comma))

    return "CONCATENATE(\n  " + ",\n  ".join(snippets) + "\n)"

def combine_date_formulas_with_regex(n):
    """
    Wrap the combined date formulas inside a REGEX_REPLACE call to remove the trailing comma and space.

    Args:
        n (int): Maximum offset (in days) to check.

    Returns:
        str: A complete Airtable formula that outputs a comma-separated list of missing dates,
             with any trailing comma removed.
    """
    base_formula = combine_date_formulas(n)
    final_formula = f"IF(values,REGEX_REPLACE({base_formula}, \",\\s*$\", \"\"))"
    return final_formula

# Example usage:
if __name__ == '__main__':
    n = 3  # Change n as needed (e.g., to generate checks for today up to today+3)
    formula = combine_date_formulas_with_regex(n)
    print(formula)
