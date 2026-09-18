import dotenv from "dotenv";
dotenv.config();

import express, { Request, Response } from "express";
import path from "path";
import { GoogleGenAI } from "@google/genai";

const app = express();
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Lista de domínios explicitamente autorizados para o proxy de planilhas/Google APIs
const ALLOWED_DOMAINS = [
  "script.google.com",
  "script.googleusercontent.com",
  "sheets.googleapis.com",
  "www.googleapis.com",
];

function isDomainAllowed(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    const host = parsed.hostname.toLowerCase();
    return ALLOWED_DOMAINS.some(
      (domain) => host === domain || host.endsWith("." + domain)
    );
  } catch {
    return false;
  }
}

// Utilitário de fetch com Timeout e Retentativas (Retry Logic)
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 2,
  timeoutMs = 35000
): Promise<globalThis.Response> {
  let lastError: any = null;

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        redirect: "follow",
      });
      clearTimeout(timeoutId);

      // Se respondeu 5xx e ainda tem retentativas, aguarda e tenta de novo
      if (response.status >= 500 && attempt <= maxRetries) {
        await new Promise((r) => setTimeout(r, attempt * 800));
        continue;
      }

      return response;
    } catch (err: any) {
      clearTimeout(timeoutId);
      lastError = err;
      if (attempt <= maxRetries) {
        await new Promise((r) => setTimeout(r, attempt * 800));
        continue;
      }
    }
  }

  throw lastError || new Error("Falha de conexão após múltiplas tentativas.");
}

// 1. Health check
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// 2. Rota Proxy (GET e POST) para Google Apps Script e Google Sheets
app.get("/api/proxy", async (req: Request, res: Response) => {
  try {
    const targetUrlParam = (req.query.targetUrl as string) || process.env.APPS_SCRIPT_URL;
    if (!targetUrlParam) {
      return res.status(400).json({
        status: "error",
        message: "Nenhuma URL de destino (targetUrl ou APPS_SCRIPT_URL) configurada.",
      });
    }

    if (!isDomainAllowed(targetUrlParam)) {
      return res.status(403).json({
        status: "error",
        message: "Domínio de destino não permitido pelo proxy de segurança.",
      });
    }

    const targetUrlObj = new URL(targetUrlParam);
    // Repassa todos os parâmetros de busca recebidos na requisição (exceto targetUrl)
    for (const [key, val] of Object.entries(req.query)) {
      if (key !== "targetUrl" && typeof val === "string") {
        targetUrlObj.searchParams.set(key, val);
      }
    }

    const response = await fetchWithRetry(
      targetUrlObj.toString(),
      {
        method: "GET",
        headers: {
          Accept: "application/json, text/plain, */*",
          "Cache-Control": "no-cache",
        },
      },
      2,
      35000
    );

    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const data = await response.json();
      return res.status(response.status).json(data);
    } else {
      const text = await response.text();
      try {
        const parsed = JSON.parse(text);
        return res.status(response.status).json(parsed);
      } catch {
        return res.status(response.status).send(text);
      }
    }
  } catch (error: any) {
    console.error("Erro no proxy GET:", error);
    const isTimeout = error?.name === "AbortError";
    return res.status(504).json({
      status: "error",
      message: isTimeout
        ? "Tempo limite esgotado ao contatar o Google Apps Script (Timeout 35s)."
        : (error?.message || "Erro de conexão ao acessar a planilha."),
    });
  }
});

