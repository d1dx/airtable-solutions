// Airtable Scripting Extension

/***********************
 * 1) Choose table & field (menus sorted A→Z)
 ***********************/
const tables = [...base.tables].sort((a, b) => a.name.localeCompare(b.name));
const tableName = await input.buttonsAsync("Choose a table", tables.map(t => t.name));
const table = base.getTable(tableName);

const selectableFields = [...table.fields]
  .filter(f => f.type === "singleSelect" || f.type === "multipleSelects")
  .sort((a, b) => a.name.localeCompare(b.name));

if (selectableFields.length === 0) {
  output.text("This table has no single select or multi select fields.");
  return;
}

const fieldName = await input.buttonsAsync(
  "Choose a single select or multi select field",
  selectableFields.map(f => f.name)
);
const field = table.getField(fieldName);

const choices = field.options?.choices ?? [];
if (choices.length === 0) {
  output.text(`Field "${field.name}" has no options to update.`);
  return;
}

/***********************
 * 2) Choose target capitalization & sorting behavior
 ***********************/
const styles = ["camelCase", "PascalCase", "snake_case", "kebab-case", "Title Case", "lowercase", "UPPERCASE"];
const targetStyle = await input.buttonsAsync("Choose capitalization style", styles);

const sortAnswer = await input.buttonsAsync(
  "After renaming, sort the options alphabetically (A→Z)?",
  ["Yes, sort A→Z", "No, keep current order"]
);
const shouldSort = sortAnswer === "Yes, sort A→Z";

/***********************
 * 3) Tokenization & formatting helpers
 *    - Robustly parses existing names regardless of original casing.
 ***********************/

// Split a label into tokens (words) from any common casing/separators.
function tokenize(label) {
  if (!label) return [];
  let s = String(label);

  // Insert spaces at camel/Pascal boundaries and acronym->word boundaries
  s = s
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")     // JSONData -> JSON Data
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")        // userID -> user ID
    .replace(/([A-Za-z])([0-9])/g, "$1 $2")        // Tag2 -> Tag 2
    .replace(/([0-9])([A-Za-z])/g, "$1 $2")        // 2D -> 2 D
    .replace(/[_\-\s]+/g, " ")                     // snake, kebab, spaces -> single space
    .trim();

  if (!s) return [];
  return s.split(/\s+/);
}

function capitalize(w) {
  return w.length ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w;
}

function toCamel(tokens) {
  if (tokens.length === 0) return "";
  const [h, ...t] = tokens.map(t => t.toLowerCase());
  return h + t.map(capitalize).join("");
}

function toPascal(tokens) {
  return tokens.map(t => capitalize(t.toLowerCase())).join("");
}

function toSnake(tokens) {
  return tokens.map(t => t.toLowerCase()).join("_");
}

function toKebab(tokens) {
  return tokens.map(t => t.toLowerCase()).join("-");
}

function toTitle(tokens) {
  return tokens.map(t => capitalize(t.toLowerCase())).join(" ");
}

function toLower(tokens) {
  return tokens.map(t => t.toLowerCase()).join(" ");
}

function toUpper(tokens) {
  return tokens.map(t => t.toUpperCase()).join(" ");
}

function applyStyle(original, style) {
  const tokens = tokenize(original);
  if (tokens.length === 0) return original; // nothing to change

  switch (style) {
    case "camelCase":  return toCamel(tokens);
    case "PascalCase": return toPascal(tokens);
    case "snake_case": return toSnake(tokens);
    case "kebab-case": return toKebab(tokens);
    case "Title Case": return toTitle(tokens);
    case "lowercase":  return toLower(tokens);
    case "UPPERCASE":  return toUpper(tokens);
    default:           return original;
  }
}

// Ensure uniqueness in case multiple options collapse to the same name after conversion
function ensureUniqueName(baseName, usedSet) {
  let name = baseName;
  let i = 2;
  while (usedSet.has(name)) {
    name = `${baseName} (${i++})`;
  }
  usedSet.add(name);
  return name;
}

/***********************
 * 4) Build updated choices (preserve ids & colors)
 ***********************/
const used = new Set();
let updatedChoices = choices.map(ch => {
  const base = applyStyle(ch.name, targetStyle);
  const unique = ensureUniqueName(base, used);
  return {
    ...ch,         // preserves id & color
    name: unique,  // new label
  };
});

// Optional sort (A→Z) AFTER renaming
if (shouldSort) {
  updatedChoices = [...updatedChoices].sort((a, b) => a.name.localeCompare(b.name));
}

/***********************
 * 5) Apply updates
 ***********************/
await field.updateOptionsAsync({ choices: updatedChoices });

output.markdown(
  `✅ **Done**

- **Table:** ${table.name}
- **Field:** ${field.name} (${field.type})
- **Target style:** ${targetStyle}
- **Sorted A→Z after rename:** ${shouldSort ? "Yes" : "No"}
- **Choices updated:** ${choices.length}`
);
