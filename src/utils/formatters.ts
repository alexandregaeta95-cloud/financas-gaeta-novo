/**
 * Finanças Gaeta — Formatting and Normalization Utilities
 * Robust handling of Google Sheets data formats, currency strings (pt-BR "1.234,56"),
 * date-time anomalies (1899 epoch), and property name variations across all 19 tabs.
 */

import {
  Lancamento,
  Abastecimento,
  ContaBancaria,
  CartaoCredito,
  ConsultaMedica,
  ReceitaMedica,
  Infracao,
  Veiculo,
  MetaCategoria,
  CategoriaCustomizada,
  ServicoOficina,
  ManutencaoAgendada,
  ItemMercado,
  ZonaDeRisco,
  CompromissoAgenda,
  RegistroSaude,
  AlimentoAnaliseResult,
  AlimentoItem,
  LembreteSaudeConfig,
  ExercicioRegistro,
  ConsumoCafe,
} from "../types";

/**
 * Parse any currency or numeric value safely (e.g. "R$ 73,26", "1.250,50", "1234,56", 73.26, null)
 * Correctly converts Brazilian format strings (thousands with dot, decimals with comma) into JS float.
 */
export function parseCurrency(val: any): number {
  if (val === null || val === undefined || val === "") {
    return 0;
  }
  if (typeof val === "number") {
    return isNaN(val) ? 0 : val;
  }

  let str = String(val).trim();
  if (
    !str ||
    str === "-" ||
    str === "--" ||
    str === "NaN" ||
    str === "null" ||
    str === "undefined" ||
    str === "#N/A" ||
    str === "#VALUE!"
  ) {
    return 0;
  }

  // Check if negative with leading minus, "- R$", or wrapped in parentheses: e.g. "(R$ 100,00)" or "-R$ 50,00"
  const isNegative =
    str.includes("-") ||
    (str.startsWith("(") && str.endsWith(")"));

  // Remove currency symbols (R$, $, €), spaces, non-breaking spaces, and parentheses
  str = str
    .replace(/R\$/gi, "")
    .replace(/[$€£]/g, "")
    .replace(/\s+/g, "")
    .replace(/\u00a0/g, "")
    .replace(/[()]/g, "");

  const hasComma = str.includes(",");
  const hasDot = str.includes(".");

  if (hasComma && hasDot) {
    if (str.lastIndexOf(",") > str.lastIndexOf(".")) {
      // Brazilian format: "1.234,56" or "1.234.567,89" -> remove dots, replace comma with dot
      str = str.replace(/\./g, "").replace(",", ".");
    } else {
      // US format: "1,234.56" -> remove commas
      str = str.replace(/,/g, "");
    }
  } else if (hasComma) {
    // Only comma: e.g. "1234,56" or "73,26" -> replace comma with dot
    str = str.replace(",", ".");
  }

  // Remove any remaining unexpected characters except digits, dot, and minus
  str = str.replace(/[^0-9.-]/g, "");
  if (!str || str === "-" || str === ".") return 0;

  let parsed = parseFloat(str);
  if (isNaN(parsed)) return 0;
  if (isNegative && parsed > 0) parsed = -parsed;
  return parsed;
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
 * Format currency mask in real-time as user types numbers (e.g. 10000 -> 100,00, 125050 -> 1.250,50)
 */
export function formatCurrencyInput(raw: string): { numeric: number; formatted: string } {
  const digits = raw.replace(/\D/g, "");
  if (!digits || digits === "0" || digits === "00") {
    return { numeric: 0, formatted: "" };
  }
  const num = Number(digits) / 100;
  const formatted = num.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return { numeric: num, formatted };
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

  // If Date object passed
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return "";
    const hours = String(val.getHours()).padStart(2, "0");
    const minutes = String(val.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
  }

  const str = String(val).trim();
  if (!str) return "";

  // If contains ISO date (e.g. 1899-12-30T14:30:00.000Z or 1899-12-30T11:36:28.000Z)
  if (str.includes("T")) {
    const timeMatch = str.match(/T(\d{1,2}:\d{2})/i);
    if (timeMatch) {
      const parts = timeMatch[1].split(":");
      return `${parts[0].padStart(2, "0")}:${parts[1].padStart(2, "0")}`;
    }
  }

  // If contains date prefix (e.g. "1899-12-30 14:30:00" or "30/12/1899 14:30")
  const dateTimeMatch = str.match(/\d{2,4}[-/]\d{1,2}[-/]\d{1,4}[ T](\d{1,2}):(\d{2})/);
  if (dateTimeMatch) {
    const hours = dateTimeMatch[1].padStart(2, "0");
    const minutes = dateTimeMatch[2].padStart(2, "0");
    return `${hours}:${minutes}`;
  }

  // If contains time formatted with colons (e.g. "14:30:00", "09:15", "9:15")
  const colonMatch = str.match(/(\d{1,2}):(\d{2})(?::\d{2})?/);
  if (colonMatch) {
    const hours = colonMatch[1].padStart(2, "0");
    const minutes = colonMatch[2].padStart(2, "0");
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
 * 1. Normalize Lancamento (1_Lancamentos)
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
    raw.Valor ??
    raw["Valor"] ??
    raw["VALOR"] ??
    raw.valor ??
    raw["Valor_Total"] ??
    raw["Valor Total"] ??
    raw["VALOR_TOTAL"] ??
    raw["VALOR TOTAL"] ??
    raw.Valor_Total ??
    raw.valor_total ??
    raw.Valor_Original ??
    raw["Valor_Original"] ??
    raw["Valor Original"] ??
    0
  );

  const valorPago = parseCurrency(
    raw.Valor_Pago ??
    raw["Valor_Pago"] ??
    raw["Valor Pago"] ??
    raw["VALOR PAGO"] ??
    raw["VALOR_PAGO"] ??
    raw["Valor pago"] ??
    raw.valor_pago ??
    raw.valorPago ??
    raw["valor_pago"] ??
    raw["valor pago"] ??
    raw.ValorPago ??
    raw["ValorPago"] ??
    0
  );

  const rawTipo = raw.Tipo ?? raw.tipo;
  let tipo = rawTipo;
  if (!tipo) {
    tipo =
      String(raw.Categoria || "").toUpperCase() === "ABASTECIMENTO"
        ? "ABASTECIMENTO"
        : "DESPESA";
  } else {
    const tUpper = String(tipo).trim().toUpperCase();
    if (tUpper === "DESPESA" || tUpper === "DESPESAS") tipo = "DESPESA";
    else if (tUpper === "RECEITA" || tUpper === "RECEITAS") tipo = "RECEITA";
    else if (tUpper === "ABASTECIMENTO" || tUpper === "ABASTECIMENTOS") tipo = "ABASTECIMENTO";
    else tipo = tUpper;
  }

  const categoria = (
    raw.Categoria ?? raw.categoria ?? (tipo === "ABASTECIMENTO" ? "ABASTECIMENTO" : "Outros")
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

  const rawPostoCandidates = [
    raw.Nome_Posto,
    raw["Nome_Posto"],
    raw["Nome Posto"],
    raw.nome_posto,
    raw.nomePosto,
    raw.Posto,
    raw["Posto"],
    raw.posto,
  ];
  let posto = "";
  for (const cand of rawPostoCandidates) {
    if (cand !== null && cand !== undefined) {
      const trimmed = String(cand).trim();
      const upper = trimmed.toUpperCase();
      if (
        trimmed &&
        !["SIM", "NÃO", "NAO", "TRUE", "FALSE", "YES", "NO"].includes(upper) &&
        !upper.startsWith("COMPLETOU")
      ) {
        posto = trimmed;
        break;
      }
    }
  }

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
    ...raw,
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
    Veiculo: raw.Veiculo ?? raw.veiculo ?? raw.Descrição_Do_Veículo ?? raw.Descricao_Do_Veiculo ?? "",
    Descricao_Do_Veiculo:
      raw.Descricao_Do_Veiculo ??
      raw["Descrição_Do_Veículo"] ??
      raw["Descricao_Do_Veiculo"] ??
      raw["Descrição_Do_Veiculo"] ??
      raw.Veiculo ??
      raw.veiculo ??
      "",
    Km_Atual: kmAtual,
    Km_Percorrido: kmPercorrido,
    Litros: litros,
    Preco_Litro: precoLitro,
    Posto: String(posto).trim(),
    Nome_Posto: String(posto).trim(),
    Localizacao_Do_Posto: String(
      raw.Localizacao_Do_Posto ??
        raw["Localização_Do_Posto"] ??
        raw["Localizacao_Do_Posto"] ??
        raw.localizacao_do_posto ??
        ""
    ).trim(),
    Completou_O_Tanque:
      raw.Completou_O_Tanque ??
      raw["Completou_O_Tanque"] ??
      raw.completou_o_tanque ??
      "",
    Comprovante_Url: String(
      raw.Comprovante_Url ??
        raw["Comprovante_Url"] ??
        raw.comprovante_url ??
        raw.Comprovante ??
        ""
    ).trim(),
    Motorista: String(raw.Motorista ?? raw.motorista ?? raw.Condutor ?? raw.condutor ?? "").trim(),
    Media_KmL: mediaKmL,
    Tipo_Combustivel: String(
      raw.Tipo_Combustivel ??
        raw["Tipo_Combustivel"] ??
        raw["Tipo_Combustível"] ??
        raw["Tipo Combustivel"] ??
        raw["Tipo Combustível"] ??
        raw["Tipo_De_Combustivel"] ??
        raw["Tipo_de_Combustível"] ??
        raw.tipo_combustivel ??
        raw.tipoCombustivel ??
        ""
    ).trim(),
    Recorrencia_Id: String(
      raw.Recorrencia_Id ??
        raw["Recorrencia_Id"] ??
        raw.recorrencia_id ??
        (raw.Observacoes && typeof raw.Observacoes === "string" ? raw.Observacoes.match(/\[REC:([^\]]+)\]/)?.[1] : "") ??
        (raw.OBS && typeof raw.OBS === "string" ? raw.OBS.match(/\[REC:([^\]]+)\]/)?.[1] : "") ??
        ""
    ).trim() || undefined,
    Parcela_Info: String(
      raw.Parcela_Info ??
        raw["Parcela_Info"] ??
        raw.parcela_info ??
        ""
    ).trim() || undefined,
  };
}

