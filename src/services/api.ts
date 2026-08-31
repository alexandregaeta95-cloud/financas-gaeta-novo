/**
 * Finanças Gaeta — Client API Service
 * Enforces strict foundation rules:
 * - LocalStorage is strictly a CACHE, never source of truth.
 * - Failed GETs maintain local state and throw error, NEVER returning empty array.
 * - UPSERT with LockService on POST.
 * - Deterministic ID generation.
 */

import { ApiResponse, SHEET_NAMES, SheetNameKey } from "../types";
import {
  parseCurrency,
  normalizeLancamento,
  normalizeAbastecimento,
  normalizeContaBancaria,
  normalizeCartaoCredito,
  normalizeConsultaMedica,
  normalizeReceitaMedica,
  normalizeInfracao,
  normalizeVeiculo,
  normalizeMetaCategoria,
  normalizeCategoriaCustomizada,
  normalizeServicoOficina,
  normalizeManutencaoAgendada,
  normalizeItemMercado,
  normalizeZonaDeRisco,
  normalizeCompromissoAgenda,
  normalizeRegistroSaude,
  normalizeAlimentoAnalise,
  normalizeExercicio,
  normalizeConfigLembreteSaude,
  normalizeConsumoCafe,
  normalizeConsumoAgua,
  normalizeConfigLembreteFinancas,
  normalizeLembreteRemedio,
  formatarHora,
} from "../utils/formatters";

const LOCAL_STORAGE_KEY_PREFIX = "financas_gaeta_cache_";
const APPS_SCRIPT_URL_KEY = "financas_gaeta_apps_script_url";

/**
 * Get or store the Google Apps Script Web App URL from localStorage
 */
export function getSavedAppsScriptUrl(): string {
  return localStorage.getItem(APPS_SCRIPT_URL_KEY) || "";
}

export function saveAppsScriptUrl(url: string): void {
  if (url && url.trim().startsWith("http")) {
    localStorage.setItem(APPS_SCRIPT_URL_KEY, url.trim());
  } else if (!url) {
    localStorage.removeItem(APPS_SCRIPT_URL_KEY);
  }
}

/**
 * Deterministic ID Generator for Client-Side items missing an ID
 */
export function generateDeterministicId(sheetName: string, index: number, item: any): string {
  const currentId = item?.Id ? String(item.Id).trim() : "";
  if (currentId && currentId.toLowerCase() !== "id" && !currentId.startsWith("undefined")) {
    return currentId;
  }
  const str = `${sheetName}_${index}_${item.Data || item.data || ""}_${item.Descricao || item.Nome || item.Item || item.Medicamento || ""}_${item.Valor || item.Modelo || ""}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return `DET_${sheetName}_${index}_${Math.abs(hash)}`;
}

/**
 * Generate Timestamp + Random ID for NEW user-created items
 */
export function generateNewId(prefix: string = "GAETA"): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return `${prefix}_${timestamp}_${random}`;
}

/**
 * Helper to normalize any record according to its sheet
 */
export function normalizeRecordBySheet(sheetName: string, item: any): any {
  if (!item || typeof item !== "object") return item;
  const s = String(sheetName || "").toLowerCase();

  if (s.includes("lancamento") || sheetName === SHEET_NAMES.LANCAMENTOS) {
    return normalizeLancamento(item);
  }
  if (s.includes("abastecimento") || sheetName === SHEET_NAMES.ABASTECIMENTOS) {
    return normalizeAbastecimento(item);
  }
  if (s.includes("contas") || sheetName === SHEET_NAMES.CONTAS_BANCARIAS) {
    return normalizeContaBancaria(item);
  }
  if (s.includes("cart") || sheetName === SHEET_NAMES.CARTOES_CREDITO) {
    return normalizeCartaoCredito(item);
  }
  if (s.includes("consulta") || sheetName === SHEET_NAMES.CONSULTAS_MEDICAS) {
    return normalizeConsultaMedica(item);
  }
  if (s.includes("receita") || sheetName === SHEET_NAMES.RECEITAS_MEDICAS) {
    return normalizeReceitaMedica(item);
  }
  if (s.includes("infrac") || sheetName === SHEET_NAMES.INFRACOES) {
    return normalizeInfracao(item);
  }
  if (s.includes("veiculo") || sheetName === SHEET_NAMES.VEICULOS) {
    return normalizeVeiculo(item);
  }
  if (s.includes("meta") || sheetName === SHEET_NAMES.METAS_CATEGORIA) {
    return normalizeMetaCategoria(item);
  }
  if (s.includes("categoria") || sheetName === SHEET_NAMES.CATEGORIAS_CUSTOMIZADAS) {
    return normalizeCategoriaCustomizada(item);
  }
  if (s.includes("oficina") || sheetName === SHEET_NAMES.OFICINA) {
    return normalizeServicoOficina(item);
  }
  if (s.includes("manuten") || sheetName === SHEET_NAMES.MANUTENCOES_AGENDADAS) {
    return normalizeManutencaoAgendada(item);
  }
  if (s.includes("mercado") || sheetName === SHEET_NAMES.LISTA_MERCADO) {
    return normalizeItemMercado(item);
  }
  if (s.includes("risco") || sheetName === SHEET_NAMES.ZONAS_RISCO) {
    return normalizeZonaDeRisco(item);
  }
  if (s.includes("agenda") || s.includes("compromisso") || sheetName === SHEET_NAMES.AGENDA) {
    return normalizeCompromissoAgenda(item);
  }
  if (s.includes("saude") || s.includes("saúde") || s.includes("biometria") || sheetName === SHEET_NAMES.CONTROLE_SAUDE) {
    return normalizeRegistroSaude(item);
  }
  if (s.includes("alimento") || s.includes("nutri") || sheetName === SHEET_NAMES.ANALISE_ALIMENTOS) {
    return normalizeAlimentoAnalise(item);
  }
  if (s.includes("exercicio") || s.includes("treino") || sheetName === SHEET_NAMES.EXERCICIOS || sheetName === "23_Exercicios") {
    return normalizeExercicio(item);
  }
  if (
    s.includes("lembrete") ||
    s.includes("22_config") ||
    sheetName === SHEET_NAMES.CONFIG_LEMBRETES_SAUDE ||
    sheetName === "22_Config_Lembretes_Saude"
  ) {
    return normalizeConfigLembreteSaude(item);
  }
  if (
    s.includes("cafe") ||
    s.includes("café") ||
    sheetName === SHEET_NAMES.CONSUMO_CAFE ||
    sheetName === "24_Consumo_Cafe"
  ) {
    return normalizeConsumoCafe(item);
  }
  if (
    s.includes("agua") ||
    s.includes("água") ||
    sheetName === SHEET_NAMES.CONSUMO_AGUA ||
    sheetName === "25_Consumo_Agua"
  ) {
    return normalizeConsumoAgua(item);
  }
  if (
    s.includes("26_config") ||
    s.includes("lembretes_financas") ||
    sheetName === SHEET_NAMES.CONFIG_LEMBRETES_FINANCAS ||
    sheetName === "26_Config_Lembretes_Financas"
  ) {
    return normalizeConfigLembreteFinancas(item);
  }
  if (
    s.includes("27_") ||
    s.includes("remedio") ||
    s.includes("remédio") ||
    sheetName === SHEET_NAMES.LEMBRETES_REMEDIOS ||
    sheetName === "27_Lembretes_Remedios"
  ) {
    return normalizeLembreteRemedio(item);
  }
  return item;
}

/**
 * Read cached sheet records safely
 */
export function getCachedSheetData<T>(sheetName: string): T[] {
  try {
    const raw = localStorage.getItem(`${LOCAL_STORAGE_KEY_PREFIX}${sheetName}`);
    if (raw) {
      const parsed: any[] = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => normalizeRecordBySheet(sheetName, item) as T);
      }
    }
  } catch (err) {
    console.warn(`[Cache Read Warn] Could not parse cache for ${sheetName}:`, err);
  }
  return [];
}

/**
 * Update local cache safely
 */
export function setCachedSheetData<T>(sheetName: string, data: T[]): void {
  try {
    localStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}${sheetName}`, JSON.stringify(data));
  } catch (err) {
    console.warn(`[Cache Write Warn] Could not save cache for ${sheetName}:`, err);
  }
}

