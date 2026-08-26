import React, { useState, useMemo } from "react";
import {
  Coffee,
  Plus,
  Clock,
  Calendar,
  Trash2,
  Edit2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Flame,
  Sparkles,
} from "lucide-react";
import { ConsumoCafe } from "../types";
import { RegistroCafeModal } from "./RegistroCafeModal";
import { formatDateBR } from "../utils/formatters";

interface Props {
  consumosCafe: ConsumoCafe[];
  onSaveCafe: (cafe: ConsumoCafe) => Promise<void> | void;
  onDeleteCafe: (id: string) => Promise<void> | void;
}

type PeriodoCafeFilter = "hoje" | "semana" | "mes" | "todos";

export const ContadorCafeWidget: React.FC<Props> = ({
  consumosCafe = [],
  onSaveCafe,
  onDeleteCafe,
}) => {
  const [periodoFilter, setPeriodoFilter] = useState<PeriodoCafeFilter>("hoje");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCafe, setEditingCafe] = useState<ConsumoCafe | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isQuickAdding, setIsQuickAdding] = useState(false);
  const [showHistory, setShowHistory] = useState(true);

  // Today string YYYY-MM-DD
  const todayStr = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, []);

  // Today count
  const cafesHoje = useMemo(() => {
    return consumosCafe
      .filter((c) => (c.data || "").startsWith(todayStr))
      .reduce((acc, curr) => acc + (curr.quantidade || 1), 0);
  }, [consumosCafe, todayStr]);

  // Filtered list based on selected period
  const filteredList = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(now.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    return [...consumosCafe]
      .filter((item) => {
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
        // Sort newest date & time first
        const dateA = `${a.data || ""} ${a.hora || "00:00"}`;
        const dateB = `${b.data || ""} ${b.hora || "00:00"}`;
        return dateB.localeCompare(dateA);
      });
  }, [consumosCafe, periodoFilter, todayStr]);

  // Total coffees in filtered period
  const totalCafesPeriodo = useMemo(() => {
    return filteredList.reduce((acc, curr) => acc + (curr.quantidade || 1), 0);
  }, [filteredList]);

  // Quick 1-click +1 Coffee
  const handleQuickAddOne = async () => {
    setIsQuickAdding(true);
    try {
      const now = new Date();
      const currentHours = String(now.getHours()).padStart(2, "0");
      const currentMinutes = String(now.getMinutes()).padStart(2, "0");
      const hora = `${currentHours}:${currentMinutes}`;

      const newCafe: ConsumoCafe = {
        id: `CAFE_${Date.now()}`,
        Id: `CAFE_${Date.now()}`,
        data: todayStr,
        Data: todayStr,
        hora,
        Hora: hora,
        quantidade: 1,
        Quantidade: 1,
        observacoes: undefined,
        dataCriacao: now.toISOString(),
        Data_Criacao: now.toISOString(),
      };

      await onSaveCafe(newCafe);
    } finally {
      setIsQuickAdding(false);
    }
  };

  const handleOpenEdit = (item: ConsumoCafe) => {
    setEditingCafe(item);
    setIsModalOpen(true);
  };

  const handleOpenNewCustom = () => {
    setEditingCafe(null);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    await onDeleteCafe(id);
    setDeleteConfirmId(null);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4 shadow-sm">
      {/* Top Banner: Today Counter & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Counter & Icon */}
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0 shadow-inner">
            <Coffee className="w-6 h-6" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-400/90">
                Consumo de Café
              </span>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                ☕ {cafesHoje} {cafesHoje === 1 ? "xícara hoje" : "xícaras hoje"}
              </span>
            </div>

            <div className="flex items-baseline gap-2 mt-0.5">
              <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {cafesHoje > 0 ? (
                  <>
                    <span className="text-amber-400 font-extrabold">{cafesHoje}</span>{" "}
                    <span className="text-slate-200 text-lg font-bold">
                      {cafesHoje === 1 ? "café hoje" : "cafés hoje"}
                    </span>
                  </>
                ) : (
                  <span className="text-slate-400 text-lg font-medium">
                    Nenhum café registrado hoje
                  </span>
                )}
              </h3>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 sm:self-center">
          {/* Main 1-Click +1 Coffee Button */}
          <button
            onClick={handleQuickAddOne}
            disabled={isQuickAdding}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 active:scale-95 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-amber-950/40 disabled:opacity-50"
            title="Registrar 1 café agora com o horário atual"
          >
            <span className="text-base leading-none">☕</span>
            <span>+1 Café</span>
            <span className="text-[11px] opacity-80 font-normal">
              ({new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })})
            </span>
          </button>

          {/* Custom / Detailed Register Button */}
          <button
            onClick={handleOpenNewCustom}
            className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white text-xs font-medium rounded-xl transition-colors shrink-0"
            title="Registrar café com horário ou quantidade customizada"
          >
            <Plus className="w-3.5 h-3.5 text-amber-400" />
            <span>Ajustar</span>
          </button>

          {/* Toggle History button */}
          <button
            onClick={() => setShowHistory((prev) => !prev)}
            className="p-2.5 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 text-slate-400 hover:text-slate-200 rounded-xl transition-colors shrink-0"
            title={showHistory ? "Ocultar histórico de cafés" : "Ver histórico de cafés"}
          >
            {showHistory ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
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
                      ? "bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm"
                      : "bg-slate-800/50 text-slate-400 border-transparent hover:bg-slate-800 hover:text-slate-200"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Total coffees in period */}
            <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <span>Total no período:</span>
              <strong className="text-amber-400 font-bold">
                {totalCafesPeriodo} {totalCafesPeriodo === 1 ? "café" : "cafés"}
              </strong>
              <span>({filteredList.length} registros)</span>
            </div>
          </div>

          {/* List of Coffee Records */}
          {filteredList.length === 0 ? (
            <div className="py-5 text-center bg-slate-950/40 border border-dashed border-slate-800 rounded-xl">
              <Coffee className="w-6 h-6 text-slate-600 mx-auto mb-1.5 opacity-60" />
              <p className="text-xs text-slate-400">
                Nenhum cafezinho registrado no período selecionado.
              </p>
              <button
                onClick={handleQuickAddOne}
                className="mt-2 inline-flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 font-semibold"
              >
                <Plus className="w-3.5 h-3.5" />
                Registrar primeiro café agora
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {filteredList.map((item) => {
                const isToday = (item.data || "").startsWith(todayStr);
                const isDeleting = deleteConfirmId === item.id;

                return (
                  <div
                    key={item.id}
                    className="p-2.5 bg-slate-950/60 hover:bg-slate-950 border border-slate-800/80 hover:border-amber-500/30 rounded-xl flex items-center justify-between gap-2 transition-colors group"
                  >
                    {/* Time & Info */}
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold text-xs shrink-0">
                        ☕
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-bold text-white">
                            {item.quantidade || 1} {item.quantidade === 1 ? "café" : "cafés"}
                          </span>
                          <span className="text-[11px] font-mono text-amber-400 font-medium">
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
                            className="p-1 text-slate-500 hover:text-amber-400 hover:bg-slate-800 rounded-md transition-colors"
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
      <RegistroCafeModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingCafe(null);
        }}
        onSave={onSaveCafe}
        initialData={editingCafe}
      />
    </div>
  );
};
