import React, { useState, useEffect } from "react";
import {
  X,
  Utensils,
  Flame,
  Clock,
  Calendar,
  Save,
  Plus,
  Zap,
  Check,
  ChevronDown,
  ChevronUp,
  Wheat,
  Droplets,
  FileText,
} from "lucide-react";
import { AlimentoAnaliseResult } from "../types";
import { VoiceInput } from "./VoiceInput";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSaveAlimento: (alimento: AlimentoAnaliseResult) => Promise<void> | void;
}

export const RegistroRapidoAlimentoModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSaveAlimento,
}) => {
  const [nomePrato, setNomePrato] = useState("");
  const [calorias, setCalorias] = useState<string>("");
  const [data, setData] = useState("");
  const [hora, setHora] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [showMacros, setShowMacros] = useState(false);
  const [proteinas, setProteinas] = useState<string>("");
  const [carboidratos, setCarboidratos] = useState<string>("");
  const [gorduras, setGorduras] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const day = String(now.getDate()).padStart(2, "0");
      const hours = String(now.getHours()).padStart(2, "0");
      const minutes = String(now.getMinutes()).padStart(2, "0");

      setData(`${year}-${month}-${day}`);
      setHora(`${hours}:${minutes}`);
      setNomePrato("");
      setCalorias("");
      setObservacoes("");
      setShowMacros(false);
      setProteinas("");
      setCarboidratos("");
      setGorduras("");
      setError(null);
      setIsSaving(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedNome = nomePrato.trim().toUpperCase();
    if (!trimmedNome) {
      setError("Por favor, digite o que você comeu ou beliscou.");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const calNum = calorias ? Math.round(Number(calorias)) || 0 : 0;
      const protNum = proteinas ? Math.round(Number(proteinas)) || 0 : 0;
      const carbNum = carboidratos ? Math.round(Number(carboidratos)) || 0 : 0;
      const gordNum = gorduras ? Math.round(Number(gorduras)) || 0 : 0;

      // Montar data e hora formatada
      let dataHoraStr = "";
      if (data) {
        const [y, m, d] = data.split("-");
        dataHoraStr = `${d}/${m}/${y}${hora ? ` ${hora}` : ""}`;
      } else {
        const now = new Date();
        dataHoraStr = now.toLocaleString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
      }

      const id = `ALIM_${Date.now()}`;
      const itemToSave: AlimentoAnaliseResult = {
        id,
        data: data || new Date().toISOString().split("T")[0],
        dataHora: dataHoraStr,
        nomePrato: trimmedNome,
        descricao: "REGISTRO MANUAL",
        caloriasEstimadas: calNum,
        proteinasEstimadas: protNum,
        carboidratosEstimados: carbNum,
        gordurasEstimadas: gordNum,
        itensIdentificados: [
          {
            item: trimmedNome,
            calorias: calNum > 0 ? calNum : undefined,
            proteinas: protNum > 0 ? protNum : undefined,
          },
        ],
        observacoes: observacoes.trim().toUpperCase() || undefined,
      };

      await onSaveAlimento(itemToSave);
      onClose();
    } catch (err: any) {
      console.error("Erro ao salvar registro rápido de alimento:", err);
      setError(err?.message || "Erro ao salvar na planilha. Tente novamente.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col my-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Registro Rápido
                <span className="px-2 py-0.5 bg-amber-500/10 text-amber-300 text-[10px] font-semibold rounded-full border border-amber-500/20">
                  Sem Foto / Sem IA
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Anote lanches, beliscos ou refeições em segundos
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSaving}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-300">
              {error}
            </div>
          )}

          {/* Campo 1: O que você comeu */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              O que você comeu / beliscou? <span className="text-rose-400">*</span>
            </label>
            <VoiceInput
              type="text"
              required
              autoFocus
              placeholder="Ex: 2 BOLACHAS, 1 FATIA DE BOLO, MAÇÃ COM CANELA..."
              value={nomePrato}
              onChange={(e) => setNomePrato(e.target.value.toUpperCase())}
              className="bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors uppercase"
              uppercase
            />
          </div>

          {/* Campo 2: Estimativa de Calorias */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                Estimativa de Calorias (kcal)
              </label>
              <span className="text-[11px] text-slate-500">Opcional</span>
            </div>
            <input
              type="number"
              min="0"
              step="1"
              placeholder="Ex: 180 (deixe em branco se não souber)"
              value={calorias}
              onFocus={(e) => e.target.select()}
              onChange={(e) => setCalorias(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>

          {/* Campo 3: Data e Hora */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-slate-500" /> Data
              </label>
              <input
                type="date"
                required
                value={data}
                onChange={(e) => setData(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-amber-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1 flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-500" /> Horário
              </label>
              <input
                type="time"
                value={hora}
                onChange={(e) => setHora(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-amber-500 transition-colors"
              />
            </div>
          </div>

          {/* Campo 4: Observações / Contexto */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1 flex items-center gap-1">
              <FileText className="w-3 h-3 text-slate-500" /> Observações / Contexto (Opcional)
            </label>
            <VoiceInput
              type="text"
              placeholder="Ex: LANCHE DA TARDE, BELISCO NO TRABALHO..."
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value.toUpperCase())}
              className="bg-slate-950 border border-slate-800 rounded-xl py-2 px-3.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors uppercase"
              uppercase
            />
          </div>

          {/* Macronutrientes (Colapsável Opcional) */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowMacros(!showMacros)}
              className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors"
            >
              {showMacros ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
              <span>{showMacros ? "Ocultar macronutrientes" : "Adicionar macronutrientes (opcional)"}</span>
            </button>

            {showMacros && (
              <div className="grid grid-cols-3 gap-2.5 mt-2.5 p-3 bg-slate-950/60 border border-slate-800 rounded-xl animate-in fade-in duration-150">
                <div>
                  <span className="text-[10px] text-teal-400 font-medium block mb-1 flex items-center gap-1">
                    <Zap className="w-3 h-3" /> Proteínas (g)
                  </span>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={proteinas}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setProteinas(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-1.5 text-xs text-white focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-amber-400 font-medium block mb-1 flex items-center gap-1">
                    <Wheat className="w-3 h-3" /> Carbos (g)
                  </span>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={carboidratos}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setCarboidratos(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-rose-400 font-medium block mb-1 flex items-center gap-1">
                    <Droplets className="w-3 h-3" /> Gorduras (g)
                  </span>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={gorduras}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setGorduras(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-1.5 text-xs text-white focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-amber-950/40 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Salvar Registro</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
