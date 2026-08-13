/**
 * Finanças Gaeta — Formatting and Normalization Utilities
 * Robust handling of Google Sheets data formats, currency strings,
 * date-time anomalies (1899 epoch), and property name variations.
 */

import { Lancamento, ConsultaMedica, CompromissoAgenda, Abastecimento, Veiculo, Infracao, ItemMercado, ZonaDeRisco } from "../types";

/**
 * Parse any currency or numeric value safely (e.g. "R$ 73,26", "1.250,50", 73.26, null)
 */
export function parseCurrency(val: any): number {
  if (val === null || val === undefined || val === "") {
    return 0;
  }
  if (typeof val === "number") {
    return isNaN(val) ? 0 : val;
  }

  let str = String(val).trim();
  if (!str) return 0;

  // Remove currency symbol, spaces, and non-breaking spaces
  str = str.replace(/R\$/gi, "").replace(/\s+/g, "").replace(/\u00a0/g, "");

  // Handle Brazilian vs US decimal formats:
  // e.g. "1.234,56" -> "1234.56"
  // e.g. "1,234.56" -> "1234.56"
  // e.g. "73,26" -> "73.26"
  const hasComma = str.includes(",");
  const hasDot = str.includes(".");

  if (hasComma && hasDot) {
    if (str.lastIndexOf(",") > str.lastIndexOf(".")) {
      // Brazilian format: 1.234,56
      str = str.replace(/\./g, "").replace(",", ".");
    } else {
      // US format: 1,234.56
      str = str.replace(/,/g, "");
    }
  } else if (hasComma) {
    // Only comma: 73,26
    str = str.replace(",", ".");
  }

  // Remove any remaining unexpected characters except numbers, decimal dot, minus/plus
  str = str.replace(/[^0-9.-]/g, "");

  const parsed = parseFloat(str);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Format currency number to Brazilian Real string (e.g. "73,26" or "1.250,00")
 */
export function formatCurrency(val: any): string {
  const num = parseCurrency(val);
  return num.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Format currency with R$ prefix (e.g. "R$ 73,26")
 */
export function formatCurrencyWithSymbol(val: any): string {
  return `R$ ${formatCurrency(val)}`;
}

/**
 * Format Time string safely.
 * Solves Google Sheets 1899-12-30 epoch issue for time-only fields:
 * - If ISO string like "1899-12-30T14:30:00.000Z" -> "14:30"
 * - If "14:30:00" -> "14:30"
 * - If already "14:30" -> "14:30"
 * - If empty/null -> ""
 */
export function formatarHora(val: any): string {
  if (val === null || val === undefined || val === "") {
    return "";
  }

  const str = String(val).trim();
  if (!str) return "";

  // If contains ISO date (e.g. 1899-12-30T14:30:00.000Z)
  if (str.includes("T")) {
    const timeMatch = str.match(/T(\d{1,2}:\d{2})/i);
    if (timeMatch) {
      const parts = timeMatch[1].split(":");
      return `${parts[0].padStart(2, "0")}:${parts[1]}`;
    }
  }

  // If contains time formatted with colons (e.g. "14:30:00", "09:15", "9:15")
  const colonMatch = str.match(/(\d{1,2}):(\d{2})(?::\d{2})?/);
  if (colonMatch) {
    const hours = colonMatch[1].padStart(2, "0");
    const minutes = colonMatch[2];
    return `${hours}:${minutes}`;
  }

  // If it's a date string with year < 1900
  try {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      const hours = String(d.getUTCHours()).padStart(2, "0");
      const minutes = String(d.getUTCMinutes()).padStart(2, "0");
      return `${hours}:${minutes}`;
    }
  } catch {
    // Ignore error and return fallback
  }

  return str;
}

/**
 * Alias for formatarHora
 */
export const formatTime = formatarHora;

/**
 * Format Date string safely to "dd/mm/aaaa" or "yyyy-MM-dd"
 */
export function formatDateBR(val: any): string {
  if (!val) return "";
  const str = String(val).trim();
  if (str.includes("T")) {
    return str.split("T")[0];
  }
  return str;
}

/**
 * Normalize Lancamento record so all components have access to standard property names
 * regardless of whether Google Sheets returned "Descrição", "Descricao", "Nome_Posto", etc.
 */
export function normalizeLancamento(raw: any): Lancamento {
  if (!raw || typeof raw !== "object") {
    return raw;
  }

  const desc =
    raw.Descricao ??
    raw["Descrição"] ??
    raw.descricao ??
    raw["descrição"] ??
    raw.Descricao_Do_Veiculo ??
    raw["Descrição_Do_Veículo"] ??
    raw.Item ??
    raw.item ??
    "";

  const valor = parseCurrency(
    raw.Valor ?? raw.valor ?? raw.Valor_Total ?? raw["Valor_Total"] ?? 0
  );

  const valorPago = parseCurrency(
    raw.Valor_Pago ?? raw["Valor_Pago"] ?? raw.valor_pago ?? raw.valorPago ?? 0
  );

  const tipo = (
    raw.Tipo ?? raw.tipo ?? (raw.Categoria === "ABASTECIMENTO" ? "Abastecimento" : "Despesa")
  ) as any;

  const categoria = (
    raw.Categoria ?? raw.categoria ?? (tipo === "Abastecimento" ? "ABASTECIMENTO" : "Outros")
  ) as string;

  const data = formatDateBR(raw.Data ?? raw.data ?? new Date().toISOString().split("T")[0]);

  const conta =
    raw.Conta ??
    raw.conta ??
    raw.Banco_Id ??
    raw["Banco_Id"] ??
    raw.Banco ??
    raw.banco ??
    "Principal";

  const status = (raw.Status ?? raw.status ?? "Pago") as any;

  const posto =
    raw.Posto ??
    raw.posto ??
    raw.Nome_Posto ??
    raw["Nome_Posto"] ??
    raw.nome_posto ??
    raw.nomePosto ??
    raw["Nome Posto"] ??
    raw.Localização_Do_Posto ??
    raw["Localização_Do_Posto"] ??
    "";

  const litros = parseCurrency(raw.Litros ?? raw.litros ?? 0);

  const precoLitro = parseCurrency(
    raw.Preco_Litro ??
    raw["Preço_Litro"] ??
    raw.preco_litro ??
    raw["Preco_Litro"] ??
    raw.precoLitro ??
    (litros > 0 && valor > 0 ? valor / litros : 0)
  );

  const kmAtual = parseCurrency(
    raw.Km_Atual ?? raw.KM ?? raw.km ?? raw["KM"] ?? raw.km_atual ?? raw.Km ?? 0
  );

  const kmPercorrido = parseCurrency(
    raw.Km_Percorrido ?? raw["KM_Percorrido"] ?? raw.km_percorrido ?? 0
  );

  const mediaKmL = parseCurrency(
    raw.Media_KmL ??
    raw["Média_(Km/L)"] ??
    raw["Media_(Km/L)"] ??
    raw.media_km_l ??
    raw.mediaKmL ??
    0
  );

  return {
    ...raw, // Keep raw keys first
    // Override standard keys with normalized values
    Id: String(raw.Id || ""),
    Data: data,
    Tipo: tipo,
    Categoria: categoria,
    Subcategoria: raw.Subcategoria ?? raw.subcategoria ?? "",
    Descricao: String(desc).trim() || (tipo === "Abastecimento" ? "Abastecimento" : "Lançamento"),
    Valor: valor,
    Valor_Pago: valorPago,
    Conta: conta,
    Cartao: raw.Cartao ?? raw["Cartão_Id"] ?? raw.Cartão_Id ?? "",
    Forma_Pagamento: raw.Forma_Pagamento ?? raw["Forma_Pagamento"] ?? "PIX",
    Status: status,
    Observacoes: raw.Observacoes ?? raw.OBS ?? raw.Observação ?? raw.observacoes ?? "",
    Veiculo: raw.Veiculo ?? raw.veiculo ?? raw.Descrição_Do_Veículo ?? "",
    Km_Atual: kmAtual,
    Km_Percorrido: kmPercorrido,
    Litros: litros,
    Preco_Litro: precoLitro,
    Posto: String(posto).trim(),
    Nome_Posto: String(posto).trim(),
    Media_KmL: mediaKmL,
  };
}

/**
 * Normalize ConsultaMedica record
 */
export function normalizeConsultaMedica(raw: any): ConsultaMedica {
  if (!raw || typeof raw !== "object") return raw;
  const hora = formatarHora(raw.Horas ?? raw.Hora ?? raw.horas ?? raw.hora ?? "");
  const data = formatDateBR(raw.Data ?? raw.data ?? "");
  const medico = raw.Médico ?? raw.Medico ?? raw.medico ?? raw.médico ?? "";
  const status = raw.Status ?? raw.status ?? "Agendada";
  const especialidade = raw.Especialidade ?? raw.especialidade ?? "Clínica Geral";

  return {
    ...raw,
    Id: String(raw.Id || ""),
    Especialidade: especialidade,
    Médico: medico,
    Medico: medico,
    Data: data,
    Horas: hora,
    Local: raw.Local ?? raw.local ?? "",
    Lembrete_Ativo: raw.Lembrete_Ativo ?? raw["Lembrete_Ativo"] ?? "SIM",
    Status: status,
    Observação: raw.Observação ?? raw.Observacao ?? raw.Observacoes ?? "",
  };
}

/**
 * Normalize CompromissoAgenda record
 */
export function normalizeCompromissoAgenda(raw: any): CompromissoAgenda {
  if (!raw || typeof raw !== "object") return raw;
  const hora = formatarHora(raw.Hora ?? raw.Horas ?? raw.hora ?? raw.horas ?? "");
  const data = formatDateBR(raw.Data ?? raw.data ?? "");
  const titulo = raw.Titulo ?? raw["Título"] ?? raw.titulo ?? "Compromisso";
  const concluido =
    raw.Concluído === true ||
    raw.Concluido === true ||
    raw.Concluído === "SIM" ||
    raw.Concluido === "SIM" ||
    raw.concluido === true;

  return {
    ...raw,
    Id: String(raw.Id || ""),
    Titulo: titulo,
    Data: data,
    Hora: hora,
    Descrição: raw.Descrição ?? raw.Descricao ?? raw.descricao ?? "",
    Cor_De_Identificação: raw.Cor_De_Identificação ?? raw.cor ?? "#10b981",
    "Efeito_Alerta_(Piscando)": raw["Efeito_Alerta_(Piscando)"] ?? raw.Alerta ?? "NÃO",
    Lembrete_Ativo: raw.Lembrete_Ativo ?? "SIM",
    Dias_De_Antecedência: Number(raw.Dias_De_Antecedência || 1),
    Concluído: concluido,
    Categoria: raw.Categoria ?? "Geral",
  };
}
