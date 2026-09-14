import React, { useState, useMemo } from "react";
import { X, TrendingUp, Calendar } from "lucide-react";
import { formatCurrency } from "../utils/formatters";

type Periodo = "hoje" | "semana" | "mes" | "ano" | "tudo";

interface Props<T> {
  titulo: string;
  corTema?: string; // classe tailwind, ex: "amber" ou "lime"
  itens: T[];
  getData: (item: T) => string | undefined;
  getValor: (item: T) => number;
  renderLinha: (item: T) => React.ReactNode;
  onClose: () => void;
}

const THEMES: Record<
  string,
  {
    iconBg: string;
    iconText: string;
    btnActive: string;
    cardBorder: string;
    textTotal: string;
  }
> = {
  orange: {
    iconBg: "bg-orange-500/10",
    iconText: "text-orange-400",
    btnActive: "bg-orange-600 text-white",
    cardBorder: "border-orange-500/30",
    textTotal: "text-orange-400",
  },
  rose: {
    iconBg: "bg-rose-500/10",
    iconText: "text-rose-400",
    btnActive: "bg-rose-600 text-white",
    cardBorder: "border-rose-500/30",
    textTotal: "text-rose-400",
  },
  emerald: {
    iconBg: "bg-emerald-500/10",
    iconText: "text-emerald-400",
    btnActive: "bg-emerald-600 text-white",
    cardBorder: "border-emerald-500/30",
    textTotal: "text-emerald-400",
  },
  amber: {
    iconBg: "bg-amber-500/10",
    iconText: "text-amber-400",
    btnActive: "bg-amber-600 text-white",
    cardBorder: "border-amber-500/30",
    textTotal: "text-amber-400",
  },
  lime: {
    iconBg: "bg-lime-500/10",
    iconText: "text-lime-400",
    btnActive: "bg-lime-600 text-white",
    cardBorder: "border-lime-500/30",
    textTotal: "text-lime-400",
  },
  blue: {
    iconBg: "bg-blue-500/10",
    iconText: "text-blue-400",
    btnActive: "bg-blue-600 text-white",
    cardBorder: "border-blue-500/30",
    textTotal: "text-blue-400",
  },
  indigo: {
    iconBg: "bg-indigo-500/10",
    iconText: "text-indigo-400",
    btnActive: "bg-indigo-600 text-white",
    cardBorder: "border-indigo-500/30",
    textTotal: "text-indigo-400",
  },
  purple: {
    iconBg: "bg-purple-500/10",
    iconText: "text-purple-400",
    btnActive: "bg-purple-600 text-white",
    cardBorder: "border-purple-500/30",
    textTotal: "text-purple-400",
  },
};

function parseDateSafely(val?: string | null): Date | null {
  if (!val) return null;
  const s = String(val).trim();
  if (!s) return null;

  const brMatch = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (brMatch) {
    const day = parseInt(brMatch[1], 10);
    const month = parseInt(brMatch[2], 10) - 1;
    const year = parseInt(brMatch[3], 10);
    const d = new Date(year, month, day);
    return isNaN(d.getTime()) ? null : d;
  }

  const isoPart = s.split("T")[0];
  const isoMatch = isoPart.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10) - 1;
    const day = parseInt(isoMatch[3], 10);
    const d = new Date(year, month, day);
    return isNaN(d.getTime()) ? null : d;
  }

  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

