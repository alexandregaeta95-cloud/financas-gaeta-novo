import React, { useState } from "react";
import {
  Clock,
  AlertCircle,
  CheckCircle2,
  PieChart as PieChartIcon,
  Calendar,
  X,
  BarChart3,
  FileText,
  TrendingUp,
  Fuel,
  Car,
} from "lucide-react";
import { Lancamento } from "../types";
import { ModuleView } from "./Navigation";
import { parseCurrency, formatCurrency, isLancamentoExcluded } from "../utils/formatters";

type PeriodFilterType = "ALL" | "CURRENT_MONTH" | "LAST_MONTH" | "CUSTOM";

interface Props {
  lancamentos: Lancamento[];
  onSaveLancamento: (lancamento: Lancamento) => Promise<void>;
  onNavigate?: (view: ModuleView) => void;
}

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

export const PainelContasView: React.FC<Props> = ({
  lancamentos,
  onSaveLancamento,
  onNavigate,
}) => {
  const [periodFilter, setPeriodFilter] = useState<PeriodFilterType>("CURRENT_MONTH");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const todayStr = new Date().toISOString().split("T")[0];

  // Helper de checagem do período selecionado
  const isDateInPeriod = (dateStr?: string | null): boolean => {
    if (!dateStr) return periodFilter === "ALL";
    if (periodFilter === "ALL") return true;

    const itemDate = parseDateSafely(dateStr);
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
  };

  // Exclude deleted entries and filter by period
  const activeEntries = lancamentos
    .filter((l) => !isLancamentoExcluded(l))
    .filter((l) => isDateInPeriod(l.Data));

  // Group 1: Pagas
  const pagas = activeEntries.filter(
    (l) =>
      String(l.Status || "").toUpperCase() === "PAGO" ||
      parseCurrency((l as any).Valor_Pago) > 0
  );

  // Group 2: Vencidas (Past date & Status = Pendente)
  const vencidas = activeEntries.filter((l) => {
    const s = String(l.Status || "").toUpperCase();
    return s === "PENDENTE" && (l.Data || "") < todayStr;
  });

  // Group 3: A Vencer (Future or today date & Status = Pendente)
  const aVencer = activeEntries.filter((l) => {
    const s = String(l.Status || "").toUpperCase();
    return s === "PENDENTE" && (l.Data || "") >= todayStr;
  });

  // Sums
  const totalPagas = pagas.reduce((acc, curr) => acc + parseCurrency(curr.Valor), 0);
  const totalVencidas = vencidas.reduce((acc, curr) => acc + parseCurrency(curr.Valor), 0);
  const totalAVencer = aVencer.reduce((acc, curr) => acc + parseCurrency(curr.Valor), 0);
  const grandTotal = totalPagas + totalVencidas + totalAVencer || 1;

  // Percentages for chart bar
  const pctPagas = grandTotal > 1 ? Math.round((totalPagas / grandTotal) * 100) : 0;
  const pctVencidas = grandTotal > 1 ? Math.round((totalVencidas / grandTotal) * 100) : 0;
  const pctAVencer = grandTotal > 1 ? Math.round((totalAVencer / grandTotal) * 100) : 0;

  const handleMarkAsPaid = async (l: Lancamento) => {
    await onSaveLancamento({
      ...l,
      Status: "Pago",
      Valor_Pago: l.Valor,
    });
  };

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Header with Period Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Clock className="w-5 h-5 text-emerald-400" />
            Painel de Contas (A Vencer / Vencidas / Pagas)
          </h2>
          <p className="text-xs text-slate-400">
            Visão agrupada e inteligente de todos os lançamentos financeiros da aba <code className="text-emerald-400 font-mono">1_Lancamentos</code>.
          </p>
        </div>

        {/* Period Selector Dropdown */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            <select
              value={periodFilter}
              onChange={(e) => setPeriodFilter(e.target.value as PeriodFilterType)}
              className="bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-8 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 cursor-pointer appearance-none shadow-sm"
            >
              <option value="ALL">Todos os Períodos</option>
              <option value="CURRENT_MONTH">Mês Atual</option>
              <option value="LAST_MONTH">Mês Passado</option>
              <option value="CUSTOM">Selecionar Período</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
              <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Action Shortcuts Grid */}
      {onNavigate && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
          <button
            onClick={() => onNavigate("indicadores")}
            className="w-full flex items-center justify-center gap-1.5 sm:gap-2 p-3 sm:p-3.5 bg-slate-800 hover:bg-slate-700 text-teal-300 font-semibold rounded-xl text-xs border border-teal-500/30 transition-all shadow-xs active:scale-95 text-center cursor-pointer"
          >
            <BarChart3 className="w-4 h-4 shrink-0" />
            <span className="truncate">Indicadores</span>
          </button>

          <button
            onClick={() => onNavigate("relatorios")}
            className="w-full flex items-center justify-center gap-1.5 sm:gap-2 p-3 sm:p-3.5 bg-slate-800 hover:bg-slate-700 text-purple-300 font-semibold rounded-xl text-xs border border-purple-500/30 transition-all shadow-xs active:scale-95 text-center cursor-pointer"
          >
            <FileText className="w-4 h-4 shrink-0" />
            <span className="truncate">Relatórios</span>
          </button>

          <button
            onClick={() => onNavigate("analise_corridas")}
            className="w-full flex items-center justify-center gap-1.5 sm:gap-2 p-3 sm:p-3.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 font-semibold rounded-xl text-xs border border-emerald-500/30 transition-all shadow-xs active:scale-95 text-center cursor-pointer"
          >
            <TrendingUp className="w-4 h-4 shrink-0" />
            <span className="truncate">Análise Uber / 99</span>
          </button>

          <button
            onClick={() => onNavigate("abastecimentos")}
            className="w-full flex items-center justify-center gap-1.5 sm:gap-2 p-3 sm:p-3.5 bg-slate-800 hover:bg-slate-700 text-amber-400 font-semibold rounded-xl text-xs border border-amber-500/20 transition-all shadow-xs active:scale-95 text-center cursor-pointer"
          >
            <Fuel className="w-4 h-4 shrink-0" />
            <span className="truncate">Abastecimento</span>
          </button>

          <button
            onClick={() => onNavigate("veiculos")}
            className="w-full flex items-center justify-center gap-1.5 sm:gap-2 p-3 sm:p-3.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl text-xs border border-slate-700 transition-all shadow-xs active:scale-95 text-center cursor-pointer col-span-2 sm:col-span-1"
          >
            <Car className="w-4 h-4 shrink-0" />
            <span className="truncate">Veículos</span>
          </button>
        </div>
      )}

      {/* Custom Period Date Range Pickers (shown when periodFilter === "CUSTOM") */}
      {periodFilter === "CUSTOM" && (
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex flex-wrap items-center gap-3">
          <span className="text-xs text-slate-300 font-medium flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-emerald-400" />
            Intervalo de Datas:
          </span>
          <div className="flex items-center gap-2">
            <label className="text-[11px] text-slate-400">Data Inicial:</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-[11px] text-slate-400">Data Final:</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>
          {(startDate || endDate) && (
            <button
              onClick={() => {
                setStartDate("");
                setEndDate("");
              }}
              className="flex items-center gap-1 text-xs text-rose-400 hover:text-rose-300 hover:underline px-2 py-1"
            >
              <X className="w-3 h-3" />
              Limpar datas
            </button>
          )}
        </div>
      )}

      {/* Proportional Overview Bar */}
      <div className="p-5 bg-slate-900 border border-slate-800 rounded-3xl space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-white flex items-center gap-2">
            <PieChartIcon className="w-4 h-4 text-emerald-400" />
            Proporção de Contas {periodFilter === "CURRENT_MONTH" ? "(Mês Atual)" : periodFilter === "LAST_MONTH" ? "(Mês Passado)" : periodFilter === "CUSTOM" ? "(Período Personalizado)" : ""}
          </span>
          <span className="text-slate-400 font-mono">Total R$ {formatCurrency(grandTotal === 1 ? 0 : grandTotal)}</span>
        </div>

        <div className="w-full h-4 bg-slate-950 rounded-full overflow-hidden flex border border-slate-800">
          <div
            className="h-full bg-emerald-500 transition-all"
            style={{ width: `${pctPagas}%` }}
            title={`Pagas: ${pctPagas}%`}
          />
          <div
            className="h-full bg-rose-500 transition-all"
            style={{ width: `${pctVencidas}%` }}
            title={`Vencidas: ${pctVencidas}%`}
          />
          <div
            className="h-full bg-amber-500 transition-all"
            style={{ width: `${pctAVencer}%` }}
            title={`A Vencer: ${pctAVencer}%`}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-1">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-emerald-500 shrink-0" />
            <span className="text-slate-300">Pagas ({pctPagas}%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-rose-500 shrink-0" />
            <span className="text-slate-300">Vencidas ({pctVencidas}%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-amber-500 shrink-0" />
            <span className="text-slate-300">A Vencer ({pctAVencer}%)</span>
          </div>
        </div>
      </div>

      {/* 3 Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Vencidas */}
        <div className="p-5 bg-rose-950/30 border border-rose-500/30 rounded-2xl space-y-2">
          <div className="flex justify-between items-center text-rose-400">
            <span className="text-xs font-bold uppercase tracking-wider">Vencidas (Atrasadas)</span>
            <AlertCircle className="w-5 h-5" />
          </div>
          <span className="text-2xl font-black text-rose-400 block font-mono">
            R$ {formatCurrency(totalVencidas)}
          </span>
          <span className="text-[10px] text-rose-300/80 block font-semibold">
            {vencidas.length} conta(s) precisando de liquidação imediata
          </span>
        </div>

        {/* A Vencer */}
        <div className="p-5 bg-amber-950/30 border border-amber-500/30 rounded-2xl space-y-2">
          <div className="flex justify-between items-center text-amber-400">
            <span className="text-xs font-bold uppercase tracking-wider">A Vencer (Futuras)</span>
            <Clock className="w-5 h-5" />
          </div>
          <span className="text-2xl font-black text-amber-400 block font-mono">
            R$ {formatCurrency(totalAVencer)}
          </span>
          <span className="text-[10px] text-amber-300/80 block font-semibold">
            {aVencer.length} compromisso(s) a vencer no prazo
          </span>
        </div>

        {/* Pagas */}
        <div className="p-5 bg-emerald-950/30 border border-emerald-500/30 rounded-2xl space-y-2">
          <div className="flex justify-between items-center text-emerald-400">
            <span className="text-xs font-bold uppercase tracking-wider">Pagas (Liquidadas)</span>
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <span className="text-2xl font-black text-emerald-400 block font-mono">
            R$ {formatCurrency(totalPagas)}
          </span>
          <span className="text-[10px] text-emerald-300/80 block font-semibold">
            {pagas.length} lançamento(s) quitados com sucesso
          </span>
        </div>
      </div>

      {/* Detailed Lists per Group */}
      <div className="space-y-6">
        {/* 1. VENCIDAS */}
        {vencidas.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-bold text-rose-400 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Contas Vencidas ({vencidas.length})
            </h3>

            <div className="bg-slate-900 border border-rose-500/30 rounded-2xl divide-y divide-slate-800">
              {vencidas.map((l, idx) => (
                <div key={`${l.Id || 'vencida'}-${idx}`} className="p-4 flex items-center justify-between gap-3 text-xs">
                  <div>
                    <h4 className="font-bold text-white text-sm">{l.Descricao}</h4>
                    <p className="text-rose-400 font-mono">
                      Venceu em: {l.Data} • Categoria: {l.Categoria}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-extrabold text-rose-400 text-sm font-mono">
                      R$ {formatCurrency(l.Valor)}
                    </span>
                    <button
                      onClick={() => handleMarkAsPaid(l)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-[11px] transition-colors"
                    >
                      Pagar Agora
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 2. A VENCER */}
        <div className="space-y-3">
          <h3 className="font-bold text-amber-400 text-sm flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Contas a Vencer ({aVencer.length})
          </h3>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl divide-y divide-slate-800">
            {aVencer.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-xs">
                Nenhuma conta a vencer encontrada para o período selecionado.
              </div>
            ) : (
              aVencer.map((l, idx) => (
                <div key={`${l.Id || 'avencer'}-${idx}`} className="p-4 flex items-center justify-between gap-3 text-xs">
                  <div>
                    <h4 className="font-bold text-white text-sm">{l.Descricao}</h4>
                    <p className="text-slate-400 font-mono">
                      Vence em: {l.Data} • Categoria: {l.Categoria}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-extrabold text-amber-400 text-sm font-mono">
                      R$ {formatCurrency(l.Valor)}
                    </span>
                    <button
                      onClick={() => handleMarkAsPaid(l)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-[11px] transition-colors"
                    >
                      Pagar
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 3. PAGAS */}
        <div className="space-y-3">
          <h3 className="font-bold text-emerald-400 text-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Contas Pagas ({pagas.length})
          </h3>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl divide-y divide-slate-800">
            {pagas.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-xs">
                Nenhuma conta paga encontrada para o período selecionado.
              </div>
            ) : (
              pagas.slice(0, 10).map((l, idx) => (
                <div key={`${l.Id || 'paga'}-${idx}`} className="p-4 flex items-center justify-between gap-3 text-xs opacity-80 hover:opacity-100 transition-opacity">
                  <div>
                    <h4 className="font-semibold text-slate-200">{l.Descricao}</h4>
                    <p className="text-slate-500 font-mono">
                      Data: {l.Data} • {l.Categoria}
                    </p>
                  </div>
                  <span className="font-bold text-emerald-400 font-mono">
                    R$ {formatCurrency(l.Valor)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