/**
 * 4. Normalize Abastecimento (4_Abastecimentos)
 */
export function normalizeAbastecimento(raw: any): Abastecimento {
  if (!raw || typeof raw !== "object") return raw;
  const litros = parseCurrency(raw.Litros ?? raw.litros ?? 0);
  const precoLitro = parseCurrency(
    raw.Preco_Litro ?? raw["Preço_Litro"] ?? raw.preco_litro ?? raw["Preco_Litro"] ?? 0
  );
  let valorTotal = parseCurrency(
    raw.Valor_Total ?? raw["Valor_Total"] ?? raw.valor_total ?? raw.Valor ?? raw.valor ?? 0
  );
  if (valorTotal === 0 && litros > 0 && precoLitro > 0) {
    valorTotal = litros * precoLitro;
  }
  const kmAtual = parseCurrency(
    raw.Km_Atual ?? raw.KM ?? raw.km ?? raw["KM"] ?? raw.km_atual ?? 0
  );
  const kmPercorrido = parseCurrency(
    raw.Km_Percorrido ?? raw["KM_Percorrido"] ?? raw.km_percorrido ?? 0
  );
  const mediaKmL = parseCurrency(
    raw.Media_KmL ?? raw["Média_(Km/L)"] ?? raw["Media_(Km/L)"] ?? raw.media_km_l ?? 0
  );
  const rawPostoAbastCandidates = [
    raw.Nome_Posto,
    raw["Nome_Posto"],
    raw["Nome Posto"],
    raw.nome_posto,
    raw.Posto,
    raw["Posto"],
    raw.posto,
  ];
  let posto = "";
  for (const cand of rawPostoAbastCandidates) {
    if (cand !== null && cand !== undefined) {
      const trimmed = String(cand).trim();
      const upper = trimmed.toUpperCase();
      if (
        trimmed &&
        !["SIM", "NÃO", "NAO", "TRUE", "FALSE", "YES", "NO"].includes(upper) &&
        !upper.startsWith("COMPLETOU")
      ) {
        posto = trimmed;
        break;
      }
    }
  }
  const veiculo =
    raw.Veiculo ?? raw.veiculo ?? raw["Veículo"] ?? raw.Descricao_Do_Veiculo ?? "Veículo";
  const motorista =
    raw.Motorista ?? raw.motorista ?? raw.Condutor ?? raw.condutor ?? "";

  return {
    ...raw,
    Id: String(raw.Id || ""),
    Data: formatDateBR(raw.Data ?? raw.data ?? ""),
    Veiculo: String(veiculo).trim(),
    Descricao_Do_Veiculo: String(
      raw.Descricao_Do_Veiculo ??
        raw["Descrição_Do_Veículo"] ??
        raw["Descricao_Do_Veiculo"] ??
        raw["Descrição_Do_Veiculo"] ??
        veiculo
    ).trim(),
    Motorista: String(motorista).trim(),
    Km_Atual: kmAtual,
    Km_Percorrido: kmPercorrido,
    Litros: litros,
    Preco_Litro: precoLitro,
    Valor_Total: valorTotal,
    Posto: String(posto).trim(),
    Nome_Posto: String(posto).trim(),
    Localizacao_Do_Posto: String(
      raw.Localizacao_Do_Posto ??
        raw["Localização_Do_Posto"] ??
        raw["Localizacao_Do_Posto"] ??
        raw.localizacao_do_posto ??
        ""
    ).trim(),
    Completou_O_Tanque:
      raw.Completou_O_Tanque ??
      raw["Completou_O_Tanque"] ??
      raw.completou_o_tanque ??
      "",
    Comprovante_Url: String(
      raw.Comprovante_Url ??
        raw["Comprovante_Url"] ??
        raw.comprovante_url ??
        raw.Comprovante ??
        ""
    ).trim(),
    Media_KmL: mediaKmL,
    Observacoes: raw.Observacoes ?? raw.Observações ?? raw.observacoes ?? "",
    Tipo_Combustivel: String(
      raw.Tipo_Combustivel ??
        raw["Tipo_Combustivel"] ??
        raw["Tipo_Combustível"] ??
        raw["Tipo Combustivel"] ??
        raw["Tipo Combustível"] ??
        raw["Tipo_De_Combustivel"] ??
        raw["Tipo_de_Combustível"] ??
        raw.tipo_combustivel ??
        raw.tipoCombustivel ??
        ""
    ).trim(),
  };
}

