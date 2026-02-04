// Author: Daniel Rudaev (D1DX) | Version: 1.0.0
/**
 * A script that:
 * 1) Reads a URL from input.config().
 * 2) Constructs a favicon URL from Google's t3.gstatic.com endpoint.
 * 3) Fetches the favicon as binary data.
 * 4) Uploads the binary data to https://tmpfiles.org/api/v1/upload (multipart/form-data).
 * 5) Extracts the file ID and constructs a /dl/ direct-download URL.
 * 6) Outputs (output.set) the tmpfiles "/dl/" URL.
 *
 * NOTE: tmpfiles.org will delete the uploaded file after 60 minutes.
 * 
 * The final link will look like: https://tmpfiles.org/dl/<file_id>/favicon.ico
 *     (instead of the default https://tmpfiles.org/<file_id>/favicon.ico)
 * 
 * Steps are split into sub-functions for easier reading and maintenance.
 */

// --------------------------------------------------
// 1) Read and validate inputs
// --------------------------------------------------
let config = input.config();
let siteUrl = config.siteUrl; // e.g., "https://www.wix.com"
console.log("Received siteUrl:", siteUrl);

if (!siteUrl) {
    throw new Error("No siteUrl provided in input config.");
}
try {
    new URL(siteUrl);
} catch (err) {
    throw new Error(`Invalid siteUrl provided: "${siteUrl}"`);
}

// --------------------------------------------------
// 2) Build the Google Favicon URL
// --------------------------------------------------
function constructGoogleFaviconUrl(targetUrl, size = 256) {
    // Example:
    // https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https%3A%2F%2Fwww.gov.il&size=256
    console.log(`Constructing Google Favicon URL for site "${targetUrl}" with size ${size}...`);
    const encoded = encodeURIComponent(targetUrl);
    return `https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=${encoded}&size=${size}`;
}
let faviconUrl = constructGoogleFaviconUrl(siteUrl, 256);
console.log("Constructed favicon URL:", faviconUrl);

// --------------------------------------------------
// 3) Fetch the favicon binary
// --------------------------------------------------
async function fetchFaviconBinary(url) {
    console.log("Fetching favicon data from:", url);
    let response;
    try {
        response = await fetch(url);
    } catch (err) {
        throw new Error(`Network error fetching favicon: ${err.message}`);
    }

    if (!response.ok) {
        throw new Error(`Favicon fetch failed with status ${response.status} ${response.statusText}`);
    }

    let buffer;
    try {
        buffer = await response.arrayBuffer();
    } catch (err) {
        throw new Error(`Error reading favicon as ArrayBuffer: ${err.message}`);
    }

    console.log(`Favicon file size: ${buffer.byteLength} bytes`);
    return buffer;
}
let iconBuffer = await fetchFaviconBinary(faviconUrl);

// --------------------------------------------------
// 4) Upload the binary to tmpfiles.org
// --------------------------------------------------
async function uploadToTmpfiles(fileBuffer) {
    console.log("Uploading favicon binary to tmpfiles.org...");

    // Create a random boundary for multipart form-data
    let boundary = `boundary-${Math.random().toString(36).slice(2)}`;

    // We'll name the file "favicon.ico" for clarity
    let multipartHeader = `--${boundary}\r\n`
      + `Content-Disposition: form-data; name="file"; filename="favicon.ico"\r\n`
      + `Content-Type: image/x-icon\r\n\r\n`;
    let multipartFooter = `\r\n--${boundary}--\r\n`;

    // Helper to convert string → Uint8Array
    function stringToUint8Array(str) {
        return new TextEncoder().encode(str);
    }

    let headerBytes = stringToUint8Array(multipartHeader);
    let footerBytes = stringToUint8Array(multipartFooter);
    let iconBytes = new Uint8Array(fileBuffer);

    // Combine header + icon data + footer
    let bodyArray = new Uint8Array(headerBytes.length + iconBytes.length + footerBytes.length);
    bodyArray.set(headerBytes, 0);
    bodyArray.set(iconBytes, headerBytes.length);
    bodyArray.set(footerBytes, headerBytes.length + iconBytes.length);

    let uploadResponse;
    try {
        uploadResponse = await fetch("https://tmpfiles.org/api/v1/upload", {
            method: "POST",
            headers: {
                "Content-Type": `multipart/form-data; boundary=${boundary}`
            },
            body: bodyArray
        });
    } catch (err) {
        throw new Error(`Network error uploading to tmpfiles.org: ${err.message}`);
    }

    if (!uploadResponse.ok) {
        throw new Error(`tmpfiles.org upload failed with status ${uploadResponse.status} ${uploadResponse.statusText}`);
    }

    let uploadJson;
    try {
        uploadJson = await uploadResponse.json();
    } catch (err) {
        throw new Error(`Error parsing tmpfiles.org JSON response: ${err.message}`);
    }

    console.log("tmpfiles.org response:", JSON.stringify(uploadJson, null, 2));

    if (!uploadJson.data || !uploadJson.data.url) {
        throw new Error("tmpfiles.org response did not include a valid 'data.url' field.");
    }

    // Example: "https://tmpfiles.org/23313275/favicon.ico"
    return uploadJson.data.url;
}
let tmpDefaultUrl = await uploadToTmpfiles(iconBuffer);
console.log("Temporary file hosted at (default path):", tmpDefaultUrl);

// --------------------------------------------------
// 5) Convert tmpfiles.org default URL to a "/dl/" direct URL
// --------------------------------------------------
function createTmpfilesDLUrl(originalUrl) {
    // tmpfiles.org returns something like "https://tmpfiles.org/23313275/favicon.ico"
    // We want "https://tmpfiles.org/dl/23313275/favicon.ico"

    let parsed = new URL(originalUrl);
    // e.g. parsed.hostname => "tmpfiles.org"
    // e.g. parsed.pathname => "/23313275/favicon.ico"

    // Break pathname by '/', ignoring empty segments
    let pathParts = parsed.pathname.split('/').filter(Boolean);
    // e.g. ["23313275", "favicon.ico"]

    // Insert "dl" at the front
    // So we get: ["dl", "23313275", "favicon.ico"]
    pathParts.unshift("dl");
    // Join them back with '/'
    parsed.pathname = "/" + pathParts.join('/');

    // This yields something like "/dl/23313275/favicon.ico"
    let dlUrl = parsed.toString();
    console.log("Constructed /dl/ direct URL:", dlUrl);
    return dlUrl;
}
let tmpDlUrl = createTmpfilesDLUrl(tmpDefaultUrl);

// --------------------------------------------------
// 6) Output the final "/dl/" link
// --------------------------------------------------
output.set("faviconUrl", tmpDlUrl);
console.log("Successfully set output.faviconUrl to:", tmpDlUrl);
