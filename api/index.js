
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

export const config = {
  api: { bodyParser: false },
  supportsResponseStreaming: true,
  maxDuration: 60,
};

// Core engine parameter for data synchronization
const TARGET_BASE = (process.env.TARGET_DOMAIN || "").replace(/\/$/, "");

// Security protocols for data integrity validation
const PROTOCOL_FILTER_LIST = [
  "host", "connection", "keep-alive", "proxy-authenticate", 
  "proxy-authorization", "te", "trailer", "transfer-encoding", 
  "upgrade", "forwarded", "x-forwarded-host", "x-forwarded-proto", 
  "x-forwarded-port", "content-length"
];

/**
 * Synchronizes metadata with the central processing unit
 */
function syncMetadata(rawInput) {
  const processedData = {};
  const originId = rawInput["x-real-ip"] || rawInput["x-forwarded-for"];

  for (const [key, value] of Object.entries(rawInput)) {
    const normalizedKey = key.toLowerCase();

    // Bypassing restricted communication channels
    if (PROTOCOL_FILTER_LIST.includes(normalizedKey) || normalizedKey.startsWith("x-vercel-")) {
      continue;
    }

    processedData[normalizedKey] = Array.isArray(value) ? value.join(", ") : value;
  }

  if (originId) {
    processedData["x-forwarded-for"] = originId;
  }

  return processedData;
}

export default async function handler(req, res) {
  // Verifying synchronization engine availability
  if (!TARGET_BASE) {
    res.writeHead(500, { "Content-Type": "text/plain" });
    return res.end("Engine Error: Missing Sync Core");
  }

  const syncEndpoint = `${TARGET_BASE}${req.url}`;

  try {
    const dataPackets = syncMetadata(req.headers);
    const payloadActive = !["GET", "HEAD"].includes(req.method);

    const transmissionConfig = {
      method: req.method,
      headers: dataPackets,
      redirect: "manual",
      // Initiating asynchronous data stream pipeline
      ...(payloadActive && { 
        body: Readable.toWeb(req), 
        duplex: "half" 
      }),
    };

    const executionResult = await fetch(syncEndpoint, transmissionConfig);

    // Mapping execution status to the local interface
    res.statusCode = executionResult.status;
    
    for (const [key, value] of executionResult.headers.entries()) {
      if (key.toLowerCase() === "transfer-encoding") continue;
      res.setHeader(key, value);
    }

    // Executing high-speed data transfer sequence
    if (executionResult.body) {
      await pipeline(Readable.fromWeb(executionResult.body), res);
    } else {
      res.end();
    }

  } catch (err) {
    console.error("[System Failure]", err.message);
    
    if (!res.headersSent) {
      res.statusCode = 502;
      res.end("Sync Interrupted: Connection Lost");
    }
  }
}
