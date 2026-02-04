// Author: Daniel Rudaev (D1DX) | Version: 1.0.0
// Airtable Automation - Run script
// Expects input variable: delaySeconds (seconds)

// -------------------- Validation --------------------
function validateDelaySeconds(rawValue) {
  if (rawValue === null || rawValue === undefined) {
    throw new Error("Missing required config value: delaySeconds");
  }

  if (typeof rawValue === "string") {
    const trimmed = rawValue.trim();
    if (!trimmed) throw new Error("delaySeconds cannot be an empty string");
    rawValue = trimmed;
  }

  const delaySeconds = Number(rawValue);

  if (!Number.isFinite(delaySeconds)) {
    throw new Error(`delaySeconds must be a finite number. Got: ${rawValue}`);
  }
  if (delaySeconds < 0) {
    throw new Error(`delaySeconds must be >= 0. Got: ${delaySeconds}`);
  }

  return delaySeconds;
}

function toDelayMs(delaySeconds, maxMs = 20_000) {
  const delayMs = Math.round(delaySeconds * 1000);

  if (!Number.isSafeInteger(delayMs)) {
    throw new Error(`delaySeconds too large to convert safely. Got: ${delaySeconds}`);
  }
  if (delayMs > maxMs) {
    throw new Error(
      `delaySeconds too large for a single run (${delaySeconds}s -> ${delayMs}ms). ` +
      `Use a timestamp + scheduled/conditional automation for long delays.`
    );
  }

  return delayMs;
}

// -------------------- Delay (no setTimeout available) --------------------
function busyWait(ms) {
  const start = Date.now();
  while (Date.now() - start < ms) {
    // intentional no-op
  }
}

// -------------------- Main --------------------
const config = input.config();

const delaySeconds = validateDelaySeconds(config.delaySeconds);
const delayMs = toDelayMs(delaySeconds);

console.log(`Delaying for ${delaySeconds}s (${delayMs}ms)...`);
busyWait(delayMs);
console.log("Delay finished - continuing.");
