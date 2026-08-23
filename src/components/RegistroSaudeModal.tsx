import React, { useState, useEffect } from "react";
import { X, Activity, Scale, Heart, Droplets, Calendar, Clock, AlertCircle } from "lucide-react";
import { RegistroSaude } from "../types";
import { generateNewId } from "../services/api";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (registro: RegistroSaude) => Promise<void>;
  initialData?: RegistroSaude | null;
  defaultTipo?: "PESO" | "PRESSAO" | "GLICEMIA";
}

// Helper to parse date and time reliably from any format (ISO, YYYY-MM-DD HH:mm, DD/MM/YYYY HH:mm)
function parseDataHora(dtStr?: string): { data: string; hora: string } {
  if (!dtStr || !dtStr.trim()) {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const hh = String(now.getHours()).padStart(2, "0");
    const min = String(now.getMinutes()).padStart(2, "0");
    return { data: `${yyyy}-${mm}-${dd}`, hora: `${hh}:${min}` };
  }

  let datePart = "";
  let timePart = "";

  const trimmed = dtStr.trim();
  if (trimmed.includes("T")) {
    const parts = trimmed.split("T");
    datePart = parts[0];
    timePart = parts[1]?.substring(0, 5) || "";
  } else if (trimmed.includes(" ")) {
    const parts = trimmed.split(/\s+/);
    datePart = parts[0];
    timePart = parts[1]?.substring(0, 5) || "";
  } else {
    datePart = trimmed;
  }

  // Convert DD/MM/YYYY -> YYYY-MM-DD for <input type="date">
  if (datePart.includes("/")) {
    const dParts = datePart.split("/");
    if (dParts.length === 3) {
      const day = dParts[0].padStart(2, "0");
      const month = dParts[1].padStart(2, "0");
      let year = dParts[2];
      if (year.length === 2) year = `20${year}`;
      datePart = `${year}-${month}-${day}`;
    }
  }

  return { data: datePart, hora: timePart };
}

