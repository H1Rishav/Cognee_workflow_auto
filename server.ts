import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// API routes go here FIRST

// Secure server-side Gemini Proxy Endpoint
app.post("/api/gemini/generate", async (req, res) => {
  const { systemInstruction, prompt, apiKey } = req.body;
  const keyToUse = apiKey || process.env.GEMINI_API_KEY;

  if (!keyToUse) {
    console.error("[Gemini Error] No GEMINI_API_KEY configured.");
    return res.status(400).json({ error: "Gemini API key is missing. Please set it in Settings > Secrets or the GEMINI_API_KEY constant." });
  }

  try {
    const ai = new GoogleGenAI({
      apiKey: keyToUse,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    res.json({ text: response.text });
  } catch (err: any) {
    console.error("[Gemini API Call Failed]:", err);
    res.status(500).json({ error: err.message || "Gemini generation failed" });
  }
});

// Health check endpoint
app.get("/api/cognee/health", async (req, res) => {
  const baseUrl = process.env.COGNEE_BASE_URL || "";
  const apiKey = process.env.COGNEE_API_KEY || "";
  const tenantId = process.env.COGNEE_TENANT_ID || "";

  const hasConfig = baseUrl.trim() !== "" && apiKey.trim() !== "";
  let isFallbackMode = true;
  let errorDetails = "";

  if (hasConfig) {
    try {
      console.log(`[Cognee Connection Check] Pinging Cognee Cloud at: ${baseUrl}`);
      const response = await fetch(`${baseUrl}/api/v1/search`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Api-Key": apiKey,
          "X-Tenant-Id": tenantId,
        },
        body: JSON.stringify({ query: "ping", datasetName: "mnemosyne" }),
      });
      isFallbackMode = !response.ok;
      if (!response.ok) {
        const text = await response.text();
        errorDetails = `HTTP ${response.status}: ${text}`;
        console.error(`[Cognee Connection Failed] Received response code ${response.status} from Cognee Cloud: ${text}`);
      } else {
        console.log(`[Cognee Connection Connected] Handshake successful! Cloud persistence is active.`);
      }
    } catch (e: any) {
      isFallbackMode = true;
      errorDetails = e.message || String(e);
      console.error(`[Cognee Connection Error] Network or DNS error connecting to Cognee Cloud at ${baseUrl}:`, e);
    }
  } else {
    console.log(`[Cognee Config Alert] No credentials supplied. MNEMOSYNE is running in Local Fallback storage mode.`);
  }

  res.json({
    hasConfig,
    isFallbackMode,
    error: errorDetails || null,
  });
});

