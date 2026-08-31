import { Lancamento, MetaCategoria } from "../types";
import { parseCurrency, formatCurrency } from "./formatters";

export type PeriodoAlerta = "dia" | "semana" | "mes";

export interface PeriodoFinanceiroResumo {
  periodo: PeriodoAlerta;
  label: string;
  totalReceitas: number;
  totalDespesas: number;
  saldo: number;
  estouro: number; // > 0 quando despesas > receitas
  emAlerta: boolean;
  categoriaOfensora?: {
    categoria: string;
    total: number;
    percentual: number;
  };
  metaEstourada?: {
    categoria: string;
    valorMeta: number;
    gastoTotalMes: number;
    excesso: number;
  };
  comparativoMedia?: {
    mediaHistorica: number;
    percentualAcima: number;
    texto: string;
  };
  orientacao: string;
}

export interface AlertaFinanceiroResult {
  temAlerta: boolean;
  resumos: Record<PeriodoAlerta, PeriodoFinanceiroResumo>;
  periodosEmAlerta: PeriodoAlerta[];
  resumoPrincipal?: PeriodoFinanceiroResumo;
}

/**
 * Returns YYYY-MM-DD string for a given date in local time
 */
function toLocalDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Gets start and end dates (inclusive YYYY-MM-DD) for Day, Week (Mon-Sun), and Month
 */
export function getIntervalosPeriodos(referencia: Date = new Date()) {
  const hojeStr = toLocalDateStr(referencia);

  // Semana atual (Segunda-feira até Domingo)
  const diaSemana = referencia.getDay(); // 0 = Domingo, 1 = Segunda, ...
  const diffSegunda = diaSemana === 0 ? -6 : 1 - diaSemana;
  const segunda = new Date(referencia);
  segunda.setDate(referencia.getDate() + diffSegunda);
  const domingo = new Date(segunda);
  domingo.setDate(segunda.getDate() + 6);

  const inicioSemanaStr = toLocalDateStr(segunda);
  const fimSemanaStr = toLocalDateStr(domingo);

  // Mês atual
  const ano = referencia.getFullYear();
  const mes = referencia.getMonth();
  const primeiroDiaMes = new Date(ano, mes, 1);
  const ultimoDiaMes = new Date(ano, mes + 1, 0);

  const inicioMesStr = toLocalDateStr(primeiroDiaMes);
  const fimMesStr = toLocalDateStr(ultimoDiaMes);
  const mesAnoAtual = `${ano}-${String(mes + 1).padStart(2, "0")}`;

  return {
    hojeStr,
    inicioSemanaStr,
    fimSemanaStr,
    inicioMesStr,
    fimMesStr,
    mesAnoAtual,
  };
}

/**
 * Extracts the effective value of a launch (Valor_Pago if present and > 0, else Valor)
 */
export function getValorEfetivo(l: Lancamento): number {
  if (!l) return 0;
  const pago = parseCurrency(l.Valor_Pago);
  if (pago > 0) return pago;
  return parseCurrency(l.Valor);
}

/**
 * Checks if a transaction is an active expense (excluding canceled/deleted)
 */
export function isDespesaAtiva(l: Lancamento): boolean {
  if (!l) return false;
  const status = String(l.Status || "").toUpperCase().trim();
  if (status === "EXCLUÍDO" || status === "EXCLUIDO" || status === "CANCELADO") {
    return false;
  }
  const tipo = String(l.Tipo || "").toUpperCase().trim();
  return tipo === "DESPESA" || tipo === "ABASTECIMENTO";
}

/**
 * Checks if a transaction is an active revenue (excluding canceled/deleted)
 */
export function isReceitaAtiva(l: Lancamento): boolean {
  if (!l) return false;
  const status = String(l.Status || "").toUpperCase().trim();
  if (status === "EXCLUÍDO" || status === "EXCLUIDO" || status === "CANCELADO") {
    return false;
  }
  const tipo = String(l.Tipo || "").toUpperCase().trim();
  return tipo === "RECEITA";
}

