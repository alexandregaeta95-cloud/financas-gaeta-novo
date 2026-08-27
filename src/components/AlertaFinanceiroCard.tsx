import React, { useState } from "react";
import { AlertTriangle, TrendingDown, ArrowRight, ShieldAlert, Sparkles, ChevronRight } from "lucide-react";
import { formatCurrency } from "../utils/formatters";
import { AlertaFinanceiroResult, PeriodoAlerta, PeriodoFinanceiroResumo } from "../utils/financeAlertEngine";

interface Props {
  alertas: AlertaFinanceiroResult;
  onNavigateToLancamentos?: () => void;
  onNavigateToMetas?: () => void;
}

export const AlertaFinanceiroCard: React.FC<Props> = ({
  alertas,
  onNavigateToLancamentos,
  onNavigateToMetas,
}) => {
  if (!alertas || !alertas.temAlerta || alertas.periodosEmAlerta.length === 0) {
    return null;
  }

  // Estado da aba selecionada (padrão: mês, ou o primeiro em alerta)
  const defaultTab: PeriodoAlerta =
    alertas.periodosEmAlerta.includes("mes")
      ? "mes"
      : alertas.periodosEmAlerta.includes("semana")
      ? "semana"
      : "dia";

  const [selectedPeriodo, setSelectedPeriodo] = useState<PeriodoAlerta>(defaultTab);

  // Garante que o período selecionado existe no resumo
  const activeResumo: PeriodoFinanceiroResumo =
    alertas.resumos[selectedPeriodo] || alertas.resumoPrincipal || alertas.resumos.dia;

  const isSevere = activeResumo.estouro > 1000 || activeResumo.periodo === "mes";

  return (
    <div
      id="card_alerta_financeiro_despesas"
      className={`relative overflow-hidden rounded-2xl border transition-all duration-300 shadow-lg ${
        isSevere
          ? "bg-gradient-to-br from-rose-950/40 via-slate-900/90 to-rose-950/20 border-rose-500/40 shadow-rose-950/30"
          : "bg-gradient-to-br from-amber-950/40 via-slate-900/90 to-amber-950/20 border-amber-500/40 shadow-amber-950/30"
      }`}
    >
      {/* Decorative top accent line */}
      <div
        className={`h-1.5 w-full ${
          isSevere
            ? "bg-gradient-to-r from-rose-500 via-red-500 to-amber-500"
            : "bg-gradient-to-r from-amber-500 via-yellow-500 to-orange-500"
        }`}
      />

      <div className="p-4 sm:p-5">
        {/* Header with Title & Period Switcher Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-700/50">
          <div className="flex items-center gap-2.5">
            <div
              className={`p-2 rounded-xl flex items-center justify-center shrink-0 ${
                isSevere ? "bg-rose-500/20 text-rose-400" : "bg-amber-500/20 text-amber-400"
              }`}
            >
              <AlertTriangle className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-white tracking-wide flex items-center gap-1.5">
                  Alerta Financeiro: Despesas Superando Receitas
                </h3>
                <span
                  className={`text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full ${
                    isSevere
                      ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                      : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                  }`}
                >
                  Déficit
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Acompanhamento em tempo real de fluxo diário, semanal e mensal
              </p>
            </div>
          </div>

          {/* Independent Period Switcher Tabs */}
          <div className="flex items-center bg-slate-950/60 p-1 rounded-xl border border-slate-800/80 shrink-0 self-start sm:self-auto">
            {(["dia", "semana", "mes"] as PeriodoAlerta[]).map((p) => {
              const res = alertas.resumos[p];
              const isSelected = selectedPeriodo === p;
              const hasAlert = res.emAlerta;

              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setSelectedPeriodo(p)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    isSelected
                      ? hasAlert
                        ? "bg-rose-600 text-white shadow-sm"
                        : "bg-slate-700 text-white"
                      : hasAlert
                      ? "text-rose-400 hover:text-rose-200 hover:bg-rose-950/30"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                  }`}
                >
                  <span>{res.label}</span>
                  {hasAlert && (
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isSelected ? "bg-white" : "bg-rose-500"
                      } animate-ping`}
                      style={{ animationDuration: "2.5s" }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Dynamic Period Analysis Content */}
        <div className="pt-4 grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
          {/* Main Metric Spotlight Box */}
          <div className="lg:col-span-4 bg-slate-950/70 p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Balanço {activeResumo.label}:</span>
              <span
                className={`font-semibold ${
                  activeResumo.emAlerta ? "text-rose-400" : "text-emerald-400"
                }`}
              >
                {activeResumo.emAlerta ? "No Vermelho" : "Superávit"}
              </span>
            </div>

            {/* Estouro / Saldo Hero */}
            <div className="my-2">
              <div className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-baseline gap-1">
                <span className="text-rose-400">R$</span>
                <span className={activeResumo.emAlerta ? "text-rose-400" : "text-emerald-400"}>
                  {formatCurrency(activeResumo.emAlerta ? activeResumo.estouro : Math.abs(activeResumo.saldo))}
                </span>
                <span className="text-xs font-normal text-slate-400 ml-1">
                  {activeResumo.emAlerta ? "de estouro" : "positivo"}
                </span>
              </div>
            </div>

            {/* Sub-breakdown: Receitas vs Despesas */}
            <div className="pt-2 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-slate-500 block text-[11px]">Receitas</span>
                <span className="font-semibold text-emerald-400">
                  R$ {formatCurrency(activeResumo.totalReceitas)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-slate-500 block text-[11px]">Despesas</span>
                <span className="font-semibold text-rose-400">
                  R$ {formatCurrency(activeResumo.totalDespesas)}
                </span>
              </div>
            </div>
          </div>

          {/* Orientation & Contextual Diagnostic Box */}
          <div className="lg:col-span-8 flex flex-col justify-between space-y-3">
            <div className="space-y-2">
              {/* Category Breakdown & Insights */}
              {activeResumo.emAlerta ? (
                <div className="space-y-2">
                  {activeResumo.categoriaOfensora && (
                    <div className="flex items-start gap-2 text-xs sm:text-sm text-slate-200">
                      <span className="text-rose-400 shrink-0 mt-0.5 font-bold">🎯 Categoria mais pesada:</span>
                      <div>
                        <span className="font-bold text-white">
                          {activeResumo.categoriaOfensora.categoria}
                        </span>{" "}
                        somou{" "}
                        <span className="font-semibold text-rose-300">
                          R$ {formatCurrency(activeResumo.categoriaOfensora.total)}
                        </span>{" "}
                        ({activeResumo.categoriaOfensora.percentual}% de todos os gastos de {activeResumo.label.toLowerCase()}).
                      </div>
                    </div>
                  )}

                  {/* Comparative Historical Insight */}
                  {activeResumo.comparativoMedia && (
                    <div className="flex items-center gap-2 text-xs text-amber-300/90 bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/20">
                      <TrendingDown className="w-4 h-4 shrink-0 text-amber-400" />
                      <span>{activeResumo.comparativoMedia.texto}.</span>
                    </div>
                  )}

                  {/* Meta Exceeded Warning */}
                  {activeResumo.metaEstourada && (
                    <div className="flex items-center gap-2 text-xs text-rose-300 bg-rose-500/10 px-3 py-1.5 rounded-lg border border-rose-500/20">
                      <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400" />
                      <span>
                        A meta mensal para <strong className="text-white">{activeResumo.metaEstourada.categoria}</strong> (R$ {formatCurrency(activeResumo.metaEstourada.valorMeta)}) já foi ultrapassada em R$ {formatCurrency(activeResumo.metaEstourada.excesso)}.
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs sm:text-sm text-emerald-400">
                  <Sparkles className="w-4 h-4 shrink-0" />
                  <span>
                    Contas equilibradas em {activeResumo.label.toLowerCase()}! As receitas superaram as despesas em R$ {formatCurrency(activeResumo.saldo)}.
                  </span>
                </div>
              )}
            </div>

            {/* Quick Action Navigation Footer */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/60">
              <span className="text-[11px] text-slate-400">
                {alertas.periodosEmAlerta.length > 1
                  ? `Existem ${alertas.periodosEmAlerta.length} períodos com despesas superando receitas.`
                  : `Alerta ativo para o período de ${activeResumo.label.toLowerCase()}.`}
              </span>

              <div className="flex items-center gap-2">
                {onNavigateToMetas && activeResumo.metaEstourada && (
                  <button
                    type="button"
                    onClick={onNavigateToMetas}
                    className="text-xs font-semibold text-amber-400 hover:text-amber-300 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>Ver Metas</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}
                {onNavigateToLancamentos && (
                  <button
                    type="button"
                    onClick={onNavigateToLancamentos}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-slate-800 hover:bg-slate-700 active:scale-95 text-white rounded-lg transition-all border border-slate-700 cursor-pointer shadow-sm"
                  >
                    <span>Ver Lançamentos</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