/**
 * 5. Normalize ContaBancaria (5_Contas_Bancarias)
 */
export function normalizeContaBancaria(raw: any): ContaBancaria {
  if (!raw || typeof raw !== "object") return raw;
  const saldoInicial = parseCurrency(
    raw.Saldo_Inicial ??
      raw["Saldo_Inicial"] ??
      raw.saldo_inicial ??
      raw.saldoInicial ??
      raw.Saldo ??
      raw.saldo ??
      0
  );
  const saldoAtual = parseCurrency(
    raw.Saldo_Atual ??
      raw["Saldo_Atual"] ??
      raw.saldo_atual ??
      raw.saldoAtual ??
      saldoInicial
  );
  const limite = parseCurrency(raw.Limite ?? raw.limite ?? 0);
  const nome = raw.Nome ?? raw.nome ?? raw.Banco ?? raw.banco ?? "Conta Bancária";
  const tipo = raw.Tipo ?? raw.tipo ?? "BANCO";
  const agencia = raw.Agência ?? raw.Agencia ?? raw.agencia ?? raw["Agência"] ?? "";
  const conta = raw.Conta ?? raw.conta ?? "";

  return {
    ...raw,
    Id: String(raw.Id || ""),
    Nome: String(nome).trim(),
    Saldo_Inicial: saldoInicial,
    Saldo_Atual: saldoAtual,
    Cor: raw.Cor ?? raw.cor ?? "#059669",
    Ícone: raw.Ícone ?? raw.Icone ?? raw.icone ?? "Landmark",
    Tipo: String(tipo).trim(),
    Agência: String(agencia).trim(),
    Conta: String(conta).trim(),
    Limite: limite,
    Ativa: raw.Ativa !== false && raw.Ativa !== "NÃO" && raw.Ativa !== "NAO",
  };
}

/**
 * 18. Normalize CartaoCredito (18_Cartões_De_Crédito: A-Id, B-Nome, C-Bandeira, D-Limite_Total, E-Dia_Fechamento, F-Dia_Vencimento, G-Cor_Hex, H-Ativo)
 */
export function normalizeCartaoCredito(raw: any): CartaoCredito {
  if (!raw || typeof raw !== "object") return raw;
  const limiteTotal = parseCurrency(
    raw.Limite_Total ??
      raw["Limite_Total"] ??
      raw.limite_total ??
      raw.Limite ??
      raw.limite ??
      0
  );
  const diaFechamento = parseCurrency(
    raw.Dia_Fechamento ??
      raw["Dia_Fechamento"] ??
      raw.dia_fechamento ??
      raw.Fechamento ??
      raw.fechamento ??
      10
  );
  const diaVencimento = parseCurrency(
    raw.Dia_Vencimento ??
      raw["Dia_Vencimento"] ??
      raw.dia_vencimento ??
      raw.Vencimento ??
      raw.vencimento ??
      20
  );
  const corHex = String(
    raw.Cor_Hex ??
      raw["Cor_Hex"] ??
      raw.cor_hex ??
      raw.Cor ??
      raw.cor ??
      "#0f172a"
  ).trim();
  const gasto = parseCurrency(raw.Gasto ?? raw.gasto ?? 0);
  const rawNome = raw.Nome ?? raw.nome ?? raw.Cartão ?? raw.Cartao ?? "CARTÃO DE CRÉDITO";
  const nome = String(rawNome).trim().toUpperCase();
  const rawBandeira = raw.Bandeira ?? raw.bandeira ?? "MASTERCARD";
  const bandeira = String(rawBandeira).trim().toUpperCase();

  const isAtivo =
    raw.Ativo !== false &&
    raw.Ativo !== "NÃO" &&
    raw.Ativo !== "NAO" &&
    raw.Ativo !== "0" &&
    raw.Ativo !== 0;

  return {
    ...raw,
    Id: String(raw.Id || "").trim(),
    Nome: nome,
    Bandeira: bandeira,
    Limite_Total: limiteTotal,
    Dia_Fechamento: diaFechamento,
    Dia_Vencimento: diaVencimento,
    Cor_Hex: corHex,
    Ativo: isAtivo ? "SIM" : "NÃO",
    // Aliases para compatibilidade interna
    Limite: limiteTotal,
    Fechamento: diaFechamento,
    Vencimento: diaVencimento,
    Cor: corHex,
    Banco_ID: String(raw.Banco_ID ?? raw.Banco_Id ?? raw.banco_id ?? raw.Banco ?? "").trim().toUpperCase(),
    Gasto: gasto,
  };
}

/**
 * 6. Normalize ConsultaMedica (6_Consultas_Médicas)
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
 * 7. Normalize ReceitaMedica (7_Receitas_Médicas)
 */
export function normalizeReceitaMedica(raw: any): ReceitaMedica {
  if (!raw || typeof raw !== "object") return raw;
  const medico = raw.Médico ?? raw.Medico ?? raw.medico ?? "";
  return {
    ...raw,
    Id: String(raw.Id || ""),
    Medicamento: raw.Medicamento ?? raw.medicamento ?? "Medicamento",
    Dosagem: raw.Dosagem ?? raw.dosagem ?? "",
    Frequência: raw.Frequência ?? raw.Frequencia ?? raw.frequencia ?? "",
    Médico: medico,
    Data_Emissão: formatDateBR(raw.Data_Emissão ?? raw.Data_Emissao ?? raw.data_emissao ?? ""),
    Data_Validade: formatDateBR(raw.Data_Validade ?? raw.data_validade ?? ""),
    Data_Vencimento: formatDateBR(raw.Data_Vencimento ?? raw.data_vencimento ?? ""),
    Instruções: raw.Instruções ?? raw.Instrucoes ?? raw.instrucoes ?? "",
    Especialidade: raw.Especialidade ?? raw.especialidade ?? "",
    Observação: raw.Observação ?? raw.Observacao ?? "",
    Arquivo_Anexo: raw.Arquivo_Anexo ?? raw.anexo ?? "",
    Ativa: raw.Ativa !== false && raw.Ativa !== "NÃO",
  };
}

/**
 * 8. Normalize Infracao (8_Infracoes)
 */
