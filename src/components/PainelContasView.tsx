import React from "react";
import {
  Clock,
  AlertCircle,
  CheckCircle2,
  DollarSign,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  PieChart as PieChartIcon
} from "lucide-react";
import { Lancamento } from "../types";
import { parseCurrency, formatCurrency } from "../utils/formatters";

interface Props {
  lancamentos: Lancamento[];
  onSaveLancamento: (lancamento: Lancamento) => Promise<void>;
}

export const PainelContasView: React.FC<Props> = ({ lancamentos, onSaveLancamento }) => {
  const todayStr = new Date().toISOString().split("T")[0];

  // Exclude deleted entries
  const activeEntries = lancamentos.filter((l) => {
    const s = String(l.Status || "").toUpperCase();
    return s !== "EXCLUÍDO" && s !== "EXCLUIDO" && s !== "DELETED";
  });

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
  const pctPagas = Math.round((totalPagas / grandTotal) * 100);
  const pctVencidas = Math.round((totalVencidas / grandTotal) * 100);
  const pctAVencer = Math.round((totalAVencer / grandTotal) * 100);

  const handleMarkAsPaid = async (l: Lancamento) => {
    await onSaveLancamento({
      ...l,
      Status: "Pago",
      Valor_Pago: l.Valor,
    });
  };

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <Clock className="w-5 h-5 text-emerald-400" />
          Painel de Contas (A Vencer / Vencidas / Pagas)
        </h2>
        <p className="text-xs text-slate-400">
          Visão agrupada e inteligente de todos os lançamentos financeiros da aba <code className="text-emerald-400 font-mono">1_Lancamentos</code>.
        </p>
      </div>

      {/* Proportional Overview Bar */}
      <div className="p-5 bg-slate-900 border border-slate-800 rounded-3xl space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-white flex items-center gap-2">
            <PieChartIcon className="w-4 h-4 text-emerald-400" />
            Proporção de Contas
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
              {vencidas.map((l) => (
                <div key={l.Id} className="p-4 flex items-center justify-between gap-3 text-xs">
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
                Nenhuma conta a vencer cadastrada.
              </div>
            ) : (
              aVencer.map((l) => (
                <div key={l.Id} className="p-4 flex items-center justify-between gap-3 text-xs">
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
            Últimas Contas Pagas ({pagas.length})
          </h3>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl divide-y divide-slate-800">
            {pagas.slice(0, 5).map((l) => (
              <div key={l.Id} className="p-4 flex items-center justify-between gap-3 text-xs opacity-75">
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
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
