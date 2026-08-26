import React, { useState, useEffect } from "react";
import {
  X,
  Coffee,
  Clock,
  Calendar,
  Hash,
  FileText,
  Save,
  Check,
  Plus,
  Minus,
} from "lucide-react";
import { ConsumoCafe } from "../types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (cafe: ConsumoCafe) => Promise<void> | void;
  initialData?: ConsumoCafe | null;
}

const PRESET_OBS = [
  "Expresso",
  "Coador / Filtrado",
  "Com leite",
  "Sem açúcar",
  "Com adoçante",
  "Descafeinado",
];

export const RegistroCafeModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
}) => {
  const [data, setData] = useState<string>("");
  const [hora, setHora] = useState<string>("");
  const [quantidade, setQuantidade] = useState<number>(1);
  const [observacoes, setObservacoes] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setData(initialData.data || new Date().toISOString().split("T")[0]);
        setHora(initialData.hora || "");
        setQuantidade(initialData.quantidade || 1);
        setObservacoes(initialData.observacoes || "");
      } else {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, "0");
        const day = String(now.getDate()).padStart(2, "0");
        const hours = String(now.getHours()).padStart(2, "0");
        const minutes = String(now.getMinutes()).padStart(2, "0");

        setData(`${year}-${month}-${day}`);
        setHora(`${hours}:${minutes}`);
        setQuantidade(1);
        setObservacoes("");
      }
      setError(null);
      setIsSaving(false);
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data) {
      setError("Por favor, informe a data do registro.");
      return;
    }

    if (quantidade < 1) {
      setError("A quantidade deve ser de pelo menos 1 café.");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const now = new Date();
      const currentHours = String(now.getHours()).padStart(2, "0");
      const currentMinutes = String(now.getMinutes()).padStart(2, "0");
      const finalHora = hora.trim() || `${currentHours}:${currentMinutes}`;

      const itemToSave: ConsumoCafe = {
        id: initialData?.id || `CAFE_${Date.now()}`,
        Id: initialData?.id || `CAFE_${Date.now()}`,
        data,
        Data: data,
        hora: finalHora,
        Hora: finalHora,
        quantidade,
        Quantidade: quantidade,
        observacoes: observacoes.trim().toUpperCase() || undefined,
        Observacoes: observacoes.trim().toUpperCase() || undefined,
        dataCriacao: initialData?.dataCriacao || new Date().toISOString(),
        Data_Criacao: initialData?.dataCriacao || new Date().toISOString(),
      };

      await onSave(itemToSave);
      onClose();
    } catch (err: any) {
      setError(err?.message || "Erro ao salvar o registro de café.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-600/20 border border-amber-600/30 flex items-center justify-center text-amber-400">
              <Coffee className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white leading-tight">
                {initialData ? "Editar Registro de Café" : "Registrar Café ☕"}
              </h2>
              <p className="text-[11px] text-slate-400">
                Acompanhamento diário de cafezinhos
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4 overflow-y-auto">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-xs flex items-center gap-2">
              <span>{error}</span>
            </div>
          )}

          {/* Quantidade (com Auto-Select no foco) */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-amber-400" />
                Quantidade de Cafés (Xícaras/Doses)
              </span>
              <span className="text-[11px] text-amber-400 font-bold">
                {quantidade} {quantidade === 1 ? "café" : "cafés"}
              </span>
            </label>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setQuantidade((prev) => Math.max(1, prev - 1))}
                disabled={quantidade <= 1}
                className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
              >
                <Minus className="w-4 h-4" />
              </button>

              <input
                type="number"
                min="1"
                max="30"
                step="1"
                value={quantidade}
                onFocus={(e) => e.target.select()}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  setQuantidade(isNaN(val) ? 1 : Math.max(1, Math.min(30, val)));
                }}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-center text-lg font-bold text-amber-400 focus:outline-none focus:border-amber-500"
                required
              />

              <button
                type="button"
                onClick={() => setQuantidade((prev) => Math.min(30, prev + 1))}
                className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-700 transition-colors shrink-0"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Quick chips presets */}
            <div className="flex items-center gap-1.5 pt-1">
              {[1, 2, 3, 4].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setQuantidade(num)}
                  className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition-colors ${
                    quantidade === num
                      ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                      : "bg-slate-800/60 border-slate-700/60 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {num} {num === 1 ? "café" : "cafés"}
                </button>
              ))}
            </div>
          </div>

          {/* Data & Hora */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Data
              </label>
              <input
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-amber-500"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                Horário
              </label>
              <input
                type="time"
                value={hora}
                onChange={(e) => setHora(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-amber-500"
                required
              />
            </div>
          </div>

          {/* Observações / Tipo de Café */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              Observação (Opcional)
            </label>
            <input
              type="text"
              placeholder="Ex: Expresso, Coado, Com leite, Sem açúcar..."
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />

            {/* Sugestões rápidas */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {PRESET_OBS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() =>
                    setObservacoes((prev) =>
                      prev ? `${prev}, ${preset}` : preset
                    )
                  }
                  className="px-2 py-0.5 text-[10px] rounded-md bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 transition-colors"
                >
                  + {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-3.5 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-amber-950/40 disabled:opacity-50"
            >
              {isSaving ? (
                <span>Salvando...</span>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{initialData ? "Salvar Alterações" : "Salvar Café"}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
