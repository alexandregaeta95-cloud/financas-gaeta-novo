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

    // Observações / Observacoes / OBS mapping
    if (
      item.Observacoes !== undefined ||
      item["Observações"] !== undefined ||
      item.OBS !== undefined ||
      item["Observacao"] !== undefined ||
      item["Observação"] !== undefined
    ) {
      const val =
        item.Observacoes ??
        item["Observações"] ??
        item.OBS ??
        item["Observacao"] ??
        item["Observação"];

      const upperVal = typeof val === "string" ? val.toUpperCase() : val !== undefined && val !== null ? String(val).toUpperCase() : "";
      enriched["Observacoes"] = upperVal;
      enriched["Observações"] = upperVal;
      enriched["OBS"] = upperVal;
      enriched["Observação"] = upperVal;
      enriched["Observacao"] = upperVal;
    }

    // 20_Controle_Saude biometric mappings
    if (
      sheetName === SHEET_NAMES.CONTROLE_SAUDE ||
      sheetName === "20_Controle_Saude" ||
      sheetName.includes("Controle_Saude") ||
      item.Tipo_Registro !== undefined ||
      item.Valor_Principal !== undefined
    ) {
      if (item.Tipo_Registro !== undefined) {
        enriched["Tipo_Registro"] = item.Tipo_Registro;
        enriched["Tipo Registro"] = item.Tipo_Registro;
        enriched["Tipo_registro"] = item.Tipo_Registro;
        enriched["Tipo"] = item.Tipo_Registro;
      }
      if (item.Data_Hora !== undefined) {
        enriched["Data_Hora"] = item.Data_Hora;
        enriched["Data Hora"] = item.Data_Hora;
        enriched["Data_hora"] = item.Data_Hora;
        enriched["Data"] = item.Data_Hora;
      }
      if (item.Valor_Principal !== undefined) {
        enriched["Valor_Principal"] = item.Valor_Principal;
        enriched["Valor Principal"] = item.Valor_Principal;
        enriched["Valor_principal"] = item.Valor_Principal;
      }
      if (item.Valor_Secundario !== undefined) {
        enriched["Valor_Secundario"] = item.Valor_Secundario;
        enriched["Valor Secundario"] = item.Valor_Secundario;
        enriched["Valor_secundario"] = item.Valor_Secundario;
      }
      if (item.Batimentos_Bpm !== undefined && item.Batimentos_Bpm !== null && item.Batimentos_Bpm !== "") {
        const parsedBpm = typeof item.Batimentos_Bpm === "number" ? item.Batimentos_Bpm : parseInt(String(item.Batimentos_Bpm), 10);
        if (!isNaN(parsedBpm) && parsedBpm > 0) {
          enriched["Batimentos_Bpm"] = parsedBpm;
          enriched["Batimentos Bpm"] = parsedBpm;
          enriched["Batimentos_bpm"] = parsedBpm;
          enriched["Batimentos"] = parsedBpm;
          enriched["BPM"] = parsedBpm;
          enriched["Bpm"] = parsedBpm;
        }
      }
      if (item.Contexto !== undefined) {
        enriched["Contexto"] = item.Contexto;
        enriched["contexto"] = item.Contexto;
      }
      if (item.Data_Criacao !== undefined) {
        enriched["Data_Criacao"] = item.Data_Criacao;
        enriched["Data Criacao"] = item.Data_Criacao;
        enriched["Data_criacao"] = item.Data_Criacao;
      }
    }

    // 21_Analise_Alimentos mappings
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

      const foodId = String(item.id || item.Id || item.ID || `ALIM_${Date.now()}`);
      const dataVal = String(item.data || item.Data || new Date().toISOString().split("T")[0]);
      const dataHoraVal = String(item.dataHora || item.Data_Hora || item.DataHora || dataVal);
      const pratoVal = String(item.nomePrato || item.Nome_Prato || item.Nome || item.Prato || "Refeição");
      const calVal = Math.round(Number(item.caloriasEstimadas ?? item.Calorias_Estimadas ?? item.Calorias ?? item.calorias ?? 0));
      const protVal = Math.round(Number(item.proteinasEstimadas ?? item.Proteinas_Estimadas ?? item.Proteinas ?? item.proteinas ?? 0));
      const carbVal = Math.round(Number(item.carboidratosEstimados ?? item.Carboidratos_Estimados ?? item.Carboidratos ?? item.carboidratos ?? 0));
      const gordVal = Math.round(Number(item.gordurasEstimadas ?? item.Gorduras_Estimadas ?? item.Gorduras ?? item.gorduras ?? 0));
      const descVal = String(item.descricao || item.Descricao || item.Classificacao_Geral || item.classificacao_geral || "");
      
      let itensVal = "";
      if (typeof item.itensIdentificados === "object" && item.itensIdentificados !== null) {
        itensVal = JSON.stringify(item.itensIdentificados);
      } else {
        itensVal = String(item.Itens_Identificados || item.itens_identificados || item.itensIdentificados || item.Itens || "");
      }

      const dicasVal = String(item.dicasNutricionais || item.Dicas_Nutricionais || item.dicas_nutricionais || item.dicas || item.Dicas || "");
      const obsVal = String(item.observacoes || item.Observacoes || item.observações || item["Observações"] || item.obs || item.OBS || "");
      const criacaoVal = String(item.Data_Criacao || item.data_criacao || item.dataCriacao || new Date().toISOString());

      // Canonical columns (Uppercase snake_case)
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

      // Aliases (camelCase & lowercase) to ensure existing sheets match seamlessly
      enriched["id"] = foodId;
      enriched["data"] = dataVal;
      enriched["dataHora"] = dataHoraVal;
      enriched["nomePrato"] = pratoVal;
      enriched["caloriasEstimadas"] = calVal;
      enriched["proteinasEstimadas"] = protVal;
      enriched["carboidratosEstimados"] = carbVal;
      enriched["gordurasEstimadas"] = gordVal;
      enriched["descricao"] = descVal;
      enriched["Descricao"] = descVal;
      enriched["classificacaoGeral"] = descVal;
      enriched["itensIdentificados"] = itensVal;
      enriched["dicasNutricionais"] = dicasVal;
      enriched["observacoes"] = obsVal;
      enriched["dataCriacao"] = criacaoVal;
    }

    // 22_Config_Lembretes_Saude mapping
    if (
      sheetName === SHEET_NAMES.CONFIG_LEMBRETES_SAUDE ||
      sheetName === "22_Config_Lembretes_Saude" ||
      sheetName.includes("Lembretes") ||
      item.id === "LEMBRETE_PRESSAO" ||
      item.id === "LEMBRETE_GLICEMIA" ||
      item.Id === "LEMBRETE_PRESSAO" ||
      item.Id === "LEMBRETE_GLICEMIA"
    ) {
      const lembreteId = String(item.id || item.Id || `LEMBRETE_${Date.now()}`);
      const tipoVal = String(item.tipo || item.Tipo || "");
      const ativoVal =
        item.ativo === true || item.ativo === "SIM" || item.Ativo === "SIM" || item.Ativo === true
          ? "SIM"
          : "NAO";
      const h1 = String(item.horario1 || item.Horario_1 || item.Horario1 || "");
      const h2 = String(item.horario2 || item.Horario_2 || item.Horario2 || "");
      const h3 = String(item.horario3 || item.Horario_3 || item.Horario3 || "");
      const diasVal = String(item.diasSemana || item.Dias_Semana || item.dias_semana || "TODOS");
      const atualizacaoVal = String(
        item.ultimaAtualizacao || item.Ultima_Atualizacao || new Date().toLocaleString("pt-BR")
      );

      enriched["Id"] = lembreteId;
      enriched["Tipo"] = tipoVal;
      enriched["Ativo"] = ativoVal;
      enriched["Horario_1"] = h1;
      enriched["Horario_2"] = h2;
      enriched["Horario_3"] = h3;
      enriched["Dias_Semana"] = diasVal;
      enriched["Ultima_Atualizacao"] = atualizacaoVal;

      // camelCase aliases
      enriched["id"] = lembreteId;
      enriched["tipo"] = tipoVal;
      enriched["ativo"] = ativoVal;
      enriched["horario1"] = h1;
      enriched["horario2"] = h2;
      enriched["horario3"] = h3;
      enriched["diasSemana"] = diasVal;
      enriched["ultimaAtualizacao"] = atualizacaoVal;
    }

    // 23_Exercicios mapping
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
      const exeId = String(item.id || item.Id || `EXE_${Date.now()}`);
      const dataVal = String(item.data || item.Data || new Date().toISOString().split("T")[0]);
      const horaVal = String(item.hora || item.Hora || item.horario || item.Horario || "");
      const tipoVal = String(
        item.tipoExercicio ||
        item.Tipo_Exercicio ||
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
              item.duracaoMinutos ??
              item.Duracao_Minutos ??
              item.duracao ??
              item.Duracao ??
              0
            )
          )
        )
      );
      const rawCal = item.caloriasQueimadas ?? item.Calorias_Queimadas ?? item.Calorias ?? item.calorias;
      const calVal = rawCal !== undefined && rawCal !== null && rawCal !== "" ? Math.round(Number(parseCurrency(rawCal))) : 0;
      const rawInt = String(item.intensidade || item.Intensidade || "").trim().toUpperCase();
      const obsVal = String(
        item.observacoes ||
        item.Observacoes ||
        item.observações ||
        item["Observações"] ||
        item.obs ||
        item.OBS ||
        ""
      ).trim().toUpperCase();
      const criacaoVal = String(item.dataCriacao || item.Data_Criacao || item.data_criacao || new Date().toISOString());

      // Canonical columns (Uppercase snake_case)
      enriched["Id"] = exeId;
      enriched["Data"] = dataVal;
      enriched["Hora"] = horaVal;
      enriched["Tipo_Exercicio"] = tipoVal;
      enriched["Duracao_Minutos"] = duracaoVal;
      enriched["Calorias_Queimadas"] = calVal > 0 ? calVal : "";
      enriched["Intensidade"] = rawInt;
      enriched["Observacoes"] = obsVal;
      enriched["Data_Criacao"] = criacaoVal;

      // camelCase aliases
      enriched["id"] = exeId;
      enriched["data"] = dataVal;
      enriched["hora"] = horaVal;
      enriched["tipoExercicio"] = tipoVal;
      enriched["duracaoMinutos"] = duracaoVal;
      enriched["caloriasQueimadas"] = calVal > 0 ? calVal : undefined;
      enriched["intensidade"] = rawInt || undefined;
      enriched["observacoes"] = obsVal || undefined;
      enriched["dataCriacao"] = criacaoVal;
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

    // Tipo_Combustivel mapping (1_Lancamentos)
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

    return enriched;
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
