import React, { useState, useEffect } from "react";
import {
  X,
  Bell,
  Clock,
  Heart,
  Activity,
  Check,
  Save,
  AlertCircle,
  Loader2,
  Sparkles,
} from "lucide-react";
import { LembreteSaudeConfig } from "../types";
import { formatarHora } from "../utils/formatters";

interface ConfigLembretesSaudeModalProps {
  isOpen: boolean;
  onClose: () => void;
  configs: LembreteSaudeConfig[];
  onSaveConfigs: (updatedConfigs: LembreteSaudeConfig[]) => Promise<void> | void;
}

export const ConfigLembretesSaudeModal: React.FC<ConfigLembretesSaudeModalProps> = ({
  isOpen,
  onClose,
  configs,
  onSaveConfigs,
}) => {
  // Estado Pressão
  const [pressaoAtivo, setPressaoAtivo] = useState(true);
  const [pressaoH1, setPressaoH1] = useState("07:30");
  const [pressaoH2, setPressaoH2] = useState("13:30");
  const [pressaoH3, setPressaoH3] = useState("19:30");

  // Estado Glicemia
  const [glicemiaAtivo, setGlicemiaAtivo] = useState(true);
  const [glicemiaH1, setGlicemiaH1] = useState("07:00");
  const [glicemiaH2, setGlicemiaH2] = useState("14:00");
  const [glicemiaH3, setGlicemiaH3] = useState("21:30");

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Carrega configurações existentes quando abrir
  useEffect(() => {
    if (configs && configs.length > 0) {
      const pressaoCfg = configs.find(
        (c) =>
          c.id === "LEMBRETE_PRESSAO" ||
          c.Id === "LEMBRETE_PRESSAO" ||
          String(c.tipo || c.Tipo).toLowerCase().includes("pressao")
      );
      if (pressaoCfg) {
        const ativo =
          pressaoCfg.ativo === "SIM" ||
          pressaoCfg.Ativo === "SIM" ||
          pressaoCfg.ativo === true ||
          pressaoCfg.Ativo === true;
        setPressaoAtivo(ativo);
        setPressaoH1(formatarHora(pressaoCfg.horario1 || pressaoCfg.Horario_1) || "07:30");
        setPressaoH2(formatarHora(pressaoCfg.horario2 || pressaoCfg.Horario_2) || "13:30");
        setPressaoH3(formatarHora(pressaoCfg.horario3 || pressaoCfg.Horario_3) || "19:30");
      }

      const glicemiaCfg = configs.find(
        (c) =>
          c.id === "LEMBRETE_GLICEMIA" ||
          c.Id === "LEMBRETE_GLICEMIA" ||
          String(c.tipo || c.Tipo).toLowerCase().includes("glicemia")
      );
      if (glicemiaCfg) {
        const ativo =
          glicemiaCfg.ativo === "SIM" ||
          glicemiaCfg.Ativo === "SIM" ||
          glicemiaCfg.ativo === true ||
          glicemiaCfg.Ativo === true;
        setGlicemiaAtivo(ativo);
        setGlicemiaH1(formatarHora(glicemiaCfg.horario1 || glicemiaCfg.Horario_1) || "07:00");
        setGlicemiaH2(formatarHora(glicemiaCfg.horario2 || glicemiaCfg.Horario_2) || "14:00");
        setGlicemiaH3(formatarHora(glicemiaCfg.horario3 || glicemiaCfg.Horario_3) || "21:30");
      }
    }
  }, [configs, isOpen]);

  if (!isOpen) return null;

  const handleSave = async () => {
    setIsSaving(true);
    setErrorMessage(null);

    try {
      const nowStr = new Date().toLocaleString("pt-BR");

      const payload: LembreteSaudeConfig[] = [
        {
          id: "LEMBRETE_PRESSAO",
          Id: "LEMBRETE_PRESSAO",
          tipo: "Pressao_Arterial",
          Tipo: "Pressao_Arterial",
          ativo: pressaoAtivo ? "SIM" : "NAO",
          Ativo: pressaoAtivo ? "SIM" : "NAO",
          horario1: pressaoH1,
          Horario_1: pressaoH1,
          horario2: pressaoH2,
          Horario_2: pressaoH2,
          horario3: pressaoH3,
          Horario_3: pressaoH3,
          diasSemana: "TODOS",
          Dias_Semana: "TODOS",
          ultimaAtualizacao: nowStr,
          Ultima_Atualizacao: nowStr,
        },
        {
          id: "LEMBRETE_GLICEMIA",
          Id: "LEMBRETE_GLICEMIA",
          tipo: "Glicemia",
          Tipo: "Glicemia",
          ativo: glicemiaAtivo ? "SIM" : "NAO",
          Ativo: glicemiaAtivo ? "SIM" : "NAO",
          horario1: glicemiaH1,
          Horario_1: glicemiaH1,
          horario2: glicemiaH2,
          Horario_2: glicemiaH2,
          horario3: glicemiaH3,
          Horario_3: glicemiaH3,
          diasSemana: "TODOS",
          Dias_Semana: "TODOS",
          ultimaAtualizacao: nowStr,
          Ultima_Atualizacao: nowStr,
        },
      ];

      await onSaveConfigs(payload);

      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error("Erro ao salvar configurações de lembrete:", err);
      setErrorMessage(err.message || "Erro ao salvar na planilha. Tente novamente.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Cabeçalho */}
        <div className="p-5 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                Lembretes de Medição Diária
                <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Aba 22
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Configure até 3 horários diários fixos sincronizados na planilha
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conteúdo rolável */}
        <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
          {errorMessage && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-3 text-rose-400 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Bloco 1: Pressão Arterial */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl">
                  <Heart className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Pressão Arterial</h3>
                  <p className="text-[11px] text-slate-400">Sistólica / Diastólica</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={pressaoAtivo}
                  onChange={(e) => setPressaoAtivo(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
              </label>
            </div>

            {pressaoAtivo && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1.5 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-500" />
                    1º Horário (Manhã)
                  </label>
                  <input
                    type="time"
                    value={pressaoH1}
                    onChange={(e) => setPressaoH1(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1.5 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-500" />
                    2º Horário (Tarde)
                  </label>
                  <input
                    type="time"
                    value={pressaoH2}
                    onChange={(e) => setPressaoH2(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1.5 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-500" />
                    3º Horário (Noite)
                  </label>
                  <input
                    type="time"
                    value={pressaoH3}
                    onChange={(e) => setPressaoH3(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Bloco 2: Glicemia */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Glicemia</h3>
                  <p className="text-[11px] text-slate-400">Jejum / Pós-Prandial / Noite</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={glicemiaAtivo}
                  onChange={(e) => setGlicemiaAtivo(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
              </label>
            </div>

            {glicemiaAtivo && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1.5 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-500" />
                    1º Horário (Jejum)
                  </label>
                  <input
                    type="time"
                    value={glicemiaH1}
                    onChange={(e) => setGlicemiaH1(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1.5 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-500" />
                    2º Horário (Pós-Almoço)
                  </label>
                  <input
                    type="time"
                    value={glicemiaH2}
                    onChange={(e) => setGlicemiaH2(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1.5 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-500" />
                    3º Horário (Antes de Dormir)
                  </label>
                  <input
                    type="time"
                    value={glicemiaH3}
                    onChange={(e) => setGlicemiaH3(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Rodapé com Botão Salvar */}
        <div className="p-5 border-t border-slate-800/80 bg-slate-900/80 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Sincroniza automaticamente celular e PC</span>
          </div>
          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-all"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className={`px-5 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center gap-2 shadow-lg ${
                saveSuccess
                  ? "bg-emerald-600 text-white"
                  : "bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black shadow-emerald-500/20"
              } disabled:opacity-60 disabled:cursor-not-allowed`}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                  <span>Salvando na Planilha...</span>
                </>
              ) : saveSuccess ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Salvo com Sucesso!</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Salvar Lembretes</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
