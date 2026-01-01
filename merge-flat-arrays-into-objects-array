/**
 * Airtable Automation - Run a script
 * Inputs (input.config):
 *   - a, b, c: arrays (or "comma,separated" strings)
 * Output:
 *   [{ key1: ..., key2: ..., key3: ... }, ...]
 */

function toArray(v) {
  if (Array.isArray(v)) return v;
  if (typeof v === "string") {
    const s = v.trim();
    if (!s) return [];
    return s.split(",").map(x => x.trim());
  }
  if (v == null) return [];
  return [v];
}

function merge3(a, b, c, keys = ["key1", "key2", "key3"]) {
  const [k1, k2, k3] = keys;

  if (a.length !== b.length || a.length !== c.length) {
    throw new Error(`Length mismatch: ${k1}=${a.length}, ${k2}=${b.length}, ${k3}=${c.length}`);
  }

  return a.map((_, i) => ({ [k1]: a[i], [k2]: b[i], [k3]: c[i] }));
}

const cfg = input.config();

// rename these to your actual input variable names
const a = toArray(cfg.a);
const b = toArray(cfg.b);
const c = toArray(cfg.c);

console.log("Arrays:", { a, b, c });

const merged = merge3(a, b, c, ["key1", "key2", "key3"]);

console.log("Merged:", merged);
output.set("merged", merged);