export function normalizeInfracao(raw: any): Infracao {
  if (!raw || typeof raw !== "object") return raw;
  const valor = parseCurrency(raw.Valor ?? raw.valor ?? raw.Valor_Multa ?? 0);
  const pontos = parseCurrency(raw.Pontos ?? raw.pontos ?? 0);
  const desc =
    raw.Descrição ??
    raw.Descricao ??
    raw.descricao ??
    raw.Título ??
    raw.Titulo ??
    "Infração de Trânsito";
  const veiculo = raw.Veículo ?? raw.Veiculo ?? raw.veiculo ?? "Veículo";

  return {
    ...raw,
    Id: String(raw.Id || ""),
    Protocolo: raw.Protocolo ?? raw.protocolo ?? "",
    Título: raw.Título ?? raw.Titulo ?? raw.titulo ?? String(desc).trim(),
    Veículo: String(veiculo).trim(),
    Placa: raw.Placa ?? raw.placa ?? "",
    Data: formatDateBR(raw.Data ?? raw.data ?? ""),
    Descrição: String(desc).trim(),
    Valor: valor,
    Pontos: pontos,
    Status: raw.Status ?? raw.status ?? "Pendente",
    Localização: raw.Localização ?? raw.Localizacao ?? raw.localizacao ?? "",
    Observação: raw.Observação ?? raw.Observacao ?? raw.observacao ?? "",
  };
}

/**
 * 9. Normalize Veiculo (9_Veiculos)
 */
export function normalizeVeiculo(raw: any): Veiculo {
  if (!raw || typeof raw !== "object") return raw;
  const kmAtual = parseCurrency(raw.Km_Atual ?? raw.KM ?? raw.km ?? raw.km_atual ?? 0);
  const ano = parseCurrency(raw.Ano ?? raw.ano ?? new Date().getFullYear());
  const anoFab = parseCurrency(
    raw.Ano_Fabricação ?? raw.Ano_Fabricacao ?? raw.ano_fabricacao ?? ano
  );

  return {
    ...raw,
    Id: String(raw.Id || ""),
    Descrição: raw.Descrição ?? raw.Descricao ?? raw.descricao ?? "",
    Motorista: raw.Motorista ?? raw.motorista ?? "",
    Placa: raw.Placa ?? raw.placa ?? "",
    Renavam: raw.Renavam ?? raw.renavam ?? "",
    Chassi: raw.Chassi ?? raw.chassi ?? "",
    Marca: raw.Marca ?? raw.marca ?? "",
    Modelo: raw.Modelo ?? raw.modelo ?? "",
    Ano: ano,
    Ano_Fabricação: anoFab,
    Combustível: raw.Combustível ?? raw.Combustivel ?? raw.combustivel ?? "Flex",
    Km_Atual: kmAtual,
    Ativo: raw.Ativo !== false && raw.Ativo !== "NÃO" && raw.Ativo !== "NAO",
  };
}

/**
 * 10. Normalize MetaCategoria (10_Metas_De_Categoria)
 */
export function normalizeMetaCategoria(raw: any): MetaCategoria {
  if (!raw || typeof raw !== "object") return raw;
  const valorMeta = parseCurrency(
    raw.Valor_Meta ?? raw["Valor_Meta"] ?? raw.valor_meta ?? raw.Meta ?? raw.meta ?? 0
  );
  const alerta = parseCurrency(
    raw.Alerta_Porcentagem ?? raw["Alerta_Porcentagem"] ?? raw.alerta ?? 80
  );
  const cat = raw.Categoria ?? raw.categoria ?? "OUTROS";

  return {
    ...raw,
    Id: String(raw.Id || ""),
    Categoria: String(cat).trim().toUpperCase(),
    Valor_Meta: valorMeta,
    Mes_Ano:
      raw.Mes_Ano ?? raw["Mes_Ano"] ?? raw.mes_ano ?? new Date().toISOString().substring(0, 7),
    Alerta_Porcentagem: alerta || 80,
  };
}

/**
 * 11. Normalize CategoriaCustomizada (11_Categorias_Customizadas)
 */
export function normalizeCategoriaCustomizada(raw: any): CategoriaCustomizada {
  if (!raw || typeof raw !== "object") return raw;
  return {
    ...raw,
    Id: String(raw.Id || ""),
    Nome: raw.Nome ?? raw.nome ?? "Categoria",
    Tipo: raw.Tipo ?? raw.tipo ?? "Despesa",
    Icone: raw.Icone ?? raw.icone ?? "Tag",
    Cor_Hex: raw.Cor_Hex ?? raw.cor ?? "#10b981",
  };
}

/**
 * 14. Normalize ServicoOficina (14_Oficina)
 */
export function normalizeServicoOficina(raw: any): ServicoOficina {
  if (!raw || typeof raw !== "object") return raw;
  const km = parseCurrency(raw.KM ?? raw.km ?? raw.Km_Atual ?? raw.km_atual ?? 0);
  const valorAPg = parseCurrency(raw.Valor_A_PG ?? raw["Valor_A_PG"] ?? raw.valor_a_pg ?? 0);
  const valorPago = parseCurrency(
    raw.Valor_Pago ?? raw["Valor_Pago"] ?? raw.valor_pago ?? raw.Valor ?? raw.valor ?? 0
  );
  const desc = raw.Descrição ?? raw.Descricao ?? raw.descricao ?? "Serviço Mecânico";

  return {
    ...raw,
    Id: String(raw.Id || ""),
    Data: formatDateBR(raw.Data ?? raw.data ?? ""),
    Descrição: String(desc).trim(),
    KM: km,
    Valor_A_PG: valorAPg,
    Valor_Pago: valorPago,
    Oficina_Nome: raw.Oficina_Nome ?? raw["Oficina_Nome"] ?? raw.oficina ?? "",
    Comprovante_Url: raw.Comprovante_Url ?? raw["Comprovante_Url"] ?? "",
    Observações: raw.Observações ?? raw.Observacoes ?? raw.observacoes ?? "",
    Veiculo: raw.Veiculo ?? raw.veiculo ?? raw["Veículo"] ?? "CARRO",
  };
}

/**
 * 15. Normalize ManutencaoAgendada (15_Manutenções_Agendadas)
 */
export function normalizeManutencaoAgendada(raw: any): ManutencaoAgendada {
  if (!raw || typeof raw !== "object") return raw;
  const kmAlvo = parseCurrency(raw.KM_Alvo ?? raw["KM_Alvo"] ?? raw.km_alvo ?? 0);
  const freqMeses = parseCurrency(
    raw.Frequência_Meses ?? raw["Frequência_Meses"] ?? raw.Frequencia_Meses ?? 0
  );
  const freqKm = parseCurrency(
    raw.Frequência_KM ?? raw["Frequência_KM"] ?? raw.Frequencia_KM ?? 0
  );

  return {
    ...raw,
    Id: String(raw.Id || ""),
    Veículo: raw.Veículo ?? raw.Veiculo ?? raw.veiculo ?? "Veículo",
    Descrição: raw.Descrição ?? raw.Descricao ?? raw.descricao ?? "Manutenção",
    Tipo_Agendamento: raw.Tipo_Agendamento ?? "Ambos",
    Data_Alvo: formatDateBR(raw.Data_Alvo ?? raw.data_alvo ?? ""),
    KM_Alvo: kmAlvo,
    Recorrente: raw.Recorrente ?? "SIM",
    Frequência_Meses: freqMeses,
    Frequência_KM: freqKm,
    Status: raw.Status ?? "PENDENTE",
    Prioridade: raw.Prioridade ?? "Média",
    Oficina_Nome: raw.Oficina_Nome ?? "",
    Observações: raw.Observações ?? "",
  };
}

/**
 * 16. Normalize ItemMercado (16_Lista_De_Mercado)
 */