app.post("/api/proxy", async (req: Request, res: Response) => {
  try {
    const targetUrlParam =
      (req.body?.targetUrl as string) ||
      (req.query.targetUrl as string) ||
      process.env.APPS_SCRIPT_URL;

    if (!targetUrlParam) {
      return res.status(400).json({
        status: "error",
        message: "Nenhuma URL de destino (targetUrl ou APPS_SCRIPT_URL) configurada.",
      });
    }

    if (!isDomainAllowed(targetUrlParam)) {
      return res.status(403).json({
        status: "error",
        message: "Domínio de destino não permitido pelo proxy de segurança.",
      });
    }

    // O Apps Script espera receber o corpo JSON com { action, sheet, items, ... }
    const response = await fetchWithRetry(
      targetUrlParam,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json, text/plain, */*",
        },
        body: JSON.stringify(req.body),
      },
      2,
      40000
    );

    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const data = await response.json();
      return res.status(response.status).json(data);
    } else {
      const text = await response.text();
      try {
        const parsed = JSON.parse(text);
        return res.status(response.status).json(parsed);
      } catch {
        return res.status(response.status).send(text);
      }
    }
  } catch (error: any) {
    console.error("Erro no proxy POST:", error);
    const isTimeout = error?.name === "AbortError";
    return res.status(504).json({
      status: "error",
      message: isTimeout
        ? "Tempo limite esgotado ao salvar dados no Google Apps Script (Timeout 40s)."
        : (error?.message || "Erro de conexão ao salvar na planilha."),
    });
  }
});

// Lazy initializer for Gemini API client
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("A variável de ambiente GEMINI_API_KEY não está configurada no servidor.");
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

// 3. Análise de Alimentos / Pratos via Gemini Vision
app.post("/api/analyze-food", async (req: Request, res: Response) => {
  try {
    const { imageBase64, mimeType = "image/jpeg" } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ status: "error", message: "Imagem não fornecida." });
    }

    const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, "");
    const ai = getGeminiClient();

    const prompt = `Analise a foto desta refeição/alimento e forneça uma estimativa nutricional precisa e realista.
Retorne ESTRITAMENTE um objeto JSON válido (sem tags markdown nem explicações fora do JSON) com a seguinte estrutura:
{
  "nomePrato": "Nome descritivo e claro do prato ou alimento",
  "descricao": "Breve descrição dos componentes visíveis",
  "caloriasEstimadas": 450,
  "proteinasEstimadas": 25,
  "carboidratosEstimados": 45,
  "gordurasEstimadas": 15,
  "itensIdentificados": [
    { "nome": "Item 1", "quantidade": "100g", "calorias": 150 },
    { "nome": "Item 2", "quantidade": "1 fatia", "calorias": 100 }
  ],
  "dicasNutricionais": "Dica nutricional ou comentário sobre a refeição",
  "observacoes": "Observação sobre a estimativa calórica"
}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            {
              inlineData: {
                data: cleanBase64,
                mimeType: mimeType || "image/jpeg",
              },
            },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
      },
    });

    const text = response.text || "{}";
    let parsed: any;
    try {
      parsed = JSON.parse(text);
    } catch {
      const match = text.match(/\{[\s\S]*\}/);
      parsed = match ? JSON.parse(match[0]) : {};
    }

    const result = {
      id: `food_${Date.now()}`,
      data: new Date().toISOString().split("T")[0],
      dataHora: new Date().toISOString(),
      nomePrato: parsed.nomePrato || "Refeição Identificada",
      descricao: parsed.descricao || "",
      caloriasEstimadas: Number(parsed.caloriasEstimadas) || 0,
      proteinasEstimadas: Number(parsed.proteinasEstimadas) || 0,
      carboidratosEstimados: Number(parsed.carboidratosEstimados) || 0,
      gordurasEstimadas: Number(parsed.gordurasEstimadas) || 0,
      itensIdentificados: Array.isArray(parsed.itensIdentificados) ? parsed.itensIdentificados : [],
      dicasNutricionais: parsed.dicasNutricionais || "",
      observacoes: parsed.observacoes || "",
    };

    return res.json({ status: "success", data: result });
  } catch (error: any) {
    console.error("Erro em /api/analyze-food:", error);
    return res.status(500).json({
      status: "error",
      message: error?.message || "Falha ao processar análise da imagem com IA.",
    });
  }
});

// 4. Leitura de Lista de Compras por Foto via Gemini Vision
app.post("/api/read-shopping-list", async (req: Request, res: Response) => {
  try {
    const { imageBase64, mimeType = "image/jpeg" } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ status: "error", message: "Imagem da lista não fornecida." });
    }

    const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, "");
    const ai = getGeminiClient();

    const prompt = `Analise a foto desta lista de compras (manuscrita ou impressa) e extraia todos os itens.
Retorne ESTRITAMENTE um objeto JSON válido (sem tags markdown nem texto fora do JSON) com a seguinte estrutura:
{
  "itens": [
    {
      "item": "NOME DO ITEM EM MAIÚSCULAS",
      "quantidade": 1,
      "unidade": "UN",
      "observacao": "Detalhe, marca ou especificação se houver"
    }
  ],
  "resumoLeitura": "Identificados X itens pela leitura com IA."
}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            {
              inlineData: {
                data: cleanBase64,
                mimeType: mimeType || "image/jpeg",
              },
            },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
      },
    });

    const text = response.text || "{}";
    let parsed: any;
    try {
      parsed = JSON.parse(text);
    } catch {
      const match = text.match(/\{[\s\S]*\}/);
      parsed = match ? JSON.parse(match[0]) : { itens: [] };
    }

    const itens = Array.isArray(parsed.itens) ? parsed.itens : [];
    return res.json({
      status: "success",
      data: {
        itens,
        resumoLeitura: parsed.resumoLeitura || `Identificados ${itens.length} itens pela Visão Gemini.`,
      },
    });
  } catch (error: any) {
    console.error("Erro em /api/read-shopping-list:", error);
    return res.status(500).json({
      status: "error",
      message: error?.message || "Falha ao processar lista de compras com IA.",
    });
  }
});

// 5. Rota para cálculo de distância da Calculadora de Corridas
function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

app.post("/api/rota", async (req: Request, res: Response) => {
  try {
    const { pontos } = req.body;
    if (!Array.isArray(pontos) || pontos.length < 2) {
      return res.status(400).json({ error: "É necessário fornecer ao menos 2 pontos [lat, lng]." });
    }

    // Tentativa com OSRM público
    try {
      const coordinatesStr = pontos.map((p: [number, number]) => `${p[1]},${p[0]}`).join(";");
      const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${coordinatesStr}?overview=false`;
      const osrmRes = await fetch(osrmUrl, { signal: AbortSignal.timeout(6000) });

      if (osrmRes.ok) {
        const osrmData = (await osrmRes.json()) as any;
        if (osrmData.routes && osrmData.routes.length > 0) {
          const route = osrmData.routes[0];
          const distanciaKm = Number((route.distance / 1000).toFixed(2));
          const duracaoMinutos = Math.max(1, Math.round(route.duration / 60));
          return res.json({ distanciaKm, duracaoMinutos });
        }
      }
    } catch {
      // Fallback em caso de indisponibilidade do OSRM
    }

    let totalKm = 0;
    for (let i = 0; i < pontos.length - 1; i++) {
      totalKm += haversineDistanceKm(pontos[i][0], pontos[i][1], pontos[i + 1][0], pontos[i + 1][1]);
    }
    const distanciaKm = Number((totalKm * 1.3).toFixed(2));
    const duracaoMinutos = Math.max(1, Math.round((distanciaKm / 35) * 60));

    return res.json({ distanciaKm, duracaoMinutos });
  } catch (error: any) {
    console.error("Erro em /api/rota:", error);
    return res.status(500).json({ error: "Falha ao calcular rota." });
  }
});

// 6. Servir arquivos estáticos do frontend compilado
const distPath = path.join(process.cwd(), "dist");
app.use(express.static(distPath));

app.get("*", (_req: Request, res: Response) => {
  res.sendFile(path.join(distPath, "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(Number(PORT), "0.0.0.0", () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
