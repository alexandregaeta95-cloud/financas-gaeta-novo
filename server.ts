import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

let aiClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY não configurada no ambiente do servidor.");
    }
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

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
      hasGeminiApiKey: Boolean(process.env.GEMINI_API_KEY),
    });
  });

  // Food / Meal analysis with Gemini AI
  app.post("/api/analyze-food", async (req, res) => {
    try {
      const { imageBase64, mimeType = "image/jpeg" } = req.body;

      if (!imageBase64 || typeof imageBase64 !== "string") {
        res.status(400).json({
          status: "error",
          message: "Nenhuma imagem foi enviada para análise.",
        });
        return;
      }

      // Clean base64 string if data URL prefix was included
      const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z0-9+]+;base64,/, "");

      const genAI = getGenAI();

      const prompt = `Você é um nutricionista especialista em estimativa visual de calorias e macronutrientes.
Analise a imagem da refeição, prato ou alimento com atenção e determine:
1. Nome claro e representativo do prato ou alimento (ex: "Prato Feito: Arroz, Feijão, Frango Grelhado e Salada").
2. Descrição concisa dos itens visíveis.
3. Estimativa aproximada de calorias totais (kcal).
4. Estimativa de proteínas (g), carboidratos (g) e gorduras (g).
5. Lista de cada item identificado com porção estimada, calorias e proteínas do item.
6. Uma dica ou observação nutricional construtiva.

Retorne estritamente um JSON com a seguinte estrutura:
{
  "nomePrato": "string",
  "descricao": "string",
  "caloriasEstimadas": number,
  "proteinasEstimadas": number,
  "carboidratosEstimados": number,
  "gordurasEstimadas": number,
  "itensIdentificados": [
    {
      "item": "string",
      "porcaoAproximada": "string",
      "calorias": number,
      "proteinas": number
    }
  ],
  "dicasNutricionais": "string"
}`;

      const response = await genAI.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          {
            role: "user",
            parts: [
              {
                inlineData: {
                  mimeType: mimeType || "image/jpeg",
                  data: cleanBase64,
                },
              },
              {
                text: prompt,
              },
            ],
          },
        ],
        config: {
          responseMimeType: "application/json",
        },
      });

      const responseText = response.text || "{}";
      let parsedData;
      try {
        parsedData = JSON.parse(responseText);
      } catch (parseErr) {
        console.error("Erro ao fazer parse do JSON do Gemini:", parseErr, responseText);
        // Fallback sanitize json code blocks
        const sanitized = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
        parsedData = JSON.parse(sanitized);
      }

      res.json({
        status: "success",
        data: parsedData,
      });
    } catch (err: any) {
      console.error("[Gemini Food Analysis Error]:", err);
      res.status(500).json({
        status: "error",
        message: err.message || "Falha ao analisar a imagem do alimento com Gemini.",
      });
    }
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

      let googleResponse: Response | null = null;
      let lastError: any = null;

      // Retry up to 2 times for transient network or 5xx errors from Google
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          googleResponse = await fetch(targetUrl, fetchOptions);
          if (googleResponse.ok) {
            break;
          }
          // If 5xx error, wait 400ms and retry once
          if (googleResponse.status >= 500 && attempt === 0) {
            await new Promise((resolve) => setTimeout(resolve, 400));
            continue;
          }
          break;
        } catch (err: any) {
          lastError = err;
          if (attempt === 0) {
            await new Promise((resolve) => setTimeout(resolve, 400));
            continue;
          }
        }
      }

      if (!googleResponse) {
        throw lastError || new Error("Falha na comunicação com o Google Apps Script.");
      }

      if (!googleResponse.ok) {
        const errorRaw = await googleResponse.text().catch(() => "");
        // Clean HTML or long responses from Google error pages
        const isHtml = errorRaw.includes("<html") || errorRaw.includes("<!DOCTYPE");
        const cleanMessage = isHtml
          ? `Google Apps Script indisponível temporariamente (${googleResponse.status}). Verifique a permissão do script ou tente novamente.`
          : errorRaw.slice(0, 300);

        res.status(googleResponse.status).json({
          status: "error",
          message: cleanMessage,
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
