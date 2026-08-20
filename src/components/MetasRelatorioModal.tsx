import React, { useState, useMemo } from "react";
import {
  X,
  Printer,
  Download,
  BarChart3,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { MetaCategoria, Lancamento } from "../types";
import { formatCurrency, parseCurrency } from "../utils/formatters";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  metas: MetaCategoria[];
  lancamentos: Lancamento[];
}

const MESES_NOMES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const MESES_ABREV = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

const MONTH_NAMES_MAP: Record<string, number> = {
  jan: 1, janeiro: 1, january: 1,
  fev: 2, fevereiro: 2, february: 2,
  mar: 3, marco: 3, março: 3, march: 3,
  abr: 4, abril: 4, april: 4,
  mai: 5, maio: 5, may: 5,
  jun: 6, junho: 6, june: 6,
  jul: 7, julho: 7, july: 7,
  ago: 8, agosto: 8, august: 8,
  set: 9, setembro: 9, september: 9,
  out: 10, outubro: 10, october: 10,
  nov: 11, novembro: 11, november: 11,
  dez: 12, dezembro: 12, december: 12,
};

function normalizeCategory(cat?: string | null): string {
  if (!cat) return "";
  return String(cat)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[_\-\s]+/g, " ")
    .trim()
    .toUpperCase();
}

function categoriesMatch(
  metaCat?: string | null,
  lancamentoCat?: string | null,
  lancamentoTipo?: string | null
): boolean {
  const mNorm = normalizeCategory(metaCat);
  const lNorm = normalizeCategory(lancamentoCat);
  const tNorm = normalizeCategory(lancamentoTipo);

  if (!mNorm) return false;
  if (mNorm === lNorm) return true;

  const isFuelMeta = mNorm === "COMBUSTIVEL" || mNorm === "ABASTECIMENTO" || mNorm === "GASOLINA";
  const isFuelLancamento =
    lNorm === "COMBUSTIVEL" ||
    lNorm === "ABASTECIMENTO" ||
    lNorm === "GASOLINA" ||
    tNorm === "ABASTECIMENTO";

  if (isFuelMeta && isFuelLancamento) return true;

  if (
    (mNorm === "MERCADO" && lNorm === "SUPERMERCADO") ||
    (mNorm === "SUPERMERCADO" && lNorm === "MERCADO")
  ) {
    return true;
  }

  return false;
}

function extractYearMonth(dateVal?: any): { year: number; month: number } | null {
  if (dateVal === null || dateVal === undefined || dateVal === "") return null;

  if (dateVal instanceof Date && !isNaN(dateVal.getTime())) {
    return { year: dateVal.getUTCFullYear(), month: dateVal.getUTCMonth() + 1 };
  }

  if (typeof dateVal === "number" && dateVal > 20000 && dateVal < 60000) {
    const epoch = new Date(Date.UTC(1899, 11, 30));
    const jsDate = new Date(epoch.getTime() + dateVal * 86400000);
    if (!isNaN(jsDate.getTime())) {
      return { year: jsDate.getUTCFullYear(), month: jsDate.getUTCMonth() + 1 };
    }
  }

  const str = String(dateVal).trim();
  if (!str) return null;

  const isoMatch = str.match(/^(\d{4})[-/.](\d{1,2})/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10);
    if (month >= 1 && month <= 12) {
      return { year, month };
    }
  }

  const brFullMatch = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/);
  if (brFullMatch) {
    const month = parseInt(brFullMatch[2], 10);
    let year = parseInt(brFullMatch[3], 10);
    if (year < 100) {
      year = year < 70 ? 2000 + year : 1900 + year;
    }
    if (month >= 1 && month <= 12 && year > 1900) {
      return { year, month };
    }
  }

  const brMonthYearMatch = str.match(/^(\d{1,2})[-/.](\d{2,4})$/);
  if (brMonthYearMatch) {
    const month = parseInt(brMonthYearMatch[1], 10);
    let year = parseInt(brMonthYearMatch[2], 10);
    if (year < 100) {
      year = year < 70 ? 2000 + year : 1900 + year;
    }
    if (month >= 1 && month <= 12 && year > 1900) {
      return { year, month };
    }
  }

  const textMonthMatch = str.toLowerCase().match(/^([a-zçãé]+)[-/\s]+(\d{2,4})$/);
  if (textMonthMatch) {
    const monthName = textMonthMatch[1].normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    let year = parseInt(textMonthMatch[2], 10);
    if (year < 100) {
      year = year < 70 ? 2000 + year : 1900 + year;
    }
    const month = MONTH_NAMES_MAP[monthName] || MONTH_NAMES_MAP[monthName.slice(0, 3)];
    if (month && year > 1900) {
      return { year, month };
    }
  }

  const singleMonthMatch = str.match(/^0?([1-9]|1[0-2])$/);
  if (singleMonthMatch) {
    const month = parseInt(singleMonthMatch[1], 10);
    return { year: new Date().getUTCFullYear(), month };
  }

  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 };
  }

  return null;
}

