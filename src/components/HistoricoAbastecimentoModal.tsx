import React, { useState, useMemo } from "react";
import { X, TrendingUp, Calendar, Fuel } from "lucide-react";
import { Lancamento } from "../types";
import { formatCurrency, parseCurrency } from "../utils/formatters";

interface Props {
  lancamentos: Lancamento[];
  onClose: () => void;
}

type Periodo = "hoje" | "semana" | "mes" | "ano" | "tudo";

export const HistoricoAbastecimentoModal: React.FC<Props> = ({ lancamentos, onClose }) => {
  const [periodo, setPeriodo] = useState<Periodo>("mes");

  const abastecimentos = useMemo(
    () =>
      lancamentos
        .filter((l) => (l.Categoria === "ABASTECIMENTO" || l.Tipo === "ABASTECIMENTO") && l.Data)
        .sort((a, b) => (b.Data || "").localeCompare(a.Data || "")),
    [lancamentos]
  );

  const getValor = (item: any) => {
    const vp = parseCurrency(item.Valor_Pago ?? 0);
    return vp > 0 ? vp : parseCurrency(item.Valor ?? 0);
  };

  const filtrados = useMemo(() => {
    if (periodo === "tudo") return abastecimentos;
    const hoje = new Date();
    return abastecimentos.filter((item) => {
      if (!item.Data) return false;
      const dataItem = new Date(item.Data + "T00:00:00");
      if (periodo === "hoje") return dataItem.toDateString() === hoje.toDateString();
      if (periodo === "semana") {
        const seteDiasAtras = new Date(hoje);
        seteDiasAtras.setDate(hoje.getDate() - 7);
        return dataItem >= seteDiasAtras;
      }
      if (periodo === "mes") return dataItem.getMonth() === hoje.getMonth() && dataItem.getFullYear() === hoje.getFullYear();
      if (periodo === "ano") return dataItem.getFullYear() === hoje.getFullYear();
      return true;
    });
  }, [abastecimentos, periodo]);

  const totalPeriodo = filtrados.reduce((acc, item) => acc + getValor(item), 0);
  const litrosTotal = filtrados.reduce((acc, item: any) => acc + (parseCurrency(item.Litros) || 0), 0);

  const agrupadosPorData = useMemo(() => {
    const grupos: Record<string, Lancamento[]> = {};
    filtrados.forEach((item) => {
      const data = item.Data || "Sem data";
      if (!grupos[data]) grupos[data] = [];
      grupos[data].push(item);
    });
    return grupos;
  }, [filtrados]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/60 backdrop-blur-xs text-xs overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl my-8">
        <div className="flex items-center justify-between border-b border-slate-800 p-5 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl">
              <TrendingUp className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-white">Histórico de Combustível</h3>
          </div>
          <button onClick={onClose}>
            <X className="w-5 h-5 text-slate-400 hover:text-white" />
          </button>
        </div>

        <div className="p-5 pb-3 space-y-3">
          <div className="grid grid-cols-5 gap-1.5">
            {(["hoje", "semana", "mes", "ano", "tudo"] as Periodo[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriodo(p)}
                className={`py-1.5 rounded-lg text-[11px] font-semibold transition-colors ${
                  periodo === p ? "bg-amber-600 text-white" : "bg-slate-800 text-slate-400 hover:text-slate-200"
                }`}
              >
                {p === "hoje" ? "Hoje" : p === "semana" ? "7 dias" : p === "mes" ? "Este mês" : p === "ano" ? "Este ano" : "Tudo"}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="bg-slate-950 border border-amber-500/30 rounded-xl p-3">
              <span className="text-slate-400 block text-[10px]">Total no período</span>
              <span className="text-lg font-extrabold text-amber-400">R$ {formatCurrency(totalPeriodo)}</span>
            </div>
            <div className="bg-slate-950 border border-slate-700 rounded-xl p-3">
              <span className="text-slate-400 block text-[10px]">Litros no período</span>
              <span className="text-lg font-extrabold text-slate-200">{litrosTotal.toFixed(1)} L</span>
            </div>
          </div>
        </div>

        <div className="overflow-y-auto px-5 pb-5 space-y-4 flex-1">
          {Object.keys(agrupadosPorData).length === 0 && (
            <div className="text-center py-8 text-slate-500">Nenhum abastecimento nesse período.</div>
          )}
          {(Object.entries(agrupadosPorData) as [string, Lancamento[]][]).map(([data, itensGrupo]) => (
            <div key={data}>
              <div className="flex items-center gap-1.5 text-slate-400 mb-1.5">
                <Calendar className="w-3 h-3" />
                <span className="font-semibold">{data}</span>
                <span className="text-slate-600">
                  · R$ {formatCurrency(itensGrupo.reduce((acc, i) => acc + getValor(i), 0))}
                </span>
              </div>
              <div className="space-y-1">
                {itensGrupo.map((item: any) => (
                  <div key={item.Id} className="flex justify-between items-center bg-slate-800/50 rounded-lg px-3 py-1.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Fuel className="w-3 h-3 text-amber-400 shrink-0" />
                      <span className="text-slate-200 truncate">{item.Nome_Posto || item.Posto || "Posto não informado"}</span>
                    </div>
                    <span className="text-slate-400 shrink-0 ml-2">
                      {item.Litros ? `${Number(item.Litros).toFixed(1)}L · ` : ""}R$ {formatCurrency(getValor(item))}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
