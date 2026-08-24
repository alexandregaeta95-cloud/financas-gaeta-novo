import React, { useState, useEffect } from "react";
import {
  X,
  Dumbbell,
  Clock,
  Calendar,
  Flame,
  FileText,
  Save,
  Zap,
  Activity,
  Plus,
  Check,
} from "lucide-react";
import { ExercicioRegistro } from "../types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (treino: ExercicioRegistro) => Promise<void> | void;
  initialData?: ExercicioRegistro | null;
}

const TIPOS_PREDEFINIDOS = [
  { id: "MUSCULAÇÃO", label: "Musculação", icon: "🏋️" },
  { id: "CORRIDA", label: "Corrida", icon: "🏃" },
  { id: "CAMINHADA", label: "Caminhada", icon: "🚶" },
  { id: "BICICLETA / CICLISMO", label: "Bicicleta / Ciclismo", icon: "🚴" },
  { id: "NATAÇÃO", label: "Natação", icon: "🏊" },
  { id: "FUNCIONAL / CROSSFIT", label: "Funcional / Crossfit", icon: "⚡" },
  { id: "PILATES", label: "Pilates / Alongamento", icon: "🧘" },
  { id: "FUTEBOL", label: "Futebol", icon: "⚽" },
  { id: "OUTRO", label: "Outro exercício...", icon: "➕" },
];

const ATALHOS_DURACAO = [15, 30, 45, 60, 90];