export const MetasRelatorioModal: React.FC<Props> = ({
  isOpen,
  onClose,
  metas,
  lancamentos,
}) => {
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth() + 1);

  // Available months and years in system
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    years.add(currentDate.getFullYear());
    metas.forEach((m) => {
      const ym = extractYearMonth(m.Mes_Ano);
      if (ym?.year) years.add(ym.year);
    });
    lancamentos.forEach((l) => {
      const ym = extractYearMonth(l.Data);
      if (ym?.year) years.add(ym.year);
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [metas, lancamentos, currentDate]);

  // Metas for selected month & year (or fallback to latest)
  const reportMetas = useMemo(() => {
    return metas.map((m) => {
      const targetYM = extractYearMonth(m.Mes_Ano) || {
        year: selectedYear,
        month: selectedMonth,
      };

      const metaCatNorm = normalizeCategory(m.Categoria);
      const isIncomeMeta =
        metaCatNorm === "RECEITA" ||
        metaCatNorm === "RENDIMENTO" ||
        metaCatNorm === "SALARIO" ||
        metaCatNorm === "ENTRADA";

      const spent = lancamentos
        .filter((l) => {
          const t = String(l.Tipo || "").trim().toUpperCase();
          if (isIncomeMeta) {
            return t === "RECEITA";
          }
          return t === "DESPESA" || t === "ABASTECIMENTO";
        })
        .filter((l) => {
          const lYM = extractYearMonth(l.Data);
          if (!lYM) return false;
          return lYM.year === selectedYear && lYM.month === selectedMonth;
        })
        .filter((l) => categoriesMatch(m.Categoria, l.Categoria, l.Tipo))
        .reduce((sum, l) => sum + (parseCurrency(l.Valor_Pago ?? l.Valor) || 0), 0);

      const target = parseCurrency(m.Valor_Meta) || 1;
      const pct = Math.round((spent / target) * 100);
      const alertThreshold = parseCurrency(m.Alerta_Porcentagem) || 80;
      const isOver = spent > target;
      const isNear = pct >= alertThreshold && !isOver;
      const saldo = target - spent;

      return {
        ...m,
        spent,
        target,
        pct,
        alertThreshold,
        isOver,
        isNear,
        saldo,
        isIncomeMeta,
      };
    });
  }, [metas, lancamentos, selectedYear, selectedMonth]);

  // Totals for the selected month
  const totals = useMemo(() => {
    const totalMeta = reportMetas.reduce((acc, m) => acc + m.target, 0);
    const totalRealizado = reportMetas.reduce((acc, m) => acc + m.spent, 0);
    const totalSaldo = totalMeta - totalRealizado;
    const avgPct = totalMeta > 0 ? Math.round((totalRealizado / totalMeta) * 100) : 0;
    const overCount = reportMetas.filter((m) => m.isOver).length;
    const alertCount = reportMetas.filter((m) => m.isNear).length;
    const okCount = reportMetas.filter((m) => !m.isOver && !m.isNear).length;

    return {
      totalMeta,
      totalRealizado,
      totalSaldo,
      avgPct,
      overCount,
      alertCount,
      okCount,
    };
  }, [reportMetas]);

  // Historical calculation: Last 6 months evolution
  const historicalData = useMemo(() => {
    const monthsList: { label: string; year: number; month: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(selectedYear, selectedMonth - 1 - i, 1);
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      monthsList.push({
        label: `${MESES_ABREV[m - 1]}/${String(y).slice(-2)}`,
        year: y,
        month: m,
      });
    }

    // Top categories with metas
    const topCategories: string[] = Array.from(
      new Set<string>(
        metas
          .map((m) => String(m.Categoria || "").trim().toUpperCase())
          .filter((c) => c.length > 0)
      )
    ).slice(0, 6);

    const dataByMonth = monthsList.map((mo) => {
      const categorySpent: Record<string, number> = {};
      let monthTotal = 0;

      topCategories.forEach((cat) => {
        const spent = lancamentos
          .filter((l) => {
            const t = String(l.Tipo || "").trim().toUpperCase();
            return t === "DESPESA" || t === "ABASTECIMENTO";
          })
          .filter((l) => {
            const lYM = extractYearMonth(l.Data);
            return lYM && lYM.year === mo.year && lYM.month === mo.month;
          })
          .filter((l) => categoriesMatch(cat, l.Categoria, l.Tipo))
          .reduce((sum, l) => sum + (parseCurrency(l.Valor_Pago ?? l.Valor) || 0), 0);

        categorySpent[cat] = spent;
        monthTotal += spent;
      });

      return {
        ...mo,
        categorySpent,
        monthTotal,
      };
    });

    const maxMonthTotal = Math.max(...dataByMonth.map((d) => d.monthTotal), 100);

    return {
      monthsList,
      topCategories,
      dataByMonth,
      maxMonthTotal,
    };
  }, [metas, lancamentos, selectedYear, selectedMonth]);

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  const currentMonthName = MESES_NOMES[selectedMonth - 1];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 print:p-0 print:bg-white print:static print:overflow-visible">
      {/* Print stylesheet override */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 12mm 12mm 12mm 12mm;
          }
          body {
            background-color: #ffffff !important;
            color: #0f172a !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
          .print-container {
            border: none !important;
            box-shadow: none !important;
            width: 100% !important;
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            background: #ffffff !important;
            color: #0f172a !important;
          }
          .print-card {
            background: #f8fafc !important;
            border: 1px solid #e2e8f0 !important;
            color: #0f172a !important;
          }
          .print-table th {
            background: #f1f5f9 !important;
            color: #0f172a !important;
            border-color: #cbd5e1 !important;
          }
          .print-table td {
            border-color: #e2e8f0 !important;
            color: #0f172a !important;
          }
          .print-text-dark {
            color: #0f172a !important;
          }
          .print-text-muted {
            color: #475569 !important;
          }
          .print-progress-bg {
            background: #e2e8f0 !important;
          }
        }
      `}</style>

      <div className="print-container bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-5xl my-4 sm:my-8 shadow-2xl overflow-hidden flex flex-col text-slate-100 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Top Control Bar (Hidden on print) */}
        <div className="no-print p-4 sm:p-5 bg-slate-950/80 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base leading-tight">
                Relatório de Metas & Evolução Financeira
              </h3>
              <p className="text-xs text-slate-400">
                Visualização executiva com comparativos e exportação para PDF
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Filter selectors */}
            <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="bg-transparent text-white font-medium focus:outline-hidden cursor-pointer"
              >
                {MESES_NOMES.map((name, i) => (
                  <option key={name} value={i + 1} className="bg-slate-900 text-white">
                    {name}
                  </option>
                ))}
              </select>

              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="bg-transparent text-white font-medium focus:outline-hidden cursor-pointer ml-1"
              >
                {availableYears.map((y) => (
                  <option key={y} value={y} className="bg-slate-900 text-white">
                    {y}
                  </option>
                ))}
              </select>
            </div>

            {/* Print button */}
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl transition-all shadow-xs cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir / Salvar PDF</span>
            </button>

            {/* Close button */}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Report Body */}
        <div id="relatorio-metas-print" className="p-4 sm:p-8 space-y-6 overflow-y-auto max-h-[80vh] print:max-h-none print:overflow-visible">
          
          {/* Official Report Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-800 print:border-slate-300 gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-md bg-emerald-500/10 text-emerald-400 print:bg-emerald-100 print:text-emerald-800 border border-emerald-500/20">
                  RELATÓRIO FINANCEIRO
                </span>
                <span className="text-xs text-slate-400 print-text-muted">
                  Finanças Pessoais & Gestão Orçamentária
                </span>
              </div>
              <h1 className="text-2xl font-black text-white print-text-dark tracking-tight mt-1">
                Desempenho de Metas de Categoria
              </h1>
              <p className="text-xs text-slate-400 print-text-muted mt-0.5">
                Competência: <strong className="text-white print-text-dark">{currentMonthName} de {selectedYear}</strong>
              </p>
            </div>

            <div className="text-left sm:text-right text-[11px] text-slate-400 print-text-muted space-y-0.5">
              <div>Emitido em: <strong className="text-slate-200 print-text-dark">{new Date().toLocaleDateString("pt-BR")} às {new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</strong></div>
              <div>Metas Analisadas: <strong className="text-slate-200 print-text-dark">{reportMetas.length} categorias</strong></div>
            </div>
          </div>

          {/* Consolidated KPI Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 print:gap-2">
            <div className="print-card p-4 bg-slate-950/70 border border-slate-800 rounded-2xl space-y-1">
              <span className="text-[11px] text-slate-400 print-text-muted font-medium block">
                Total Metas Orçadas
              </span>
              <div className="text-lg sm:text-xl font-mono font-bold text-white print-text-dark">
                R$ {formatCurrency(totals.totalMeta)}
              </div>
              <span className="text-[10px] text-slate-500 print-text-muted">
                Teto orçamentário previsto
              </span>
            </div>

            <div className="print-card p-4 bg-slate-950/70 border border-slate-800 rounded-2xl space-y-1">
              <span className="text-[11px] text-slate-400 print-text-muted font-medium block">
                Total Realizado (Gasto)
              </span>
              <div className="text-lg sm:text-xl font-mono font-bold text-emerald-400 print:text-emerald-700">
                R$ {formatCurrency(totals.totalRealizado)}
              </div>
              <div className="flex items-center gap-1 text-[10px] text-slate-400 print-text-muted">
                <span>{totals.avgPct}% do total previsto</span>
              </div>
            </div>

            <div className="print-card p-4 bg-slate-950/70 border border-slate-800 rounded-2xl space-y-1">
              <span className="text-[11px] text-slate-400 print-text-muted font-medium block">
                Saldo / Economia
              </span>
              <div className={`text-lg sm:text-xl font-mono font-bold ${
                totals.totalSaldo >= 0 ? "text-emerald-400 print:text-emerald-700" : "text-rose-400 print:text-rose-700"
              }`}>
                R$ {formatCurrency(Math.abs(totals.totalSaldo))}
              </div>
              <span className="text-[10px] text-slate-500 print-text-muted">
                {totals.totalSaldo >= 0 ? "Sobrou do orçamento" : "Excedeu o orçamento"}
              </span>
            </div>

            <div className="print-card p-4 bg-slate-950/70 border border-slate-800 rounded-2xl space-y-1">
              <span className="text-[11px] text-slate-400 print-text-muted font-medium block">
                Status das Metas
              </span>
              <div className="flex items-center gap-2 pt-0.5">
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 print:text-emerald-700">
                  <CheckCircle2 className="w-3.5 h-3.5" /> {totals.okCount}
                </span>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-400 print:text-amber-700">
                  <AlertTriangle className="w-3.5 h-3.5" /> {totals.alertCount}
                </span>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-400 print:text-rose-700">
                  <AlertCircle className="w-3.5 h-3.5" /> {totals.overCount}
                </span>
              </div>
              <span className="text-[10px] text-slate-500 print-text-muted">
                {totals.overCount === 0 ? "Nenhuma meta ultrapassada" : `${totals.overCount} categoria(s) estourada(s)`}
              </span>
            </div>
          </div>

          {/* Section 1: Detailed Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white print-text-dark uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-400 print:text-emerald-700" />
                Detalhamento por Categoria ({currentMonthName}/{selectedYear})
              </h2>
              <span className="text-[11px] text-slate-400 print-text-muted">
                Valores calculados em tempo real
              </span>
            </div>

            {reportMetas.length === 0 ? (
              <div className="p-6 text-center bg-slate-950/50 border border-slate-800 rounded-2xl text-slate-500 text-xs">
                Nenhuma meta cadastrada para este mês.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-800 print:border-slate-300">
                <table className="print-table w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 print-text-muted text-[11px] uppercase tracking-wider">
                      <th className="p-3 font-semibold">Categoria</th>
                      <th className="p-3 font-semibold text-right">Meta (R$)</th>
                      <th className="p-3 font-semibold text-right">Realizado (R$)</th>
                      <th className="p-3 font-semibold text-right">Saldo (R$)</th>
                      <th className="p-3 font-semibold text-center w-36">Progresso</th>
                      <th className="p-3 font-semibold text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 print:divide-slate-200">
                    {reportMetas.map((m, idx) => (
                      <tr
                        key={`${m.Id || "row"}-${idx}`}
                        className="hover:bg-slate-800/30 transition-colors"
                      >
                        <td className="p-3 font-semibold text-white print-text-dark">
                          {m.Categoria}
                          <span className="block text-[10px] font-normal text-slate-400 print-text-muted">
                            Alerta configurado em {m.alertThreshold}%
                          </span>
                        </td>

                        <td className="p-3 text-right font-mono font-medium text-slate-300 print-text-dark">
                          R$ {formatCurrency(m.target)}
                        </td>

                        <td className="p-3 text-right font-mono font-bold text-white print-text-dark">
                          R$ {formatCurrency(m.spent)}
                        </td>

                        <td className="p-3 text-right font-mono font-semibold">
                          <span
                            className={
                              m.saldo >= 0
                                ? "text-emerald-400 print:text-emerald-700"
                                : "text-rose-400 print:text-rose-700"
                            }
                          >
                            {m.saldo >= 0 ? "+" : "-"} R$ {formatCurrency(Math.abs(m.saldo))}
                          </span>
                        </td>

                        <td className="p-3">
                          <div className="space-y-1">
                            <div className="flex justify-between text-[10px]">
                              <span className="text-slate-400 print-text-muted">{m.pct}%</span>
                            </div>
                            <div className="print-progress-bg w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800 print:border-slate-300">
                              <div
                                className={`h-full transition-all ${
                                  m.isOver
                                    ? "bg-rose-500"
                                    : m.isNear
                                    ? "bg-amber-500"
                                    : "bg-emerald-500"
                                }`}
                                style={{ width: `${Math.min(100, m.pct)}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        <td className="p-3 text-center">
                          {m.isOver ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 print:bg-rose-100 print:text-rose-800 border border-rose-500/20">
                              <AlertCircle className="w-3 h-3" /> Ultrapassada
                            </span>
                          ) : m.isNear ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 print:bg-amber-100 print:text-amber-800 border border-amber-500/20">
                              <AlertTriangle className="w-3 h-3" /> Atenção
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 print:bg-emerald-100 print:text-emerald-800 border border-emerald-500/20">
                              <CheckCircle2 className="w-3 h-3" /> No Limite
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-950 font-bold border-t border-slate-700 print:border-slate-300 text-white print-text-dark">
                      <td className="p-3">TOTAL CONSOLIDADO</td>
                      <td className="p-3 text-right font-mono">
                        R$ {formatCurrency(totals.totalMeta)}
                      </td>
                      <td className="p-3 text-right font-mono">
                        R$ {formatCurrency(totals.totalRealizado)}
                      </td>
                      <td className="p-3 text-right font-mono">
                        <span
                          className={
                            totals.totalSaldo >= 0
                              ? "text-emerald-400 print:text-emerald-700"
                              : "text-rose-400 print:text-rose-700"
                          }
                        >
                          {totals.totalSaldo >= 0 ? "+" : "-"} R${" "}
                          {formatCurrency(Math.abs(totals.totalSaldo))}
                        </span>
                      </td>
                      <td className="p-3 text-center font-mono">{totals.avgPct}% médio</td>
                      <td className="p-3 text-center">
                        <span className="text-[11px] text-slate-300 print-text-dark font-medium">
                          {totals.overCount === 0 ? "Orçamento Saudável" : "Revisar Gastos"}
                        </span>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* Section 2: Visual Comparison Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4">
            
            {/* Chart 1: Meta vs. Realizado (Mês Atual) */}
            <div className="print-card p-5 bg-slate-950/70 border border-slate-800 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-white print-text-dark text-xs uppercase tracking-wider flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-emerald-400 print:text-emerald-700" />
                  Comparativo Meta vs. Realizado ({currentMonthName})
                </h3>
                <div className="flex items-center gap-3 text-[10px]">
                  <span className="flex items-center gap-1 text-slate-400 print-text-muted">
                    <span className="w-2.5 h-2.5 rounded-xs bg-slate-600 inline-block" /> Meta
                  </span>
                  <span className="flex items-center gap-1 text-slate-400 print-text-muted">
                    <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500 inline-block" /> Realizado
                  </span>
                </div>
              </div>

              {reportMetas.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs">Sem dados para o gráfico.</div>
              ) : (
                <div className="space-y-3.5 pt-1">
                  {reportMetas.map((m, idx) => {
                    const maxVal = Math.max(m.target, m.spent, 100);
                    const targetWidth = Math.round((m.target / maxVal) * 100);
                    const spentWidth = Math.round((m.spent / maxVal) * 100);

                    return (
                      <div key={`chart-cat-${idx}`} className="space-y-1">
                        <div className="flex justify-between text-xs font-semibold">
                          <span className="text-slate-200 print-text-dark">{m.Categoria}</span>
                          <span className={m.isOver ? "text-rose-400 print:text-rose-700" : "text-emerald-400 print:text-emerald-700"}>
                            R$ {formatCurrency(m.spent)} <span className="text-slate-400 print-text-muted font-normal">/ R$ {formatCurrency(m.target)}</span>
                          </span>
                        </div>

                        {/* Dual Bar System */}
                        <div className="space-y-1">
                          {/* Target bar */}
                          <div className="print-progress-bg w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800 print:border-slate-300">
                            <div
                              className="h-full bg-slate-600 print:bg-slate-400 rounded-full"
                              style={{ width: `${targetWidth}%` }}
                            />
                          </div>

                          {/* Spent bar */}
                          <div className="print-progress-bg w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800 print:border-slate-300">
                            <div
                              className={`h-full rounded-full transition-all ${
                                m.isOver
                                  ? "bg-rose-500"
                                  : m.isNear
                                  ? "bg-amber-500"
                                  : "bg-emerald-500"
                              }`}
                              style={{ width: `${spentWidth}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Chart 2: Historical Evolution (Last 6 Months) */}
            <div className="print-card p-5 bg-slate-950/70 border border-slate-800 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-white print-text-dark text-xs uppercase tracking-wider flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400 print:text-emerald-700" />
                  Evolução Histórica dos Últimos 6 Meses
                </h3>
                <span className="text-[10px] text-slate-400 print-text-muted">
                  Gasto mensal acumulado
                </span>
              </div>

              {/* Column Bar Visualizer */}
              <div className="pt-2">
                <div className="grid grid-cols-6 gap-2 items-end h-44 pb-2 border-b border-slate-800 print:border-slate-300">
                  {historicalData.dataByMonth.map((d, i) => {
                    const heightPct = Math.round((d.monthTotal / historicalData.maxMonthTotal) * 100);
                    const isSelected = d.year === selectedYear && d.month === selectedMonth;

                    return (
                      <div key={`hist-bar-${i}`} className="flex flex-col items-center gap-1.5 h-full justify-end group">
                        <span className="text-[9px] font-mono text-slate-400 print-text-muted">
                          R${(d.monthTotal / 1000).toFixed(1)}k
                        </span>
                        
                        <div className="w-full max-w-[36px] bg-slate-900 print:bg-slate-200 rounded-t-lg overflow-hidden flex flex-col justify-end h-full">
                          <div
                            className={`w-full rounded-t-lg transition-all ${
                              isSelected
                                ? "bg-emerald-500 print:bg-emerald-600 shadow-lg shadow-emerald-500/20"
                                : "bg-emerald-600/60 print:bg-emerald-400 hover:bg-emerald-500"
                            }`}
                            style={{ height: `${Math.max(8, heightPct)}%` }}
                          />
                        </div>

                        <span className={`text-[10px] font-semibold ${isSelected ? "text-emerald-400 print:text-emerald-700" : "text-slate-400 print-text-muted"}`}>
                          {d.label}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Categories Legend */}
                <div className="mt-4 flex flex-wrap gap-2 text-[10px]">
                  {historicalData.topCategories.map((cat, i) => (
                    <span
                      key={cat}
                      className="px-2 py-0.5 rounded-md bg-slate-800/80 print:bg-slate-100 text-slate-300 print-text-dark border border-slate-700/50 print:border-slate-300"
                    >
                      {cat}
                    </span>
                  ))}
                </div>
              </div>
            </div>

          </div>

          {/* Report Footer */}
          <div className="pt-6 border-t border-slate-800 print:border-slate-300 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 print-text-muted gap-2">
            <div>
              Sistema de Controle Financeiro • Gestão Inteligente de Metas & Orçamentos
            </div>
            <div>
              Documento gerado eletronicamente para fins de acompanhamento orçamentário.
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
