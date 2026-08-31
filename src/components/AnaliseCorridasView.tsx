import React, { useState, useMemo } from "react";
import {
  TrendingUp,
  Calendar,
  Clock,
  Car,
  Award,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  DollarSign,
  Sun,
  Moon,
  Sunset,
  Sunrise,
  Sparkles,
  Search,
  CheckCircle2,
  Info,
  ChevronDown,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Lancamento } from "../types";
import { parseCurrency, formatCurrency, isLancamentoExcluded, formatDateBR } from "../utils/formatters";

type PeriodFilterType = "CURRENT_MONTH" | "LAST_MONTH" | "LAST_30_DAYS" | "CURRENT_YEAR" | "ALL" | "CUSTOM";
type PlatformFilterType = "ALL" | "UBER" | "99";

interface Props {
  lancamentos: Lancamento[];
  onOpenNewLancamento?: () => void;
  onEditLancamento?: (lancamento: Lancamento) => void;
}

const DIAS_SEMANA_NOMES = [
  { index: 0, nome: "Domingo", sigla: "DOM", order: 7 },
  { index: 1, nome: "Segunda-feira", sigla: "SEG", order: 1 },
  { index: 2, nome: "Terça-feira", sigla: "TER", order: 2 },
  { index: 3, nome: "Quarta-feira", sigla: "QUA", order: 3 },
  { index: 4, nome: "Quinta-feira", sigla: "QUI", order: 4 },
  { index: 5, nome: "Sexta-feira", sigla: "SEX", order: 5 },
  { index: 6, nome: "Sábado", sigla: "SÁB", order: 6 },
];

function parseDateSafely(dateStr?: string | null): Date | null {
  if (!dateStr) return null;
  const parts = String(dateStr).trim().split(/[-/]/);
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      return new Date(year, month, day);
    } else if (parts[2].length === 4) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      return new Date(year, month, day);
    }
  }
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

function getPlatformType(l: Lancamento): "UBER" | "99" | "OUTRO" {
  const cat = String(l.Categoria || "").trim().toUpperCase();
  if (cat === "UBER") return "UBER";
  if (cat === "99" || cat === "99POP" || cat === "99APP") return "99";

  const desc = String(l.Descricao || "").trim().toUpperCase();
  if (/\bUBER\b/i.test(desc) || desc.includes("UBER")) return "UBER";
  if (/\b99\b/i.test(desc) || desc.includes("99POP") || desc.includes("99APP") || desc.includes("99 MOTORISTA")) return "99";

  return "OUTRO";
}

function getShiftFromHour(horaStr?: string): "MADRUGADA" | "MANHA" | "TARDE" | "NOITE" | "SEM_HORA" {
  if (!horaStr) return "SEM_HORA";
  const clean = horaStr.trim();
  const match = clean.match(/^(\d{1,2})/);
  if (!match) return "SEM_HORA";
  const h = parseInt(match[1], 10);
  if (isNaN(h)) return "SEM_HORA";

  if (h >= 0 && h < 6) return "MADRUGADA";
  if (h >= 6 && h < 12) return "MANHA";
  if (h >= 12 && h < 18) return "TARDE";
  if (h >= 18 && h <= 23) return "NOITE";
  return "SEM_HORA";
}

