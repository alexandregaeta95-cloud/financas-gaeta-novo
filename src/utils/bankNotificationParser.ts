/**
 * Parser de Notificações Bancárias de PIX (Itaú, Nubank, PicPay e Fallback Genérico)
 */

export interface RawNotificationPayload {
  id: string;
  packageName: string;
  title: string;
  text: string;
  timestamp: number;
}

export interface ParsedPixTransaction {
  id: string;
  rawId: string;
  banco: "Itaú" | "Nubank" | "PicPay" | "Outro";
  tipo: "RECEITA" | "DESPESA";
  valor: number;
  valorFormatado: string;
  pessoa?: string;
  descricaoSugerida: string;
  timestamp: number;
  categoriaSugerida: string;
}

// Pacotes dos bancos monitorados
export const BANK_PACKAGES = {
  ITAU: ["com.itau", "com.itau.personnalite"],
  NUBANK: ["com.nu.production"],
  PICPAY: ["com.picpay"],
};

/**
 * Normaliza e extrai número de valor monetário no formato brasileiro "R$ 1.234,56" ou "1,00"
 */
export function extractMonetaryValue(text: string): number | null {
  if (!text) return null;
  // Match R$ 1.234,56 ou R$1,00 ou 1.234,56
  const match = text.match(/R\$\s*([\d\.,]+)/i) || text.match(/(?:^|\s)([\d]{1,3}(?:\.[\d]{3})*,\d{2})(?:\s|$|[,\.])/);
  if (!match) return null;

  const rawNum = match[1].replace(/\./g, "").replace(",", ".");
  const val = parseFloat(rawNum);
  return isNaN(val) || val <= 0 ? null : val;
}

/**
 * Formata número em moeda brasileira R$ 1.234,56
 */