export const RegistroExercicioModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
}) => {
  const [tipoSelecionado, setTipoSelecionado] = useState<string>("MUSCULAÇÃO");
  const [tipoCustomizado, setTipoCustomizado] = useState<string>("");
  const [duracaoMinutos, setDuracaoMinutos] = useState<string>("45");
  const [data, setData] = useState<string>("");
  const [hora, setHora] = useState<string>("");
  const [intensidade, setIntensidade] = useState<"LEVE" | "MODERADO" | "INTENSO">("MODERADO");
  const [calorias, setCalorias] = useState<string>("");
  const [observacoes, setObservacoes] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        const matchingTipo = TIPOS_PREDEFINIDOS.find(
          (t) => t.id === initialData.tipoExercicio
        );
        if (matchingTipo) {
          setTipoSelecionado(matchingTipo.id);
          setTipoCustomizado("");
        } else {
          setTipoSelecionado("OUTRO");
          setTipoCustomizado(initialData.tipoExercicio || "");
        }

        setDuracaoMinutos(String(initialData.duracaoMinutos || "45"));
        setData(initialData.data || new Date().toISOString().split("T")[0]);
        setHora(initialData.hora || "");
        setIntensidade(
          (initialData.intensidade as "LEVE" | "MODERADO" | "INTENSO") || "MODERADO"
        );
        setCalorias(
          initialData.caloriasQueimadas ? String(initialData.caloriasQueimadas) : ""
        );
        setObservacoes(initialData.observacoes || "");
      } else {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, "0");
        const day = String(now.getDate()).padStart(2, "0");
        const hours = String(now.getHours()).padStart(2, "0");
        const minutes = String(now.getMinutes()).padStart(2, "0");

        setTipoSelecionado("MUSCULAÇÃO");
        setTipoCustomizado("");
        setDuracaoMinutos("45");
        setData(`${year}-${month}-${day}`);
        setHora(`${hours}:${minutes}`);
        setIntensidade("MODERADO");
        setCalorias("");
        setObservacoes("");
      }
      setError(null);
      setIsSaving(false);
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const finalTipo =
      tipoSelecionado === "OUTRO"
        ? tipoCustomizado.trim().toUpperCase()
        : tipoSelecionado.trim().toUpperCase();

    if (!finalTipo) {
      setError("Por favor, especifique o tipo de exercício.");
      return;
    }

    const duracaoNum = Math.round(Number(duracaoMinutos)) || 0;
    if (duracaoNum <= 0) {
      setError("A duração do treino deve ser maior que 0 minutos.");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const calNum = calorias ? Math.round(Number(calorias)) || 0 : undefined;
      const id = initialData?.id || `EXE_${Date.now()}`;

      const registro: ExercicioRegistro = {
        id,
        data: data || new Date().toISOString().split("T")[0],
        hora: hora || undefined,
        tipoExercicio: finalTipo,
        duracaoMinutos: duracaoNum,
        caloriasQueimadas: calNum && calNum > 0 ? calNum : undefined,
        intensidade,
        observacoes: observacoes.trim() ? observacoes.trim().toUpperCase() : undefined,
        dataCriacao: initialData?.dataCriacao || new Date().toISOString(),
      };

      await onSave(registro);
      onClose();
    } catch (err: any) {
      console.error("Erro ao salvar treino:", err);
      setError(err?.message || "Erro ao salvar na planilha. Tente novamente.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col my-auto max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Dumbbell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                {initialData ? "Editar Treino" : "Registrar Treino"}
                <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-300 text-[10px] font-semibold rounded-full border border-emerald-500/20">
                  23_Exercicios
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                {initialData
                  ? "Atualize as informações do seu exercício"
                  : "Mantenha o foco e registre sua atividade física"}
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
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-300">
              {error}
            </div>
          )}

          {/* Tipo de Exercício (Seletor rápido em chips) */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Tipo de Exercício <span className="text-emerald-400">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {TIPOS_PREDEFINIDOS.map((tipo) => {
                const isSelected = tipoSelecionado === tipo.id;
                return (
                  <button
                    key={tipo.id}
                    type="button"
                    onClick={() => setTipoSelecionado(tipo.id)}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-medium transition-all text-left ${
                      isSelected
                        ? "bg-emerald-500/15 border-emerald-500 text-emerald-300 shadow-sm shadow-emerald-950"
                        : "bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-800/60"
                    }`}
                  >
                    <span className="text-base leading-none">{tipo.icon}</span>
                    <span className="truncate">{tipo.label}</span>
                  </button>
                );
              })}
            </div>

            {tipoSelecionado === "OUTRO" && (
              <div className="mt-2.5 animate-in fade-in duration-150">
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="DIGITE O TIPO DO EXERCÍCIO (EX: JIU-JITSU, TÊNIS...)"
                  value={tipoCustomizado}
                  onChange={(e) => setTipoCustomizado(e.target.value.toUpperCase())}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
            )}
          </div>

          {/* Duração em Minutos com atalhos */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                Duração (minutos) <span className="text-emerald-400">*</span>
              </label>
              <div className="flex items-center gap-1">
                {ATALHOS_DURACAO.map((min) => (
                  <button
                    key={min}
                    type="button"
                    onClick={() => setDuracaoMinutos(String(min))}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-all ${
                      duracaoMinutos === String(min)
                        ? "bg-emerald-500 text-slate-950 font-bold"
                        : "bg-slate-800 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {min}m
                  </button>
                ))}
              </div>
            </div>
            <input
              type="number"
              required
              min="1"
              max="600"
              step="1"
              placeholder="Ex: 45"
              value={duracaoMinutos}
              onChange={(e) => setDuracaoMinutos(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors font-mono"
            />
          </div>

          {/* Data e Horário */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-slate-500" /> Data <span className="text-emerald-400">*</span>
              </label>
              <input
                type="date"
                required
                value={data}
                onChange={(e) => setData(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1 flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-500" /> Horário (Opcional)
              </label>
              <input
                type="time"
                value={hora}
                onChange={(e) => setHora(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
          </div>

          {/* Intensidade & Calorias */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5 flex items-center gap-1">
                <Activity className="w-3 h-3 text-slate-500" /> Intensidade
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {(["LEVE", "MODERADO", "INTENSO"] as const).map((lvl) => {
                  const isSelected = intensidade === lvl;
                  const colors = {
                    LEVE: isSelected ? "bg-teal-500/20 border-teal-500 text-teal-300" : "text-slate-400",
                    MODERADO: isSelected ? "bg-amber-500/20 border-amber-500 text-amber-300" : "text-slate-400",
                    INTENSO: isSelected ? "bg-rose-500/20 border-rose-500 text-rose-300" : "text-slate-400",
                  };
                  return (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setIntensidade(lvl)}
                      className={`py-1.5 px-1 rounded-xl border text-[10px] font-bold transition-all ${
                        isSelected
                          ? colors[lvl]
                          : "bg-slate-950 border-slate-800 hover:border-slate-700"
                      }`}
                    >
                      {lvl === "LEVE" ? "Leve" : lvl === "MODERADO" ? "Moderado" : "Intenso"}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5 flex items-center gap-1">
                <Flame className="w-3 h-3 text-amber-400" /> Calorias Gastas (kcal)
              </label>
              <input
                type="number"
                min="0"
                step="1"
                placeholder="Ex: 350 (opcional)"
                value={calorias}
                onChange={(e) => setCalorias(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors font-mono"
              />
            </div>
          </div>

          {/* Observações */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1 flex items-center gap-1">
              <FileText className="w-3 h-3 text-slate-500" /> Observações do Treino (Opcional)
            </label>
            <textarea
              rows={2}
              placeholder="EX: TREINO A: PEITO E TRÍCEPS, 4 SÉRIES DE SUPINO..."
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value.toUpperCase())}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors resize-none"
            />
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
              className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-emerald-950/40 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{initialData ? "Salvar Alterações" : "Salvar Treino"}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
