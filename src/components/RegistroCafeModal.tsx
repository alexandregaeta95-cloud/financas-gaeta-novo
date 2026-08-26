import React, { useState, useEffect } from "react";
import {
  X,
  Coffee,
  Clock,
  Calendar,
  Hash,
  FileText,
  Save,
  Plus,
  Minus,
  Flame,
  Dumbbell,
  Wheat,
  Droplet,
  Sparkles,
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

interface MacroPreset {
  label: string;
  cal: number;
  prot: number;
  carb: number;
  gord: number;
  obs?: string;
}

const MACRO_PRESETS: MacroPreset[] = [
  { label: "Puro / Zero", cal: 0, prot: 0, carb: 0, gord: 0, obs: "Puro" },
  { label: "+ Açúcar (1 colher)", cal: 32, prot: 0, carb: 8, gord: 0, obs: "Com açúcar" },
  { label: "+ Leite Integral (50ml)", cal: 31, prot: 1.6, carb: 2.4, gord: 1.6, obs: "Com leite integral" },
  { label: "+ Leite Desnatado (50ml)", cal: 18, prot: 1.6, carb: 2.5, gord: 0.1, obs: "Com leite desnatado" },
  { label: "+ Pingado / Cappuccino", cal: 65, prot: 3.2, carb: 5.5, gord: 3.3, obs: "Com leite" },
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
  const [calorias, setCalorias] = useState<string>("");
  const [proteinas, setProteinas] = useState<string>("");
  const [carboidratos, setCarboidratos] = useState<string>("");
  const [gorduras, setGorduras] = useState<string>("");
  const [observacoes, setObservacoes] = useState<string>("");
  const [showMacros, setShowMacros] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setData(initialData.data || new Date().toISOString().split("T")[0]);
        setHora(initialData.hora || "");
        setQuantidade(initialData.quantidade || 1);
        setCalorias(initialData.calorias ? String(initialData.calorias) : "");
        setProteinas(initialData.proteinas ? String(initialData.proteinas) : "");
        setCarboidratos(initialData.carboidratos ? String(initialData.carboidratos) : "");
        setGorduras(initialData.gorduras ? String(initialData.gorduras) : "");
        setObservacoes(initialData.observacoes || "");
        setShowMacros(
          Boolean(
            (initialData.calorias && initialData.calorias > 0) ||
            (initialData.proteinas && initialData.proteinas > 0) ||
            (initialData.carboidratos && initialData.carboidratos > 0) ||
            (initialData.gorduras && initialData.gorduras > 0)
          )
        );
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
        setCalorias("");
        setProteinas("");
        setCarboidratos("");
        setGorduras("");
        setObservacoes("");
        setShowMacros(false);
      }
      setError(null);
      setIsSaving(false);
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleApplyPreset = (preset: MacroPreset) => {
    setShowMacros(true);
    setCalorias(preset.cal > 0 ? String(preset.cal) : "0");
    setProteinas(preset.prot > 0 ? String(preset.prot) : "0");
    setCarboidratos(preset.carb > 0 ? String(preset.carb) : "0");
    setGorduras(preset.gord > 0 ? String(preset.gord) : "0");
    if (preset.obs && !observacoes) {
      setObservacoes(preset.obs);
    }
  };

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

      const parsedCal = calorias.trim() !== "" ? Math.round(Number(calorias.replace(",", "."))) : undefined;
      const parsedProt = proteinas.trim() !== "" ? Number(Number(proteinas.replace(",", ".")).toFixed(1)) : undefined;
      const parsedCarb = carboidratos.trim() !== "" ? Number(Number(carboidratos.replace(",", ".")).toFixed(1)) : undefined;
      const parsedGord = gorduras.trim() !== "" ? Number(Number(gorduras.replace(",", ".")).toFixed(1)) : undefined;

      const itemToSave: ConsumoCafe = {
        id: initialData?.id || `CAFE_${Date.now()}`,
        Id: initialData?.id || `CAFE_${Date.now()}`,
        data,
        Data: data,
        hora: finalHora,
        Hora: finalHora,
        quantidade,
        Quantidade: quantidade,
        calorias: parsedCal !== undefined && parsedCal > 0 ? parsedCal : undefined,
        Calorias: parsedCal !== undefined && parsedCal > 0 ? parsedCal : undefined,
        proteinas: parsedProt !== undefined && parsedProt > 0 ? parsedProt : undefined,
        Proteinas: parsedProt !== undefined && parsedProt > 0 ? parsedProt : undefined,
        carboidratos: parsedCarb !== undefined && parsedCarb > 0 ? parsedCarb : undefined,
        Carboidratos: parsedCarb !== undefined && parsedCarb > 0 ? parsedCarb : undefined,
        gorduras: parsedGord !== undefined && parsedGord > 0 ? parsedGord : undefined,
        Gorduras: parsedGord !== undefined && parsedGord > 0 ? parsedGord : undefined,
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
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
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
                Acompanhamento diário de cafezinhos & macros opcionais
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

          {/* Seção Opcional de Macros / Calorias */}
          <div className="bg-slate-950/60 border border-slate-800/90 rounded-xl p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-orange-400" />
                Calorias & Macros (Opcional)
              </label>
              <button
                type="button"
                onClick={() => setShowMacros((prev) => !prev)}
                className="text-[11px] text-amber-400 hover:text-amber-300 font-semibold"
              >
                {showMacros ? "Ocultar" : "+ Adicionar Macros (Açúcar/Leite)"}
              </button>
            </div>

            {/* Presets Rápidos de Macros */}
            <div className="flex flex-wrap gap-1.5">
              {MACRO_PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => handleApplyPreset(p)}
                  className="px-2 py-0.5 text-[10px] rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700/80 text-slate-300 hover:text-amber-300 transition-colors flex items-center gap-1"
                >
                  <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                  <span>{p.label}</span>
                </button>
              ))}
            </div>

            {showMacros && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 animate-in fade-in duration-150">
                {/* Calorias */}
                <div className="space-y-1">
                  <label className="text-[10px] font-medium text-slate-400 flex items-center gap-1">
                    <Flame className="w-3 h-3 text-orange-400" />
                    Calorias (kcal)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="1000"
                    step="1"
                    placeholder="0"
                    value={calorias}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setCalorias(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-lg py-1.5 px-2.5 text-xs text-orange-400 font-bold text-center focus:outline-none focus:border-orange-500"
                  />
                </div>

                {/* Proteínas */}
                <div className="space-y-1">
                  <label className="text-[10px] font-medium text-slate-400 flex items-center gap-1">
                    <Dumbbell className="w-3 h-3 text-blue-400" />
                    Proteínas (g)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    placeholder="0"
                    value={proteinas}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setProteinas(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-lg py-1.5 px-2.5 text-xs text-blue-400 font-bold text-center focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Carbos */}
                <div className="space-y-1">
                  <label className="text-[10px] font-medium text-slate-400 flex items-center gap-1">
                    <Wheat className="w-3 h-3 text-amber-400" />
                    Carbos (g)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    placeholder="0"
                    value={carboidratos}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setCarboidratos(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-lg py-1.5 px-2.5 text-xs text-amber-400 font-bold text-center focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Gorduras */}
                <div className="space-y-1">
                  <label className="text-[10px] font-medium text-slate-400 flex items-center gap-1">
                    <Droplet className="w-3 h-3 text-rose-400" />
                    Gorduras (g)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    placeholder="0"
                    value={gorduras}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setGorduras(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-lg py-1.5 px-2.5 text-xs text-rose-400 font-bold text-center focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>
            )}
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