/**
 * Main engine that calculates Financial Alerts for Day, Week, and Month.
 * Pure function with zero external network requests. Runs in < 2ms.
 */
export function calcularAlertasFinanceiros(
  lancamentos: Lancamento[] = [],
  metas: MetaCategoria[] = [],
  dataReferencia: Date = new Date()
): AlertaFinanceiroResult {
  const { hojeStr, inicioSemanaStr, fimSemanaStr, inicioMesStr, fimMesStr, mesAnoAtual } =
    getIntervalosPeriodos(dataReferencia);

  // Agregações de valores para os 3 períodos
  let diaRec = 0, diaDesp = 0;
  let semRec = 0, semDesp = 0;
  let mesRec = 0, mesDesp = 0;

  const despesasPorCategoriaDia = new Map<string, number>();
  const despesasPorCategoriaSem = new Map<string, number>();
  const despesasPorCategoriaMes = new Map<string, number>();

  // Histórico para cálculo de médias anteriores
  const despesasPorDiaHistorico = new Map<string, number>();
  const despesasPorSemanaHistorico = new Map<string, number>();
  const despesasPorMesHistorico = new Map<string, number>();

  for (const l of lancamentos) {
    if (!l) continue;
    const data = String(l.Data || "").trim().substring(0, 10);
    if (!data) continue;

    const valor = getValorEfetivo(l);
    if (valor <= 0) continue;

    const isDesp = isDespesaAtiva(l);
    const isRec = isReceitaAtiva(l);
    const cat = String(l.Categoria || "Outros").trim();

    if (isDesp) {
      // Agregação histórica diária
      despesasPorDiaHistorico.set(data, (despesasPorDiaHistorico.get(data) || 0) + valor);

      // Agregação histórica mensal (YYYY-MM)
      const ym = data.substring(0, 7);
      despesasPorMesHistorico.set(ym, (despesasPorMesHistorico.get(ym) || 0) + valor);

      // Agregação período Dia Atual
      if (data === hojeStr) {
        diaDesp += valor;
        despesasPorCategoriaDia.set(cat, (despesasPorCategoriaDia.get(cat) || 0) + valor);
      }

      // Agregação período Semana Atual
      if (data >= inicioSemanaStr && data <= fimSemanaStr) {
        semDesp += valor;
        despesasPorCategoriaSem.set(cat, (despesasPorCategoriaSem.get(cat) || 0) + valor);
      }

      // Agregação período Mês Atual
      if (data >= inicioMesStr && data <= fimMesStr) {
        mesDesp += valor;
        despesasPorCategoriaMes.set(cat, (despesasPorCategoriaMes.get(cat) || 0) + valor);
      }
    } else if (isRec) {
      // Agregação período Dia Atual
      if (data === hojeStr) {
        diaRec += valor;
      }

      // Agregação período Semana Atual
      if (data >= inicioSemanaStr && data <= fimSemanaStr) {
        semRec += valor;
      }

      // Agregação período Mês Atual
      if (data >= inicioMesStr && data <= fimMesStr) {
        mesRec += valor;
      }
    }
  }

  // Helper para extrair categoria ofensora
  const getCategoriaOfensora = (map: Map<string, number>, totalDesp: number) => {
    if (map.size === 0 || totalDesp <= 0) return undefined;
    let maiorCat = "";
    let maiorVal = 0;
    for (const [cat, val] of map.entries()) {
      if (val > maiorVal) {
        maiorVal = val;
        maiorCat = cat;
      }
    }
    if (!maiorCat || maiorVal <= 0) return undefined;
    return {
      categoria: maiorCat,
      total: maiorVal,
      percentual: Math.round((maiorVal / totalDesp) * 100),
    };
  };

  // Helper para verificar se a categoria ofensora estourou meta no mês
  const checkMetaEstourada = (categoriaNome?: string) => {
    if (!categoriaNome || !metas || metas.length === 0) return undefined;
    const catNorm = String(categoriaNome).toUpperCase().trim();
    const metaObj = metas.find(
      (m) =>
        m.Categoria &&
        (String(m.Categoria).toUpperCase().trim() === catNorm ||
          catNorm.includes(String(m.Categoria).toUpperCase().trim())) &&
        (!m.Mes_Ano || String(m.Mes_Ano) === mesAnoAtual)
    );

    if (!metaObj) return undefined;
    const gastoTotalMes = despesasPorCategoriaMes.get(categoriaNome) || 0;
    const valorMeta = parseCurrency(metaObj.Valor_Meta);
    if (valorMeta > 0 && gastoTotalMes > valorMeta) {
      return {
        categoria: categoriaNome,
        valorMeta,
        gastoTotalMes,
        excesso: gastoTotalMes - valorMeta,
      };
    }
    return undefined;
  };

  // Helper para calcular comparação com médias anteriores
  // Média Diária histórica (excluindo hoje)
  const diasAnteriores = Array.from(despesasPorDiaHistorico.entries()).filter(
    ([d, val]) => d !== hojeStr && val > 0
  );
  const mediaDiaria =
    diasAnteriores.length > 0
      ? diasAnteriores.reduce((acc, [, val]) => acc + val, 0) / diasAnteriores.length
      : 0;

  // Média Mensal histórica (excluindo mês atual)
  const mesesAnteriores = Array.from(despesasPorMesHistorico.entries()).filter(
    ([ym, val]) => ym !== mesAnoAtual && val > 0
  );
  const mediaMensal =
    mesesAnteriores.length > 0
      ? mesesAnteriores.reduce((acc, [, val]) => acc + val, 0) / mesesAnteriores.length
      : 0;

  // Montar Resumo: DIA
  const estouroDia = Math.max(0, diaDesp - diaRec);
  const emAlertaDia = diaDesp > diaRec && diaDesp > 0;
  const ofensoraDia = getCategoriaOfensora(despesasPorCategoriaDia, diaDesp);
  const metaEstouradaDia = checkMetaEstourada(ofensoraDia?.categoria);

  let compDia: PeriodoFinanceiroResumo["comparativoMedia"];
  if (mediaDiaria > 0 && diaDesp > mediaDiaria) {
    const perc = Math.round(((diaDesp - mediaDiaria) / mediaDiaria) * 100);
    compDia = {
      mediaHistorica: mediaDiaria,
      percentualAcima: perc,
      texto: `${perc}% acima da sua média diária (R$ ${formatCurrency(mediaDiaria)})`,
    };
  }

  const orientacoesDia: string[] = [];
  if (ofensoraDia) {
    orientacoesDia.push(`A categoria "${ofensoraDia.categoria}" lidera com R$ ${formatCurrency(ofensoraDia.total)} (${ofensoraDia.percentual}% dos gastos de hoje).`);
  }
  if (compDia) {
    orientacoesDia.push(compDia.texto + ".");
  }
  if (metaEstouradaDia) {
    orientacoesDia.push(`A meta mensal de "${metaEstouradaDia.categoria}" (R$ ${formatCurrency(metaEstouradaDia.valorMeta)}) já foi excedida em R$ ${formatCurrency(metaEstouradaDia.excesso)}.`);
  }

  const resumoDia: PeriodoFinanceiroResumo = {
    periodo: "dia",
    label: "Hoje",
    totalReceitas: diaRec,
    totalDespesas: diaDesp,
    saldo: diaRec - diaDesp,
    estouro: estouroDia,
    emAlerta: emAlertaDia,
    categoriaOfensora: ofensoraDia,
    metaEstourada: metaEstouradaDia,
    comparativoMedia: compDia,
    orientacao: orientacoesDia.join(" "),
  };

  // Montar Resumo: SEMANA
  const estouroSem = Math.max(0, semDesp - semRec);
  const emAlertaSem = semDesp > semRec && semDesp > 0;
  const ofensoraSem = getCategoriaOfensora(despesasPorCategoriaSem, semDesp);
  const metaEstouradaSem = checkMetaEstourada(ofensoraSem?.categoria);

  const orientacoesSem: string[] = [];
  if (ofensoraSem) {
    orientacoesSem.push(`A categoria "${ofensoraSem.categoria}" concentrou R$ ${formatCurrency(ofensoraSem.total)} (${ofensoraSem.percentual}% das despesas da semana).`);
  }
  if (metaEstouradaSem) {
    orientacoesSem.push(`Atenção: a meta mensal para "${metaEstouradaSem.categoria}" já está ultrapassada.`);
  }

  const resumoSemana: PeriodoFinanceiroResumo = {
    periodo: "semana",
    label: "Esta Semana",
    totalReceitas: semRec,
    totalDespesas: semDesp,
    saldo: semRec - semDesp,
    estouro: estouroSem,
    emAlerta: emAlertaSem,
    categoriaOfensora: ofensoraSem,
    metaEstourada: metaEstouradaSem,
    orientacao: orientacoesSem.join(" "),
  };

  // Montar Resumo: MÊS
  const estouroMes = Math.max(0, mesDesp - mesRec);
  const emAlertaMes = mesDesp > mesRec && mesDesp > 0;
  const ofensoraMes = getCategoriaOfensora(despesasPorCategoriaMes, mesDesp);
  const metaEstouradaMes = checkMetaEstourada(ofensoraMes?.categoria);

  let compMes: PeriodoFinanceiroResumo["comparativoMedia"];
  if (mediaMensal > 0 && mesDesp > mediaMensal) {
    const perc = Math.round(((mesDesp - mediaMensal) / mediaMensal) * 100);
    compMes = {
      mediaHistorica: mediaMensal,
      percentualAcima: perc,
      texto: `${perc}% acima da sua média mensal anterior (R$ ${formatCurrency(mediaMensal)})`,
    };
  }

  const orientacoesMes: string[] = [];
  if (ofensoraMes) {
    orientacoesMes.push(`"${ofensoraMes.categoria}" é a maior despesa do mês com R$ ${formatCurrency(ofensoraMes.total)} (${ofensoraMes.percentual}% do total).`);
  }
  if (compMes) {
    orientacoesMes.push(compMes.texto + ".");
  }
  if (metaEstouradaMes) {
    orientacoesMes.push(`A meta mensal de "${metaEstouradaMes.categoria}" foi ultrapassada em R$ ${formatCurrency(metaEstouradaMes.excesso)}.`);
  }

  const resumoMes: PeriodoFinanceiroResumo = {
    periodo: "mes",
    label: "Este Mês",
    totalReceitas: mesRec,
    totalDespesas: mesDesp,
    saldo: mesRec - mesDesp,
    estouro: estouroMes,
    emAlerta: emAlertaMes,
    categoriaOfensora: ofensoraMes,
    metaEstourada: metaEstouradaMes,
    comparativoMedia: compMes,
    orientacao: orientacoesMes.join(" "),
  };

  const periodosEmAlerta: PeriodoAlerta[] = [];
  if (emAlertaDia) periodosEmAlerta.push("dia");
  if (emAlertaSem) periodosEmAlerta.push("semana");
  if (emAlertaMes) periodosEmAlerta.push("mes");

  // Período principal em destaque: Mês > Semana > Dia
  let resumoPrincipal: PeriodoFinanceiroResumo | undefined;
  if (emAlertaMes) resumoPrincipal = resumoMes;
  else if (emAlertaSem) resumoPrincipal = resumoSemana;
  else if (emAlertaDia) resumoPrincipal = resumoDia;

  return {
    temAlerta: periodosEmAlerta.length > 0,
    resumos: {
      dia: resumoDia,
      semana: resumoSemana,
      mes: resumoMes,
    },
    periodosEmAlerta,
    resumoPrincipal,
  };
}
