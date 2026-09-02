import { CartaoCredito, Lancamento } from "../types";
import { parseCurrency, isLancamentoExcluded, isLancamentoVinculadoAoCartao } from "./formatters";

export interface FaturaResumo {
  faturaKey: string;
  label: string;
  vencimento: Date;
  totalGasto: number;
  totalPago: number;
  saldo: number;
  fechada: boolean;
}

/**
 * Retorna a chave "AAAA-MM" da fatura a que uma compra pertence, com base
 * no dia de fechamento do cartão. Compras até o dia de fechamento (inclusive)
 * entram na fatura que fecha NESTE mês; compras após o fechamento entram
 * na fatura do mês seguinte.
 */
export function getFaturaKey(dataCompraISO: string, diaFechamento: number): string {
  const data = new Date(dataCompraISO + "T12:00:00");
  if (isNaN(data.getTime())) return "";
  const dia = data.getDate();
  let mes = data.getMonth();
  let ano = data.getFullYear();
  if (dia > diaFechamento) {
    mes += 1;
    if (mes > 11) {
      mes = 0;
      ano += 1;
    }
  }
  return `${ano}-${String(mes + 1).padStart(2, "0")}`;
}

/** Data de vencimento de uma fatura identificada por faturaKey "AAAA-MM", dado o dia de vencimento do cartão */
export function getFaturaVencimento(faturaKey: string, diaVencimento: number): Date {
  const [anoStr, mesStr] = faturaKey.split("-");
  const ano = Number(anoStr);
  const mes = Number(mesStr) - 1;
  return new Date(ano, mes, diaVencimento, 12, 0, 0);
}

/** Rótulo amigável tipo "Setembro/2026" a partir da chave "2026-09" */
export function getFaturaLabel(faturaKey: string): string {
  const [anoStr, mesStr] = faturaKey.split("-");
  const meses = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
  ];
  const idx = Number(mesStr) - 1;
  return `${meses[idx] || mesStr}/${anoStr}`;
}

export function getFaturasPorCartao(
  cartao: CartaoCredito,
  lancamentos: Lancamento[]
): FaturaResumo[] {
  const diaFechamento = Number(cartao.Dia_Fechamento ?? cartao.Fechamento ?? 10) || 10;
  const diaVencimento = Number(cartao.Dia_Vencimento ?? cartao.Vencimento ?? 20) || 20;
  const hoje = new Date();
  const faturaAtualKey = getFaturaKey(hoje.toISOString().slice(0, 10), diaFechamento);

  const porFatura = new Map<string, { gasto: number; pago: number }>();

  (lancamentos || []).forEach((l) => {
    if (isLancamentoExcluded(l)) return;
    if (!isLancamentoVinculadoAoCartao(l, cartao)) return;

    const dataLanc = String(l.Data || "").slice(0, 10);
    if (!dataLanc) return;
    const key = getFaturaKey(dataLanc, diaFechamento);
    const atual = porFatura.get(key) || { gasto: 0, pago: 0 };

    const valor = parseCurrency(l.Valor ?? 0);
    const valorPago = parseCurrency((l as any).Valor_Pago ?? 0);
    const status = String(l.Status || "").toUpperCase();
    const tipo = String(l.Tipo || "").toUpperCase();
    const cat = String(l.Categoria || "").toUpperCase();
    const desc = String(l.Descricao || (l as any).Descrição || "").toUpperCase();

    const isPagamentoFatura =
      cat.includes("FATURA") || desc.includes("PAGAMENTO DE FATURA") ||
      desc.includes("PAGAMENTO DA FATURA") || tipo === "PAGAMENTO";
    const isReceita = tipo.includes("RECEITA") || cat.includes("RECEITA");

    if (isPagamentoFatura || isReceita) {
      const isPaid =
        status.includes("PAGO") || status.includes("PAGA") ||
        status.includes("REALIZADO") || status.includes("CONCLUIDO") ||
        status.includes("LIQUIDADO") || valorPago > 0;
      if (isPaid) {
        atual.pago += valorPago > 0 ? valorPago : valor;
      }
    } else {
      atual.gasto += valor;
    }

    porFatura.set(key, atual);
  });

  const resultado: FaturaResumo[] = Array.from(porFatura.entries()).map(([faturaKey, { gasto, pago }]) => ({
    faturaKey,
    label: getFaturaLabel(faturaKey),
    vencimento: getFaturaVencimento(faturaKey, diaVencimento),
    totalGasto: gasto,
    totalPago: pago,
    saldo: Math.max(0, gasto - pago),
    fechada: faturaKey < faturaAtualKey,
  }));

  return resultado.sort((a, b) => b.faturaKey.localeCompare(a.faturaKey));
}

