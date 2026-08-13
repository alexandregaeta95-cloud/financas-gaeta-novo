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
  if (item.Id && String(item.Id).trim() !== "") {
    return String(item.Id);
  }
  const str = `${sheetName}_${index}_${item.Data || ""}_${item.Descricao || item.Nome || item.Item || ""}_${item.Valor || item.Modelo || ""}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return `DET_${Math.abs(hash)}`;
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

    const records = result.data || [];

    // Ensure all records have an Id and are normalized
    const recordsWithIds = records.map((item, idx) => {
      const withId = {
        ...item,
        Id: generateDeterministicId(sheetName, idx, item),
      };
      return normalizeRecordBySheet(sheetName, withId);
    });

    // Update local cache only on success
    setCachedSheetData(sheetName, recordsWithIds);

    return recordsWithIds;
  } catch (error: any) {
    console.error(`[Finanças Gaeta API Error - GET ${sheetName}]:`, error);
    // RULE 2: Keep loaded local cache and throw recognizable exception!
    const cached = getCachedSheetData<T>(sheetName);
    if (cached && cached.length > 0) {
      console.warn(`[Fallback Cache Used] Returning ${cached.length} cached records for ${sheetName}`);
      // Throw exception so UI knows sync failed, but don't wipe data
      throw new Error(
        `Falha na sincronização online para "${sheetName}". Dados locais mantidos. (${error.message || error})`
      );
    }
    throw error;
  }
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

  // Ensure all items have a valid ID
  const itemsToSave = items.map((item: any) => ({
    ...item,
    Id: item.Id || generateNewId(),
  }));

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
      const existingIdx = updatedCached.findIndex((c) => c.Id === itemToSave.Id);
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