export function normalizeItemMercado(raw: any): ItemMercado {
  if (!raw || typeof raw !== "object") return raw;
  const qtd = parseCurrency(raw.Quantidade ?? raw.quantidade ?? raw.Qtd ?? raw.qtd ?? 1) || 1;
  const unitPrice = parseCurrency(
    raw.Valor_Unitário ??
      raw["Valor_Unitário"] ??
      raw.Valor_Unitario ??
      raw.valor_unitario ??
      raw.Preco_Unitario ??
      raw["Preço_Unitário"] ??
      raw["Preço_Unitario"] ??
      0
  );
  let total = parseCurrency(raw.Valor_Total ?? raw["Valor_Total"] ?? raw.valor_total ?? 0);
  let estimado = parseCurrency(
    raw.Preco_Estimado ??
      raw["Preco_Estimado"] ??
      raw["Preço_Estimado"] ??
      raw["Preco Estimado"] ??
      raw["Preço Estimado"] ??
      raw.preco_estimado ??
      raw.Valor_Estimado ??
      raw["Valor_Estimado"] ??
      raw["Valor Estimado"] ??
      raw.valor_estimado ??
      0
  );
  if (total === 0 && unitPrice > 0) {
    total = qtd * unitPrice;
  }
  if (estimado === 0) {
    estimado = total;
  }

  const comprado =
    raw.Comprado === true ||
    raw.Comprado === "SIM" ||
    raw.Comprado === "Sim" ||
    raw.comprado === true ||
    raw.comprado === "SIM";

  return {
    ...raw,
    Id: String(raw.Id || ""),
    Item: raw.Item ?? raw.item ?? raw.Nome ?? "Item",
    Categoria: raw.Categoria ?? raw.categoria ?? "MERCADO",
    Quantidade: qtd,
    Unidade: raw.Unidade ?? raw.unidade ?? "un",
    Valor_Unitário: unitPrice,
    Valor_Total: total,
    Valor_Estimado: estimado,
    Preco_Estimado: estimado,
    Data_Pedido: formatDateBR(raw.Data_Pedido ?? raw.data_pedido ?? ""),
    Data_Compra: formatDateBR(raw.Data_Compra ?? raw.data_compra ?? ""),
    Comprado: comprado,
    Observação: raw.Observação ?? raw.Observacao ?? raw.observacao ?? "",
  };
}

/**
 * 17. Normalize ZonaDeRisco (17_Zonas_De_Risco)
 */
export function normalizeZonaDeRisco(raw: any): ZonaDeRisco {
  if (!raw || typeof raw !== "object") return raw;
  const lat = parseCurrency(raw.Latitude ?? raw.latitude ?? raw.lat ?? 0);
  const lng = parseCurrency(raw.Longitude ?? raw.longitude ?? raw.lng ?? 0);
  const raio = parseCurrency(
    raw["Raio_(M)"] ?? raw["Raio_(m)"] ?? raw.Raio ?? raw.raio ?? 300
  );

  const desc =
    raw.Nome_Local ??
    raw.nome_local ??
    raw.Descrição ??
    raw.Descricao ??
    raw.descricao ??
    "Zona de Risco";

  const nivelRaw =
    raw.Nível_De_Risco ??
    raw.Nivel_Risco ??
    raw.Nivel_De_Risco ??
    raw.nivel_risco ??
    raw.nivel ??
    "MÉDIO";

  const nivelStr = String(nivelRaw).toUpperCase();
  const nivelVal = (
    nivelStr.includes("EXTREM")
      ? "EXTREMO"
      : nivelStr.includes("ALT")
      ? "ALTO"
      : nivelStr.includes("BAIX")
      ? "BAIXO"
      : "MÉDIO"
  ) as "BAIXO" | "MÉDIO" | "ALTO" | "EXTREMO";

  const obs =
    raw.Observações ??
    raw.Observacoes ??
    raw.observacoes ??
    raw.Observação ??
    raw.Observacao ??
    raw.observacao ??
    "";

  return {
    ...raw,
    Id: String(raw.Id || ""),
    Nome_Local: String(raw.Nome_Local ?? desc).trim(),
    Bairro_Cidade: String(raw.Bairro_Cidade ?? raw.bairro_cidade ?? "").trim(),
    Nivel_Risco: nivelVal,
    Tipo_Ocorrencia: String(raw.Tipo_Ocorrencia ?? raw.tipo_ocorrencia ?? "").trim(),
    Descrição: String(desc).trim(),
    Nível_De_Risco: nivelVal,
    Latitude: lat,
    Longitude: lng,
    "Raio_(M)": raio || 300,
    Ativo: raw.Ativo !== false && raw.Ativo !== "NÃO" && raw.Ativo !== "NAO",
    Mensagem_De_Alerta: raw.Mensagem_De_Alerta ?? raw.mensagem ?? "CUIDADO: Zona de Risco Registrada!",
    Data_Registro: formatDateBR(raw.Data_Registro ?? raw.data ?? ""),
    Observação: obs,
    Observacoes: obs,
  };
}

/**
 * 19. Normalize CompromissoAgenda (19_Agenda_E_Compromissos)
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
    Categoria: raw.Categoria != null ? String(raw.Categoria).trim() : "Geral",
  };
}

/**
 * Check if a Lancamento is marked as excluded / deleted / canceled
 */
export function isLancamentoExcluded(l: any): boolean {
  if (!l || typeof l !== "object") return false;
  const s = String(l.Status ?? l.status ?? "").trim().toUpperCase();
  return (
    s === "EXCLUÍDO" ||
    s === "EXCLUIDO" ||
    s === "EXCLUÍDA" ||
    s === "EXCLUIDA" ||
    s === "DELETED" ||
    s === "CANCELADO" ||
    s === "CANCELADA" ||
    s === "INATIVO" ||
    s.includes("EXCLU") ||
    s.includes("DELET")
  );
}

/**
 * Calculates current dynamic balance for a bank account based on its initial balance
 * and all active (non-excluded) lancamentos linked to this account name.
 */
export function calculateAccountCurrentBalance(
  conta: ContaBancaria,
  lancamentos: Lancamento[]
): number {
  if (!conta) return 0;
  const initial = parseCurrency(conta.Saldo_Inicial ?? 0);
  const targetContaNome = String(conta.Nome || "").trim().toUpperCase();

  if (!targetContaNome) return initial;

  let delta = 0;
  (lancamentos || []).forEach((l) => {
    // Skip excluded/deleted items
    if (isLancamentoExcluded(l)) {
      return;
    }

    // Skip pending/scheduled future items from current realized balance
    const status = String(l.Status || "").trim().toUpperCase();
    if (status === "PENDENTE" || status === "AGENDADO") {
      return;
    }

    const itemConta = String(l.Conta || "").trim().toUpperCase();
    if (itemConta !== targetContaNome) {
      return;
    }

    const valor = parseCurrency(l.Valor ?? 0);
    const tipo = String(l.Tipo || "").trim().toUpperCase();
    const cat = String(l.Categoria || "").trim().toUpperCase();

    const isReceita = tipo === "RECEITA" || tipo === "RECEITAS" || cat === "RECEITA";
    const isDespesaOuAbastecimento =
      tipo === "DESPESA" ||
      tipo === "DESPESAS" ||
      tipo === "ABASTECIMENTO" ||
      tipo === "ABASTECIMENTOS" ||
      cat === "ABASTECIMENTO" ||
      !isReceita;

    if (isReceita) {
      delta += valor;
    } else if (isDespesaOuAbastecimento) {
      delta -= valor;
    }
  });

  return initial + delta;
}

