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
    Veiculo: raw.Veiculo ?? raw.veiculo ?? raw.Descrição_Do_Veículo ?? "",
    Km_Atual: kmAtual,
    Km_Percorrido: kmPercorrido,
    Litros: litros,
    Preco_Litro: precoLitro,
    Posto: String(posto).trim(),
    Nome_Posto: String(posto).trim(),
    Motorista: String(raw.Motorista ?? raw.motorista ?? raw.Condutor ?? raw.condutor ?? "").trim(),
    Media_KmL: mediaKmL,
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
  const posto =
    raw.Posto ?? raw.posto ?? raw.Nome_Posto ?? raw["Nome_Posto"] ?? raw.nome_posto ?? "";
  const veiculo =
    raw.Veiculo ?? raw.veiculo ?? raw["Veículo"] ?? raw.Descricao_Do_Veiculo ?? "Veículo";
  const motorista =
    raw.Motorista ?? raw.motorista ?? raw.Condutor ?? raw.condutor ?? "";

  return {
    ...raw,
    Id: String(raw.Id || ""),
    Data: formatDateBR(raw.Data ?? raw.data ?? ""),
    Veiculo: String(veiculo).trim(),
    Motorista: String(motorista).trim(),
    Km_Atual: kmAtual,
    Km_Percorrido: kmPercorrido,
    Litros: litros,
    Preco_Litro: precoLitro,
    Valor_Total: valorTotal,
    Posto: String(posto).trim(),
    Media_KmL: mediaKmL,
    Observacoes: raw.Observacoes ?? raw.Observações ?? raw.observacoes ?? "",
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
 * 18. Normalize CartaoCredito (18_Cartões_De_Crédito)
 */
export function normalizeCartaoCredito(raw: any): CartaoCredito {
  if (!raw || typeof raw !== "object") return raw;
  const limite = parseCurrency(raw.Limite ?? raw.limite ?? 0);
  const fechamento = parseCurrency(raw.Fechamento ?? raw.fechamento ?? 10);
  const vencimento = parseCurrency(raw.Vencimento ?? raw.vencimento ?? 20);
  const gasto = parseCurrency(raw.Gasto ?? raw.gasto ?? 0);
  const nome = raw.Nome ?? raw.nome ?? raw.Cartão ?? raw.Cartao ?? "Cartão de Crédito";

  return {
    ...raw,
    Id: String(raw.Id || ""),
    Nome: String(nome).trim(),
    Limite: limite,
    Fechamento: fechamento,
    Vencimento: vencimento,
    Cor: raw.Cor ?? raw.cor ?? "#0f172a",
    Banco_ID: raw.Banco_ID ?? raw.Banco_Id ?? raw.banco_id ?? raw.bancoId ?? raw.Banco ?? "",
    Gasto: gasto,
    Ativo: raw.Ativo !== false && raw.Ativo !== "NÃO" && raw.Ativo !== "NAO",
    Bandeira: raw.Bandeira ?? raw.bandeira ?? "Mastercard",
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
      0
  );
  let total = parseCurrency(raw.Valor_Total ?? raw["Valor_Total"] ?? raw.valor_total ?? 0);
  let estimado = parseCurrency(
    raw.Valor_Estimado ?? raw["Valor_Estimado"] ?? raw.valor_estimado ?? 0
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

  return {
    ...raw,
    Id: String(raw.Id || ""),
    Descrição: raw.Descrição ?? raw.Descricao ?? raw.descricao ?? "Zona de Risco",
    Nível_De_Risco: (raw.Nível_De_Risco ?? raw.Nivel_De_Risco ?? raw.nivel ?? "MÉDIO") as any,
    Latitude: lat,
    Longitude: lng,
    "Raio_(M)": raio || 300,
    Ativo: raw.Ativo !== false && raw.Ativo !== "NÃO" && raw.Ativo !== "NAO",
    Mensagem_De_Alerta: raw.Mensagem_De_Alerta ?? raw.mensagem ?? "",
    Data_Registro: formatDateBR(raw.Data_Registro ?? raw.data ?? ""),
    Observação: raw.Observação ?? raw.Observacao ?? "",
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
    Categoria: raw.Categoria ?? "Geral",
  };
}
