import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";

dotenv.config();

const ALLOWED_GOOGLE_DOMAINS = [
  "script.google.com",
  "script.googleusercontent.com",
  "sheets.googleapis.com",
  "docs.google.com",
];

function isAllowedUrl(targetUrl: string): boolean {
  try {
    const parsed = new URL(targetUrl);
    const hostname = parsed.hostname.toLowerCase();
    return ALLOWED_GOOGLE_DOMAINS.some(
      (domain) => hostname === domain || hostname.endsWith(`.${domain}`)
    );
  } catch {
    return false;
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));

  // Health check endpoint
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      hasAppsScriptEnv: Boolean(process.env.APPS_SCRIPT_URL),
    });
  });

  // Config check endpoint
  app.get("/api/config", (_req, res) => {
    res.json({
      hasAppsScriptUrl: Boolean(process.env.APPS_SCRIPT_URL),
      appsScriptUrlConfigured: process.env.APPS_SCRIPT_URL ? true : false,
    });
  });

  // Proxy endpoint to communicate with Google Apps Script
  app.all("/api/proxy", async (req, res) => {
    try {
      // Get target URL from body, query, or environment variable
      let targetUrl =
        (req.body && req.body.targetUrl) ||
        (req.query && (req.query.targetUrl as string)) ||
        process.env.APPS_SCRIPT_URL;

      if (!targetUrl) {
        res.status(400).json({
          status: "error",
          message:
            "URL do Google Apps Script não configurada no servidor e nenhuma targetUrl foi fornecida.",
        });
        return;
      }

      // Append action/sheet params if provided in query or body
      if (req.method === "GET" && req.query) {
        const urlObj = new URL(targetUrl);
        Object.keys(req.query).forEach((key) => {
          if (key !== "targetUrl") {
            urlObj.searchParams.set(key, String(req.query[key]));
          }
        });
        targetUrl = urlObj.toString();
      }

      // Security Check: Whitelist check for allowed Google domains
      if (!isAllowedUrl(targetUrl)) {
        res.status(403).json({
          status: "error",
          message:
            "Acesso negado: O servidor proxy só aceita redirecionar para domínios do Google permitidos (script.google.com, etc).",
        });
        return;
      }

      // Forward request to Google Apps Script
      const method = req.method;
      const fetchOptions: RequestInit = {
        method: method === "GET" ? "GET" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        redirect: "follow",
      };

      if (method !== "GET") {
        // Exclude targetUrl from payload sent to Apps Script
        const bodyPayload = { ...req.body };
        delete bodyPayload.targetUrl;
        fetchOptions.body = JSON.stringify(bodyPayload);
      }

      const googleResponse = await fetch(targetUrl, fetchOptions);

      if (!googleResponse.ok) {
        const errorText = await googleResponse.text();
        res.status(googleResponse.status).json({
          status: "error",
          message: `Erro na resposta do Google Apps Script (${googleResponse.status}): ${errorText}`,
        });
        return;
      }

      const responseText = await googleResponse.text();
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch {
        // Raw text response
        responseData = { status: "success", raw: responseText };
      }

      // Always return payload directly
      res.json(responseData);
    } catch (err: any) {
      console.error("[Proxy Error]:", err);
      res.status(500).json({
        status: "error",
        message: `Erro de comunicação com o proxy: ${err.message || String(err)}`,
      });
    }
  });

  // Vite middleware for development vs Static serving for production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Finanças Gaeta] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