export function formatCurrencyBRL(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

/**
 * Parser principal de notificações de PIX
 */
export function parseBankNotification(payload: RawNotificationPayload): ParsedPixTransaction | null {
  const pkg = (payload.packageName || "").toLowerCase();
  const title = (payload.title || "").trim();
  const text = (payload.text || "").trim();
  const combined = `${title} ${text}`;

  // Se a notificação não contiver menção a Pix ou Transferência nem valor, descarta
  if (!/pix|transfer[eê]ncia|recebeu|pagamento/i.test(combined)) {
    return null;
  }

  const valor = extractMonetaryValue(text) || extractMonetaryValue(title);
  if (!valor) return null;

  // 1. ITAÚ
  // Pacotes: com.itau ou com.itau.personnalite
  if (BANK_PACKAGES.ITAU.some((p) => pkg.includes(p)) || /ita[uú]/i.test(title)) {
    // Exemplo Recebido:
    // Título: "Pix recebido"
    // Corpo: "Você recebeu R$ 1,00 de Alexandre, CPF XXX.906.278-XX."
    const isRecebido = /recebido|recebeu/i.test(combined);
    // Exemplo Enviado:
    // Título: "Feito. Pix enviado"
    // Corpo: "Você enviou R$ 1,00 para FERNANDA, CPF XXX.190.748-XX."
    const isEnviado = /enviou|enviado/i.test(combined);

    let pessoa = "";
    if (isRecebido) {
      // Extrai nome após "de " até a vírgula ou CPF
      const matchPessoa = text.match(/de\s+([^,]+?)(?:,\s*CPF|$)/i);
      if (matchPessoa) pessoa = matchPessoa[1].trim();
    } else if (isEnviado) {
      // Extrai nome após "para " até a vírgula ou CPF
      const matchPessoa = text.match(/para\s+([^,]+?)(?:,\s*CPF|$)/i);
      if (matchPessoa) pessoa = matchPessoa[1].trim();
    }

    const tipo: "RECEITA" | "DESPESA" = isRecebido ? "RECEITA" : "DESPESA";
    const descricao = tipo === "RECEITA"
      ? `PIX RECEBIDO - ${pessoa ? pessoa.toUpperCase() : "ITAÚ"}`
      : `PIX ENVIADO - ${pessoa ? pessoa.toUpperCase() : "ITAÚ"}`;

    return {
      id: `itau_${valor}_${Math.floor(payload.timestamp / 120000)}`,
      rawId: payload.id,
      banco: "Itaú",
      tipo,
      valor,
      valorFormatado: formatCurrencyBRL(valor),
      pessoa: pessoa || undefined,
      descricaoSugerida: descricao,
      timestamp: payload.timestamp,
      categoriaSugerida: tipo === "RECEITA" ? "OUTRAS RECEITAS" : "OUTRAS DESPESAS",
    };
  }

  // 2. NUBANK
  // Pacote: com.nu.production
  if (BANK_PACKAGES.NUBANK.some((p) => pkg.includes(p)) || /nubank/i.test(title)) {
    // Exemplo Recebido real:
    // Título: "Transferência recebida"
    // Corpo: "Recebemos sua transferência de R$ 1,00." -> NÃO contém nome de pessoa!
    // Outro formato eventual: "Você recebeu uma transferência de R$ 10,00 de Fulano"
    const isRecebido = /recebida|recebido|recebemos/i.test(combined);
    const isEnviado = /enviou|enviada|pagamento|transferiu/i.test(combined);

    let pessoa = "";

    if (isEnviado) {
      // Se for enviado: procurar "para <Pessoa>"
      const matchPara = text.match(/para\s+([^,\.]+?)(?:\.|$)/i);
      if (matchPara) {
        pessoa = matchPara[1].trim();
      }
    } else if (isRecebido) {
      // Se for recebido: verificar se existe "de <Nome>" que NÃO seja "de R$" nem termos genéricos
      // Caso 1: "de R$ 10,00 de Fulano"
      const matchDePosValor = text.match(/R\$\s*[\d\.,]+\s+de\s+([^,\.]+?)(?:\.|$)/i);
      if (matchDePosValor) {
        pessoa = matchDePosValor[1].trim();
      } else {
        // Caso 2: "transferência de Fulano de Tal" (onde o que vem após "de" não é R$, valor numérico nem "sua")
        const matchDeDireto = text.match(/de\s+([^,\.]+?)(?:\.|$)/i);
        if (matchDeDireto) {
          const candidato = matchDeDireto[1].trim();
          // Ignora se for valor em dinheiro, "sua transferência", "um Pix", etc.
          const isValorOuInvalido = /^R\$|\d+|sua|um\b|uma\b|transfer/i.test(candidato);
          if (!isValorOuInvalido) {
            pessoa = candidato;
          }
        }
      }
    }

    // Validação extra de segurança: nunca aceitar moeda, número ou termos genéricos como pessoa
    if (pessoa && (/R\$|^\d+|\btransfer[eê]ncia\b|\bsua\b/i.test(pessoa))) {
      pessoa = "";
    }

    const tipo: "RECEITA" | "DESPESA" = isRecebido ? "RECEITA" : isEnviado ? "DESPESA" : "RECEITA";
    const descricao = tipo === "RECEITA"
      ? (pessoa ? `PIX RECEBIDO - ${pessoa.toUpperCase()}` : "PIX RECEBIDO - NUBANK")
      : (pessoa ? `PIX ENVIADO - ${pessoa.toUpperCase()}` : "PIX ENVIADO - NUBANK");

    return {
      id: `nubank_${valor}_${Math.floor(payload.timestamp / 120000)}`,
      rawId: payload.id,
      banco: "Nubank",
      tipo,
      valor,
      valorFormatado: formatCurrencyBRL(valor),
      pessoa: pessoa || undefined,
      descricaoSugerida: descricao,
      timestamp: payload.timestamp,
      categoriaSugerida: tipo === "RECEITA" ? "OUTRAS RECEITAS" : "OUTRAS DESPESAS",
    };
  }

  // 3. PICPAY
  // Pacote: com.picpay
  if (BANK_PACKAGES.PICPAY.some((p) => pkg.includes(p)) || /picpay/i.test(title)) {
    // Exemplo Recebido:
    // Título: "NOME enviou um Pix para você" (o nome de quem mandou entra no título)
    // Corpo: "Você recebeu um Pix de R$ 1,00. Toque para visualizar o pagamento"
    const isRecebido = /recebeu|para voc[eê]/i.test(combined);

    let pessoa = "";
    // Título no PicPay: "Alexandre enviou um Pix para você"
    const matchTitulo = title.match(/^(.+?)\s+enviou\s+um\s+Pix/i);
    if (matchTitulo) {
      pessoa = matchTitulo[1].trim();
    } else {
      const matchCorpo = text.match(/de\s+([^,\.]+)/i);
      if (matchCorpo) pessoa = matchCorpo[1].trim();
    }

    const tipo: "RECEITA" | "DESPESA" = isRecebido ? "RECEITA" : "DESPESA";
    const descricao = tipo === "RECEITA"
      ? `PIX RECEBIDO - ${pessoa ? pessoa.toUpperCase() : "PICPAY"}`
      : `PIX ENVIADO - ${pessoa ? pessoa.toUpperCase() : "PICPAY"}`;

    return {
      id: `picpay_${valor}_${Math.floor(payload.timestamp / 120000)}`,
      rawId: payload.id,
      banco: "PicPay",
      tipo,
      valor,
      valorFormatado: formatCurrencyBRL(valor),
      pessoa: pessoa || undefined,
      descricaoSugerida: descricao,
      timestamp: payload.timestamp,
      categoriaSugerida: tipo === "RECEITA" ? "OUTRAS RECEITAS" : "OUTRAS DESPESAS",
    };
  }

  // 4. Fallback Genérico para outros bancos com PIX
  if (/pix/i.test(combined)) {
    const isRecebido = /recebeu|recebido|recebemos/i.test(combined);
    const tipo: "RECEITA" | "DESPESA" = isRecebido ? "RECEITA" : "DESPESA";

    return {
      id: `outro_${valor}_${Math.floor(payload.timestamp / 120000)}`,
      rawId: payload.id,
      banco: "Outro",
      tipo,
      valor,
      valorFormatado: formatCurrencyBRL(valor),
      descricaoSugerida: `PIX ${tipo} - ${valor}`,
      timestamp: payload.timestamp,
      categoriaSugerida: tipo === "RECEITA" ? "OUTRAS RECEITAS" : "OUTRAS DESPESAS",
    };
  }

  return null;
}

/**
 * Deduplica lista de transações PIX:
 * Mesmo valor + mesmo banco com diferença menor que 2 minutos (120.000 ms) são unificados no mesmo evento.
 */
export function deduplicatePixTransactions(transactions: ParsedPixTransaction[]): ParsedPixTransaction[] {
  const result: ParsedPixTransaction[] = [];

  for (const item of transactions) {
    const isDuplicate = result.some(
      (existing) =>
        existing.banco === item.banco &&
        Math.abs(existing.valor - item.valor) < 0.001 &&
        existing.tipo === item.tipo &&
        Math.abs(existing.timestamp - item.timestamp) < 120000
    );

    if (!isDuplicate) {
      result.push(item);
    }
  }

  return result;
}
