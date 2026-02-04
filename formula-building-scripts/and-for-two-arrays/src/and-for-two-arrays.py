def generate_combined_formula_no_spaces_with_comma_check(x, output_file):
    """
    Generate a CONCATENATE formula for all items from 1 to x without spaces in formulas.
    Add a condition to check if the current i is less than or equal to the count of commas in {A} minus one.
    Save the result to a text file.

    Parameters:
    - x: The number of items to include in the formula.
    - output_file: Path to the output .txt file.
    """
    def wrap_item_with_condition(item_formula, item_index):
        """
        Wrap a single formula in an IF condition with optional comma concatenation and a comma count check.
        """
        comma_check = f"IF({item_index}<=LEN({{A}})-LEN(SUBSTITUTE({{A}},',',''))-1,"
        if item_index == 1:
            return f"{comma_check}{item_formula.replace(' ', '')},'')"
        return f"{comma_check}if({item_formula.replace(' ', '')},','&{item_formula.replace(' ', '')}),'')"

    # Generate all formulas for 1 to x
    item_formulas = [generate_nth_item_formula(i) for i in range(1, x + 1)]

    # Wrap each formula with conditions and concatenate
    combined_formula = "CONCATENATE(" + ",".join(
        wrap_item_with_condition(item_formulas[i], i + 1) for i in range(x)
    ) + ")"

    # Save to file
    with open(output_file, "w") as file:
        file.write(combined_formula)

# Example usage (for testing, DO NOT RUN):
# generate_combined_formula_no_spaces_with_comma_check(3, "output.txt")