/**
 * Calculates dynamic balance, current invoice spent, and available limit for a credit card
 * based on its total limit and active (non-excluded) transactions linked to this card.
 *
 * Rules:
 * 1. Despesas no cartão sempre contam na Fatura Atual imediatamente, independente do status (Pendente ou Pago),
 *    pois toda compra no cartão é dívida assumida no momento da transação.
 * 2. Pagamento de fatura só abate da Fatura Atual quando o status for "PAGO" (ou houver Valor_Pago).
 *    Se estiver "PENDENTE" ou "AGENDADO", ainda não foi debitado e não abate.
 */
export function calculateCardBalance(
  cartao: CartaoCredito,
  lancamentos: Lancamento[]
): {
  totalLimit: number;
  currentSpent: number;
  availableLimit: number;
  expensesTotal: number;
  paymentsTotal: number;
} {
  if (!cartao) {
    return { totalLimit: 0, currentSpent: 0, availableLimit: 0, expensesTotal: 0, paymentsTotal: 0 };
  }

  const norm = (val: unknown) =>
    String(val || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^A-Z0-9\s]/gi, " ")
      .replace(/\s+/g, " ")
      .trim()
      .toUpperCase();

  const totalLimit = parseCurrency(cartao.Limite_Total ?? cartao.Limite ?? 0);
  const targetCardName = norm(cartao.Nome);
  const targetCardId = norm(cartao.Id);
  const targetBandeira = norm(cartao.Bandeira);

  if (!targetCardName && !targetCardId) {
    return { totalLimit, currentSpent: 0, availableLimit: totalLimit, expensesTotal: 0, paymentsTotal: 0 };
  }

  // Extrai palavras-chave significativas do nome do cartão (ex: "NUBANK", "MASTERCARD", "BLACK")
  const targetKeywords = targetCardName
    .split(" ")
    .filter((w) => w.length >= 3 && w !== "CARTAO" && w !== "CREDITO" && w !== "DEBITO" && w !== "CARD" && w !== "BANCO");

  let expensesTotal = 0;
  let paymentsTotal = 0;

  (lancamentos || []).forEach((l) => {
    // Skip excluded / deleted
    if (isLancamentoExcluded(l)) {
      return;
    }

    const rawL = l as unknown as Record<string, unknown>;
    const itemCard = norm(l.Cartao || rawL.Cartão_Id || rawL.Cartão || rawL.Cartao_Id || rawL.Cartão_Nome || rawL.Cartao_Nome);
    const itemConta = norm(l.Conta || rawL.Conta_Bancaria);
    const itemForma = norm(l.Forma_Pagamento || rawL.Forma_De_Pagamento);
    const itemDesc = norm(l.Descricao || rawL.Descrição);
    const itemObs = norm(l.Observacoes || rawL.Observações);
    const tipo = norm(l.Tipo);
    const cat = norm(l.Categoria);

    // Verificação flexível de vínculo com o cartão:
    // 1. Vínculo direto pelo campo Cartão / Cartão_Id
    let isLinked = false;
    if (itemCard) {
      if (
        itemCard === targetCardName ||
        (targetCardId && itemCard === targetCardId) ||
        (targetCardName && (itemCard.includes(targetCardName) || targetCardName.includes(itemCard))) ||
        (targetKeywords.length > 0 && targetKeywords.some((kw) => itemCard.includes(kw)))
      ) {
        isLinked = true;
      }
    }

    // 2. Vínculo pelo campo Conta (se o usuário selecionou o cartão na coluna Conta)
    if (!isLinked && itemConta) {
      if (
        itemConta === targetCardName ||
        (targetCardId && itemConta === targetCardId) ||
        (targetCardName && (itemConta.includes(targetCardName) || targetCardName.includes(itemConta))) ||
        (targetKeywords.length > 0 && targetKeywords.some((kw) => itemConta.includes(kw)))
      ) {
        isLinked = true;
      }
    }

    // 3. Vínculo por Forma de Pagamento = CARTÃO DE CRÉDITO com menção no texto
    if (!isLinked && (itemForma.includes("CARTAO") || itemForma.includes("CREDITO"))) {
      if (
        (targetKeywords.length > 0 && targetKeywords.some((kw) => itemForma.includes(kw) || itemDesc.includes(kw) || itemObs.includes(kw))) ||
        (targetBandeira && (itemDesc.includes(targetBandeira) || itemForma.includes(targetBandeira)))
      ) {
        isLinked = true;
      }
    }

    if (!isLinked) {
      return;
    }

    const valor = parseCurrency(l.Valor ?? 0);
    const status = norm(l.Status);
    const valorPago = parseCurrency(l.Valor_Pago ?? 0);

    const isPagamentoFatura =
      cat.includes("PAGAMENTO DE FATURA") ||
      cat.includes("PAGAMENTO FATURA") ||
      cat.includes("FATURA CARTAO") ||
      cat.includes("FATURA") ||
      itemDesc.includes("PAGAMENTO DE FATURA") ||
      itemDesc.includes("PAGAMENTO DA FATURA") ||
      itemDesc.includes("PAGAMENTO FATURA") ||
      tipo === "PAGAMENTO";

    const isReceita = tipo.includes("RECEITA") || cat.includes("RECEITA");

    if (isPagamentoFatura || isReceita) {
      // Pagamento de fatura ou estorno:
      // Só abate da fatura se o pagamento foi efetivado (Status PAGO / REALIZADO / CONCLUÍDO ou Valor_Pago > 0)
      const isPaid =
        status.includes("PAGO") ||
        status.includes("PAGA") ||
        status.includes("REALIZADO") ||
        status.includes("CONCLUIDO") ||
        status.includes("LIQUIDADO") ||
        valorPago > 0;

      if (isPaid) {
        const paymentAmount = valorPago > 0 ? valorPago : valor;
        paymentsTotal += paymentAmount;
      }
    } else {
      // Despesa no cartão:
      // Conta SEMPRE na fatura atual imediatamente, independente de ser "Pendente" ou "Pago"
      expensesTotal += valor;
    }
  });

  // Fatura Atual líquida (não fica negativa)
  const currentSpent = Math.max(0, expensesTotal - paymentsTotal);
  // Limite Disponível (Limite Total - Fatura Atual)
  const availableLimit = Math.max(0, totalLimit - currentSpent);

  return {
    totalLimit,
    currentSpent,
    availableLimit,
    expensesTotal,
    paymentsTotal,
  };
}

/**
 * 20. Normalize RegistroSaude (20_Controle_Saude: Id, Tipo_Registro, Data_Hora, Valor_Principal, Valor_Secundario, Batimentos_Bpm, Contexto, Observacoes, Data_Criacao)
 */
