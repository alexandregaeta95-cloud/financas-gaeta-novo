import React, { useState, useEffect } from "react";
import {
  X,
  Settings,
  Droplets,
  Target,
  GlassWater,
  Save,
  Check,
  Info,
  Sparkles,
} from "lucide-react";
import { ConfigAgua } from "../types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSaveConfig: (config: ConfigAgua) => Promise<void> | void;
  currentConfig?: ConfigAgua;
}

const PRESET_COPOS = [200, 250, 300, 400, 500, 600, 750, 1000];
const PRESET_METAS = [1500, 2000, 2500, 3000, 3500, 4000, 5000];

export const ConfigAguaModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSaveConfig,
  currentConfig,
}) => {
  const [tamanhoCopoMl, setTamanhoCopoMl] = useState<number>(500);
  const [metaDiariaMl, setMetaDiariaMl] = useState<number>(2500);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTamanhoCopoMl(currentConfig?.tamanhoCopoMl || 500);
      setMetaDiariaMl(currentConfig?.metaDiariaMl || 2500);
      setError(null);
      setIsSaving(false);
    }
  }, [isOpen, currentConfig]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (tamanhoCopoMl < 50 || tamanhoCopoMl > 5000) {
      setError("O tamanho do copo/recipiente deve estar entre 50 ml e 5.000 ml.");
      return;
    }

    if (metaDiariaMl < 500 || metaDiariaMl > 15000) {
      setError("A meta diária de água deve estar entre 500 ml e 15.000 ml.");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const configToSave: ConfigAgua = {
        id: "CONFIG_AGUA",
        Id: "CONFIG_AGUA",
        metaDiariaMl,
        Meta_Diaria_Ml: metaDiariaMl,
        tamanhoCopoMl,
        Tamanho_Copo_Ml: tamanhoCopoMl,
        dataCriacao: currentConfig?.dataCriacao || new Date().toISOString(),
        Data_Criacao: currentConfig?.dataCriacao || new Date().toISOString(),
      };

      await onSaveConfig(configToSave);
      onClose();
    } catch (err: any) {
      setError(err?.message || "Erro ao salvar as configurações de hidratação.");
    } finally {
      setIsSaving(false);
    }
  };

  const coposPorDia = tamanhoCopoMl > 0 ? (metaDiariaMl / tamanhoCopoMl).toFixed(1) : "0";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white leading-tight">
                Metas & Recipiente de Água
              </h2>
              <p className="text-[11px] text-slate-400">
                Sincronizado na planilha para todos os seus dispositivos
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

          {/* 1. Tamanho do Recipiente Padrão */}
          <div className="space-y-2 p-3.5 bg-slate-950/60 border border-slate-800/80 rounded-xl">
            <label className="text-xs font-semibold text-slate-200 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <GlassWater className="w-4 h-4 text-cyan-400" />
                Tamanho do Copo / Garrafa Padrão
              </span>
              <span className="text-xs font-bold text-cyan-400">
                {tamanhoCopoMl} ml ({tamanhoCopoMl >= 1000 ? `${tamanhoCopoMl / 1000} L` : `${tamanhoCopoMl} ml`})
              </span>
            </label>
            <p className="text-[11px] text-slate-400">
              Define o volume somado automaticamente no botão de 1 clique (ex: <strong className="text-cyan-300">+{tamanhoCopoMl}ml</strong>).
            </p>

            <div className="pt-1">
              <input
                type="number"
                min="50"
                max="5000"
                step="25"
                value={tamanhoCopoMl}
                onFocus={(e) => e.target.select()}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  setTamanhoCopoMl(isNaN(val) ? 50 : Math.max(50, Math.min(5000, val)));
                }}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 px-3 text-center text-lg font-bold text-cyan-400 focus:outline-none focus:border-cyan-500"
                required
              />
            </div>

            {/* Quick chips presets */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1.5">
              {PRESET_COPOS.map((ml) => (
                <button
                  key={ml}
                  type="button"
                  onClick={() => setTamanhoCopoMl(ml)}
                  className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition-colors ${
                    tamanhoCopoMl === ml
                      ? "bg-cyan-500/25 border-cyan-500/50 text-cyan-300 shadow-sm"
                      : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                  }`}
                >
                  {ml >= 1000 ? `${ml / 1000}L` : `${ml}ml`}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Meta Diária de Consumo */}
          <div className="space-y-2 p-3.5 bg-slate-950/60 border border-slate-800/80 rounded-xl">
            <label className="text-xs font-semibold text-slate-200 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Target className="w-4 h-4 text-emerald-400" />
                Meta Diária de Consumo
              </span>
              <span className="text-xs font-bold text-emerald-400">
                {metaDiariaMl.toLocaleString("pt-BR")} ml ({(metaDiariaMl / 1000).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 2 })} L)
              </span>
            </label>
            <p className="text-[11px] text-slate-400">
              Sua meta diária ideal para hidratação e acompanhamento do progresso.
            </p>

            <div className="pt-1">
              <input
                type="number"
                min="500"
                max="15000"
                step="100"
                value={metaDiariaMl}
                onFocus={(e) => e.target.select()}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  setMetaDiariaMl(isNaN(val) ? 500 : Math.max(500, Math.min(15000, val)));
                }}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 px-3 text-center text-lg font-bold text-emerald-400 focus:outline-none focus:border-emerald-500"
                required
              />
            </div>

            {/* Quick chips presets */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1.5">
              {PRESET_METAS.map((ml) => (
                <button
                  key={ml}
                  type="button"
                  onClick={() => setMetaDiariaMl(ml)}
                  className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition-colors ${
                    metaDiariaMl === ml
                      ? "bg-emerald-500/25 border-emerald-500/50 text-emerald-300 shadow-sm"
                      : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                  }`}
                >
                  {(ml / 1000).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} L ({ml}ml)
                </button>
              ))}
            </div>
          </div>

          {/* Helper Card */}
          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-start gap-2.5 text-xs text-blue-300">
            <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-blue-200">
                Equivalência diária:
              </p>
              <p className="text-[11px] text-blue-300/90 mt-0.5">
                Para atingir sua meta de <strong className="text-white">{metaDiariaMl} ml</strong>, você precisará tomar aproximadamente <strong className="text-white">{coposPorDia} vezes</strong> o seu recipiente de <strong className="text-white">{tamanhoCopoMl} ml</strong> ao longo do dia.
              </p>
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
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-cyan-950/40 disabled:opacity-50"
            >
              {isSaving ? (
                <span>Salvando...</span>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Salvar Configurações</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