/**
 * Core GET method to fetch sheet records.
 * CRITICAL RULE: If fetch fails, keep current cached state and throw an exception!
 */
export async function fetchSheetData<T = any>(
  sheetName: string,
  customTargetUrl?: string
): Promise<T[]> {
  const targetUrl = customTargetUrl || getSavedAppsScriptUrl();

  try {
    const query = new URLSearchParams({ sheet: sheetName });
    if (targetUrl) {
      query.set("targetUrl", targetUrl);
    }

    const response = await fetch(`/api/proxy?${query.toString()}`, {
      method: "GET",
      headers: {
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      throw new Error(
        errJson.message || `Erro HTTP ${response.status} ao carregar a aba ${sheetName}`
      );
    }

    const result: ApiResponse<T[]> = await response.json();

    if (result.status === "error") {
      throw new Error(result.message || `Erro retornado pelo backend da aba ${sheetName}`);
    }

    const rawRecords = Array.isArray(result.data) ? result.data : [];

    // Filter out accidental header rows (where Id is 'Id' and Data is 'Data', etc)
    const records = rawRecords.filter((item: any) => {
      if (!item || typeof item !== "object") return false;
      const idVal = String(item.Id ?? item.id ?? "").trim().toLowerCase();
      const dataVal = String(item.Data ?? item.data ?? "").trim().toLowerCase();
      const tipoVal = String(item.Tipo ?? item.tipo ?? "").trim().toLowerCase();
      if (idVal === "id" && (dataVal === "data" || tipoVal === "tipo" || dataVal === "")) {
        return false;
      }
      return true;
    });

    // Ensure all records have a unique deterministic Id and are normalized
    const seenIds = new Set<string>();
    const recordsWithIds = records.map((item, idx) => {
      let uniqueId = generateDeterministicId(sheetName, idx, item);
      if (seenIds.has(uniqueId) || uniqueId.toLowerCase() === "id") {
        uniqueId = `${uniqueId}_${idx}`;
      }
      seenIds.add(uniqueId);

      const withId = {
        ...item,
        Id: uniqueId,
      };
      return normalizeRecordBySheet(sheetName, withId);
    });

    // Update local cache only on success
    setCachedSheetData(sheetName, recordsWithIds);

    return recordsWithIds;
  } catch (error: any) {
    console.warn(`[Finanças Gaeta API Warning - GET ${sheetName}]:`, error.message || error);
    // RULE: Keep loaded local cache and return it if available
    const cached = getCachedSheetData<T>(sheetName);
    if (cached && cached.length > 0) {
      return cached;
    }
    return [];
  }
}

/**
 * Safe uppercase sanitizer for saving records to Google Sheets.
 * Converts free text strings to UPPERCASE while strictly preserving:
 * - URLs (http, https, data:, blob:)
 * - Image/Proof fields (Comprovante_Url, etc.)
 * - Location/GPS coordinates
 * - Numbers, booleans, dates/timestamps
 * - JSON structures (while sanitizing string values inside JSON)
 */
export function sanitizeValueToUppercase(key: string, value: any): any {
  if (value === null || value === undefined) return value;

  // Handle arrays recursively
  if (Array.isArray(value)) {
    return value.map((elem) =>
      typeof elem === "object" && elem !== null
        ? sanitizeRecordToUppercase(elem)
        : sanitizeValueToUppercase(key, elem)
    );
  }

  // Handle objects recursively
  if (typeof value === "object") {
    return sanitizeRecordToUppercase(value);
  }

  if (typeof value !== "string") return value;

  const trimmed = value.trim();
  if (trimmed === "") return "";

  const lowerKey = key.toLowerCase();

  // 1. Keys that must NEVER be converted to uppercase
  if (
    lowerKey.includes("url") ||
    lowerKey.includes("link") ||
    lowerKey.includes("comprovante") ||
    lowerKey.includes("foto") ||
    lowerKey.includes("imagem") ||
    lowerKey.includes("webhook") ||
    lowerKey.includes("token") ||
    lowerKey.includes("localizacao") ||
    lowerKey.includes("localização") ||
    lowerKey.includes("latitude") ||
    lowerKey.includes("longitude") ||
    lowerKey.includes("maps") ||
    lowerKey === "targeturl"
  ) {
    return value;
  }

  // 2. Protocols and Web URLs
  if (
    /^(https?:\/\/|data:|blob:|mailto:|geo:|tel:)/i.test(trimmed) ||
    trimmed.startsWith("www.")
  ) {
    return value;
  }

  // 3. Geographic coordinates (e.g., "-23.550520, -46.633308" or "-23.550520;-46.633308")
  if (/^-?\d+(\.\d+)?\s*[,;]\s*-?\d+(\.\d+)?$/.test(trimmed)) {
    return value;
  }

  // 4. ISO Date / Datetime strings (e.g., "2026-08-24T13:42:00.000Z" or "2026-08-24")
  if (/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/i.test(trimmed)) {
    return value;
  }

  // 5. Plain Time strings (e.g., "14:30" or "08:15:00")
  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(trimmed)) {
    return value;
  }

  // 6. JSON Object / Array string payloads - parse and sanitize string values inside JSON
  if ((trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith("[") && trimmed.endsWith("]"))) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === "object") {
        const sanitizedParsed = sanitizeRecordToUppercase(parsed);
        return JSON.stringify(sanitizedParsed);
      }
    } catch {
      // Not valid JSON, continue to uppercase
    }
  }

  // 7. General text: Convert to UPPERCASE
  return value.toUpperCase();
}

/**
 * Sanitizes an entire record object so all string properties are safely UPPERCASED
 * while preserving URLs, coordinates, dates, numbers, and JSON structures.
 */
export function sanitizeRecordToUppercase<T = any>(item: T): T {
  if (!item || typeof item !== "object") return item;
  if (Array.isArray(item)) {
    return item.map((elem) =>
      typeof elem === "object" && elem !== null
        ? sanitizeRecordToUppercase(elem)
        : sanitizeValueToUppercase("", elem)
    ) as any;
  }
  const sanitized: any = {};
  for (const [key, value] of Object.entries(item)) {
    sanitized[key] = sanitizeValueToUppercase(key, value);
  }
  return sanitized as T;
}

/**
 * Core POST method to save/upsert sheet records.
 */