export function normalizeRegistroSaude(raw: any): RegistroSaude {
  if (!raw || typeof raw !== "object") return raw;
  const tipo = String(raw.Tipo_Registro ?? raw.tipo_registro ?? raw.Tipo ?? raw.tipo ?? "PESO").trim().toUpperCase();
  const valorPrincipal = parseCurrency(
    raw.Valor_Principal ?? raw.valor_principal ?? raw.Valor ?? raw.valor ?? raw.Peso ?? raw.Sistolica ?? raw.Glicemia ?? 0
  );
  const valorSecundario = raw.Valor_Secundario !== undefined || raw.valor_secundario !== undefined || raw.Diastolica !== undefined
    ? parseCurrency(raw.Valor_Secundario ?? raw.valor_secundario ?? raw.Diastolica ?? 0)
    : undefined;
  const rawBpm = raw.Batimentos_Bpm ?? raw.batimentos_bpm ?? raw.Batimentos ?? raw.batimentos ?? raw.Bpm ?? raw.bpm ?? raw.BPM;
  const batimentosBpm = rawBpm !== undefined && rawBpm !== null && String(rawBpm).trim() !== ""
    ? Math.round(parseCurrency(rawBpm))
    : undefined;
  const dataHora = String(
    raw.Data_Hora ?? raw.data_hora ?? raw.Data ?? raw.data ?? new Date().toISOString().split("T")[0]
  ).trim();
  const contexto = raw.Contexto ?? raw.contexto ? String(raw.Contexto ?? raw.contexto).trim().toUpperCase() : undefined;
  const obs =
    raw.Observacoes ??
    raw.observacoes ??
    raw["Observações"] ??
    raw.observações ??
    raw.OBS ??
    raw.obs ??
    raw.Observação ??
    raw.observacao ??
    raw["Observacao"] ??
    "";

  const cleanRaw = { ...raw };
  delete cleanRaw["Observações"];
  delete cleanRaw["observações"];
  delete cleanRaw["OBS"];
  delete cleanRaw["obs"];
  delete cleanRaw["Observação"];
  delete cleanRaw["observacao"];
  delete cleanRaw["Observacao"];

  return {
    ...cleanRaw,
    Id: String(raw.Id || raw.id || ""),
    Tipo_Registro: tipo,
    Data_Hora: dataHora,
    Valor_Principal: valorPrincipal,
    Valor_Secundario: valorSecundario,
    Batimentos_Bpm: batimentosBpm && batimentosBpm > 0 ? batimentosBpm : undefined,
    Contexto: contexto,
    Observacoes: String(obs).trim().toUpperCase(),
    Data_Criacao: raw.Data_Criacao ?? raw.data_criacao ?? new Date().toISOString(),
  };
}

/**
 * 21. Normalize AlimentoAnalise (21_Analise_Alimentos: Id, Data, Data_Hora, Nome_Prato, Calorias_Estimadas, Proteinas_Estimadas, Carboidratos_Estimados, Gorduras_Estimadas, Classificacao_Geral, Itens_Identificados, Dicas_Nutricionais, Observacoes, Data_Criacao)
 */
export function normalizeAlimentoAnalise(raw: any): AlimentoAnaliseResult {
  if (!raw || typeof raw !== "object") return raw;

  const id = String(raw.Id || raw.id || raw.ID || `ALIM_${Date.now()}`);
  const data = String(raw.Data || raw.data || new Date().toISOString().split("T")[0]).trim();
  const dataHora = String(raw.Data_Hora || raw.data_hora || raw.DataHora || raw.dataHora || data).trim();
  const nomePrato = String(
    raw.Nome_Prato || raw.nome_prato || raw.NomePrato || raw.nomePrato || raw.Nome || raw.Prato || "Refeição"
  ).trim();
  const descricao = String(raw.Classificacao_Geral || raw.classificacao_geral || raw.Descricao || raw.descricao || raw.Descricao_Geral || raw.descricao_geral || "").trim();
  const caloriasEstimadas = Math.round(parseCurrency(raw.Calorias_Estimadas ?? raw.calorias_estimadas ?? raw.Calorias ?? raw.calorias ?? raw.caloriasEstimadas ?? 0));
  const proteinasEstimadas = Math.round(parseCurrency(raw.Proteinas_Estimadas ?? raw.proteinas_estimadas ?? raw.Proteinas ?? raw.proteinas ?? raw.proteinasEstimadas ?? 0));
  const carboidratosEstimados = Math.round(parseCurrency(raw.Carboidratos_Estimados ?? raw.carboidratos_estimados ?? raw.Carboidratos ?? raw.carboidratos ?? raw.carboidratosEstimados ?? 0));
  const gordurasEstimadas = Math.round(parseCurrency(raw.Gorduras_Estimadas ?? raw.gorduras_estimadas ?? raw.Gorduras ?? raw.gorduras ?? raw.gordurasEstimadas ?? 0));

  let itensIdentificados: AlimentoItem[] = [];
  const rawItens = raw.Itens_Identificados ?? raw.itens_identificados ?? raw.itensIdentificados ?? raw.Itens ?? raw.itens;
  if (Array.isArray(rawItens)) {
    itensIdentificados = rawItens
      .map((it: any) => ({
        item: String(it.item || it.nome || it.Item || it.Nome || "").trim(),
        porcaoAproximada: it.porcaoAproximada || it.porcao || it.Porcao || undefined,
        calorias: it.calorias !== undefined ? parseCurrency(it.calorias) : undefined,
        proteinas: it.proteinas !== undefined ? parseCurrency(it.proteinas) : undefined,
      }))
      .filter((it: any) => it.item.length > 0);
  } else if (typeof rawItens === "string" && rawItens.trim()) {
    try {
      const parsed = JSON.parse(rawItens);
      if (Array.isArray(parsed)) {
        itensIdentificados = parsed
          .map((it: any) => ({
            item: String(it.item || it.nome || it.Item || it.Nome || "").trim(),
            porcaoAproximada: it.porcaoAproximada || it.porcao || it.Porcao || undefined,
            calorias: it.calorias !== undefined ? parseCurrency(it.calorias) : undefined,
            proteinas: it.proteinas !== undefined ? parseCurrency(it.proteinas) : undefined,
          }))
          .filter((it: any) => it.item.length > 0);
      }
    } catch {
      itensIdentificados = rawItens
        .split(/[\n,;]+/)
        .map((str: string) => ({ item: str.trim() }))
        .filter((it: any) => it.item.length > 0);
    }
  }

  const dicasNutricionais = String(raw.Dicas_Nutricionais || raw.dicas_nutricionais || raw.dicasNutricionais || raw.Dicas || raw.dicas || "").trim();
  const observacoes = String(
    raw.Observacoes ||
    raw.observacoes ||
    raw["Observações"] ||
    raw.observações ||
    raw.OBS ||
    raw.obs ||
    raw.Observacao ||
    raw.observacao ||
    ""
  ).trim();
  const imagemPreview = raw.Imagem_Preview || raw.imagem_preview || raw.imagemPreview || raw.Imagem || undefined;
  const dataCriacao = raw.Data_Criacao || raw.data_criacao || raw.DataCriacao || raw.dataCriacao || new Date().toISOString();

  return {
    id,
    data,
    dataHora,
    nomePrato,
    descricao: descricao || undefined,
    caloriasEstimadas,
    proteinasEstimadas,
    carboidratosEstimados,
    gordurasEstimadas,
    itensIdentificados,
    dicasNutricionais: dicasNutricionais || undefined,
    observacoes: observacoes || undefined,
    imagemPreview,
  };
}