export const RegistroSaudeModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  defaultTipo = "PESO",
}) => {
  const [tipo, setTipo] = useState<"PESO" | "PRESSAO" | "GLICEMIA">(defaultTipo);
  const [data, setData] = useState("");
  const [hora, setHora] = useState("");

  // Sub-aba 1: Peso
  const [pesoValor, setPesoValor] = useState<string>("");
  const [pesoObs, setPesoObs] = useState("");

  // Sub-aba 2: Pressão Arterial
  const [pressaoSistolica, setPressaoSistolica] = useState<string>("");
  const [pressaoDiastolica, setPressaoDiastolica] = useState<string>("");
  const [pressaoBpm, setPressaoBpm] = useState<string>("");
  const [pressaoObs, setPressaoObs] = useState("");

  // Sub-aba 3: Glicemia
  const [glicemiaValor, setGlicemiaValor] = useState<string>("");
  const [glicemiaContexto, setGlicemiaContexto] = useState<string>("JEJUM");
  const [glicemiaObs, setGlicemiaObs] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (isOpen) {
      setErrorMsg("");

      if (initialData) {
        const rawTipo = String(initialData.Tipo_Registro || "").trim().toUpperCase();
        const itemTipo = rawTipo.includes("PRESS")
          ? "PRESSAO"
          : rawTipo.includes("GLIC")
          ? "GLICEMIA"
          : "PESO";

        setTipo(itemTipo);

        const { data: parsedData, hora: parsedHora } = parseDataHora(initialData.Data_Hora);
        setData(parsedData);
        setHora(parsedHora);

        const obsValue = initialData.Observacoes ? String(initialData.Observacoes).toUpperCase() : "";

        if (itemTipo === "PESO") {
          setPesoValor(initialData.Valor_Principal ? String(initialData.Valor_Principal) : "");
          setPesoObs(obsValue);
          // Clear other sub-tabs to avoid data mixing
          setPressaoSistolica("");
          setPressaoDiastolica("");
          setPressaoBpm("");
          setPressaoObs("");
          setGlicemiaValor("");
          setGlicemiaContexto("JEJUM");
          setGlicemiaObs("");
        } else if (itemTipo === "PRESSAO") {
          setPressaoSistolica(initialData.Valor_Principal ? String(initialData.Valor_Principal) : "");
          setPressaoDiastolica(initialData.Valor_Secundario ? String(initialData.Valor_Secundario) : "");
          setPressaoBpm(initialData.Batimentos_Bpm ? String(initialData.Batimentos_Bpm) : "");
          setPressaoObs(obsValue);
          // Clear other sub-tabs to avoid data mixing
          setPesoValor("");
          setPesoObs("");
          setGlicemiaValor("");
          setGlicemiaContexto("JEJUM");
          setGlicemiaObs("");
        } else if (itemTipo === "GLICEMIA") {
          setGlicemiaValor(initialData.Valor_Principal ? String(initialData.Valor_Principal) : "");
          setGlicemiaContexto(initialData.Contexto || "JEJUM");
          setGlicemiaObs(obsValue);
          // Clear other sub-tabs to avoid data mixing
          setPesoValor("");
          setPesoObs("");
          setPressaoSistolica("");
          setPressaoDiastolica("");
          setPressaoBpm("");
          setPressaoObs("");
        }
      } else {
        setTipo(defaultTipo);
        const { data: defaultData, hora: defaultHora } = parseDataHora();
        setData(defaultData);
        setHora(defaultHora);
        setPesoValor("");
        setPesoObs("");
        setPressaoSistolica("");
        setPressaoDiastolica("");
        setPressaoBpm("");
        setPressaoObs("");
        setGlicemiaValor("");
        setGlicemiaContexto("JEJUM");
        setGlicemiaObs("");
      }
    }
  }, [isOpen, initialData, defaultTipo]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!data) {
      setErrorMsg("A data do registro é obrigatória.");
      return;
    }

    let valP = 0;
    let valS: number | undefined = undefined;
    let bpm: number | undefined = undefined;
    let contexto: string | undefined = undefined;
    let obs = "";

    if (tipo === "PESO") {
      valP = parseFloat(pesoValor.replace(",", "."));
      if (isNaN(valP) || valP <= 0) {
        setErrorMsg("Informe o peso corporal (kg) válido e maior que zero.");
        return;
      }
      obs = pesoObs;
    } else if (tipo === "PRESSAO") {
      valP = parseFloat(pressaoSistolica.replace(",", "."));
      if (isNaN(valP) || valP <= 0) {
        setErrorMsg("Informe a pressão sistólica (máxima) válida.");
        return;
      }
      valS = parseFloat(pressaoDiastolica.replace(",", "."));
      if (isNaN(valS) || valS <= 0) {
        setErrorMsg("Informe a pressão diastólica (mínima) válida.");
        return;
      }
      if (pressaoBpm.trim()) {
        const parsedBpm = parseInt(pressaoBpm.replace(/\D/g, ""), 10);
        if (isNaN(parsedBpm) || parsedBpm <= 0) {
          setErrorMsg("Informe um número inteiro válido para os batimentos cardíacos (bpm).");
          return;
        }
        bpm = parsedBpm;
      }
      obs = pressaoObs;
    } else if (tipo === "GLICEMIA") {
      valP = parseFloat(glicemiaValor.replace(",", "."));
      if (isNaN(valP) || valP <= 0) {
        setErrorMsg("Informe o valor da glicemia (mg/dL) válido.");
        return;
      }
      contexto = glicemiaContexto;
      obs = glicemiaObs;
    }

    setIsSubmitting(true);
    try {
      const dataHoraFinal = hora ? `${data} ${hora}` : data;

      const record: RegistroSaude = {
        Id: initialData?.Id || generateNewId("SAUDE"),
        Tipo_Registro: tipo,
        Data_Hora: dataHoraFinal,
        Valor_Principal: valP,
        Valor_Secundario: valS,
        Batimentos_Bpm: tipo === "PRESSAO" ? bpm : undefined,
        Contexto: tipo === "GLICEMIA" ? contexto : undefined,
        Observacoes: obs.trim().toUpperCase(),
        Data_Criacao: initialData?.Data_Criacao || new Date().toISOString(),
      };

      await onSave(record);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Erro ao salvar registro de saúde.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-850">
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-xl ${
                tipo === "PESO"
                  ? "bg-amber-500/15 text-amber-400 border border-amber-500/20"
                  : tipo === "PRESSAO"
                  ? "bg-rose-500/15 text-rose-400 border border-rose-500/20"
                  : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
              }`}
            >
              {tipo === "PESO" ? (
                <Scale className="w-5 h-5" />
              ) : tipo === "PRESSAO" ? (
                <Heart className="w-5 h-5" />
              ) : (
                <Droplets className="w-5 h-5" />
              )}
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                {initialData ? "Editar Registro de Saúde" : "Novo Registro de Saúde"}
              </h2>
              <p className="text-xs text-slate-400">
                Aba 20_Controle_Saude • Acompanhamento Biométrico
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center gap-2.5 text-xs text-rose-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Tipo de Métrica Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Tipo de Medição
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setTipo("PESO")}
                className={`py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border transition-all ${
                  tipo === "PESO"
                    ? "bg-amber-500/20 border-amber-500/50 text-amber-300 shadow-xs"
                    : "bg-slate-800/60 border-slate-700 text-slate-400 hover:text-slate-200"
                }`}
              >
                <Scale className="w-4 h-4" />
                <span>Peso (kg)</span>
              </button>

              <button
                type="button"
                onClick={() => setTipo("PRESSAO")}
                className={`py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border transition-all ${
                  tipo === "PRESSAO"
                    ? "bg-rose-500/20 border-rose-500/50 text-rose-300 shadow-xs"
                    : "bg-slate-800/60 border-slate-700 text-slate-400 hover:text-slate-200"
                }`}
              >
                <Heart className="w-4 h-4" />
                <span>Pressão</span>
              </button>

              <button
                type="button"
                onClick={() => setTipo("GLICEMIA")}
                className={`py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border transition-all ${
                  tipo === "GLICEMIA"
                    ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300 shadow-xs"
                    : "bg-slate-800/60 border-slate-700 text-slate-400 hover:text-slate-200"
                }`}
              >
                <Droplets className="w-4 h-4" />
                <span>Glicemia</span>
              </button>
            </div>
          </div>

          {/* Data e Hora */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Data *
              </label>
              <div className="relative">
                <input
                  type="date"
                  required
                  value={data}
                  onChange={(e) => setData(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Horário
              </label>
              <div className="relative">
                <input
                  type="time"
                  value={hora}
                  onChange={(e) => setHora(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Dynamic Value Fields Based on Tipo */}
          {tipo === "PESO" && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Peso Corporal (kg) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="20"
                    max="350"
                    required
                    placeholder="Ex: 78.5"
                    value={pesoValor}
                    onChange={(e) => setPesoValor(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-base font-bold text-amber-400 focus:outline-none focus:border-amber-500 pr-12"
                  />
                  <span className="absolute right-3.5 top-2.5 text-sm font-semibold text-slate-400">
                    kg
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Dica: Pese-se preferencialmente pela manhã em jejum e após urinar.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Observações / Contexto (Peso)
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: Pela manhã em jejum; após treino de pernas..."
                  value={pesoObs}
                  onChange={(e) => setPesoObs(e.target.value.toUpperCase())}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 uppercase"
                />
              </div>
            </div>
          )}

          {tipo === "PRESSAO" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Sistólica (Máxima) *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="1"
                      min="50"
                      max="280"
                      required
                      placeholder="Ex: 120"
                      value={pressaoSistolica}
                      onChange={(e) => setPressaoSistolica(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-base font-bold text-rose-400 focus:outline-none focus:border-rose-500 pr-14"
                    />
                    <span className="absolute right-3 top-3 text-xs text-slate-400 font-medium">
                      mmHg
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Diastólica (Mínima) *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="1"
                      min="30"
                      max="180"
                      required
                      placeholder="Ex: 80"
                      value={pressaoDiastolica}
                      onChange={(e) => setPressaoDiastolica(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-base font-bold text-rose-300 focus:outline-none focus:border-rose-500 pr-14"
                    />
                    <span className="absolute right-3 top-3 text-xs text-slate-400 font-medium">
                      mmHg
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-rose-400" />
                    Batimentos Cardíacos (bpm)
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal">Opcional</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="1"
                    min="30"
                    max="250"
                    placeholder="Ex: 72"
                    value={pressaoBpm}
                    onChange={(e) => setPressaoBpm(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-rose-300 focus:outline-none focus:border-rose-500 pr-14"
                  />
                  <span className="absolute right-3.5 top-2.5 text-xs text-slate-400 font-medium">
                    bpm
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Observações / Sintomas (Pressão)
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: Aferido em repouso de 5 min; após tomar café..."
                  value={pressaoObs}
                  onChange={(e) => setPressaoObs(e.target.value.toUpperCase())}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 uppercase"
                />
              </div>
            </div>
          )}

          {tipo === "GLICEMIA" && (
            <div className="space-y-4">
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Glicemia Capilar *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="1"
                      min="20"
                      max="600"
                      required
                      placeholder="Ex: 95"
                      value={glicemiaValor}
                      onChange={(e) => setGlicemiaValor(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-base font-bold text-emerald-400 focus:outline-none focus:border-emerald-500 pr-16"
                    />
                    <span className="absolute right-3.5 top-3 text-xs font-semibold text-slate-400">
                      mg/dL
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Contexto da Medição
                  </label>
                  <select
                    value={glicemiaContexto}
                    onChange={(e) => setGlicemiaContexto(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="JEJUM">Jejum (8h+ sem ingestão)</option>
                    <option value="POS_REFEICAO">Pós-Refeição (2h após comer)</option>
                    <option value="PRE_REFEICAO">Pré-Refeição / Antes de Comer</option>
                    <option value="AO_DEITAR">Antes de Dormir / Ao Deitar</option>
                    <option value="ALEATORIO">Casual / Aleatório</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Observações / Alimentos (Glicemia)
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: 2 horas após almoço com massas; jejum de 10 horas..."
                  value={glicemiaObs}
                  onChange={(e) => setGlicemiaObs(e.target.value.toUpperCase())}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 uppercase"
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 text-xs font-semibold text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-900/30 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <span>Salvar Registro</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