export const AnaliseCorridasView: React.FC<Props> = ({
  lancamentos,
  onOpenNewLancamento,
  onEditLancamento,
}) => {
  // STRICT RULE: Default filter MUST always be CURRENT_MONTH
  const [periodFilter, setPeriodFilter] = useState<PeriodFilterType>("CURRENT_MONTH");
  const [platformFilter, setPlatformFilter] = useState<PlatformFilterType>("ALL");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"DIAS" | "HORARIOS" | "LISTA">("DIAS");

  // Filter lancamentos by period and type (Uber / 99)
  const filteredRuns = useMemo(() => {
    return lancamentos.filter((l) => {
      if (isLancamentoExcluded(l)) return false;

      // Must be a revenue or Uber/99
      const tipo = String(l.Tipo || "").toUpperCase();
      const platform = getPlatformType(l);
      if (platform === "OUTRO" && tipo !== "RECEITA") return false;
      if (platform === "OUTRO") return false; // Only Uber / 99 runs

      // Platform filter
      if (platformFilter !== "ALL" && platform !== platformFilter) return false;

      // Period filter
      if (periodFilter === "ALL") return true;

      const itemDate = parseDateSafely(l.Data);
      if (!itemDate) return true;

      const now = new Date();

      if (periodFilter === "CURRENT_MONTH") {
        return (
          itemDate.getFullYear() === now.getFullYear() &&
          itemDate.getMonth() === now.getMonth()
        );
      }

      if (periodFilter === "LAST_MONTH") {
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        return (
          itemDate.getFullYear() === lastMonth.getFullYear() &&
          itemDate.getMonth() === lastMonth.getMonth()
        );
      }

      if (periodFilter === "LAST_30_DAYS") {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return itemDate.getTime() >= thirtyDaysAgo.getTime();
      }

      if (periodFilter === "CURRENT_YEAR") {
        return itemDate.getFullYear() === now.getFullYear();
      }

      if (periodFilter === "CUSTOM") {
        const itemTime = new Date(
          itemDate.getFullYear(),
          itemDate.getMonth(),
          itemDate.getDate()
        ).getTime();

        if (startDate) {
          const startObj = parseDateSafely(startDate);
          if (startObj) {
            const startTime = new Date(
              startObj.getFullYear(),
              startObj.getMonth(),
              startObj.getDate()
            ).getTime();
            if (itemTime < startTime) return false;
          }
        }

        if (endDate) {
          const endObj = parseDateSafely(endDate);
          if (endObj) {
            const endTime = new Date(
              endObj.getFullYear(),
              endObj.getMonth(),
              endObj.getDate()
            ).getTime();
            if (itemTime > endTime) return false;
          }
        }
        return true;
      }

      return true;
    });
  }, [lancamentos, periodFilter, platformFilter, startDate, endDate]);

  // Overall KPIs
  const kpis = useMemo(() => {
    let totalGeral = 0;
    let totalUber = 0;
    let total99 = 0;
    let countUber = 0;
    let count99 = 0;
    let countComHorario = 0;

    const uniqueDaysWorked = new Set<string>();

    filteredRuns.forEach((r) => {
      const val = parseCurrency(r.Valor);
      const plat = getPlatformType(r);
      totalGeral += val;

      if (plat === "UBER") {
        totalUber += val;
        countUber++;
      } else if (plat === "99") {
        total99 += val;
        count99++;
      }

      if (r.Hora) {
        countComHorario++;
      }

      if (r.Data) {
        uniqueDaysWorked.add(r.Data);
      }
    });

    const totalCorridas = filteredRuns.length;
    const diasTrabalhados = uniqueDaysWorked.size || 1;
    const mediaPorDia = totalGeral / diasTrabalhados;
    const mediaPorCorrida = totalCorridas > 0 ? totalGeral / totalCorridas : 0;
    const pctUber = totalGeral > 0 ? (totalUber / totalGeral) * 100 : 0;
    const pct99 = totalGeral > 0 ? (total99 / totalGeral) * 100 : 0;

    return {
      totalGeral,
      totalUber,
      total99,
      countUber,
      count99,
      totalCorridas,
      diasTrabalhados,
      mediaPorDia,
      mediaPorCorrida,
      pctUber,
      pct99,
      countComHorario,
    };
  }, [filteredRuns]);

  // Stats by Day of the Week
  const weekdayStats = useMemo(() => {
    // 0 = Domingo, 1 = Segunda, ..., 6 = Sábado
    const stats = [
      { dayIndex: 1, nome: "Segunda-feira", sigla: "Seg", total: 0, uber: 0, pop99: 0, count: 0, daysSet: new Set<string>() },
      { dayIndex: 2, nome: "Terça-feira", sigla: "Ter", total: 0, uber: 0, pop99: 0, count: 0, daysSet: new Set<string>() },
      { dayIndex: 3, nome: "Quarta-feira", sigla: "Qua", total: 0, uber: 0, pop99: 0, count: 0, daysSet: new Set<string>() },
      { dayIndex: 4, nome: "Quinta-feira", sigla: "Qui", total: 0, uber: 0, pop99: 0, count: 0, daysSet: new Set<string>() },
      { dayIndex: 5, nome: "Sexta-feira", sigla: "Sex", total: 0, uber: 0, pop99: 0, count: 0, daysSet: new Set<string>() },
      { dayIndex: 6, nome: "Sábado", sigla: "Sáb", total: 0, uber: 0, pop99: 0, count: 0, daysSet: new Set<string>() },
      { dayIndex: 0, nome: "Domingo", sigla: "Dom", total: 0, uber: 0, pop99: 0, count: 0, daysSet: new Set<string>() },
    ];

    filteredRuns.forEach((r) => {
      const d = parseDateSafely(r.Data);
      if (!d) return;
      const dayIdx = d.getDay();
      const val = parseCurrency(r.Valor);
      const plat = getPlatformType(r);

      const target = stats.find((s) => s.dayIndex === dayIdx);
      if (target) {
        target.total += val;
        target.count++;
        if (r.Data) target.daysSet.add(r.Data);

        if (plat === "UBER") target.uber += val;
        else if (plat === "99") target.pop99 += val;
      }
    });

    return stats.map((s) => {
      const distinctDays = s.daysSet.size || (s.total > 0 ? 1 : 0);
      const mediaPorDia = distinctDays > 0 ? s.total / distinctDays : 0;
      const mediaPorEntrada = s.count > 0 ? s.total / s.count : 0;
      const pctTotal = kpis.totalGeral > 0 ? (s.total / kpis.totalGeral) * 100 : 0;

      return {
        ...s,
        distinctDays,
        mediaPorDia,
        mediaPorEntrada,
        pctTotal,
      };
    });
  }, [filteredRuns, kpis.totalGeral]);

  // Find Best and Worst Days
  const bestDay = useMemo(() => {
    const daysWithIncome = weekdayStats.filter((d) => d.total > 0);
    if (daysWithIncome.length === 0) return null;
    return [...daysWithIncome].sort((a, b) => b.total - a.total)[0];
  }, [weekdayStats]);

  const bestDayByAverage = useMemo(() => {
    const daysWithIncome = weekdayStats.filter((d) => d.total > 0 && d.distinctDays > 0);
    if (daysWithIncome.length === 0) return null;
    return [...daysWithIncome].sort((a, b) => b.mediaPorDia - a.mediaPorDia)[0];
  }, [weekdayStats]);

  const worstDay = useMemo(() => {
    const daysWithIncome = weekdayStats.filter((d) => d.total > 0);
    if (daysWithIncome.length === 0) return null;
    return [...daysWithIncome].sort((a, b) => a.total - b.total)[0];
  }, [weekdayStats]);

  // Stats by Time Shifts (Madrugada, Manhã, Tarde, Noite)
  const shiftStats = useMemo(() => {
    const shifts = [
      {
        id: "MANHA",
        nome: "Manhã",
        horario: "06:00 às 11:59",
        icon: Sunrise,
        color: "amber",
        total: 0,
        uber: 0,
        pop99: 0,
        count: 0,
      },
      {
        id: "TARDE",
        nome: "Tarde",
        horario: "12:00 às 17:59",
        icon: Sun,
        color: "orange",
        total: 0,
        uber: 0,
        pop99: 0,
        count: 0,
      },
      {
        id: "NOITE",
        nome: "Noite (Pico)",
        horario: "18:00 às 23:59",
        icon: Sunset,
        color: "indigo",
        total: 0,
        uber: 0,
        pop99: 0,
        count: 0,
      },
      {
        id: "MADRUGADA",
        nome: "Madrugada",
        horario: "00:00 às 05:59",
        icon: Moon,
        color: "purple",
        total: 0,
        uber: 0,
        pop99: 0,
        count: 0,
      },
      {
        id: "SEM_HORA",
        nome: "Sem Horário Informado",
        horario: "Horário não registrado",
        icon: Clock,
        color: "slate",
        total: 0,
        uber: 0,
        pop99: 0,
        count: 0,
      },
    ];

    filteredRuns.forEach((r) => {
      const shiftId = getShiftFromHour(r.Hora);
      const val = parseCurrency(r.Valor);
      const plat = getPlatformType(r);

      const target = shifts.find((s) => s.id === shiftId);
      if (target) {
        target.total += val;
        target.count++;
        if (plat === "UBER") target.uber += val;
        else if (plat === "99") target.pop99 += val;
      }
    });

    return shifts.map((s) => ({
      ...s,
      mediaPorCorrida: s.count > 0 ? s.total / s.count : 0,
      pctTotal: kpis.totalGeral > 0 ? (s.total / kpis.totalGeral) * 100 : 0,
    }));
  }, [filteredRuns, kpis.totalGeral]);

  // Best Shift
  const bestShift = useMemo(() => {
    const validShifts = shiftStats.filter((s) => s.id !== "SEM_HORA" && s.total > 0);
    if (validShifts.length === 0) return null;
    return [...validShifts].sort((a, b) => b.total - a.total)[0];
  }, [shiftStats]);

  // Filtered runs for the list view
  const searchFilteredRuns = useMemo(() => {
    if (!searchTerm.trim()) return filteredRuns;
    const term = searchTerm.toLowerCase();
    return filteredRuns.filter((r) => {
      const desc = String(r.Descricao || "").toLowerCase();
      const val = String(r.Valor || "");
      const data = String(r.Data || "");
      const hora = String(r.Hora || "");
      return (
        desc.includes(term) ||
        val.includes(term) ||
        data.includes(term) ||
        hora.includes(term)
      );
    });
  }, [filteredRuns, searchTerm]);

  // Recharts Bar Data
  const chartData = useMemo(() => {
    return weekdayStats.map((w) => ({
      name: w.sigla,
      fullName: w.nome,
      Uber: Math.round(w.uber * 100) / 100,
      "99": Math.round(w.pop99 * 100) / 100,
      Total: Math.round(w.total * 100) / 100,
      Media: Math.round(w.mediaPorDia * 100) / 100,
    }));
  }, [weekdayStats]);

  return (
    <div className="space-y-6 pb-12 animate-in fade-in-50 duration-200">
      {/* Top Header Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-xl relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 bg-gradient-to-tr from-emerald-600 to-teal-500 text-white rounded-2xl shadow-lg">
                <Car className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Análise de Corridas: Uber & 99
                </h1>
                <p className="text-xs sm:text-sm text-slate-400">
                  Descubra os melhores dias, horários e estratégias de maior rentabilidade
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {onOpenNewLancamento && (
              <button
                onClick={onOpenNewLancamento}
                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-2xl shadow-lg shadow-emerald-950/40 transition-all cursor-pointer"
              >
                <DollarSign className="w-4 h-4" />
                <span>Nova Corrida / Receita</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Period Filter Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
            <span className="text-xs font-semibold text-slate-400 flex items-center gap-1 mr-1">
              <Calendar className="w-3.5 h-3.5" /> Período:
            </span>
            {[
              { id: "CURRENT_MONTH", label: "Mês Atual" },
              { id: "LAST_MONTH", label: "Mês Anterior" },
              { id: "LAST_30_DAYS", label: "Últimos 30 Dias" },
              { id: "CURRENT_YEAR", label: "Ano Atual" },
              { id: "ALL", label: "Todo o Histórico" },
              { id: "CUSTOM", label: "Personalizado" },
            ].map((p) => {
              const active = periodFilter === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setPeriodFilter(p.id as PeriodFilterType)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    active
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          {/* Platform Filter Buttons */}
          <div className="flex items-center gap-1.5 self-start md:self-auto">
            <span className="text-xs font-semibold text-slate-400 flex items-center gap-1 mr-1">
              <Filter className="w-3.5 h-3.5" /> Plataforma:
            </span>
            <div className="inline-flex bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setPlatformFilter("ALL")}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  platformFilter === "ALL"
                    ? "bg-slate-800 text-white"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Todas
              </button>
              <button
                onClick={() => setPlatformFilter("UBER")}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  platformFilter === "UBER"
                    ? "bg-slate-800 text-emerald-400 font-bold"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Uber
              </button>
              <button
                onClick={() => setPlatformFilter("99")}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  platformFilter === "99"
                    ? "bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                99
              </button>
            </div>
          </div>
        </div>

        {/* Custom Date Pickers if CUSTOM */}
        {periodFilter === "CUSTOM" && (
          <div className="mt-3 pt-3 border-t border-slate-800/60 flex items-center gap-3 flex-wrap text-xs animate-in fade-in-50">
            <div className="flex items-center gap-2">
              <span className="text-slate-400">De:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-white"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Até:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-white"
              />
            </div>
          </div>
        )}
      </div>

      {/* KPI Cards Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Faturamento */}
        <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-2 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Faturamento Total</span>
            <div className="p-1.5 rounded-xl bg-emerald-500/10 text-emerald-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white">
            R$ {formatCurrency(kpis.totalGeral)}
          </div>
          <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-slate-800/60">
            <span>{kpis.totalCorridas} entradas</span>
            <span className="font-mono text-emerald-400">
              Méd. R$ {formatCurrency(kpis.mediaPorDia)}/dia
            </span>
          </div>
        </div>

        {/* Melhor Dia */}
        <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-2 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Melhor Dia da Semana</span>
            <div className="p-1.5 rounded-xl bg-amber-500/10 text-amber-400">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-400 truncate">
            {bestDay ? bestDay.nome : "—"}
          </div>
          <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-slate-800/60">
            <span>
              {bestDay ? `R$ ${formatCurrency(bestDay.total)}` : "Sem dados"}
            </span>
            <span className="font-mono text-slate-300">
              {bestDay ? `Méd. R$ ${formatCurrency(bestDay.mediaPorDia)}` : ""}
            </span>
          </div>
        </div>

        {/* Melhor Horário */}
        <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-2 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Melhor Faixa de Horário</span>
            <div className="p-1.5 rounded-xl bg-indigo-500/10 text-indigo-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-indigo-300 truncate">
            {bestShift ? bestShift.nome : "—"}
          </div>
          <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-slate-800/60">
            <span className="truncate">
              {bestShift ? bestShift.horario : "Registre horários"}
            </span>
            <span className="font-mono text-emerald-400">
              {bestShift ? `R$ ${formatCurrency(bestShift.total)}` : ""}
            </span>
          </div>
        </div>

        {/* Divisão Uber vs 99 */}
        <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-2 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Uber vs 99</span>
            <div className="p-1.5 rounded-xl bg-teal-500/10 text-teal-400">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-white">Uber: {kpis.pctUber.toFixed(0)}%</span>
            <span className="text-slate-600">•</span>
            <span className="text-sm font-bold text-amber-400">99: {kpis.pct99.toFixed(0)}%</span>
          </div>
          {/* Visual Progress Bar */}
          <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden flex">
            <div
              className="bg-emerald-500 h-full transition-all duration-500"
              style={{ width: `${kpis.pctUber}%` }}
              title={`Uber: R$ ${formatCurrency(kpis.totalUber)}`}
            />
            <div
              className="bg-amber-500 h-full transition-all duration-500"
              style={{ width: `${kpis.pct99}%` }}
              title={`99: R$ ${formatCurrency(kpis.total99)}`}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
            <span className="text-emerald-400 font-mono">R$ {formatCurrency(kpis.totalUber)}</span>
            <span className="text-amber-400 font-mono">R$ {formatCurrency(kpis.total99)}</span>
          </div>
        </div>
      </div>

      {/* Tabs Selector */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab("DIAS")}
          className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "DIAS"
              ? "bg-emerald-600 text-white shadow-md shadow-emerald-950/40"
              : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Dias da Semana</span>
        </button>

        <button
          onClick={() => setActiveTab("HORARIOS")}
          className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "HORARIOS"
              ? "bg-emerald-600 text-white shadow-md shadow-emerald-950/40"
              : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Faixas de Horário</span>
          {kpis.countComHorario > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px]">
              {kpis.countComHorario}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("LISTA")}
          className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "LISTA"
              ? "bg-emerald-600 text-white shadow-md shadow-emerald-950/40"
              : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
          }`}
        >
          <Search className="w-4 h-4" />
          <span>Lançamentos ({filteredRuns.length})</span>
        </button>
      </div>

      {/* TAB 1: DIAS DA SEMANA */}
      {activeTab === "DIAS" && (
        <div className="space-y-6 animate-in fade-in-50 duration-150">
          {/* Chart Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  Receita por Dia da Semana (Uber vs 99)
                </h3>
                <p className="text-xs text-slate-400">
                  Comparação direta de faturamento por dia no período selecionado
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1 text-slate-300">
                  <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" /> Uber
                </span>
                <span className="flex items-center gap-1 text-amber-300">
                  <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" /> 99
                </span>
              </div>
            </div>

            {kpis.totalGeral > 0 ? (
              <div className="h-72 w-full pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                    <XAxis
                      dataKey="name"
                      stroke="#94a3b8"
                      fontSize={12}
                      tickLine={false}
                    />
                    <YAxis
                      stroke="#94a3b8"
                      fontSize={11}
                      tickLine={false}
                      tickFormatter={(v) => `R$${v}`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0f172a",
                        borderColor: "#334155",
                        borderRadius: "1rem",
                        color: "#f8fafc",
                        fontSize: "12px",
                      }}
                      formatter={(val: any, name: any) => [
                        `R$ ${formatCurrency(Number(val))}`,
                        name,
                      ]}
                      labelFormatter={(label, items) => {
                        const item = items && items[0] ? (items[0].payload as any) : null;
                        return item ? item.fullName : label;
                      }}
                    />
                    <Legend />
                    <Bar dataKey="Uber" fill="#10b981" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="99" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="py-12 text-center text-slate-500 text-xs">
                Nenhum faturamento registrado para o período selecionado.
              </div>
            )}
          </div>

          {/* Table Breakdown by Weekday */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
            <div className="p-5 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">
                Tabela Detalhada por Dia da Semana
              </h3>
              <p className="text-xs text-slate-400">
                Totais acumulados, médias por dia trabalhado e participação percentual
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-950/80 text-slate-400 uppercase font-semibold border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Dia da Semana</th>
                    <th className="px-4 py-3 text-right">Uber (R$)</th>
                    <th className="px-4 py-3 text-right">99 (R$)</th>
                    <th className="px-4 py-3 text-right">Total Acumulado</th>
                    <th className="px-4 py-3 text-right">Média / Dia Trab.</th>
                    <th className="px-4 py-3 text-center">Entradas</th>
                    <th className="px-4 py-3 text-right">% do Total</th>
                    <th className="px-4 py-3 text-center">Classificação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {weekdayStats.map((w) => {
                    const isTop = bestDay && bestDay.dayIndex === w.dayIndex && w.total > 0;
                    const isLowest = worstDay && worstDay.dayIndex === w.dayIndex && w.total > 0;

                    return (
                      <tr
                        key={w.dayIndex}
                        className={`hover:bg-slate-800/40 transition-colors ${
                          isTop ? "bg-amber-500/5 font-semibold" : ""
                        }`}
                      >
                        <td className="px-4 py-3 text-white font-medium flex items-center gap-2">
                          <span>{w.nome}</span>
                          {isTop && (
                            <span className="px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                              🏆 TOP
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-emerald-400 font-mono">
                          {w.uber > 0 ? `R$ ${formatCurrency(w.uber)}` : "—"}
                        </td>
                        <td className="px-4 py-3 text-right text-amber-400 font-mono">
                          {w.pop99 > 0 ? `R$ ${formatCurrency(w.pop99)}` : "—"}
                        </td>
                        <td className="px-4 py-3 text-right text-white font-bold font-mono">
                          R$ {formatCurrency(w.total)}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-300 font-mono">
                          R$ {formatCurrency(w.mediaPorDia)}
                        </td>
                        <td className="px-4 py-3 text-center text-slate-400">
                          {w.count}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-300 font-mono">
                          {w.pctTotal.toFixed(1)}%
                        </td>
                        <td className="px-4 py-3 text-center">
                          {isTop ? (
                            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                              Melhor Dia
                            </span>
                          ) : isLowest ? (
                            <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[10px]">
                              Menor Rentabilidade
                            </span>
                          ) : w.total > 0 ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px]">
                              Bom Rendimento
                            </span>
                          ) : (
                            <span className="text-slate-600 text-[11px]">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: FAIXAS DE HORÁRIO */}
      {activeTab === "HORARIOS" && (
        <div className="space-y-6 animate-in fade-in-50 duration-150">
          {/* Horários Info Notice */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl mt-0.5">
                <Info className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-white">
                  Progresso de Preenchimento de Horários
                </h4>
                <p className="text-xs text-slate-400">
                  {kpis.countComHorario} de {kpis.totalCorridas} corridas já possuem horário registrado ({kpis.totalCorridas > 0 ? ((kpis.countComHorario / kpis.totalCorridas) * 100).toFixed(0) : 0}%).
                  Você pode preencher o horário nos novos lançamentos ou editar os antigos aos poucos.
                </p>
              </div>
            </div>
          </div>

          {/* Grid de Faixas Horárias */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {shiftStats.map((s) => {
              const Icon = s.icon;
              const isBest = bestShift && bestShift.id === s.id && s.total > 0;

              return (
                <div
                  key={s.id}
                  className={`p-5 rounded-3xl bg-slate-900 border transition-all space-y-3 shadow-lg ${
                    isBest
                      ? "border-indigo-500/50 bg-indigo-950/20"
                      : "border-slate-800"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2.5 rounded-2xl bg-slate-800 text-white">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-white text-sm">{s.nome}</h4>
                          {isBest && (
                            <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 text-[10px] font-bold">
                              🏆 MAIS RENTÁVEL
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-slate-400">{s.horario}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-lg font-black text-white font-mono">
                        R$ {formatCurrency(s.total)}
                      </div>
                      <span className="text-[11px] text-slate-400">
                        {s.pctTotal.toFixed(1)}% do total
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/80 text-xs">
                    <div className="p-2 rounded-xl bg-slate-950 border border-slate-800/60">
                      <span className="text-[10px] text-slate-500 block">Corridas</span>
                      <span className="font-bold text-white font-mono">{s.count}</span>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-950 border border-slate-800/60">
                      <span className="text-[10px] text-slate-500 block">Uber</span>
                      <span className="font-bold text-emerald-400 font-mono">
                        R$ {formatCurrency(s.uber)}
                      </span>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-950 border border-slate-800/60">
                      <span className="text-[10px] text-slate-500 block">99</span>
                      <span className="font-bold text-amber-400 font-mono">
                        R$ {formatCurrency(s.pop99)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: LISTA DETALHADA DE CORRIDAS */}
      {activeTab === "LISTA" && (
        <div className="space-y-4 animate-in fade-in-50 duration-150">
          {/* Search Box */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 flex items-center gap-3">
            <Search className="w-4 h-4 text-slate-400 ml-1" />
            <input
              type="text"
              placeholder="Buscar por descrição, data (AAAA-MM-DD), horário ou valor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-transparent text-white text-xs outline-none placeholder:text-slate-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="text-slate-400 hover:text-white text-xs px-2"
              >
                Limpar
              </button>
            )}
          </div>

          {/* Runs List */}
          <div className="space-y-2">
            {searchFilteredRuns.length === 0 ? (
              <div className="p-8 text-center bg-slate-900 rounded-2xl border border-slate-800 text-slate-500 text-xs">
                Nenhum registro encontrado para os filtros selecionados.
              </div>
            ) : (
              searchFilteredRuns.map((r) => {
                const plat = getPlatformType(r);
                const isUber = plat === "UBER";

                return (
                  <div
                    key={r.Id}
                    className="p-3.5 sm:p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all flex items-center justify-between gap-3 shadow-xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                          isUber
                            ? "bg-slate-950 text-white border border-slate-700"
                            : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                        }`}
                      >
                        {isUber ? "UBER" : "99"}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-white text-xs truncate">
                            {r.Descricao || (isUber ? "Corrida Uber" : "Corrida 99")}
                          </span>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] font-semibold ${
                              isUber
                                ? "bg-slate-800 text-slate-300"
                                : "bg-amber-500/20 text-amber-300"
                            }`}
                          >
                            {r.Categoria || plat}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                          <span>{formatDateBR(r.Data)}</span>
                          {r.Hora && (
                            <span className="font-mono text-emerald-400 font-medium px-1 bg-emerald-500/10 rounded border border-emerald-500/20">
                              🕒 {r.Hora}
                            </span>
                          )}
                          {r.Conta && (
                            <>
                              <span>•</span>
                              <span className="truncate max-w-[120px]">{r.Conta}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <div className="font-extrabold text-emerald-400 text-sm font-mono">
                          + R$ {formatCurrency(parseCurrency(r.Valor))}
                        </div>
                      </div>

                      {onEditLancamento && (
                        <button
                          onClick={() => onEditLancamento(r)}
                          className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold transition-all cursor-pointer"
                        >
                          Editar
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