/**
  * 23_Exercicios normalizer
  */
export function normalizeExercicio(raw: any, index = 0): ExercicioRegistro {
  const id = String(
    raw.Id || raw.id || raw.ID || `EXE_${Date.now()}_${index}`
  );
  const data = String(
    raw.Data ||
    raw.data ||
    raw.Data_Treino ||
    raw.data_treino ||
    new Date().toISOString().split("T")[0]
  ).trim();
  const hora = String(raw.Hora || raw.hora || raw.Horario || raw.horario || "").trim();
  const tipoExercicio = String(
    raw.Tipo_Exercicio ||
    raw.tipo_exercicio ||
    raw.tipoExercicio ||
    raw.Tipo ||
    raw.tipo ||
    raw.Exercicio ||
    raw.exercicio ||
    "MUSCULAÇÃO"
  ).trim().toUpperCase();

  const duracaoMinutos = Math.max(
    0,
    Math.round(
      Number(
        parseCurrency(
          raw.Duracao_Minutos ??
          raw.duracao_minutos ??
          raw.duracaoMinutos ??
          raw.Duracao ??
          raw.duracao ??
          0
        )
      )
    )
  );

  const rawCal = raw.Calorias_Queimadas ?? raw.calorias_queimadas ?? raw.caloriasQueimadas ?? raw.Calorias ?? raw.calorias;
  const caloriasQueimadas = rawCal !== undefined && rawCal !== null && rawCal !== "" ? Math.round(Number(parseCurrency(rawCal))) : undefined;

  const rawIntensidade = String(raw.Intensidade || raw.intensidade || "").trim().toUpperCase();
  const intensidade = rawIntensidade ? (rawIntensidade as "LEVE" | "MODERADO" | "INTENSO") : undefined;

  const observacoes = String(
    raw.Observacoes ||
    raw.observacoes ||
    raw["Observações"] ||
    raw.observações ||
    raw.OBS ||
    raw.obs ||
    raw.Observacao ||
    raw.observacao ||
    ""
  ).trim().toUpperCase();

  const dataCriacao = String(
    raw.Data_Criacao || raw.data_criacao || raw.DataCriacao || raw.dataCriacao || new Date().toISOString()
  );

  return {
    id,
    data,
    hora: hora || undefined,
    tipoExercicio,
    duracaoMinutos,
    caloriasQueimadas: caloriasQueimadas && caloriasQueimadas > 0 ? caloriasQueimadas : undefined,
    intensidade,
    observacoes: observacoes || undefined,
    dataCriacao,
  };
}

/**
 * 22. Normalize Config Lembretes Saude & Perfil (22_Config_Lembretes_Saude)
 * Robustly parses and extracts clean "HH:mm" strings for reminder times,
 * handling Google Sheets 1899 epoch date-time formats, ISO strings, and custom formats.
 */
export function normalizeConfigLembreteSaude(raw: any): LembreteSaudeConfig {
  if (!raw || typeof raw !== "object") return raw;

  const id = String(raw.Id || raw.id || raw.ID || `LEMBRETE_${Date.now()}`).trim();
  const tipo = String(raw.Tipo || raw.tipo || "").trim();
  const rawAtivo = raw.Ativo ?? raw.ativo;
  const ativo =
    rawAtivo === true ||
    rawAtivo === "SIM" ||
    rawAtivo === "sim" ||
    rawAtivo === "TRUE" ||
    rawAtivo === "true" ||
    rawAtivo === 1 ||
    rawAtivo === "1";

  // For height config (CONFIG_PERFIL_ALTURA), horario1 is an integer/number string, don't format as time
  const isPerfilAltura =
    id === "CONFIG_PERFIL_ALTURA" ||
    tipo.toLowerCase().includes("altura") ||
    tipo.toLowerCase().includes("perfil");

  let h1 = String(raw.Horario_1 ?? raw.horario1 ?? raw.Horario1 ?? raw["Horário 1"] ?? raw["Horario 1"] ?? "").trim();
  let h2 = String(raw.Horario_2 ?? raw.horario2 ?? raw.Horario2 ?? raw["Horário 2"] ?? raw["Horario 2"] ?? "").trim();
  let h3 = String(raw.Horario_3 ?? raw.horario3 ?? raw.Horario3 ?? raw["Horário 3"] ?? raw["Horario 3"] ?? "").trim();

  if (!isPerfilAltura) {
    h1 = formatarHora(h1);
    h2 = formatarHora(h2);
    h3 = formatarHora(h3);
  }

  const diasSemana = String(raw.Dias_Semana ?? raw.diasSemana ?? raw.dias_semana ?? "TODOS").trim().toUpperCase() || "TODOS";
  const ultimaAtualizacao = String(
    raw.Ultima_Atualizacao ?? raw.ultimaAtualizacao ?? raw.ultima_atualizacao ?? ""
  ).trim();

  return {
    id,
    Id: id,
    tipo,
    Tipo: tipo,
    ativo: ativo ? "SIM" : "NAO",
    Ativo: ativo ? "SIM" : "NAO",
    horario1: h1,
    Horario_1: h1,
    horario2: h2,
    Horario_2: h2,
    horario3: h3,
    Horario_3: h3,
    diasSemana,
    Dias_Semana: diasSemana,
    ultimaAtualizacao,
    Ultima_Atualizacao: ultimaAtualizacao,
  };
}

/**
 * 24. Normalize Consumo de Café (24_Consumo_Cafe)
 */
export function normalizeConsumoCafe(raw: any, index = 0): ConsumoCafe {
  if (!raw || typeof raw !== "object") return raw;

  const id = String(raw.Id || raw.id || raw.ID || `CAFE_${Date.now()}_${index}`).trim();
  const data = String(
    raw.Data ||
    raw.data ||
    new Date().toISOString().split("T")[0]
  ).trim();

  const rawHora = raw.Hora || raw.hora || raw.Horario || raw.horario || "";
  const hora = formatarHora(rawHora) || (typeof rawHora === "string" ? rawHora.trim() : "");

  const rawQtd = raw.Quantidade ?? raw.quantidade ?? raw.Qtd ?? raw.qtd ?? 1;
  const parsedQtd = Math.max(1, Math.round(Number(parseCurrency(rawQtd)) || 1));

  const observacoes = String(
    raw.Observacoes ||
    raw.observacoes ||
    raw["Observações"] ||
    raw.observações ||
    raw.OBS ||
    raw.obs ||
    raw.Observacao ||
    raw.observacao ||
    ""
  ).trim().toUpperCase();

  const dataCriacao = String(
    raw.Data_Criacao || raw.data_criacao || raw.DataCriacao || raw.dataCriacao || new Date().toISOString()
  );

  return {
    id,
    Id: id,
    data,
    Data: data,
    hora,
    Hora: hora,
    quantidade: parsedQtd,
    Quantidade: parsedQtd,
    observacoes: observacoes || undefined,
    Observacoes: observacoes || undefined,
    dataCriacao,
    Data_Criacao: dataCriacao,
  };
}