export function HistoricoGenericoModal<T>({
  titulo,
  corTema = "emerald",
  itens,
  getData,
  getValor,
  renderLinha,
  onClose,
}: Props<T>) {
  const [periodo, setPeriodo] = useState<Periodo>("mes");

  const theme = THEMES[corTema] || {
    iconBg: `bg-${corTema}-500/10`,
    iconText: `text-${corTema}-400`,
    btnActive: `bg-${corTema}-600 text-white`,
    cardBorder: `border-${corTema}-500/30`,
    textTotal: `text-${corTema}-400`,
  };

  const ordenados = useMemo(
    () =>
      [...itens]
        .filter((i) => !!getData(i))
        .sort((a, b) => {
          const da = parseDateSafely(getData(a))?.getTime() || 0;
          const db = parseDateSafely(getData(b))?.getTime() || 0;
          if (da !== db) return db - da;
          return (getData(b) || "").localeCompare(getData(a) || "");
        }),
    [itens, getData]
  );

  const filtrados = useMemo(() => {
    if (periodo === "tudo") return ordenados;
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    return ordenados.filter((item) => {
      const dataStr = getData(item);
      if (!dataStr) return false;
      const dataItem = parseDateSafely(dataStr);
      if (!dataItem) return false;

      if (periodo === "hoje") {
        return dataItem.toDateString() === hoje.toDateString();
      }
      if (periodo === "semana") {
        const seteDiasAtras = new Date(hoje);
        seteDiasAtras.setDate(hoje.getDate() - 7);
        return dataItem >= seteDiasAtras;
      }
      if (periodo === "mes") {
        return (
          dataItem.getMonth() === hoje.getMonth() &&
          dataItem.getFullYear() === hoje.getFullYear()
        );
      }
      if (periodo === "ano") {
        return dataItem.getFullYear() === hoje.getFullYear();
      }
      return true;
    });
  }, [ordenados, periodo, getData]);

  const totalPeriodo = filtrados.reduce((acc, item) => acc + getValor(item), 0);

  const agrupados = useMemo(() => {
    const grupos: Record<string, T[]> = {};
    filtrados.forEach((item) => {
      const data = getData(item) || "Sem data";
      if (!grupos[data]) grupos[data] = [];
      grupos[data].push(item);
    });
    return grupos;
  }, [filtrados, getData]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/60 backdrop-blur-xs text-xs overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl my-8">
        <div className="flex items-center justify-between border-b border-slate-800 p-5 pb-3">
          <div className="flex items-center gap-2">
            <div className={`p-2 ${theme.iconBg} ${theme.iconText} rounded-xl`}>
              <TrendingUp className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-white">{titulo}</h3>
          </div>
          <button onClick={onClose} className="cursor-pointer">
            <X className="w-5 h-5 text-slate-400 hover:text-white" />
          </button>
        </div>

        <div className="p-5 pb-3 space-y-3">
          <div className="grid grid-cols-5 gap-1.5">
            {(["hoje", "semana", "mes", "ano", "tudo"] as Periodo[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriodo(p)}
                className={`py-1.5 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                  periodo === p ? theme.btnActive : "bg-slate-800 text-slate-400 hover:text-slate-200"
                }`}
              >
                {p === "hoje" ? "Hoje" : p === "semana" ? "7 dias" : p === "mes" ? "Este mês" : p === "ano" ? "Este ano" : "Tudo"}
              </button>
            ))}
          </div>

          <div className={`bg-slate-950 border ${theme.cardBorder} rounded-xl p-3 flex justify-between items-center`}>
            <span className="text-slate-400">Total no período</span>
            <span className={`text-xl font-extrabold ${theme.textTotal}`}>R$ {formatCurrency(totalPeriodo)}</span>
          </div>
        </div>

        <div className="overflow-y-auto px-5 pb-5 space-y-4 flex-1">
          {Object.keys(agrupados).length === 0 && (
            <div className="text-center py-8 text-slate-500">Nenhum registro nesse período.</div>
          )}
          {(Object.entries(agrupados) as [string, T[]][]).map(([data, itensGrupo]) => (
            <div key={data}>
              <div className="flex items-center gap-1.5 text-slate-400 mb-1.5">
                <Calendar className="w-3 h-3" />
                <span className="font-semibold">{data}</span>
                <span className="text-slate-600">
                  · R$ {formatCurrency(itensGrupo.reduce((acc, i) => acc + getValor(i), 0))}
                </span>
              </div>
              <div className="space-y-1">{itensGrupo.map((item) => renderLinha(item))}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
