import React, { useState } from "react";
import {
  X,
  Pill,
  Clock,
  Plus,
  Trash2,
  Edit2,
  Check,
  Save,
  AlertCircle,
  Loader2,
  Volume2,
  VolumeX,
  Info,
  Calendar,
  Sparkles,
} from "lucide-react";
import { LembreteRemedio } from "../types";
import { formatarHora } from "../utils/formatters";
import { testAlarmSound } from "../services/alarmSoundService";

interface LembretesRemediosModalProps {
  isOpen: boolean;
  onClose: () => void;
  remedios: LembreteRemedio[];
  onSaveRemedios: (updatedRemedios: LembreteRemedio[]) => Promise<void> | void;
}

export const LembretesRemediosModal: React.FC<LembretesRemediosModalProps> = ({
  isOpen,
  onClose,
  remedios,
  onSaveRemedios,
}) => {
  const [isEditingOrCreating, setIsEditingOrCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form fields
  const [formNome, setFormNome] = useState("");
  const [formAtivo, setFormAtivo] = useState(true);
  const [formSom, setFormSom] = useState(true);
  const [formH1, setFormH1] = useState("08:00");
  const [formH2, setFormH2] = useState("");
  const [formH3, setFormH3] = useState("");
  const [formIntervaloDias, setFormIntervaloDias] = useState<number | string>(1);
  const [formInstrucoes, setFormInstrucoes] = useState("");

  const [showH2, setShowH2] = useState(false);
  const [showH3, setShowH3] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isTestingAudio, setIsTestingAudio] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormNome("");
    setFormAtivo(true);
    setFormSom(true);
    setFormH1("08:00");
    setFormH2("");
    setFormH3("");
    setFormIntervaloDias(1);
    setShowH2(false);
    setShowH3(false);
    setFormInstrucoes("");
    setErrorMessage(null);
    setIsEditingOrCreating(true);
  };

  const handleOpenEdit = (rem: LembreteRemedio) => {
    setEditingId(rem.Id || rem.id || null);
    setFormNome(rem.Nome || rem.nome || "");
    const rawAtivo = rem.Ativo ?? rem.ativo;
    setFormAtivo(
      rawAtivo === true ||
        rawAtivo === "SIM" ||
        rawAtivo === "sim" ||
        rawAtivo === "TRUE" ||
        rawAtivo === "true" ||
        (rawAtivo as any) === 1 ||
        rawAtivo === undefined ||
        rawAtivo === null ||
        rawAtivo === ""
    );
    const rawSom = rem.Som_Alarme ?? rem.somAlarme ?? rem.Som ?? rem.som;
    setFormSom(rawSom !== "NAO" && rawSom !== "nao" && rawSom !== false);

    const h1 = rem.Horario_1 || rem.horario1 || "08:00";
    const h2 = rem.Horario_2 || rem.horario2 || "";
    const h3 = rem.Horario_3 || rem.horario3 || "";

    setFormH1(h1);
    setFormH2(h2);
    setFormH3(h3);
    setFormIntervaloDias(rem.Intervalo_Dias ?? rem.intervaloDias ?? 1);
    setShowH2(!!h2);
    setShowH3(!!h3);
    setFormInstrucoes(rem.Instrucoes || rem.instrucoes || "");
    setErrorMessage(null);
    setIsEditingOrCreating(true);
  };

  const handleCancelForm = () => {
    setIsEditingOrCreating(false);
    setEditingId(null);
    setErrorMessage(null);
  };

  const handleTestAudio = async () => {
    try {
      setIsTestingAudio(true);
      await testAlarmSound();
    } catch (e) {
      console.warn("Erro ao testar áudio:", e);
    } finally {
      setTimeout(() => setIsTestingAudio(false), 2000);
    }
  };

  const handleToggleAtivoDirect = async (targetId: string, currentStatus: boolean) => {
    try {
      setIsSaving(true);
      const updated = remedios.map((r) => {
        const rId = r.Id || r.id;
        if (rId === targetId) {
          return {
            ...r,
            Ativo: currentStatus ? ("NAO" as const) : ("SIM" as const),
            ativo: !currentStatus,
          };
        }
        return r;
      });
      await onSaveRemedios(updated);
    } catch (err: any) {
      console.error("Erro ao alterar status:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (targetId: string) => {
    try {
      setIsSaving(true);
      const updated = remedios.filter((r) => (r.Id || r.id) !== targetId);
      await onSaveRemedios(updated);
      setConfirmDeleteId(null);
    } catch (err: any) {
      console.error("Erro ao excluir remédio:", err);
      setErrorMessage("Erro ao excluir. Tente novamente.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanNome = formNome.trim();
    if (!cleanNome) {
      setErrorMessage("Por favor, preencha o nome ou dosagem do medicamento.");
      return;
    }

    const cleanH1 = formatarHora(formH1);
    if (!cleanH1 || !/^\d{1,2}:\d{2}$/.test(cleanH1)) {
      setErrorMessage("O 1º Horário é obrigatório e deve estar no formato válido (HH:mm).");
      return;
    }

    const cleanH2 = showH2 && formH2.trim() ? formatarHora(formH2) : "";
    const cleanH3 = showH3 && formH3.trim() ? formatarHora(formH3) : "";

    const id = editingId || `REM_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const today = new Date().toISOString().split("T")[0];

    const rawIntervalo = parseInt(String(formIntervaloDias), 10);
    const validIntervalo = isNaN(rawIntervalo) || rawIntervalo < 1 ? 1 : rawIntervalo;

    const novoRemedio: LembreteRemedio = {
      Id: id,
      id,
      Nome: cleanNome,
      nome: cleanNome,
      Ativo: formAtivo ? "SIM" : "NAO",
      ativo: formAtivo,
      Horario_1: cleanH1,
      horario1: cleanH1,
      Horario_2: cleanH2 || undefined,
      horario2: cleanH2 || undefined,
      Horario_3: cleanH3 || undefined,
      horario3: cleanH3 || undefined,
      Intervalo_Dias: validIntervalo,
      intervaloDias: validIntervalo,
      Som_Alarme: formSom ? "SIM" : "NAO",
      somAlarme: formSom,
      Instrucoes: formInstrucoes.trim() || undefined,
      instrucoes: formInstrucoes.trim() || undefined,
      Data_Cadastro: today,
      dataCadastro: today,
    };

    let updatedList: LembreteRemedio[] = [];
    if (editingId) {
      updatedList = remedios.map((r) => ((r.Id || r.id) === editingId ? novoRemedio : r));
    } else {
      updatedList = [...remedios, novoRemedio];
    }

    try {
      setIsSaving(true);
      await onSaveRemedios(updatedList);
      setSaveSuccess(true);
      setIsEditingOrCreating(false);
      setEditingId(null);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err: any) {
      console.error("Erro ao salvar lembrete de remédio:", err);
      setErrorMessage(err.message || "Erro ao salvar no Google Sheets.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      id="modal-lembretes-remedios"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-slate-800 bg-slate-900/90 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-950">
              <Pill className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Aba 27_Lembretes_Remedios
                </span>
                <span className="text-xs text-slate-400">• Saúde & Medicamentos</span>
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight flex items-center gap-2">
                <span>Lembretes de Remédios</span>
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Fechar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Messages */}
        {errorMessage && (
          <div className="m-4 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center gap-3 text-rose-400 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {saveSuccess && (
          <div className="m-4 p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center gap-3 text-emerald-400 text-xs font-semibold">
            <Check className="w-4 h-4 shrink-0" />
            <span>Lembretes de remédios salvos com sucesso na aba 27_Lembretes_Remedios!</span>
          </div>
        )}

        {/* Content Area */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {isEditingOrCreating ? (
            /* FORMULÁRIO DE CADASTRO / EDIÇÃO */
            <form onSubmit={handleSaveForm} className="space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Pill className="w-4 h-4 text-emerald-400" />
                  <span>{editingId ? "Editar Remédio" : "Novo Medicamento"}</span>
                </h4>
                <button
                  type="button"
                  onClick={handleCancelForm}
                  className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
                >
                  Voltar para lista
                </button>
              </div>

              {/* Nome do Remédio */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Nome do Medicamento & Dosagem <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={formNome}
                  onChange={(e) => setFormNome(e.target.value.toUpperCase())}
                  placeholder="Ex: Losartana 50mg, Dipirona 1g, Ômega 3..."
                  required
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500 placeholder:text-slate-600"
                />
              </div>

              {/* Horários (1 a 3) */}
              <div className="bg-slate-950/60 border border-slate-800/90 p-4 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Horários de Tomada (1 a 3 horários)</span>
                  </label>
                  <span className="text-[11px] text-slate-400">Padrão HH:mm</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Horário 1 */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      1º Horário <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="time"
                      value={formH1}
                      onChange={(e) => setFormH1(e.target.value)}
                      required
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-white text-sm font-mono text-center focus:border-emerald-500"
                    />
                  </div>

                  {/* Horário 2 */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-semibold text-slate-400">2º Horário</label>
                      {showH2 && (
                        <button
                          type="button"
                          onClick={() => {
                            setShowH2(false);
                            setFormH2("");
                          }}
                          className="text-[10px] text-rose-400 hover:underline"
                        >
                          Remover
                        </button>
                      )}
                    </div>
                    {showH2 ? (
                      <input
                        type="time"
                        value={formH2}
                        onChange={(e) => setFormH2(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-white text-sm font-mono text-center focus:border-emerald-500"
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setShowH2(true);
                          if (!formH2) setFormH2("14:00");
                        }}
                        className="w-full py-2 px-3 border border-dashed border-slate-700 hover:border-emerald-500/60 rounded-xl text-xs text-slate-400 hover:text-emerald-300 flex items-center justify-center gap-1.5 transition-colors cursor-pointer bg-slate-900/40"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>+ 2º Horário</span>
                      </button>
                    )}
                  </div>

                  {/* Horário 3 */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-semibold text-slate-400">3º Horário</label>
                      {showH3 && (
                        <button
                          type="button"
                          onClick={() => {
                            setShowH3(false);
                            setFormH3("");
                          }}
                          className="text-[10px] text-rose-400 hover:underline"
                        >
                          Remover
                        </button>
                      )}
                    </div>
                    {showH3 ? (
                      <input
                        type="time"
                        value={formH3}
                        onChange={(e) => setFormH3(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-white text-sm font-mono text-center focus:border-emerald-500"
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setShowH3(true);
                          if (!formH3) setFormH3("20:00");
                        }}
                        className="w-full py-2 px-3 border border-dashed border-slate-700 hover:border-emerald-500/60 rounded-xl text-xs text-slate-400 hover:text-emerald-300 flex items-center justify-center gap-1.5 transition-colors cursor-pointer bg-slate-900/40"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>+ 3º Horário</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Recorrência em Dias (Intervalo de Dias) */}
                <div className="pt-2 border-t border-slate-800/80">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Frequência / Intervalo de Dias</span>
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {Number(formIntervaloDias) === 1
                        ? "Todos os dias"
                        : `A cada ${formIntervaloDias} dias`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5">
                      <span className="text-xs text-slate-400">A cada</span>
                      <input
                        type="number"
                        min="1"
                        max="365"
                        value={formIntervaloDias}
                        onChange={(e) => setFormIntervaloDias(e.target.value)}
                        className="w-14 px-2 py-1 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono text-center text-xs focus:outline-none focus:border-emerald-500"
                      />
                      <span className="text-xs text-slate-400">dia(s)</span>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      {[
                        { label: "Todo dia", val: 1 },
                        { label: "A cada 2 dias", val: 2 },
                        { label: "A cada 7 dias (Semanal)", val: 7 },
                        { label: "A cada 15 dias", val: 15 },
                        { label: "A cada 30 dias (Mensal)", val: 30 },
                      ].map((item) => (
                        <button
                          key={item.val}
                          type="button"
                          onClick={() => setFormIntervaloDias(item.val)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                            Number(formIntervaloDias) === item.val
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold"
                              : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200"
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Sugestões Rápidas de Horário */}
                <div className="pt-2">
                  <span className="text-[10px] text-slate-500 block mb-1">Atalhos rápidos para 1º Horário:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {["06:00", "07:00", "08:00", "12:00", "14:00", "18:00", "20:00", "22:00"].map((h) => (
                      <button
                        key={h}
                        type="button"
                        onClick={() => setFormH1(h)}
                        className={`px-2 py-0.5 rounded-lg text-[11px] font-mono transition-all ${
                          formH1 === h
                            ? "bg-emerald-500 text-slate-950 font-bold"
                            : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                        }`}
                      >
                        {h}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Status e Som */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Ativo Toggle */}
                <div className="bg-slate-950/60 border border-slate-800 p-3.5 rounded-2xl flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-white block">Lembrete Ativo</span>
                    <span className="text-[11px] text-slate-400">Disparar nos horários programados</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormAtivo(!formAtivo)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      formAtivo ? "bg-emerald-600" : "bg-slate-800"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                        formAtivo ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {/* Som de Alarme Toggle */}
                <div className="bg-slate-950/60 border border-slate-800 p-3.5 rounded-2xl flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      {formSom ? <Volume2 className="w-3.5 h-3.5 text-rose-400" /> : <VolumeX className="w-3.5 h-3.5 text-slate-500" />}
                      <span>Alarme Sonoro</span>
                    </span>
                    <span className="text-[11px] text-slate-400">Tocar som contínuo</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleTestAudio}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold rounded-lg transition-colors cursor-pointer"
                      title="Testar som do alarme"
                    >
                      {isTestingAudio ? "Tocando..." : "Testar"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormSom(!formSom)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        formSom ? "bg-rose-600" : "bg-slate-800"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                          formSom ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              {/* Instruções / Posologia */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-slate-400" />
                  <span>Instruções / Como tomar (Opcional)</span>
                </label>
                <textarea
                  value={formInstrucoes}
                  onChange={(e) => setFormInstrucoes(e.target.value)}
                  placeholder="Ex: Tomar em jejum com água; tomar 1 comprimido após o almoço..."
                  rows={2}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500 placeholder:text-slate-600 resize-none"
                />
              </div>

              {/* Botões do Formulário */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={handleCancelForm}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-950 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Salvar Remédio</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            /* LISTAGEM DE REMÉDIOS CADASTRADOS */
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/70 p-4 rounded-2xl border border-slate-800/80">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>Medicamentos Monitorados</span>
                    <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 font-bold text-xs rounded-full">
                      {remedios.length}
                    </span>
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Cada remédio tem seus próprios horários e alarme configurado.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleOpenCreate}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-950/40 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Cadastrar Novo Remédio</span>
                </button>
              </div>

              {remedios.length === 0 ? (
                <div className="p-8 text-center bg-slate-950/40 border border-dashed border-slate-800 rounded-3xl space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-slate-800/80 text-slate-400 flex items-center justify-center mx-auto">
                    <Pill className="w-6 h-6" />
                  </div>
                  <h5 className="text-sm font-bold text-white">Nenhum remédio cadastrado ainda</h5>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    Cadastre seus remédios para receber alarmes nos horários exatos das tomadas, com opção de soneca caso precise adiar.
                  </p>
                  <button
                    type="button"
                    onClick={handleOpenCreate}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-emerald-400 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Adicionar Primeiro Remédio</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {remedios.map((rem) => {
                    const id = rem.Id || rem.id || "";
                    const nome = rem.Nome || rem.nome || "Medicamento";
                    const rawAtivo = rem.Ativo ?? rem.ativo;
                    const isAtivo =
                      rawAtivo === true ||
                      rawAtivo === "SIM" ||
                      rawAtivo === "sim" ||
                      rawAtivo === "TRUE" ||
                      rawAtivo === "true" ||
                      rawAtivo === 1 ||
                      rawAtivo === undefined ||
                      rawAtivo === null ||
                      rawAtivo === "";

                    const rawSom = rem.Som_Alarme ?? rem.somAlarme ?? rem.Som ?? rem.som;
                    const hasSom = rawSom !== "NAO" && rawSom !== "nao" && rawSom !== false;

                    const h1 = rem.Horario_1 || rem.horario1 || "";
                    const h2 = rem.Horario_2 || rem.horario2 || "";
                    const h3 = rem.Horario_3 || rem.horario3 || "";
                    const instrucoes = rem.Instrucoes || rem.instrucoes || "";

                    const isConfirmingDelete = confirmDeleteId === id;

                    return (
                      <div
                        key={id}
                        className={`p-4 rounded-2xl border transition-all ${
                          isAtivo
                            ? "bg-slate-950/80 border-slate-800 hover:border-slate-700"
                            : "bg-slate-950/40 border-slate-900 opacity-60"
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          {/* Info do Medicamento */}
                          <div className="space-y-1.5 flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-base font-bold text-white tracking-tight truncate">
                                {nome}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  isAtivo
                                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                    : "bg-slate-800 text-slate-400"
                                }`}
                              >
                                {isAtivo ? "Ativo" : "Pausado"}
                              </span>
                              {hasSom ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                  <Volume2 className="w-3 h-3" />
                                  <span>Alarme</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400">
                                  <VolumeX className="w-3 h-3" />
                                  <span>Silencioso</span>
                                </span>
                              )}
                            </div>

                            {/* Horários e Frequência */}
                            <div className="flex items-center gap-2 flex-wrap pt-0.5">
                              <span className="text-[11px] text-slate-400 flex items-center gap-1 font-semibold">
                                <Clock className="w-3 h-3 text-emerald-400" />
                                Horários:
                              </span>
                              {h1 && (
                                <span className="px-2.5 py-1 bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 font-mono font-bold text-xs rounded-lg shadow-xs">
                                  {h1}
                                </span>
                              )}
                              {h2 && (
                                <span className="px-2.5 py-1 bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 font-mono font-bold text-xs rounded-lg shadow-xs">
                                  {h2}
                                </span>
                              )}
                              {h3 && (
                                <span className="px-2.5 py-1 bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 font-mono font-bold text-xs rounded-lg shadow-xs">
                                  {h3}
                                </span>
                              )}

                              {/* Badge de Intervalo */}
                              {rem.Intervalo_Dias && Number(rem.Intervalo_Dias) > 1 && (
                                <span className="px-2 py-0.5 bg-slate-900 border border-slate-700 text-slate-300 text-[10px] font-semibold rounded-md">
                                  A cada {rem.Intervalo_Dias} dias
                                </span>
                              )}
                            </div>

                            {/* Instruções */}
                            {instrucoes && (
                              <p className="text-xs text-slate-400 italic bg-slate-900/60 p-2 rounded-xl border border-slate-800/60 mt-1">
                                💬 {instrucoes}
                              </p>
                            )}
                          </div>

                          {/* Ações Rápidas */}
                          <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/60 justify-end">
                            {/* Toggle Ativo */}
                            <button
                              type="button"
                              onClick={() => handleToggleAtivoDirect(id, isAtivo)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                isAtivo
                                  ? "bg-slate-800 hover:bg-slate-750 text-slate-300"
                                  : "bg-emerald-950 hover:bg-emerald-900 text-emerald-400 border border-emerald-500/30"
                              }`}
                              title={isAtivo ? "Pausar lembretes deste remédio" : "Ativar lembretes deste remédio"}
                            >
                              {isAtivo ? "Pausar" : "Ativar"}
                            </button>

                            {/* Editar */}
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(rem)}
                              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                              title="Editar remédio"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>

                            {/* Excluir */}
                            {isConfirmingDelete ? (
                              <div className="flex items-center gap-1 bg-rose-950/80 p-1 rounded-xl border border-rose-500/40">
                                <span className="text-[10px] text-rose-300 font-bold px-1">Excluir?</span>
                                <button
                                  type="button"
                                  onClick={() => handleDelete(id)}
                                  className="px-2 py-1 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg text-xs"
                                >
                                  Sim
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs"
                                >
                                  Não
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(id)}
                                className="p-2 rounded-xl bg-slate-900 hover:bg-rose-950/60 text-slate-500 hover:text-rose-400 border border-slate-800 hover:border-rose-500/30 transition-colors cursor-pointer"
                                title="Excluir remédio"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Sincronização em tempo real com Google Sheets</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
