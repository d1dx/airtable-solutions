// Author: Daniel Rudaev (D1DX) | Version: 1.0.0
/**
 * INPUT variable (Automation step):
 * - html (string)  -> the HTML snippet containing <table>...</table>
 *
 * OUTPUT variables:
 * - TOON (string)  -> TOON text (no trailing newline)
 */

const { html } = input.config();
if (!html || typeof html !== "string") throw new Error("Input 'html' must be a string.");

/* -------------------- HTML table parsing -------------------- */

function decodeHtmlEntities(str) {
  if (!str) return "";
  const named = {
    "&nbsp;": " ",
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&#39;": "'",
  };

  let out = str.replace(/&nbsp;|&amp;|&lt;|&gt;|&quot;|&#39;/g, (m) => named[m] ?? m);

  // numeric entities
  out = out.replace(/&#(\d+);/g, (_, code) => {
    const n = Number(code);
    return Number.isFinite(n) ? String.fromCharCode(n) : _;
  });
  out = out.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
    const n = parseInt(hex, 16);
    return Number.isFinite(n) ? String.fromCharCode(n) : _;
  });

  return out;
}

function stripTags(htmlFragment) {
  if (!htmlFragment) return "";
  const noTags = htmlFragment.replace(/<[^>]*>/g, "");
  return decodeHtmlEntities(noTags).replace(/\s+/g, " ").trim();
}

function extractFirstTable(htmlStr) {
  const m = htmlStr.match(/<table\b[\s\S]*?<\/table>/i);
  return m ? m[0] : null;
}

function parseHtmlTable(tableHtml) {
  const rowMatches = tableHtml.match(/<tr\b[\s\S]*?<\/tr>/gi) || [];
  if (rowMatches.length === 0) return { headers: [], rows: [] };

  const parseRowCells = (rowHtml) => {
    const cellMatches = rowHtml.match(/<(th|td)\b[\s\S]*?>[\s\S]*?<\/\1>/gi) || [];
    return cellMatches.map((cellHtml) => {
      const inner = cellHtml
        .replace(/^<(th|td)\b[\s\S]*?>/i, "")
        .replace(/<\/(th|td)>$/i, "");
      return stripTags(inner);
    });
  };

  const headers = parseRowCells(rowMatches[0]).map((h, i) => h || `Column_${i + 1}`);

  const rows = [];
  for (let i = 1; i < rowMatches.length; i++) {
    const cells = parseRowCells(rowMatches[i]);
    if (cells.every((c) => !c)) continue;

    const obj = {};
    for (let c = 0; c < headers.length; c++) obj[headers[c]] = (cells[c] ?? "").trim();
    rows.push(obj);
  }

  return { headers, rows };
}

/* -------------------- TOON encoding (tabular array) -------------------- */
/**
 * Implements TOON’s practical quoting rules from the docs/cheatsheet:
 * quote if empty, leading/trailing whitespace, literal-like, number-like,
 * contains special chars (: " \ [ ] { } or control chars), contains delimiter,
 * equals "-" or starts with "-" followed by any char.  [oai_citation:2‡ToonFormat](https://toonformat.dev/reference/syntax-cheatsheet.html)
 */

const DELIM = ",";

function looksLikeNumber(s) {
  // include exponent forms too (still “number-like” => must quote if intended as string)  [oai_citation:3‡ToonFormat](https://toonformat.dev/reference/syntax-cheatsheet.html)
  return /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(s);
}

function escapeQuoted(s) {
  // Allowed escapes in TOON strings: \\ \" \n \r \t  [oai_citation:4‡ToonFormat](https://toonformat.dev/reference/syntax-cheatsheet.html)
  return s
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\t/g, "\\t");
}

function needsStringQuotes(s, delimiter) {
  if (s === "") return true;
  if (s.trim() !== s) return true;
  if (s === "true" || s === "false" || s === "null") return true;
  if (looksLikeNumber(s)) return true;
  if (/[:"\\\[\]\{\}\n\r\t]/.test(s)) return true;
  if (s.includes(delimiter)) return true;
  if (s === "-" || (s.startsWith("-") && s.length >= 2)) return true;
  return false;
}

function encodeString(s, delimiter) {
  return needsStringQuotes(s, delimiter) ? `"${escapeQuoted(s)}"` : s;
}

function isSimpleIdentifierKey(k) {
  // Keep unquoted only for simple identifier-like keys (safe & compact)
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(k) && k !== "true" && k !== "false" && k !== "null";
}

function encodeKey(k, delimiter) {
  // Keys are strings too; quote when not a simple identifier or when risky.  [oai_citation:5‡ToonFormat](https://toonformat.dev/guide/format-overview.html)
  return isSimpleIdentifierKey(k) ? k : `"${escapeQuoted(k)}"`;
}

function encodeCellValue(raw) {
  // For empty cells, emit null (valid primitive).  [oai_citation:6‡ToonFormat](https://toonformat.dev/guide/format-overview.html)
  if (raw == null) return "null";
  const s = String(raw).trim();
  if (s === "") return "null";
  return encodeString(s, DELIM);
}

function encodeRootTabularArray(headers, rows) {
  const n = rows.length;

  if (n === 0) {
    // For an empty root array, simplest valid form:
    // [0]:
    // (no rows)  [oai_citation:7‡ToonFormat](https://toonformat.dev/reference/syntax-cheatsheet.html)
    return `[0]:`;
  }

  const fieldList = headers.map((h) => encodeKey(h, DELIM)).join(DELIM);
  const headerLine = `[${n}]{${fieldList}}:`; // root tabular array form  [oai_citation:8‡ToonFormat](https://toonformat.dev/guide/format-overview.html)

  const rowLines = rows.map((r) => {
    const vals = headers.map((h) => encodeCellValue(r[h]));
    return `  ${vals.join(DELIM)}`; // tabular rows at +1 indent  [oai_citation:9‡ToonFormat](https://toonformat.dev/guide/format-overview.html)
  });

  return [headerLine, ...rowLines].join("\n");
}

/* -------------------- Main -------------------- */

const tableHtml = extractFirstTable(html);
if (!tableHtml) throw new Error("No <table>...</table> found in the input string.");

const { headers, rows } = parseHtmlTable(tableHtml);
const toon = encodeRootTabularArray(headers, rows);

// Output for next automation steps (e.g., Update record action mapping)
output.set("TOON", toon);
