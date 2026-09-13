import React, { useState, useMemo } from "react";
import { X, TrendingUp, Calendar } from "lucide-react";
import { ItemMercado } from "../types";
import { formatCurrency } from "../utils/formatters";

interface Props {
  itens: ItemMercado[];
  onClose: () => void;
}

type Periodo = "hoje" | "semana" | "mes" | "ano" | "tudo";

export const HistoricoMercadoModal: React.FC<Props> = ({ itens, onClose }) => {
  const [periodo, setPeriodo] = useState<Periodo>("mes");

  const comprados = useMemo(
    () =>
      itens
        .filter((i) => (i.Comprado === true || i.Comprado === "SIM") && i.Data_Compra)
        .sort((a, b) => (b.Data_Compra || "").localeCompare(a.Data_Compra || "")),
    [itens]
  );

  const getValor = (item: ItemMercado) =>
    Number(item.Valor_Total) || Number(item.Valor_Estimado) || Number(item.Preco_Estimado) || 0;

  const filtrados = useMemo(() => {
    if (periodo === "tudo") return comprados;
    const hoje = new Date();
    return comprados.filter((item) => {
      if (!item.Data_Compra) return false;
      const dataItem = new Date(item.Data_Compra + "T00:00:00");
      if (periodo === "hoje") {
        return dataItem.toDateString() === hoje.toDateString();
      }
      if (periodo === "semana") {
        const seteDiasAtras = new Date(hoje);
        seteDiasAtras.setDate(hoje.getDate() - 7);
        return dataItem >= seteDiasAtras;
      }
      if (periodo === "mes") {
        return dataItem.getMonth() === hoje.getMonth() && dataItem.getFullYear() === hoje.getFullYear();
      }
      if (periodo === "ano") {
        return dataItem.getFullYear() === hoje.getFullYear();
      }
      return true;
    });
  }, [comprados, periodo]);

  const totalPeriodo = filtrados.reduce((acc, item) => acc + getValor(item), 0);

  const agrupadosPorData = useMemo(() => {
    const grupos: Record<string, ItemMercado[]> = {};
    filtrados.forEach((item) => {
      const data = item.Data_Compra || "Sem data";
      if (!grupos[data]) grupos[data] = [];
      grupos[data].push(item);
    });
    return grupos;
  }, [filtrados]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs text-xs">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 p-5 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-lime-500/10 text-lime-400 rounded-xl">
              <TrendingUp className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-white">Histórico de Gastos no Mercado</h3>
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
                  periodo === p
                    ? "bg-lime-600 text-white"
                    : "bg-slate-800 text-slate-400 hover:text-slate-200"
                }`}
              >
                {p === "hoje" ? "Hoje" : p === "semana" ? "7 dias" : p === "mes" ? "Este mês" : p === "ano" ? "Este ano" : "Tudo"}
              </button>
            ))}
          </div>

          <div className="bg-slate-950 border border-lime-500/30 rounded-xl p-3 flex justify-between items-center">
            <span className="text-slate-400">Total no período</span>
            <span className="text-xl font-extrabold text-lime-400">R$ {formatCurrency(totalPeriodo)}</span>
          </div>
        </div>

        <div className="overflow-y-auto px-5 pb-5 space-y-4 flex-1">
          {Object.keys(agrupadosPorData).length === 0 && (
            <div className="text-center py-8 text-slate-500">Nenhuma compra registrada nesse período.</div>
          )}
          {(Object.entries(agrupadosPorData) as [string, ItemMercado[]][]).map(([data, itensGrupo]) => (
            <div key={data}>
              <div className="flex items-center gap-1.5 text-slate-400 mb-1.5">
                <Calendar className="w-3 h-3" />
                <span className="font-semibold">{data}</span>
                <span className="text-slate-600">
                  · R$ {formatCurrency(itensGrupo.reduce((acc, i) => acc + getValor(i), 0))}
                </span>
              </div>
              <div className="space-y-1">
                {itensGrupo.map((item) => (
                  <div
                    key={item.Id}
                    className="flex justify-between bg-slate-800/50 rounded-lg px-3 py-1.5"
                  >
                    <span className="text-slate-200">{item.Item}</span>
                    <span className="text-slate-400">R$ {formatCurrency(getValor(item))}</span>
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