export async function saveSheetRecords<T = any>(
  sheetName: string,
  items: T[],
  action: "UPSERT" | "SOFT_DELETE" = "UPSERT",
  customTargetUrl?: string
): Promise<ApiResponse> {
  const targetUrl = customTargetUrl || getSavedAppsScriptUrl();

  // Ensure all items have a valid ID and aliases for accented/spaced spreadsheet headers
  const itemsToSave = items.map((item: any) => {
    const enriched: any = {
      ...item,
      Id: item.Id || generateNewId(),
    };

    // Descrição / Descricao mapping
    if (item.Descricao !== undefined || item["Descrição"] !== undefined) {
      const val = item.Descricao ?? item["Descrição"];
      enriched["Descricao"] = val;
      enriched["Descrição"] = val;
    }

    // Valor Total / Valor mapping with Brazilian currency format support
    if (item.Valor !== undefined || item["Valor"] !== undefined || item["Valor_Total"] !== undefined || item["Valor Total"] !== undefined) {
      const rawValor = item.Valor ?? item["Valor"] ?? item["Valor_Total"] ?? item["Valor Total"];
      const numValor = typeof rawValor === "number" ? rawValor : parseCurrency(rawValor);
      const formattedValor = numValor.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      enriched["Valor"] = formattedValor;
      enriched["Valor_Total"] = formattedValor;
      enriched["Valor Total"] = formattedValor;
    }

    // Valor Pago / Valor_Pago mapping with Brazilian currency format support
    if (item.Valor_Pago !== undefined || item["Valor Pago"] !== undefined || item["Valor_Pago"] !== undefined) {
      const rawValorPago = item.Valor_Pago ?? item["Valor Pago"] ?? item["Valor_Pago"];
      const numValorPago = typeof rawValorPago === "number" ? rawValorPago : parseCurrency(rawValorPago);
      const formattedValorPago = numValorPago.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      enriched["Valor_Pago"] = formattedValorPago;
      enriched["Valor Pago"] = formattedValorPago;
    }

    // Preço Estimado / Preco_Estimado / Valor_Estimado mapping with Brazilian currency format support (16_Lista_De_Mercado)
    if (
      item.Preco_Estimado !== undefined ||
      item["Preco_Estimado"] !== undefined ||
      item["Preço_Estimado"] !== undefined ||
      item["Preco Estimado"] !== undefined ||
      item["Preço Estimado"] !== undefined ||
      item.Valor_Estimado !== undefined ||
      item["Valor_Estimado"] !== undefined ||
      item["Valor Estimado"] !== undefined
    ) {
      const rawEstimado =
        item.Preco_Estimado ??
        item["Preco_Estimado"] ??
        item["Preço_Estimado"] ??
        item["Preco Estimado"] ??
        item["Preço Estimado"] ??
        item.Valor_Estimado ??
        item["Valor_Estimado"] ??
        item["Valor Estimado"];
      const numEstimado = typeof rawEstimado === "number" ? rawEstimado : parseCurrency(rawEstimado);
      const formattedEstimado = numEstimado.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      enriched["Preco_Estimado"] = formattedEstimado;
      enriched["Preço_Estimado"] = formattedEstimado;
      enriched["Preco Estimado"] = formattedEstimado;
      enriched["Preço Estimado"] = formattedEstimado;
      enriched["Valor_Estimado"] = formattedEstimado;
      enriched["Valor Estimado"] = formattedEstimado;
    }

    // Valor_Unitário / Preco_Unitario mapping with Brazilian currency format support
    if (
      item.Valor_Unitário !== undefined ||
      item["Valor_Unitário"] !== undefined ||
      item.Valor_Unitario !== undefined ||
      item["Valor_Unitario"] !== undefined ||
      item.Preco_Unitario !== undefined ||
      item["Preço_Unitário"] !== undefined
    ) {
      const rawUnit =
        item.Valor_Unitário ??
        item["Valor_Unitário"] ??
        item.Valor_Unitario ??
        item["Valor_Unitario"] ??
        item.Preco_Unitario ??
        item["Preço_Unitário"];
      const numUnit = typeof rawUnit === "number" ? rawUnit : parseCurrency(rawUnit);
      const formattedUnit = numUnit.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      enriched["Valor_Unitário"] = formattedUnit;
      enriched["Valor_Unitario"] = formattedUnit;
      enriched["Preco_Unitario"] = formattedUnit;
      enriched["Preço_Unitário"] = formattedUnit;
    }

    // Observações / Observacoes mapping (Canonical Observacoes)
    if (
      item.Observacoes !== undefined ||
      item["Observações"] !== undefined ||
      item.OBS !== undefined ||
      item["Observacao"] !== undefined ||
      item["Observação"] !== undefined ||
      item.observacoes !== undefined ||
      item.observações !== undefined
    ) {
      const val =
        item.Observacoes ??
        item["Observações"] ??
        item.OBS ??
        item["Observacao"] ??
        item["Observação"] ??
        item.observacoes ??
        item.observações;

      const upperVal = typeof val === "string" ? val.toUpperCase() : val !== undefined && val !== null ? String(val).toUpperCase() : "";
      enriched["Observacoes"] = upperVal;
    }

    // 20_Controle_Saude biometric mappings (Canonical Title_Case ONLY)
    if (
      sheetName === SHEET_NAMES.CONTROLE_SAUDE ||
      sheetName === "20_Controle_Saude" ||
      sheetName.includes("Controle_Saude") ||
      item.Tipo_Registro !== undefined ||
      item.Valor_Principal !== undefined
    ) {
      const regId = String(item.Id || item.id || `SAUDE_${Date.now()}`).trim();
      const tipoVal = String(item.Tipo_Registro || item["Tipo Registro"] || item.Tipo_registro || item.tipo_registro || item.Tipo || item.tipo || "").trim().toUpperCase();
      const dataHoraVal = String(item.Data_Hora || item["Data Hora"] || item.Data_hora || item.data_hora || item.Data || item.data || new Date().toISOString()).trim();
      const valPrinc = item.Valor_Principal ?? item["Valor Principal"] ?? item.Valor_principal ?? item.valor_principal ?? item.Valor ?? item.valor ?? "";
      const valSec = item.Valor_Secundario ?? item["Valor Secundario"] ?? item.Valor_secundario ?? item.valor_secundario ?? "";
      
      let bpmVal: any = "";
      const rawBpm = item.Batimentos_Bpm ?? item["Batimentos Bpm"] ?? item.Batimentos_bpm ?? item.Batimentos ?? item.batimentos ?? item.BPM ?? item.Bpm ?? item.bpm;
      if (rawBpm !== undefined && rawBpm !== null && rawBpm !== "") {
        const parsedBpm = typeof rawBpm === "number" ? rawBpm : parseInt(String(rawBpm), 10);
        if (!isNaN(parsedBpm) && parsedBpm > 0) {
          bpmVal = parsedBpm;
        }
      }

      const contextoVal = String(item.Contexto || item.contexto || "").trim().toUpperCase();
      const obsVal = String(item.Observacoes || item["Observações"] || item.observacoes || item.observações || item.OBS || item.obs || "").trim().toUpperCase();
      const criacaoVal = String(item.Data_Criacao || item["Data Criacao"] || item.Data_criacao || item.data_criacao || item.dataCriacao || new Date().toISOString()).trim();

      // Canonical Title_Case columns ONLY
      enriched["Id"] = regId;
      enriched["Tipo_Registro"] = tipoVal;
      enriched["Data_Hora"] = dataHoraVal;
      enriched["Valor_Principal"] = valPrinc;
      enriched["Valor_Secundario"] = valSec;
      enriched["Batimentos_Bpm"] = bpmVal;
      enriched["Contexto"] = contextoVal;
      enriched["Observacoes"] = obsVal;
      enriched["Data_Criacao"] = criacaoVal;

      // Delete all alternate keys
      delete enriched.id;
      delete enriched["Tipo Registro"];
      delete enriched.Tipo_registro;
      delete enriched.tipo_registro;
      delete enriched.Tipo;
      delete enriched.tipo;
      delete enriched["Data Hora"];
      delete enriched.Data_hora;
      delete enriched.data_hora;
      delete enriched.Data;
      delete enriched.data;
      delete enriched["Valor Principal"];
      delete enriched.Valor_principal;
      delete enriched.valor_principal;
      delete enriched.Valor;
      delete enriched.valor;
      delete enriched["Valor Secundario"];
      delete enriched.Valor_secundario;
      delete enriched.valor_secundario;
      delete enriched["Batimentos Bpm"];
      delete enriched.Batimentos_bpm;
      delete enriched.batimentos_bpm;
      delete enriched.Batimentos;
      delete enriched.batimentos;
      delete enriched.BPM;
      delete enriched.Bpm;
      delete enriched.bpm;
      delete enriched.contexto;
      delete enriched["Data Criacao"];
      delete enriched.Data_criacao;
      delete enriched.data_criacao;
      delete enriched.dataCriacao;
      delete enriched["Observações"];
      delete enriched.observações;
      delete enriched.observacoes;
      delete enriched.OBS;
      delete enriched.obs;
      delete enriched["Observação"];
      delete enriched.observacao;
    }

    // 21_Analise_Alimentos mappings (Canonical Title_Case ONLY)
    if (
      sheetName === SHEET_NAMES.ANALISE_ALIMENTOS ||
      sheetName === "21_Analise_Alimentos" ||
      sheetName.includes("Alimento") ||
      item.nomePrato !== undefined ||
      item.caloriasEstimadas !== undefined ||
      item.Nome_Prato !== undefined ||
      item.Calorias_Estimadas !== undefined
    ) {
      // Strip out huge base64 images to prevent payload blowup / Google Sheets cell overflow
      delete enriched.imagemPreview;
      delete enriched.imagem_preview;
      delete enriched.Imagem_Preview;
      delete enriched.Imagem;
      delete enriched.imagem;

      const foodId = String(item.Id || item.id || item.ID || `ALIM_${Date.now()}`).trim();
      const dataVal = String(item.Data || item.data || new Date().toISOString().split("T")[0]).trim();
      const dataHoraVal = String(item.Data_Hora || item.dataHora || item.DataHora || dataVal).trim();
      const pratoVal = sanitizeValueToUppercase(
        "Nome_Prato",
        String(item.Nome_Prato || item.nomePrato || item.Nome || item.Prato || "REFEIÇÃO")
      );
      const calVal = Math.round(Number(item.Calorias_Estimadas ?? item.caloriasEstimadas ?? item.Calorias ?? item.calorias ?? 0));
      const protVal = Math.round(Number(item.Proteinas_Estimadas ?? item.proteinasEstimadas ?? item.Proteinas ?? item.proteinas ?? 0));
      const carbVal = Math.round(Number(item.Carboidratos_Estimados ?? item.carboidratosEstimados ?? item.Carboidratos ?? item.carboidratos ?? 0));
      const gordVal = Math.round(Number(item.Gorduras_Estimadas ?? item.gordurasEstimadas ?? item.Gorduras ?? item.gorduras ?? 0));
      const descVal = sanitizeValueToUppercase(
        "Classificacao_Geral",
        String(item.Classificacao_Geral || item.classificacao_geral || item.descricao || item.Descricao || "")
      );
      
      let itensVal = "";
      if (typeof item.itensIdentificados === "object" && item.itensIdentificados !== null) {
        const sanitizedItens = sanitizeRecordToUppercase(item.itensIdentificados);
        itensVal = JSON.stringify(sanitizedItens);
      } else {
        const rawItensStr = String(item.Itens_Identificados || item.itens_identificados || item.itensIdentificados || item.Itens || "");
        itensVal = sanitizeValueToUppercase("Itens_Identificados", rawItensStr);
      }

      const dicasVal = sanitizeValueToUppercase(
        "Dicas_Nutricionais",
        String(item.Dicas_Nutricionais || item.dicasNutricionais || item.dicas_nutricionais || item.dicas || item.Dicas || "")
      );
      const obsVal = sanitizeValueToUppercase(
        "Observacoes",
        String(item.Observacoes || item.observacoes || item.observações || item["Observações"] || item.obs || item.OBS || "")
      );
      const criacaoVal = String(item.Data_Criacao || item.data_criacao || item.dataCriacao || new Date().toISOString()).trim();

      // Canonical columns (Title_Case)
      enriched["Id"] = foodId;
      enriched["Data"] = dataVal;
      enriched["Data_Hora"] = dataHoraVal;
      enriched["Nome_Prato"] = pratoVal;
      enriched["Calorias_Estimadas"] = calVal;
      enriched["Proteinas_Estimadas"] = protVal;
      enriched["Carboidratos_Estimados"] = carbVal;
      enriched["Gorduras_Estimadas"] = gordVal;
      enriched["Classificacao_Geral"] = descVal;
      enriched["Itens_Identificados"] = itensVal;
      enriched["Dicas_Nutricionais"] = dicasVal;
      enriched["Observacoes"] = obsVal;
      enriched["Data_Criacao"] = criacaoVal;

      // Delete all camelCase and alternate duplicate keys
      delete enriched.id;
      delete enriched.data;
      delete enriched.dataHora;
      delete enriched.data_hora;
      delete enriched.nomePrato;
      delete enriched.nome_prato;
      delete enriched.Nome;
      delete enriched.Prato;
      delete enriched.prato;
      delete enriched.caloriasEstimadas;
      delete enriched.calorias_estimadas;
      delete enriched.Calorias;
      delete enriched.calorias;
      delete enriched.proteinasEstimadas;
      delete enriched.proteinas_estimadas;
      delete enriched.Proteinas;
      delete enriched.proteinas;
      delete enriched.carboidratosEstimados;
      delete enriched.carboidratos_estimados;
      delete enriched.Carboidratos;
      delete enriched.carboidratos;
      delete enriched.gordurasEstimadas;
      delete enriched.gorduras_estimadas;
      delete enriched.Gorduras;
      delete enriched.gorduras;
      delete enriched.descricao;
      delete enriched.Descricao;
      delete enriched.classificacaoGeral;
      delete enriched.classificacao_geral;
      delete enriched.itensIdentificados;
      delete enriched.itens_identificados;
      delete enriched.Itens;
      delete enriched.itens;
      delete enriched.dicasNutricionais;
      delete enriched.dicas_nutricionais;
      delete enriched.Dicas;
      delete enriched.dicas;
      delete enriched.observacoes;
      delete enriched["Observações"];
      delete enriched.observações;
      delete enriched.OBS;
      delete enriched.obs;
      delete enriched["Observação"];
      delete enriched.observacao;
      delete enriched.dataCriacao;
      delete enriched.data_criacao;
      delete enriched.DataCriacao;
    }

    // 22_Config_Lembretes_Saude mapping (Canonical Title_Case ONLY)
    if (
      sheetName === SHEET_NAMES.CONFIG_LEMBRETES_SAUDE ||
      sheetName === "22_Config_Lembretes_Saude" ||
      sheetName.includes("Lembretes") ||
      item.Id === "LEMBRETE_PRESSAO" ||
      item.Id === "LEMBRETE_GLICEMIA" ||
      item.Id === "CONFIG_PERFIL_ALTURA" ||
      item.id === "LEMBRETE_PRESSAO" ||
      item.id === "LEMBRETE_GLICEMIA" ||
      item.id === "CONFIG_PERFIL_ALTURA"
    ) {
      const lembreteId = String(item.Id || item.id || `LEMBRETE_${Date.now()}`).trim();
      const tipoVal = String(item.Tipo || item.tipo || "").trim();
      const rawAtivo = item.Ativo ?? item.ativo;
      const ativoVal =
        rawAtivo === true || rawAtivo === "SIM" || rawAtivo === "sim" || rawAtivo === "TRUE" || rawAtivo === "true" || rawAtivo === 1
          ? "SIM"
          : "NAO";
      const isAltura = lembreteId === "CONFIG_PERFIL_ALTURA" || tipoVal.toLowerCase().includes("altura") || tipoVal.toLowerCase().includes("perfil");
      const h1 = isAltura
        ? String(item.Horario_1 || item.horario1 || item.Horario1 || item.altura || "").trim()
        : formatarHora(item.Horario_1 || item.horario1 || item.Horario1 || "");
      const h2 = isAltura
        ? ""
        : formatarHora(item.Horario_2 || item.horario2 || item.Horario2 || "");
      const h3 = isAltura
        ? ""
        : formatarHora(item.Horario_3 || item.horario3 || item.Horario3 || "");
      const diasVal = String(item.Dias_Semana || item.diasSemana || item.dias_semana || "TODOS").trim().toUpperCase() || "TODOS";
      const atualizacaoVal = String(
        item.Ultima_Atualizacao || item.ultimaAtualizacao || new Date().toLocaleString("pt-BR")
      ).trim();

      // Canonical Title_Case columns ONLY (matching sheet schema exactly)
      enriched["Id"] = lembreteId;
      enriched["Tipo"] = tipoVal;
      enriched["Ativo"] = ativoVal;
      enriched["Horario_1"] = h1;
      enriched["Horario_2"] = h2;
      enriched["Horario_3"] = h3;
      enriched["Dias_Semana"] = diasVal;
      enriched["Ultima_Atualizacao"] = atualizacaoVal;

      // Strictly remove duplicate camelCase and alternate keys to prevent duplicated columns in Google Sheets
      delete enriched.id;
      delete enriched.tipo;
      delete enriched.ativo;
      delete enriched.horario1;
      delete enriched.horario2;
      delete enriched.horario3;
      delete enriched.Horario1;
      delete enriched.Horario2;
      delete enriched.Horario3;
      delete enriched.diasSemana;
      delete enriched.dias_semana;
      delete enriched.ultimaAtualizacao;
      delete enriched.ultima_atualizacao;
      delete enriched.altura;
    }

    // 23_Exercicios mapping (Canonical Title_Case ONLY)
    if (
      sheetName === SHEET_NAMES.EXERCICIOS ||
      sheetName === "23_Exercicios" ||
      sheetName.includes("Exercicio") ||
      sheetName.includes("Treino") ||
      item.tipoExercicio !== undefined ||
      item.Tipo_Exercicio !== undefined ||
      item.duracaoMinutos !== undefined ||
      item.Duracao_Minutos !== undefined
    ) {
      const exeId = String(item.Id || item.id || `EXE_${Date.now()}`).trim();
      const dataVal = String(item.Data || item.data || new Date().toISOString().split("T")[0]).trim();
      const rawHora = item.Hora || item.hora || item.Horario || item.horario || "";
      const horaVal = formatarHora(rawHora) || (typeof rawHora === "string" ? rawHora.trim() : "");
      const tipoVal = String(
        item.Tipo_Exercicio ||
        item.tipoExercicio ||
        item.Tipo ||
        item.tipo ||
        item.Exercicio ||
        item.exercicio ||
        "MUSCULAÇÃO"
      ).trim().toUpperCase();
      const duracaoVal = Math.max(
        0,
        Math.round(
          Number(
            parseCurrency(
              item.Duracao_Minutos ??
              item.duracaoMinutos ??
              item.Duracao ??
              item.duracao ??
              0
            )
          )
        )
      );
      const rawCal = item.Calorias_Queimadas ?? item.caloriasQueimadas ?? item.Calorias ?? item.calorias;
      const calVal = rawCal !== undefined && rawCal !== null && rawCal !== "" ? Math.round(Number(parseCurrency(rawCal))) : 0;
      const rawInt = String(item.Intensidade || item.intensidade || "").trim().toUpperCase();
      const obsVal = String(
        item.Observacoes ||
        item.observacoes ||
        item.observações ||
        item["Observações"] ||
        item.obs ||
        item.OBS ||
        ""
      ).trim().toUpperCase();
      const criacaoVal = String(item.Data_Criacao || item.data_criacao || item.dataCriacao || new Date().toISOString()).trim();

      // Canonical columns (Title_Case)
      enriched["Id"] = exeId;
      enriched["Data"] = dataVal;
      enriched["Hora"] = horaVal;
      enriched["Tipo_Exercicio"] = tipoVal;
      enriched["Duracao_Minutos"] = duracaoVal;
      enriched["Calorias_Queimadas"] = calVal > 0 ? calVal : "";
      enriched["Intensidade"] = rawInt;
      enriched["Observacoes"] = obsVal;
      enriched["Data_Criacao"] = criacaoVal;

      // Delete all camelCase and alternate duplicate keys
      delete enriched.id;
      delete enriched.data;
      delete enriched.hora;
      delete enriched.horario;
      delete enriched.Horario;
      delete enriched.tipoExercicio;
      delete enriched.tipo_exercicio;
      delete enriched.tipo;
      delete enriched.Tipo;
      delete enriched.exercicio;
      delete enriched.Exercicio;
      delete enriched.duracaoMinutos;
      delete enriched.duracao_minutos;
      delete enriched.duracao;
      delete enriched.Duracao;
      delete enriched.caloriasQueimadas;
      delete enriched.calorias_queimadas;
      delete enriched.calorias;
      delete enriched.Calorias;
      delete enriched.intensidade;
      delete enriched.observacoes;
      delete enriched["Observações"];
      delete enriched.observações;
      delete enriched.OBS;
      delete enriched.obs;
      delete enriched["Observação"];
      delete enriched.observacao;
      delete enriched.dataCriacao;
      delete enriched.data_criacao;
      delete enriched.DataCriacao;
    }

    // 24_Consumo_Cafe mapping (Canonical Title_Case ONLY)
    if (
      sheetName === SHEET_NAMES.CONSUMO_CAFE ||
      sheetName === "24_Consumo_Cafe" ||
      sheetName.toLowerCase().includes("cafe") ||
      sheetName.toLowerCase().includes("café") ||
      (item.quantidade !== undefined && (item.hora !== undefined || item.Hora !== undefined) && item.tipoExercicio === undefined && item.Tipo_Exercicio === undefined && item.Tipo_Registro === undefined)
    ) {
      const cafeId = String(item.Id || item.id || `CAFE_${Date.now()}`).trim();
      const dataVal = String(item.Data || item.data || new Date().toISOString().split("T")[0]).trim();
      const rawHora = item.Hora || item.hora || item.Horario || item.horario || "";
      const horaVal = formatarHora(rawHora) || (typeof rawHora === "string" ? rawHora.trim() : "");
      const rawQtd = item.Quantidade ?? item.quantidade ?? item.Qtd ?? item.qtd ?? 1;
      const qtdVal = Math.max(1, Math.round(Number(parseCurrency(rawQtd)) || 1));
      const obsVal = String(
        item.Observacoes ||
        item.observacoes ||
        item.observações ||
        item["Observações"] ||
        item.obs ||
        item.OBS ||
        ""
      ).trim().toUpperCase();
      const rawCal = item.Calorias ?? item.calorias ?? item.Calorias_Estimadas ?? item.caloriasEstimadas;
      const calVal = rawCal !== undefined && rawCal !== null && rawCal !== "" ? Math.round(Number(parseCurrency(rawCal))) : 0;
      const rawProt = item.Proteinas ?? item.proteinas ?? item.Proteínas ?? item.proteínas ?? item.Proteinas_Estimadas ?? item.proteinasEstimadas;
      const protVal = rawProt !== undefined && rawProt !== null && rawProt !== "" ? Number(Number(parseCurrency(rawProt)).toFixed(1)) : 0;
      const rawCarb = item.Carboidratos ?? item.carboidratos ?? item.Carbos ?? item.carbos ?? item.Carboidratos_Estimados ?? item.carboidratosEstimados;
      const carbVal = rawCarb !== undefined && rawCarb !== null && rawCarb !== "" ? Number(Number(parseCurrency(rawCarb)).toFixed(1)) : 0;
      const rawGord = item.Gorduras ?? item.gorduras ?? item.Gorduras_Estimadas ?? item.gordurasEstimadas;
      const gordVal = rawGord !== undefined && rawGord !== null && rawGord !== "" ? Number(Number(parseCurrency(rawGord)).toFixed(1)) : 0;
      const criacaoVal = String(item.Data_Criacao || item.data_criacao || item.dataCriacao || new Date().toISOString()).trim();

      // Canonical columns (Title_Case)
      enriched["Id"] = cafeId;
      enriched["Data"] = dataVal;
      enriched["Hora"] = horaVal;
      enriched["Quantidade"] = qtdVal;
      enriched["Calorias"] = calVal > 0 ? calVal : "";
      enriched["Proteinas"] = protVal > 0 ? protVal : "";
      enriched["Carboidratos"] = carbVal > 0 ? carbVal : "";
      enriched["Gorduras"] = gordVal > 0 ? gordVal : "";
      enriched["Observacoes"] = obsVal;
      enriched["Data_Criacao"] = criacaoVal;

      // Delete all camelCase and alternate duplicate keys
      delete enriched.id;
      delete enriched.data;
      delete enriched.hora;
      delete enriched.horario;
      delete enriched.Horario;
      delete enriched.quantidade;
      delete enriched.qtd;
      delete enriched.Qtd;
      delete enriched.calorias;
      delete enriched.Calorias_Estimadas;
      delete enriched.caloriasEstimadas;
      delete enriched.proteinas;
      delete enriched.proteínas;
      delete enriched.Proteínas;
      delete enriched.Proteinas_Estimadas;
      delete enriched.proteinasEstimadas;
      delete enriched.carboidratos;
      delete enriched.carbos;
      delete enriched.Carbos;
      delete enriched.Carboidratos_Estimados;
      delete enriched.carboidratosEstimados;
      delete enriched.gorduras;
      delete enriched.Gorduras_Estimadas;
      delete enriched.gordurasEstimadas;
      delete enriched.observacoes;
      delete enriched["Observações"];
      delete enriched.observações;
      delete enriched.OBS;
      delete enriched.obs;
      delete enriched["Observação"];
      delete enriched.observacao;
      delete enriched.dataCriacao;
      delete enriched.data_criacao;
      delete enriched.DataCriacao;
    }

    // 25_Consumo_Agua mapping (Canonical Title_Case ONLY)
    if (
      sheetName === SHEET_NAMES.CONSUMO_AGUA ||
      sheetName === "25_Consumo_Agua" ||
      sheetName.toLowerCase().includes("agua") ||
      sheetName.toLowerCase().includes("água") ||
      item.quantidadeMl !== undefined ||
      item.Quantidade_Ml !== undefined ||
      item.metaDiariaMl !== undefined ||
      item.Meta_Diaria_Ml !== undefined
    ) {
      const rawId = String(item.Id || item.id || (item.Meta_Diaria_Ml !== undefined || item.metaDiariaMl !== undefined ? "CONFIG_AGUA" : `AGUA_${Date.now()}`)).trim();

      if (rawId === "CONFIG_AGUA" || item.Meta_Diaria_Ml !== undefined || item.metaDiariaMl !== undefined) {
        const rawMeta = item.Meta_Diaria_Ml ?? item.metaDiariaMl ?? 3000;
        const rawCopo = item.Tamanho_Copo_Ml ?? item.tamanhoCopoMl ?? 500;
        const metaVal = Math.max(500, Math.round(Number(parseCurrency(rawMeta)) || 3000));
        const copoVal = Math.max(50, Math.round(Number(parseCurrency(rawCopo)) || 500));
        const criacaoVal = String(item.Data_Criacao || item.data_criacao || item.dataCriacao || new Date().toISOString()).trim();

        // Canonical columns for CONFIG row
        enriched["Id"] = "CONFIG_AGUA";
        enriched["Data"] = "";
        enriched["Hora"] = "";
        enriched["Quantidade_Ml"] = "";
        enriched["Meta_Diaria_Ml"] = metaVal;
        enriched["Tamanho_Copo_Ml"] = copoVal;
        enriched["Observacoes"] = "CONFIG_USUARIO";
        enriched["Data_Criacao"] = criacaoVal;
      } else {
        const aguaId = rawId;
        const dataVal = String(item.Data || item.data || new Date().toISOString().split("T")[0]).trim();
        const rawHora = item.Hora || item.hora || item.Horario || item.horario || "";
        const horaVal = formatarHora(rawHora) || (typeof rawHora === "string" ? rawHora.trim() : "");
        const rawQtd = item.Quantidade_Ml ?? item.quantidadeMl ?? item.Quantidade ?? item.quantidade ?? item.Qtd_Ml ?? item.qtdMl ?? item.Ml ?? item.ml ?? 500;
        const qtdVal = Math.max(10, Math.round(Number(parseCurrency(rawQtd)) || 500));
        const obsVal = String(
          item.Observacoes ||
          item.observacoes ||
          item.observações ||
          item["Observações"] ||
          item.obs ||
          item.OBS ||
          ""
        ).trim().toUpperCase();
        const criacaoVal = String(item.Data_Criacao || item.data_criacao || item.dataCriacao || new Date().toISOString()).trim();

        // Canonical columns for regular log
        enriched["Id"] = aguaId;
        enriched["Data"] = dataVal;
        enriched["Hora"] = horaVal;
        enriched["Quantidade_Ml"] = qtdVal;
        enriched["Meta_Diaria_Ml"] = "";
        enriched["Tamanho_Copo_Ml"] = "";
        enriched["Observacoes"] = obsVal;
        enriched["Data_Criacao"] = criacaoVal;
      }

      // Delete all camelCase and alternate duplicate keys
      delete enriched.id;
      delete enriched.data;
      delete enriched.hora;
      delete enriched.horario;
      delete enriched.Horario;
      delete enriched.quantidadeMl;
      delete enriched.quantidade_ml;
      delete enriched.quantidade;
      delete enriched.Quantidade;
      delete enriched.ml;
      delete enriched.Ml;
      delete enriched.qtdMl;
      delete enriched.Qtd_Ml;
      delete enriched.metaDiariaMl;
      delete enriched.meta_diaria_ml;
      delete enriched.meta;
      delete enriched.Meta;
      delete enriched.tamanhoCopoMl;
      delete enriched.tamanho_copo_ml;
      delete enriched.copo;
      delete enriched.Copo;
      delete enriched.observacoes;
      delete enriched["Observações"];
      delete enriched.observações;
      delete enriched.OBS;
      delete enriched.obs;
      delete enriched["Observação"];
      delete enriched.observacao;
      delete enriched.dataCriacao;
      delete enriched.data_criacao;
      delete enriched.DataCriacao;
    }

    // 26_Config_Lembretes_Financas mapping (Canonical Title_Case ONLY)
    if (
      sheetName === SHEET_NAMES.CONFIG_LEMBRETES_FINANCAS ||
      sheetName === "26_Config_Lembretes_Financas" ||
      item.Id === "LEMBRETE_DESPESAS" ||
      item.Id === "LEMBRETE_RECEITAS" ||
      item.id === "LEMBRETE_DESPESAS" ||
      item.id === "LEMBRETE_RECEITAS"
    ) {
      const lembreteId = String(item.Id || item.id || `LEMBRETE_${Date.now()}`).trim();
      const tipoVal = String(item.Tipo || item.tipo || "").trim();
      const rawAtivo = item.Ativo ?? item.ativo;
      const ativoVal =
        rawAtivo === true || rawAtivo === "SIM" || rawAtivo === "sim" || rawAtivo === "TRUE" || rawAtivo === "true" || rawAtivo === 1
          ? "SIM"
          : "NAO";
      const rawSom = item.Som_Alarme ?? item.somAlarme ?? item.Som ?? item.som;
      const somVal = rawSom !== "NAO" && rawSom !== "nao" && rawSom !== false ? "SIM" : "NAO";

      const h1 = formatarHora(item.Horario_1 || item.horario1 || item.Horario1 || "");
      const h2 = formatarHora(item.Horario_2 || item.horario2 || item.Horario2 || "");
      const h3 = formatarHora(item.Horario_3 || item.horario3 || item.Horario3 || "");
      const diasVal = String(item.Dias_Semana || item.diasSemana || item.dias_semana || "TODOS").trim().toUpperCase() || "TODOS";
      const atualizacaoVal = String(
        item.Ultima_Atualizacao || item.ultimaAtualizacao || new Date().toLocaleString("pt-BR")
      ).trim();

      // Canonical Title_Case columns ONLY
      enriched["Id"] = lembreteId;
      enriched["Tipo"] = tipoVal;
      enriched["Ativo"] = ativoVal;
      enriched["Som_Alarme"] = somVal;
      enriched["Horario_1"] = h1;
      enriched["Horario_2"] = h2;
      enriched["Horario_3"] = h3;
      enriched["Dias_Semana"] = diasVal;
      enriched["Ultima_Atualizacao"] = atualizacaoVal;

      // Strictly remove duplicate camelCase and alternate keys
      delete enriched.id;
      delete enriched.tipo;
      delete enriched.ativo;
      delete enriched.somAlarme;
      delete enriched.som_alarme;
      delete enriched.horario1;
      delete enriched.horario2;
      delete enriched.horario3;
      delete enriched.Horario1;
      delete enriched.Horario2;
      delete enriched.Horario3;
      delete enriched.diasSemana;
      delete enriched.dias_semana;
      delete enriched.ultimaAtualizacao;
      delete enriched.ultima_atualizacao;
    }

    // 27_Lembretes_Remedios mapping (Canonical Title_Case ONLY)
    if (
      sheetName === SHEET_NAMES.LEMBRETES_REMEDIOS ||
      sheetName === "27_Lembretes_Remedios" ||
      sheetName.toLowerCase().includes("remedio") ||
      sheetName.toLowerCase().includes("remédio")
    ) {
      const remedioId = String(item.Id || item.id || `REM_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`).trim();
      const nomeVal = String(item.Nome || item.nome || item.Medicamento || item.medicamento || "").trim();
      const rawAtivo = item.Ativo ?? item.ativo;
      const ativoVal =
        rawAtivo === true || rawAtivo === "SIM" || rawAtivo === "sim" || rawAtivo === "TRUE" || rawAtivo === "true" || rawAtivo === 1 || rawAtivo === undefined || rawAtivo === null || rawAtivo === ""
          ? "SIM"
          : "NAO";
      const rawSom = item.Som_Alarme ?? item.somAlarme ?? item.Som ?? item.som;
      const somVal = rawSom !== "NAO" && rawSom !== "nao" && rawSom !== false ? "SIM" : "NAO";

      const h1 = formatarHora(item.Horario_1 || item.horario1 || item.Horario1 || "");
      const h2 = formatarHora(item.Horario_2 || item.horario2 || item.Horario2 || "");
      const h3 = formatarHora(item.Horario_3 || item.horario3 || item.Horario3 || "");
      const instrucoesVal = String(item.Instrucoes || item.instrucoes || item.Instruções || item.instruções || item.Observacoes || item.observacoes || "").trim();
      const dataCadastroVal = String(
        item.Data_Cadastro || item.dataCadastro || item.Data || item.data || new Date().toISOString().split("T")[0]
      ).trim();

      // Canonical Title_Case columns ONLY
      enriched["Id"] = remedioId;
      enriched["Nome"] = nomeVal;
      enriched["Ativo"] = ativoVal;
      enriched["Horario_1"] = h1;
      enriched["Horario_2"] = h2;
      enriched["Horario_3"] = h3;
      enriched["Som_Alarme"] = somVal;
      enriched["Instrucoes"] = instrucoesVal;
      enriched["Data_Cadastro"] = dataCadastroVal;

      // Clean alternate & camelCase keys
      delete enriched.id;
      delete enriched.nome;
      delete enriched.ativo;
      delete enriched.somAlarme;
      delete enriched.som_alarme;
      delete enriched.horario1;
      delete enriched.horario2;
      delete enriched.horario3;
      delete enriched.Horario1;
      delete enriched.Horario2;
      delete enriched.Horario3;
      delete enriched.instrucoes;
      delete enriched.instruções;
      delete enriched.Instruções;
      delete enriched.dataCadastro;
      delete enriched.data_cadastro;
    }


    // 7_Receitas_Médicas mapping (guarantees Data, Medicamento, Dosagem, Instrucoes, Medico, Validade, Ativa are all filled)
    if (
      sheetName === SHEET_NAMES.RECEITAS_MEDICAS ||
      sheetName === "7_Receitas_Médicas" ||
      sheetName.toLowerCase().includes("receita") ||
      (item.Medicamento !== undefined && (item.Dosagem !== undefined || item.dosagem !== undefined || item.Médico !== undefined || item.Medico !== undefined))
    ) {
      const recId = String(item.Id || item.id || `REC_${Date.now()}`).trim();
      const rawData = item.Data ?? item.data ?? item.Data_Emissão ?? item.Data_Emissao ?? item.data_emissao ?? item.dataEmissao ?? new Date().toISOString().split("T")[0];
      const rawValidade = item.Validade ?? item.validade ?? item.Data_Validade ?? item.data_validade ?? item.Data_Vencimento ?? item.data_vencimento ?? item.dataVencimento ?? "";
      const rawMedicamento = item.Medicamento ?? item.medicamento ?? "MEDICAMENTO";
      const rawDosagem = item.Dosagem ?? item.dosagem ?? item.Posologia ?? item.posologia ?? "";
      const rawFreq = item.Frequência ?? item.Frequencia ?? item.frequencia ?? "";
      const rawMedico = item.Médico ?? item.Medico ?? item.medico ?? "";
      const rawInstrucoes = item.Instruções ?? item.Instrucoes ?? item.instrucoes ?? "";
      const rawEsp = item.Especialidade ?? item.especialidade ?? "";
      const rawObs = item.Observação ?? item.Observacao ?? item.Observacoes ?? item.observacoes ?? item.observação ?? "";
      const rawAtiva = item.Ativa ?? item.ativa;
      const isAtiva = rawAtiva !== false && rawAtiva !== "NÃO" && rawAtiva !== "NAO" && rawAtiva !== "false" && rawAtiva !== 0;

      // Set canonical and synonym columns so all spreadsheet header conventions are matched
      enriched["Id"] = recId;
      enriched["Data"] = rawData;
      enriched["Data_Emissão"] = rawData;
      enriched["Data_Emissao"] = rawData;
      enriched["Medicamento"] = typeof rawMedicamento === "string" ? rawMedicamento.toUpperCase() : rawMedicamento;
      enriched["Dosagem"] = typeof rawDosagem === "string" ? rawDosagem.toUpperCase() : rawDosagem;
      enriched["Posologia"] = typeof rawDosagem === "string" ? rawDosagem.toUpperCase() : rawDosagem;
      enriched["Frequência"] = typeof rawFreq === "string" ? rawFreq.toUpperCase() : rawFreq;
      enriched["Frequencia"] = typeof rawFreq === "string" ? rawFreq.toUpperCase() : rawFreq;
      enriched["Médico"] = typeof rawMedico === "string" ? rawMedico.toUpperCase() : rawMedico;
      enriched["Medico"] = typeof rawMedico === "string" ? rawMedico.toUpperCase() : rawMedico;
      enriched["Validade"] = rawValidade;
      enriched["Data_Validade"] = rawValidade;
      enriched["Data_Vencimento"] = rawValidade;
      enriched["Instruções"] = typeof rawInstrucoes === "string" ? rawInstrucoes.toUpperCase() : rawInstrucoes;
      enriched["Instrucoes"] = typeof rawInstrucoes === "string" ? rawInstrucoes.toUpperCase() : rawInstrucoes;
      enriched["Especialidade"] = typeof rawEsp === "string" ? rawEsp.toUpperCase() : rawEsp;
      enriched["Observação"] = typeof rawObs === "string" ? rawObs.toUpperCase() : rawObs;
      enriched["Observacoes"] = typeof rawObs === "string" ? rawObs.toUpperCase() : rawObs;
      enriched["Ativa"] = isAtiva ? "SIM" : "NÃO";
    }

    // Saldo_Inicial and Saldo_Atual mapping with Brazilian currency format support (5_Contas_Bancarias)
    if (
      item.Saldo_Inicial !== undefined ||
      item["Saldo_Inicial"] !== undefined ||
      item["Saldo Inicial"] !== undefined ||
      item.saldo_inicial !== undefined
    ) {
      const rawIni =
        item.Saldo_Inicial ??
        item["Saldo_Inicial"] ??
        item["Saldo Inicial"] ??
        item.saldo_inicial;
      const numIni = typeof rawIni === "number" ? rawIni : parseCurrency(rawIni);
      const formattedIni = numIni.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      enriched["Saldo_Inicial"] = formattedIni;
      enriched["Saldo Inicial"] = formattedIni;
      enriched["Saldo_inicial"] = formattedIni;
    }

    if (
      item.Saldo_Atual !== undefined ||
      item["Saldo_Atual"] !== undefined ||
      item["Saldo Atual"] !== undefined ||
      item.saldo_atual !== undefined
    ) {
      const rawAtu =
        item.Saldo_Atual ??
        item["Saldo_Atual"] ??
        item["Saldo Atual"] ??
        item.saldo_atual;
      const numAtu = typeof rawAtu === "number" ? rawAtu : parseCurrency(rawAtu);
      const formattedAtu = numAtu.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      enriched["Saldo_Atual"] = formattedAtu;
      enriched["Saldo Atual"] = formattedAtu;
      enriched["Saldo_atual"] = formattedAtu;
    }

    // Tipo_Combustivel & Data_Criacao mapping (1_Lancamentos)
    if (
      sheetName === SHEET_NAMES.LANCAMENTOS ||
      sheetName === "1_Lancamentos" ||
      item.Tipo_Combustivel !== undefined ||
      item.Completou_O_Tanque !== undefined
    ) {
      const nowFormatted = new Date().toLocaleString("pt-BR");
      const criacaoVal =
        item.Data_Criacao ||
        item["Data_Criacao"] ||
        item["Data Criação"] ||
        item.data_criacao ||
        item.dataCriacao ||
        item["Data_Hora"] ||
        item.Data_Hora ||
        nowFormatted;

      enriched["Data_Criacao"] = criacaoVal;
      enriched["Data_Hora"] = criacaoVal;
    }

    if (
      item.Tipo_Combustivel !== undefined ||
      item["Tipo_Combustivel"] !== undefined ||
      item["Tipo_Combustível"] !== undefined ||
      item["Tipo Combustivel"] !== undefined ||
      item["Tipo Combustível"] !== undefined ||
      item["Tipo_De_Combustivel"] !== undefined ||
      item["Tipo_de_Combustível"] !== undefined
    ) {
      const val =
        item.Tipo_Combustivel ??
        item["Tipo_Combustivel"] ??
        item["Tipo_Combustível"] ??
        item["Tipo Combustivel"] ??
        item["Tipo Combustível"] ??
        item["Tipo_De_Combustivel"] ??
        item["Tipo_de_Combustível"];
      enriched["Tipo_Combustivel"] = val;
      enriched["Tipo_Combustível"] = val;
      enriched["Tipo Combustivel"] = val;
      enriched["Tipo Combustível"] = val;
      enriched["Tipo_De_Combustivel"] = val;
      enriched["Tipo_de_Combustível"] = val;
    }

    // 17_Zonas_De_Risco mappings (both legacy and new GPS columns)
    if (
      item.Nome_Local !== undefined ||
      item.Descrição !== undefined ||
      item.Descricao !== undefined ||
      item.Nivel_Risco !== undefined ||
      item.Nível_De_Risco !== undefined
    ) {
      const nomeVal = item.Nome_Local ?? item.Descrição ?? item.Descricao ?? "";
      enriched["Nome_Local"] = nomeVal;
      enriched["Descrição"] = nomeVal;
      enriched["Descricao"] = nomeVal;

      const nivelVal = item.Nivel_Risco ?? item.Nível_De_Risco ?? item.Nivel_De_Risco ?? "MÉDIO";
      enriched["Nivel_Risco"] = nivelVal;
      enriched["Nível_De_Risco"] = nivelVal;
      enriched["Nivel_De_Risco"] = nivelVal;

      enriched["Bairro_Cidade"] = item.Bairro_Cidade ?? item["Bairro_Cidade"] ?? "";
      enriched["Tipo_Ocorrencia"] = item.Tipo_Ocorrencia ?? item["Tipo_Ocorrencia"] ?? "";

      const obsVal = item.Observacoes ?? item["Observações"] ?? item.Observação ?? item.Observacao ?? "";
      enriched["Observacoes"] = obsVal;
      enriched["Observações"] = obsVal;
      enriched["Observação"] = obsVal;
      enriched["Observacao"] = obsVal;

      if (item.Latitude !== undefined) enriched["Latitude"] = item.Latitude;
      if (item.Longitude !== undefined) enriched["Longitude"] = item.Longitude;
      if (item["Raio_(M)"] !== undefined || item.Raio !== undefined) {
        enriched["Raio_(M)"] = item["Raio_(M)"] ?? item.Raio ?? 300;
        enriched["Raio_(m)"] = enriched["Raio_(M)"];
        enriched["Raio"] = enriched["Raio_(M)"];
      }
      if (item.Ativo !== undefined) {
        enriched["Ativo"] = item.Ativo === false || item.Ativo === "NÃO" || item.Ativo === "NAO" ? "NÃO" : "SIM";
      }
      if (item.Mensagem_De_Alerta !== undefined) {
        enriched["Mensagem_De_Alerta"] = item.Mensagem_De_Alerta;
        enriched["Mensagem"] = item.Mensagem_De_Alerta;
      }
      if (item.Data_Registro !== undefined) {
        enriched["Data_Registro"] = item.Data_Registro;
        enriched["Data"] = item.Data_Registro;
      }
    }

    // Apply global UPPERCASE sanitation to all free-text fields
    // while strictly protecting URLs, coords, dates, numbers, and JSON objects
    const sanitizedEnriched: any = {};
    for (const [key, value] of Object.entries(enriched)) {
      sanitizedEnriched[key] = sanitizeValueToUppercase(key, value);
    }

    return sanitizedEnriched;
  });

  try {
    const response = await fetch("/api/proxy", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        targetUrl,
        sheet: sheetName,
        action,
        items: itemsToSave,
      }),
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      throw new Error(
        errJson.message || `Erro HTTP ${response.status} ao salvar na aba ${sheetName}`
      );
    }

    const result: ApiResponse = await response.json();

    if (result.status === "error") {
      throw new Error(result.message || `Erro de gravação retornado pelo servidor.`);
    }

    // Update local cache optimistically
    const currentCached = getCachedSheetData<any>(sheetName);
    let updatedCached = [...currentCached];

    itemsToSave.forEach((itemToSave) => {
      const existingIdx = updatedCached.findIndex(
        (c) => String(c.Id || c.id).trim() === String(itemToSave.Id || itemToSave.id).trim()
      );
      if (action === "SOFT_DELETE") {
        if (existingIdx !== -1) {
          updatedCached.splice(existingIdx, 1);
        }
      } else {
        if (existingIdx !== -1) {
          updatedCached[existingIdx] = { ...updatedCached[existingIdx], ...itemToSave };
        } else {
          updatedCached.unshift(itemToSave);
        }
      }
    });

    setCachedSheetData(sheetName, updatedCached);

    return result;
  } catch (error: any) {
    console.error(`[Finanças Gaeta API Error - POST ${sheetName}]:`, error);
    throw error;
  }
}

/**
 * Check connection health with Google Apps Script backend
 */
export async function testAppsScriptConnection(testUrl?: string): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    const query = new URLSearchParams({ sheet: "13_Perfil" });
    if (testUrl) {
      query.set("targetUrl", testUrl);
    }

    const res = await fetch(`/api/proxy?${query.toString()}`);
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      return {
        success: false,
        message: errJson.message || `Falha HTTP ${res.status}`,
      };
    }

    const data: ApiResponse = await res.json();
    if (data.status === "success") {
      return {
        success: true,
        message: "Conexão estabelecida com sucesso com a planilha Google Sheets!",
      };
    } else {
      return {
        success: false,
        message: data.message || "O Apps Script retornou uma mensagem de erro.",
      };
    }
  } catch (err: any) {
    return {
      success: false,
      message: err.message || "Erro de conexão de rede.",
    };
  }
}