// Proxy for ADD
app.post("/api/cognee/add", async (req, res) => {
  const baseUrl = process.env.COGNEE_BASE_URL || "";
  const apiKey = process.env.COGNEE_API_KEY || "";
  const tenantId = process.env.COGNEE_TENANT_ID || "";

  if (!baseUrl || !apiKey) {
    console.error("[Cognee Add Blocked] Missing COGNEE_BASE_URL or COGNEE_API_KEY on server.");
    return res.status(400).json({ error: "Cognee Cloud environment variables not configured on backend." });
  }

  try {
    console.log("[Cognee Add Triggered] Ingesting data payload into Cognee cloud dataset 'mnemosyne'...");
    const response = await fetch(`${baseUrl}/api/v1/add`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": apiKey,
        "X-Tenant-Id": tenantId,
      },
      body: JSON.stringify({
        datasetName: "mnemosyne",
        data: req.body,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(`[Cognee Add Failed] Cloud endpoint returned status ${response.status}: ${text}`);
      return res.status(response.status).json({ error: `Cognee responded with ${response.status}: ${text}` });
    }

    const data = await response.json();
    console.log("[Cognee Add Success] Node successfully registered with Cognee Cloud platform!");
    res.json(data);
  } catch (err: any) {
    console.error("[Cognee Add Network Error] Failed to complete Cognee /add API call:", err);
    res.status(500).json({ error: err.message || "Failed to contact Cognee cloud" });
  }
});

// Proxy for SEARCH
app.post("/api/cognee/search", async (req, res) => {
  const baseUrl = process.env.COGNEE_BASE_URL || "";
  const apiKey = process.env.COGNEE_API_KEY || "";
  const tenantId = process.env.COGNEE_TENANT_ID || "";

  if (!baseUrl || !apiKey) {
    console.error("[Cognee Search Blocked] Missing COGNEE_BASE_URL or COGNEE_API_KEY on server.");
    return res.status(400).json({ error: "Cognee Cloud environment variables not configured on backend." });
  }

  try {
    const { query } = req.body;
    console.log(`[Cognee Search Triggered] Context searching query '${query}' on Cognee cloud...`);
    const response = await fetch(`${baseUrl}/api/v1/search`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": apiKey,
        "X-Tenant-Id": tenantId,
      },
      body: JSON.stringify({
        query,
        datasetName: "mnemosyne",
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(`[Cognee Search Failed] Cloud endpoint returned status ${response.status}: ${text}`);
      return res.status(response.status).json({ error: `Cognee responded with ${response.status}: ${text}` });
    }

    const data = await response.json();
    console.log(`[Cognee Search Success] Cloud results matching query: ${Array.isArray(data) ? data.length : 1} records found.`);
    res.json(data);
  } catch (err: any) {
    console.error("[Cognee Search Network Error] Failed to complete Cognee /search API call:", err);
    res.status(500).json({ error: err.message || "Failed to contact Cognee cloud" });
  }
});

// Proxy for COGNIFY
app.post("/api/cognee/cognify", async (req, res) => {
  const baseUrl = process.env.COGNEE_BASE_URL || "";
  const apiKey = process.env.COGNEE_API_KEY || "";
  const tenantId = process.env.COGNEE_TENANT_ID || "";

  if (!baseUrl || !apiKey) {
    console.error("[Cognee Cognify Blocked] Missing COGNEE_BASE_URL or COGNEE_API_KEY on server.");
    return res.status(400).json({ error: "Cognee Cloud environment variables not configured on backend." });
  }

  try {
    console.log("[Cognee Cognify Triggered] Cognifying dataset 'mnemosyne' on Cognee Cloud platform...");
    const response = await fetch(`${baseUrl}/api/v1/cognify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": apiKey,
        "X-Tenant-Id": tenantId,
      },
      body: JSON.stringify({
        datasetName: "mnemosyne",
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(`[Cognee Cognify Failed] Cloud endpoint returned status ${response.status}: ${text}`);
      return res.status(response.status).json({ error: `Cognee responded with ${response.status}: ${text}` });
    }

    const data = await response.json();
    console.log("[Cognee Cognify Success] Cognee self-correcting cognify pipeline executed successfully!");
    res.json(data);
  } catch (err: any) {
    console.error("[Cognee Cognify Network Error] Failed to complete Cognee /cognify API call:", err);
    res.status(500).json({ error: err.message || "Failed to contact Cognee cloud" });
  }
});

// Proxy for DELETE
app.delete("/api/cognee/delete", async (req, res) => {
  const baseUrl = process.env.COGNEE_BASE_URL || "";
  const apiKey = process.env.COGNEE_API_KEY || "";
  const tenantId = process.env.COGNEE_TENANT_ID || "";

  if (!baseUrl || !apiKey) {
    console.error("[Cognee Delete Blocked] Missing COGNEE_BASE_URL or COGNEE_API_KEY on server.");
    return res.status(400).json({ error: "Cognee Cloud environment variables not configured on backend." });
  }

  try {
    const targetId = req.body?.targetId || req.query?.targetId;
    if (!targetId) {
      return res.status(400).json({ error: "Missing targetId in request body or query parameters." });
    }

    console.log(`[Cognee Delete Triggered] Deleting item with target ID '${targetId}' from Cognee cloud...`);
    const response = await fetch(`${baseUrl}/api/v1/delete`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": apiKey,
        "X-Tenant-Id": tenantId,
      },
      body: JSON.stringify({
        datasetName: "mnemosyne",
        targetId,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(`[Cognee Delete Failed] Cloud endpoint returned status ${response.status}: ${text}`);
    } else {
      console.log(`[Cognee Delete Success] Target item successfully deleted from cloud storage.`);
    }

    res.json({ success: response.ok });
  } catch (err: any) {
    console.error("[Cognee Delete Network Error] Failed to complete Cognee /delete API call:", err);
    res.status(500).json({ error: err.message || "Failed to contact Cognee cloud" });
  }
});

// Vite middleware for development or Static Assets for Production
async function setupVite() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

setupVite();
