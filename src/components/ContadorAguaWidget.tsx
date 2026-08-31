import React, { useState, useMemo } from "react";
import {
  Droplets,
  Plus,
  Clock,
  Calendar,
  Trash2,
  Edit2,
  Settings,
  ChevronDown,
  ChevronUp,
  Sparkles,
  GlassWater,
  Target,
  Trophy,
  Flame,
} from "lucide-react";
import { ConsumoAgua, ConfigAgua } from "../types";
import { RegistroAguaModal } from "./RegistroAguaModal";
import { ConfigAguaModal } from "./ConfigAguaModal";
import { formatDateBR } from "../utils/formatters";

interface Props {
  consumosAgua: ConsumoAgua[];
  configAgua?: ConfigAgua;
  onSaveAgua: (agua: ConsumoAgua) => Promise<void> | void;
  onDeleteAgua: (id: string) => Promise<void> | void;
  onSaveConfigAgua: (config: ConfigAgua) => Promise<void> | void;
}

type PeriodoAguaFilter = "hoje" | "semana" | "mes" | "todos";

export const ContadorAguaWidget: React.FC<Props> = ({
  consumosAgua = [],
  configAgua,
  onSaveAgua,
  onDeleteAgua,
  onSaveConfigAgua,
}) => {
  const [periodoFilter, setPeriodoFilter] = useState<PeriodoAguaFilter>("hoje");
  const [isRegistroModalOpen, setIsRegistroModalOpen] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [editingAgua, setEditingAgua] = useState<ConsumoAgua | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isQuickAdding, setIsQuickAdding] = useState(false);
  const [showHistory, setShowHistory] = useState(true);

  // Default values or user-configured values
  const metaDiariaMl = configAgua?.metaDiariaMl || 2500;
  const tamanhoCopoMl = configAgua?.tamanhoCopoMl || 500;

  // Today string YYYY-MM-DD
  const todayStr = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, []);

  // Today water total in ml
  const aguaHojeMl = useMemo(() => {
    return consumosAgua
      .filter((c) => (c.data || "").startsWith(todayStr))
      .reduce((acc, curr) => acc + (curr.quantidadeMl || 0), 0);
  }, [consumosAgua, todayStr]);

  // Today progress percentage
  const percentualHoje = useMemo(() => {
    if (metaDiariaMl <= 0) return 0;
    return Math.round((aguaHojeMl / metaDiariaMl) * 100);
  }, [aguaHojeMl, metaDiariaMl]);

  const metaAtingida = aguaHojeMl >= metaDiariaMl;

  // Filtered list based on selected period
  const filteredList = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(now.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    return [...consumosAgua]
      .filter((item) => {
        // Exclude internal config record if present in raw list
        if (item.id === "CONFIG_AGUA" || (item as any).Id === "CONFIG_AGUA") return false;

        const itemDateStr = (item.data || "").trim();
        if (!itemDateStr) return true;

        if (periodoFilter === "hoje") {
          return itemDateStr.startsWith(todayStr);
        }

        const itemDate = new Date(itemDateStr + "T00:00:00");
        if (isNaN(itemDate.getTime())) return true;

        if (periodoFilter === "semana") {
          return itemDate >= sevenDaysAgo && itemDate <= now;
        }

        if (periodoFilter === "mes") {
          return (
            itemDate.getFullYear() === currentYear &&
            itemDate.getMonth() === currentMonth
          );
        }

        return true;
      })
      .sort((a, b) => {
        const dateA = `${a.data || ""} ${a.hora || "00:00"}`;
        const dateB = `${b.data || ""} ${b.hora || "00:00"}`;
        return dateB.localeCompare(dateA);
      });
  }, [consumosAgua, periodoFilter, todayStr]);

  // Total water in filtered period
  const totalAguaPeriodoMl = useMemo(() => {
    return filteredList.reduce((acc, curr) => acc + (curr.quantidadeMl || 0), 0);
  }, [filteredList]);

  // Quick 1-click +[tamanhoCopoMl] water
  const handleQuickAdd = (mlToAdd: number = tamanhoCopoMl) => {
    const now = new Date();
    const currentHours = String(now.getHours()).padStart(2, "0");
    const currentMinutes = String(now.getMinutes()).padStart(2, "0");
    const hora = `${currentHours}:${currentMinutes}`;

    const newAgua: ConsumoAgua = {
      id: `AGUA_${Date.now()}`,
      Id: `AGUA_${Date.now()}`,
      data: todayStr,
      Data: todayStr,
      hora,
      Hora: hora,
      quantidadeMl: mlToAdd,
      Quantidade_Ml: mlToAdd,
      observacoes: undefined,
      dataCriacao: now.toISOString(),
      Data_Criacao: now.toISOString(),
    };

    onSaveAgua(newAgua);
  };

  const handleOpenEdit = (item: ConsumoAgua) => {
    setEditingAgua(item);
    setIsRegistroModalOpen(true);
  };

  const handleOpenNewCustom = () => {
    setEditingAgua(null);
    setIsRegistroModalOpen(true);
  };

  const handleDelete = (id: string) => {
    setDeleteConfirmId(null);
    onDeleteAgua(id);
  };

  // Helper formatting for ml vs L
  const formatVolume = (ml: number) => {
    if (ml >= 1000) {
      const liters = (ml / 1000).toLocaleString("pt-BR", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 2,
      });
      return `${ml.toLocaleString("pt-BR")} ml (${liters} L)`;
    }
    return `${ml} ml`;
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4 shadow-sm">
      {/* Top Banner: Today Counter & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Counter & Icon */}
        <div className="flex items-center gap-3.5">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-inner transition-colors ${
              metaAtingida
                ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400"
                : "bg-cyan-500/10 border border-cyan-500/20 text-cyan-400"
            }`}
          >
            <Droplets className="w-6 h-6" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-cyan-400/90">
                Hidratação Diária
              </span>
              <span
                className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${
                  metaAtingida
                    ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                    : "bg-cyan-500/15 text-cyan-300 border-cyan-500/30"
                }`}
              >
                {metaAtingida ? "🎉 Meta Atingida!" : `💧 ${percentualHoje}% da meta`}
              </span>
            </div>

            <div className="flex items-baseline gap-2 mt-0.5 flex-wrap">
              <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                <span className={metaAtingida ? "text-emerald-400 font-extrabold" : "text-cyan-400 font-extrabold"}>
                  {aguaHojeMl.toLocaleString("pt-BR")} ml
                </span>{" "}
                <span className="text-slate-400 text-sm sm:text-base font-semibold">
                  / {metaDiariaMl.toLocaleString("pt-BR")} ml
                </span>
              </h3>
              <span className="text-slate-400 text-xs font-medium">
                ({(aguaHojeMl / 1000).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 2 })} L de {(metaDiariaMl / 1000).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 2 })} L)
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 sm:self-center flex-wrap sm:flex-nowrap">
          {/* Main 1-Click Dynamic Button based on user's cup/bottle size */}
          <button
            onClick={() => handleQuickAdd(tamanhoCopoMl)}
            disabled={isQuickAdding}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 active:scale-95 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-cyan-950/40 disabled:opacity-50"
            title={`Registrar ${tamanhoCopoMl}ml de água agora`}
          >
            <span className="text-base leading-none">💧</span>
            <span>+{tamanhoCopoMl}ml</span>
            <span className="text-[11px] opacity-80 font-normal">
              ({new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })})
            </span>
          </button>

          {/* Quick preset chips if copo is different from 250ml or 500ml */}
          {tamanhoCopoMl !== 250 && (
            <button
              onClick={() => handleQuickAdd(250)}
              disabled={isQuickAdding}
              className="hidden sm:inline-flex items-center justify-center px-2.5 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-cyan-300 text-xs font-semibold rounded-xl transition-colors shrink-0"
              title="Registrar copo de 250ml"
            >
              +250ml
            </button>
          )}

          {/* Custom / Detailed Register Button */}
          <button
            onClick={handleOpenNewCustom}
            className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white text-xs font-medium rounded-xl transition-colors shrink-0"
            title="Registrar água com horário ou quantidade customizada"
          >
            <Plus className="w-3.5 h-3.5 text-cyan-400" />
            <span>Ajustar</span>
          </button>

          {/* Settings button (cup size & daily goal) */}
          <button
            onClick={() => setIsConfigModalOpen(true)}
            className="p-2.5 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 text-slate-400 hover:text-cyan-400 rounded-xl transition-colors shrink-0"
            title="Configurar tamanho do copo/garrafa e meta diária de água"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Toggle History button */}
          <button
            onClick={() => setShowHistory((prev) => !prev)}
            className="p-2.5 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 text-slate-400 hover:text-slate-200 rounded-xl transition-colors shrink-0"
            title={showHistory ? "Ocultar histórico de água" : "Ver histórico de água"}
          >
            {showHistory ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Fluid Interactive Progress Bar */}
      <div className="space-y-1.5 pt-1">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-slate-400 flex items-center gap-1">
            <Target className="w-3.5 h-3.5 text-cyan-400" />
            Progresso de Hoje: <strong className="text-slate-200">{percentualHoje}%</strong>
          </span>
          <span className="text-slate-400">
            {metaAtingida ? (
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <Trophy className="w-3.5 h-3.5" />
                Parabéns! Meta superada em {(aguaHojeMl - metaDiariaMl).toLocaleString("pt-BR")} ml
              </span>
            ) : (
              <span>
                Faltam <strong className="text-cyan-300">{(metaDiariaMl - aguaHojeMl).toLocaleString("pt-BR")} ml</strong> para a meta
              </span>
            )}
          </span>
        </div>

        <div className="w-full h-3 bg-slate-950 rounded-full border border-slate-800 overflow-hidden relative">
          <div
            className={`h-full transition-all duration-500 rounded-full relative ${
              metaAtingida
                ? "bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 shadow-lg shadow-emerald-950/50"
                : "bg-gradient-to-r from-cyan-600 via-cyan-500 to-blue-500"
            }`}
            style={{ width: `${Math.min(100, Math.max(percentualHoje > 0 ? 4 : 0, percentualHoje))}%` }}
          />
        </div>
      </div>

      {/* Expandable History Section */}
      {showHistory && (
        <div className="pt-3 border-t border-slate-800/80 space-y-3 animate-in fade-in duration-150">
          {/* Filter Bar & Summary */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            {/* Period Filters */}
            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  { id: "hoje", label: "Hoje" },
                  { id: "semana", label: "7 Dias" },
                  { id: "mes", label: "Mês Atual" },
                  { id: "todos", label: "Todos" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setPeriodoFilter(tab.id)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all ${
                    periodoFilter === tab.id
                      ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm"
                      : "bg-slate-800/50 text-slate-400 border-transparent hover:bg-slate-800 hover:text-slate-200"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Total water in period */}
            <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <span>Total no período:</span>
              <strong className="text-cyan-400 font-bold">
                {formatVolume(totalAguaPeriodoMl)}
              </strong>
              <span>({filteredList.length} registros)</span>
            </div>
          </div>

          {/* List of Water Records */}
          {filteredList.length === 0 ? (
            <div className="py-5 text-center bg-slate-950/40 border border-dashed border-slate-800 rounded-xl">
              <Droplets className="w-6 h-6 text-slate-600 mx-auto mb-1.5 opacity-60" />
              <p className="text-xs text-slate-400">
                Nenhum registro de água no período selecionado.
              </p>
              <button
                onClick={() => handleQuickAdd(tamanhoCopoMl)}
                className="mt-2 inline-flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 font-semibold"
              >
                <Plus className="w-3.5 h-3.5" />
                Registrar primeiro copo de {tamanhoCopoMl}ml agora
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {filteredList.map((item) => {
                const isToday = (item.data || "").startsWith(todayStr);
                const isDeleting = deleteConfirmId === item.id;
                const vol = item.quantidadeMl || 0;

                return (
                  <div
                    key={item.id}
                    className="p-2.5 bg-slate-950/60 hover:bg-slate-950 border border-slate-800/80 hover:border-cyan-500/30 rounded-xl flex items-center justify-between gap-2 transition-colors group"
                  >
                    {/* Time & Info */}
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center font-bold text-xs shrink-0">
                        💧
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-bold text-white">
                            {vol >= 1000 ? `${(vol / 1000).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 2 })} L` : `${vol} ml`}
                          </span>
                          <span className="text-[11px] font-mono text-cyan-400 font-medium">
                            {item.hora || "--:--"}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 truncate flex items-center gap-1">
                          <span>{isToday ? "Hoje" : formatDateBR(item.data)}</span>
                          {item.observacoes && (
                            <>
                              <span>•</span>
                              <span className="text-slate-300 truncate" title={item.observacoes}>
                                {item.observacoes}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions: Edit / Delete */}
                    <div className="flex items-center gap-1 shrink-0">
                      {isDeleting ? (
                        <div className="flex items-center gap-1 bg-rose-950/80 border border-rose-800/80 p-1 rounded-lg">
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="px-1.5 py-0.5 bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold rounded"
                            title="Confirmar exclusão"
                          >
                            Excluir
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            className="px-1 py-0.5 text-slate-400 hover:text-white text-[10px]"
                            title="Cancelar"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => handleOpenEdit(item)}
                            className="p-1 text-slate-500 hover:text-cyan-400 hover:bg-slate-800 rounded-md transition-colors"
                            title="Editar registro"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(item.id)}
                            className="p-1 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-md transition-colors"
                            title="Excluir registro"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal de Registro/Edição */}
      <RegistroAguaModal
        isOpen={isRegistroModalOpen}
        onClose={() => {
          setIsRegistroModalOpen(false);
          setEditingAgua(null);
        }}
        onSave={onSaveAgua}
        initialData={editingAgua}
        defaultTamanhoMl={tamanhoCopoMl}
      />

      {/* Modal de Configurações de Recipiente e Meta */}
      <ConfigAguaModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        onSaveConfig={onSaveConfigAgua}
        currentConfig={configAgua}
      />
    </div>
  );
};
