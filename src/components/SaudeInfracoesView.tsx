import React, { useState, useEffect } from "react";
import {
  Stethoscope,
  FileText,
  AlertOctagon,
  Plus,
  Edit2,
  Trash2,
  X,
  AlertCircle,
  Clock,
  CheckCircle2,
  Bell,
  Camera,
  Sparkles,
  Utensils,
  Flame,
  Zap,
  Activity,
  Dumbbell,
} from "lucide-react";
import {
  ConsultaMedica,
  ReceitaMedica,
  Infracao,
  Veiculo,
  AlimentoAnaliseResult,
  RegistroSaude,
  LembreteSaudeConfig,
  ExercicioRegistro,
} from "../types";
import { generateNewId } from "../services/api";
import { formatarHora, formatDateBR, parseCurrency, formatCurrency } from "../utils/formatters";
import { AnalisarAlimentoModal } from "./AnalisarAlimentoModal";
import { HistoricoAlimentosView } from "./HistoricoAlimentosView";
import { EditarAlimentoModal } from "./EditarAlimentoModal";
import { ControleSaudeView } from "./ControleSaudeView";
import { RegistroSaudeModal } from "./RegistroSaudeModal";
import { RegistroRapidoAlimentoModal } from "./RegistroRapidoAlimentoModal";
import { ExerciciosView } from "./ExerciciosView";
import { RegistroExercicioModal } from "./RegistroExercicioModal";
import { SaudeRelatorioModal } from "./SaudeRelatorioModal";

interface Props {
  consultas: ConsultaMedica[];
  receitas: ReceitaMedica[];
  infracoes: Infracao[];
  registrosSaude?: RegistroSaude[];
  lembretesConfigs?: LembreteSaudeConfig[];
  alimentos?: AlimentoAnaliseResult[];
  exercicios?: ExercicioRegistro[];
  veiculos?: Veiculo[];
  alturaUsuario?: number;
  onSaveAltura?: (alturaCm: number) => Promise<void> | void;
  onSaveConsulta: (consulta: ConsultaMedica) => Promise<void>;
  onSaveReceita: (receita: ReceitaMedica) => Promise<void>;
  onSaveInfracao: (infracao: Infracao) => Promise<void>;
  onSaveRegistroSaude?: (registro: RegistroSaude) => Promise<void>;
  onSaveLembretesConfigs?: (configs: LembreteSaudeConfig[]) => Promise<void> | void;
  onSaveAlimento?: (alimento: AlimentoAnaliseResult) => Promise<void>;
  onSaveExercicio?: (exercicio: ExercicioRegistro) => Promise<void> | void;
  onDeleteConsulta: (id: string) => Promise<void>;
  onDeleteReceita: (id: string) => Promise<void>;
  onDeleteInfracao: (id: string) => Promise<void>;
  onDeleteRegistroSaude?: (id: string) => Promise<void>;
  onDeleteAlimento?: (id: string) => Promise<void>;
  onDeleteExercicio?: (id: string) => Promise<void> | void;
}

export const SaudeInfracoesView: React.FC<Props> = ({
  consultas,
  receitas,
  infracoes,
  registrosSaude = [],
  lembretesConfigs = [],
  alimentos = [],
  exercicios = [],
  veiculos = [],
  alturaUsuario,
  onSaveAltura,
  onSaveConsulta,
  onSaveReceita,
  onSaveInfracao,
  onSaveRegistroSaude,
  onSaveLembretesConfigs,
  onSaveAlimento,
  onSaveExercicio,
  onDeleteConsulta,
  onDeleteReceita,
  onDeleteInfracao,
  onDeleteRegistroSaude,
  onDeleteAlimento,
  onDeleteExercicio,
}) => {
  const [activeTab, setActiveTab] = useState<
    "consultas" | "receitas" | "infracoes" | "alimentos" | "controle_saude" | "exercicios"
  >("consultas");

  // Delete Confirmation State
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    type: "consulta" | "receita" | "infracao" | "alimento" | "saude" | "exercicio";
    id: string;
    title: string;
    subtitle?: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Health Biometrics State (20_Controle_Saude)
  const [isRegistroSaudeModalOpen, setIsRegistroSaudeModalOpen] = useState(false);
  const [editingRegistroSaude, setEditingRegistroSaude] = useState<RegistroSaude | null>(null);
  const [defaultTipoRegistro, setDefaultTipoRegistro] = useState<"PESO" | "PRESSAO" | "GLICEMIA">("PESO");

  // Food Analysis Modal & History State (21_Analise_Alimentos)
  const [isFoodModalOpen, setIsFoodModalOpen] = useState(false);
  const [isRegistroRapidoModalOpen, setIsRegistroRapidoModalOpen] = useState(false);
  const [editingAlimento, setEditingAlimento] = useState<AlimentoAnaliseResult | null>(null);
  const [isEditAlimentoModalOpen, setIsEditAlimentoModalOpen] = useState(false);

  // Exercise & Workout State (23_Exercicios)
  const [isExercicioModalOpen, setIsExercicioModalOpen] = useState(false);
  const [editingExercicio, setEditingExercicio] = useState<ExercicioRegistro | null>(null);

  // Consolidated Health Report Modal State
  const [isRelatorioModalOpen, setIsRelatorioModalOpen] = useState(false);

  const handleSaveExercicioSubmit = async (item: ExercicioRegistro) => {
    if (onSaveExercicio) {
      await onSaveExercicio(item);
    }
  };

  const handleOpenEditExercicio = (item: ExercicioRegistro) => {
    setEditingExercicio(item);
    setIsExercicioModalOpen(true);
  };

  const handleDeleteExercicioItem = (id: string) => {
    if (onDeleteExercicio) {
      onDeleteExercicio(id);
    }
  };

  const handleSaveAlimentoItem = async (alimento: AlimentoAnaliseResult) => {
    try {
      const now = new Date();
      const id = alimento.id || (alimento as any).Id || `ALIM_${Date.now()}`;
      const itemToSave: AlimentoAnaliseResult = {
        ...alimento,
        id,
        data: alimento.data || now.toISOString().split("T")[0],
        dataHora:
          alimento.dataHora ||
          now.toLocaleString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          }),
      };

      if (onSaveAlimento) {
        await onSaveAlimento(itemToSave);
      }
    } catch (e) {
      console.error("Erro ao salvar alimento no histórico:", e);
    }
  };

  const handleDeleteAlimentoItem = (id: string) => {
    const item = alimentos.find((a) => a.id === id || (a as any).Id === id);
    setDeleteConfirm({
      isOpen: true,
      type: "alimento",
      id,
      title: item?.nomePrato || "Análise de Alimento",
      subtitle: `Calorias: ${item?.caloriasEstimadas || 0} kcal • Proteínas: ${item?.proteinasEstimadas || 0}g • Data: ${item?.dataHora || item?.data || "—"}`,
    });
  };

  const handleOpenEditAlimento = (alimento: AlimentoAnaliseResult) => {
    setEditingAlimento(alimento);
    setIsEditAlimentoModalOpen(true);
  };

  // Health Biometrics Handlers (20_Controle_Saude)
  const handleOpenNovoRegistroSaude = (tipo?: "PESO" | "PRESSAO" | "GLICEMIA") => {
    setEditingRegistroSaude(null);
    setDefaultTipoRegistro(tipo || "PESO");
    setIsRegistroSaudeModalOpen(true);
  };

  const handleOpenEditRegistroSaude = (reg: RegistroSaude) => {
    setEditingRegistroSaude(reg);
    setDefaultTipoRegistro(
      reg.Tipo_Registro === "PRESSAO" || reg.Tipo_Registro === "Pressão"
        ? "PRESSAO"
        : reg.Tipo_Registro === "GLICEMIA" || reg.Tipo_Registro === "Glicemia"
        ? "GLICEMIA"
        : "PESO"
    );
    setIsRegistroSaudeModalOpen(true);
  };

  const handleDeleteRegistroSaudeItem = (id: string) => {
    const item = registrosSaude.find((r) => r.Id === id);
    const tipoLabel =
      item?.Tipo_Registro === "PRESSAO"
        ? `Pressão Arterial: ${item.Valor_Principal}/${item.Valor_Secundario || 0} mmHg`
        : item?.Tipo_Registro === "GLICEMIA"
        ? `Glicemia: ${item.Valor_Principal} mg/dL (${item.Contexto || "Jejum"})`
        : `Peso: ${item?.Valor_Principal || 0} kg`;

    setDeleteConfirm({
      isOpen: true,
      type: "saude",
      id,
      title: `Registro de ${item?.Tipo_Registro || "Saúde"}`,
      subtitle: `${tipoLabel} • Data: ${item?.Data_Hora || "—"}`,
    });
  };

  const handleSaveRegistroSaudeSubmit = async (reg: RegistroSaude) => {
    if (onSaveRegistroSaude) {
      await onSaveRegistroSaude(reg);
    }
  };

  // Consulta Modal State
  const [isConsultaModalOpen, setIsConsultaModalOpen] = useState(false);
  const [editingConsulta, setEditingConsulta] = useState<ConsultaMedica | null>(null);
  const [consultaForm, setConsultaForm] = useState<Partial<ConsultaMedica>>({
    Especialidade: "Cardiologia",
    Médico: "Dr. Roberto Silva",
    Data: new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString().split("T")[0],
    Horas: "14:30",
    Local: "Hospital Albert Einstein - Bloco A",
    Lembrete_Ativo: "SIM",
    Status: "Agendada",
    Observação: "",
  });

  // Receita Modal State
  const [isReceitaModalOpen, setIsReceitaModalOpen] = useState(false);
  const [editingReceita, setEditingReceita] = useState<ReceitaMedica | null>(null);
  const [receitaForm, setReceitaForm] = useState<Partial<ReceitaMedica>>({
    Medicamento: "Amoxicilina 500mg",
    Dosagem: "1 comprimido",
    Frequência: "De 8 em 8 horas",
    Médico: "Dra. Ana Paula",
    Data_Emissão: new Date().toISOString().split("T")[0],
    Data_Vencimento: new Date(Date.now() + 10 * 24 * 3600 * 1000).toISOString().split("T")[0],
    Instruções: "Tomar após as refeições",
    Especialidade: "Clínica Geral",
    Observação: "",
  });

  // Infracao Modal State
  const [isInfracaoModalOpen, setIsInfracaoModalOpen] = useState(false);
  const [editingInfracao, setEditingInfracao] = useState<Infracao | null>(null);
  const [infracaoForm, setInfracaoForm] = useState<Partial<Infracao>>({
    Protocolo: "MULT-2026-098",
    Título: "Excesso de Velocidade até 20%",
    Veículo: veiculos[0]?.Modelo || "Polo TSI",
    Placa: veiculos[0]?.Placa || "GAE-2026",
    Data: new Date().toISOString().split("T")[0],
    Descrição: "Transitar em velocidade superior à máxima permitida em até 20%",
    Valor: 130.16,
    Pontos: 4,
    Status: "EM_ANALISE",
    Localização: "Av. Paulista, 1000 - SP",
    Observação: "Aguardando prazo para recurso",
  });

  // Alerts logic for medical appointments (2 days before)
  const now = new Date();
  const alertConsultas = consultas.filter((c) => {
    if (c.Status !== "Agendada" || c.Lembrete_Ativo === "NÃO") return false;
    const consultaDate = new Date(c.Data);
    const diffDays = (consultaDate.getTime() - now.getTime()) / (1000 * 3600 * 24);
    return diffDays >= 0 && diffDays <= 2;
  });

  // Alerts logic for medical recipes (near expiration - 7 days or past)
  const alertReceitas = receitas.filter((r) => {
    if (!r.Data_Vencimento && !r.Data_Validade) return false;
    const expireDate = new Date(r.Data_Vencimento || r.Data_Validade || "");
    const diffDays = (expireDate.getTime() - now.getTime()) / (1000 * 3600 * 24);
    return diffDays <= 7;
  });

  // Open Handlers
  const handleOpenConsulta = (c?: ConsultaMedica) => {
    if (c) {
      setEditingConsulta(c);
      setConsultaForm({ ...c });
    } else {
      setEditingConsulta(null);
      setConsultaForm({
        Especialidade: "Cardiologia",
        Médico: "Dr. Roberto Silva",
        Data: new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString().split("T")[0],
        Horas: "14:30",
        Local: "Hospital Albert Einstein - Bloco A",
        Lembrete_Ativo: "SIM",
        Status: "Agendada",
        Observação: "",
      });
    }
    setIsConsultaModalOpen(true);
  };

  const handleSaveConsultaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const item: ConsultaMedica = {
      Id: editingConsulta?.Id || generateNewId("MED"),
      Especialidade: consultaForm.Especialidade || "Geral",
      Médico: consultaForm.Médico || "",
      Data: consultaForm.Data || new Date().toISOString().split("T")[0],
      Horas: consultaForm.Horas || "",
      Local: consultaForm.Local || "",
      Lembrete_Ativo: consultaForm.Lembrete_Ativo || "SIM",
      Status: consultaForm.Status || "Agendada",
      Observação: consultaForm.Observação || "",
    };
    await onSaveConsulta(item);
    setIsConsultaModalOpen(false);
  };

  const handleOpenReceita = (r?: ReceitaMedica) => {
    if (r) {
      setEditingReceita(r);
      setReceitaForm({ ...r });
    } else {
      setEditingReceita(null);
      setReceitaForm({
        Medicamento: "Amoxicilina 500mg",
        Dosagem: "1 comprimido",
        Frequência: "De 8 em 8 horas",
        Médico: "Dra. Ana Paula",
        Data_Emissão: new Date().toISOString().split("T")[0],
        Data_Vencimento: new Date(Date.now() + 10 * 24 * 3600 * 1000).toISOString().split("T")[0],
        Instruções: "Tomar após as refeições",
        Especialidade: "Clínica Geral",
        Observação: "",
      });
    }
    setIsReceitaModalOpen(true);
  };

  const handleSaveReceitaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const item: ReceitaMedica = {
      Id: editingReceita?.Id || generateNewId("REC"),
      Medicamento: receitaForm.Medicamento || "Medicamento",
      Dosagem: receitaForm.Dosagem || "",
      Frequência: receitaForm.Frequência || "",
      Médico: receitaForm.Médico || "",
      Data_Emissão: receitaForm.Data_Emissão || "",
      Data_Vencimento: receitaForm.Data_Vencimento || "",
      Instruções: receitaForm.Instruções || "",
      Especialidade: receitaForm.Especialidade || "",
      Observação: receitaForm.Observação || "",
    };
    await onSaveReceita(item);
    setIsReceitaModalOpen(false);
  };

  const handleOpenInfracao = (inf?: Infracao) => {
    if (inf) {
      setEditingInfracao(inf);
      setInfracaoForm({ ...inf });
    } else {
      setEditingInfracao(null);
      setInfracaoForm({
        Protocolo: "MULT-2026-098",
        Título: "Excesso de Velocidade até 20%",
        Veículo: veiculos[0]?.Modelo || "Polo TSI",
        Placa: veiculos[0]?.Placa || "GAE-2026",
        Data: new Date().toISOString().split("T")[0],
        Descrição: "Transitar em velocidade superior à máxima permitida em até 20%",
        Valor: 130.16,
        Pontos: 4,
        Status: "EM_ANALISE",
        Localização: "Av. Paulista, 1000 - SP",
        Observação: "Aguardando prazo para recurso",
      });
    }
    setIsInfracaoModalOpen(true);
  };

  const handleSaveInfracaoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const item: Infracao = {
      Id: editingInfracao?.Id || generateNewId("MULTA"),
      Protocolo: infracaoForm.Protocolo || "",
      Título: infracaoForm.Título || "Infração de Trânsito",
      Veículo: infracaoForm.Veículo || "Veículo",
      Placa: infracaoForm.Placa || "",
      Data: infracaoForm.Data || new Date().toISOString().split("T")[0],
      Descrição: infracaoForm.Descrição || "",
      Valor: parseCurrency(infracaoForm.Valor),
      Pontos: parseCurrency(infracaoForm.Pontos),
      Status: infracaoForm.Status || "EM_ANALISE",
      Localização: infracaoForm.Localização || "",
      Observação: infracaoForm.Observação || "",
    };
    await onSaveInfracao(item);
    setIsInfracaoModalOpen(false);
  };

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-emerald-400" />
            Saúde & Infrações de Trânsito
          </h2>
          <p className="text-xs text-slate-400">
            Abas <code className="text-emerald-400 font-mono">6_Consultas_Médicas</code>,{" "}
            <code className="text-emerald-400 font-mono">7_Receitas_Médicas</code>,{" "}
            <code className="text-emerald-400 font-mono">8_Infracoes</code>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Consolidated Health Report Button */}
          <button
            onClick={() => setIsRelatorioModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-emerald-400 hover:text-emerald-300 text-xs font-bold rounded-xl transition-all border border-slate-800 hover:border-emerald-500/40 shadow-sm cursor-pointer"
            title="Abrir Relatório Consolidado de Saúde (PDF)"
          >
            <FileText className="w-4 h-4 text-emerald-400" />
            <span>📄 Relatório de Saúde (PDF)</span>
          </button>

          {/* AI Food Analysis Action Button */}
          <button
            onClick={() => setIsFoodModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-emerald-950/40 border border-emerald-500/30"
          >
            <Camera className="w-4 h-4 text-white" />
            <span>📷 Analisar Alimento</span>
            <span className="px-1.5 py-0.2 bg-emerald-400/20 text-emerald-200 text-[10px] rounded-md font-mono hidden sm:inline">
              IA
            </span>
          </button>

          {/* Tab Switcher */}
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab("consultas")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all relative ${
                activeTab === "consultas"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Consultas ({consultas.length})
              {alertConsultas.length > 0 && (
                <span className="ml-1 px-1.5 py-0.2 bg-amber-500 text-slate-950 font-bold rounded-full text-[10px]">
                  {alertConsultas.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("receitas")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all relative ${
                activeTab === "receitas"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Receitas ({receitas.length})
              {alertReceitas.length > 0 && (
                <span className="ml-1 px-1.5 py-0.2 bg-rose-500 text-white font-bold rounded-full text-[10px]">
                  {alertReceitas.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("infracoes")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "infracoes"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Infrações ({infracoes.length})
            </button>
            <button
              onClick={() => setActiveTab("alimentos")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === "alimentos"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Utensils className="w-3.5 h-3.5" />
              <span>Alimentos IA ({alimentos.length})</span>
            </button>
            <button
              onClick={() => setActiveTab("controle_saude")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === "controle_saude"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Controle de Saúde ({registrosSaude.length})</span>
            </button>
            <button
              onClick={() => setActiveTab("exercicios")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === "exercicios"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Dumbbell className="w-3.5 h-3.5" />
              <span>Exercícios ({exercicios.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* AI Nutrition Feature Highlight Banner */}
      <div className="p-4 bg-gradient-to-r from-emerald-950/40 via-slate-900 to-teal-950/30 border border-emerald-500/20 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <Camera className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              Nutrição & Estimativa de Alimentos
              <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Gemini IA
              </span>
            </h4>
            <p className="text-xs text-slate-400">
              Tire uma foto ou escolha uma imagem do seu prato para calcular calorias e proteínas aproximadas.
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsFoodModalOpen(true)}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 shrink-0 shadow-md shadow-emerald-950/50"
        >
          <Camera className="w-4 h-4" />
          <span>Tirar / Enviar Foto</span>
        </button>
      </div>

      {/* Medical Reminder Alert Banners */}
      {alertConsultas.length > 0 && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-start gap-3">
          <Bell className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs">
            <h4 className="font-bold text-amber-300">
              Lembrete: Você tem {alertConsultas.length} Consulta(s) Médica(s) nos próximos 2 dias!
            </h4>
            <ul className="list-disc list-inside text-amber-200/80 space-y-0.5">
              {alertConsultas.map((c, idx) => {
                const horaFormatada = formatarHora(c.Horas);
                return (
                  <li key={`${c.Id || 'cons-alert'}-${idx}`}>
                    <strong>{c.Especialidade}</strong> ({c.Médico || "Médico"}) — {c.Data} {horaFormatada ? `às ${horaFormatada}` : "horário a confirmar"} ({c.Local || "Local"})
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}

      {alertReceitas.length > 0 && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs">
            <h4 className="font-bold text-rose-300">
              Atenção: {alertReceitas.length} Receita(s) Médica(s) Próxima(s) do Vencimento!
            </h4>
            <ul className="list-disc list-inside text-rose-200/80 space-y-0.5">
              {alertReceitas.map((r, idx) => (
                <li key={`${r.Id || 'rec-alert'}-${idx}`}>
                  <strong>{r.Medicamento}</strong> — Vence em: {r.Data_Vencimento || r.Data_Validade}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* 1. CONSULTAS MÉDICAS */}
      {activeTab === "consultas" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-400">
              Agenda de consultas e lembretes médicos (Aba 6_Consultas_Médicas)
            </span>
            <button
              onClick={() => handleOpenConsulta()}
              className="flex items-center gap-2 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-xl transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Agendar Consulta</span>
            </button>
          </div>

          {consultas.length === 0 ? (
            <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl text-slate-500 text-xs">
              Nenhuma consulta médica cadastrada ainda.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {consultas.map((c, idx) => (
                <div
                  key={`${c.Id || 'cons'}-${idx}`}
                  className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-3 relative hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400">
                        <Stethoscope className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-base leading-tight">
                          {c.Especialidade}
                        </h3>
                        <p className="text-xs text-slate-400">{c.Médico || "Médico não informado"}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          c.Status === "Realizada"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : c.Status === "Cancelada"
                            ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                            : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                        }`}
                      >
                        {c.Status}
                      </span>
                      <button
                        onClick={() => handleOpenConsulta(c)}
                        className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                        title="Editar Consulta"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() =>
                          setDeleteConfirm({
                            isOpen: true,
                            type: "consulta",
                            id: c.Id,
                            title: `${c.Especialidade} - ${c.Médico || "Médico não informado"}`,
                            subtitle: `Data: ${c.Data}${c.Horas ? ` às ${formatarHora(c.Horas)}` : ""} • Local: ${c.Local || "—"}`,
                          })
                        }
                        className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                        title="Excluir Consulta"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <div>
                      <span className="text-slate-500 text-[10px] block">Data & Horário</span>
                      <span className="font-semibold text-slate-200">
                        {c.Data} {formatarHora(c.Horas) && `às ${formatarHora(c.Horas)}`}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] block">Lembrete Ativo</span>
                      <span className="font-bold text-emerald-400">{c.Lembrete_Ativo || "SIM"}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-slate-500 text-[10px] block">Local</span>
                      <span className="text-slate-300">{c.Local || "Não especificado"}</span>
                    </div>
                  </div>

                  {c.Observação && (
                    <p className="text-xs text-slate-400 italic">"{c.Observação}"</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 2. RECEITAS MÉDICAS */}
      {activeTab === "receitas" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-400">
              Controle de medicamentos, posologias e validades (Aba 7_Receitas_Médicas)
            </span>
            <button
              onClick={() => handleOpenReceita()}
              className="flex items-center gap-2 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-xl transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Cadastrar Receita</span>
            </button>
          </div>

          {receitas.length === 0 ? (
            <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl text-slate-500 text-xs">
              Nenhuma receita médica cadastrada ainda.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {receitas.map((r, idx) => (
                <div
                  key={`${r.Id || 'rec'}-${idx}`}
                  className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-3 relative hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400">
                        <FileText className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-base leading-tight">
                          {r.Medicamento}
                        </h3>
                        <p className="text-xs text-slate-400">
                          {r.Dosagem} • {r.Frequência}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenReceita(r)}
                        className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                        title="Editar Receita"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() =>
                          setDeleteConfirm({
                            isOpen: true,
                            type: "receita",
                            id: r.Id,
                            title: r.Medicamento,
                            subtitle: `Dosagem: ${r.Dosagem || "—"} • Vencimento: ${r.Data_Vencimento || r.Data_Validade || "—"} • Médico: ${r.Médico || "—"}`,
                          })
                        }
                        className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                        title="Excluir Receita"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <div>
                      <span className="text-slate-500 text-[10px] block">Médico Prescritor</span>
                      <span className="font-semibold text-slate-200">{r.Médico || "—"}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] block">Validade / Vencimento</span>
                      <span className="font-bold text-rose-400">{r.Data_Vencimento || r.Data_Validade || "—"}</span>
                    </div>
                    {r.Instruções && (
                      <div className="col-span-2">
                        <span className="text-slate-500 text-[10px] block">Instruções de Uso</span>
                        <span className="text-slate-300">{r.Instruções}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 3. INFRAÇÕES */}
      {activeTab === "infracoes" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-400">
              Histórico de multas e recursos de trânsito (Aba 8_Infracoes)
            </span>
            <button
              onClick={() => handleOpenInfracao()}
              className="flex items-center gap-2 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-xl transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Registrar Infração</span>
            </button>
          </div>

          {infracoes.length === 0 ? (
            <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl text-slate-500 text-xs">
              Nenhuma infração cadastrada ainda.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {infracoes.map((inf, idx) => (
                <div
                  key={`${inf.Id || 'inf'}-${idx}`}
                  className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-3 relative hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-xl bg-rose-500/10 text-rose-400">
                        <AlertOctagon className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-base leading-tight">
                          {inf.Título || inf.Descrição}
                        </h3>
                        <p className="text-xs text-slate-400 font-mono">
                          Protocolo: {inf.Protocolo || "—"} • Veículo: {inf.Veículo} ({inf.Placa})
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenInfracao(inf)}
                        className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                        title="Editar Infração"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() =>
                          setDeleteConfirm({
                            isOpen: true,
                            type: "infracao",
                            id: inf.Id,
                            title: inf.Título || inf.Descrição,
                            subtitle: `Veículo: ${inf.Veículo} (${inf.Placa}) • Valor: R$ ${formatCurrency(inf.Valor)} • Protocolo: ${inf.Protocolo || "—"}`,
                          })
                        }
                        className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                        title="Excluir Infração"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <div>
                      <span className="text-slate-500 text-[10px] block">Valor da Multa</span>
                      <span className="font-bold text-rose-400">R$ {formatCurrency(inf.Valor)}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] block">Pontuação</span>
                      <span className="font-semibold text-amber-400">{inf.Pontos || 0} pts</span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] block">Status</span>
                      <span className="font-bold text-emerald-400">{inf.Status}</span>
                    </div>
                  </div>

                  {inf.Localização && (
                    <p className="text-xs text-slate-400">📍 Location: {inf.Localização}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 4. ALIMENTOS & NUTRIÇÃO (HISTÓRICO IA - ABA 21) */}
      {activeTab === "alimentos" && (
        <HistoricoAlimentosView
          alimentos={alimentos}
          onOpenAnalysisModal={() => setIsFoodModalOpen(true)}
          onOpenRegistroRapidoModal={() => setIsRegistroRapidoModalOpen(true)}
          onSelectAlimento={(item) => {
            setEditingAlimento(item);
          }}
          onEditAlimento={handleOpenEditAlimento}
          onDeleteAlimento={handleDeleteAlimentoItem}
        />
      )}

      {/* 5. CONTROLE DE SAÚDE (BIOMETRIA - ABA 20) */}
      {activeTab === "controle_saude" && (
        <ControleSaudeView
          registros={registrosSaude}
          onOpenNovoRegistro={handleOpenNovoRegistroSaude}
          onEditRegistro={handleOpenEditRegistroSaude}
          onDeleteRegistro={handleDeleteRegistroSaudeItem}
          lembretesConfigs={lembretesConfigs}
          onSaveLembretesConfigs={onSaveLembretesConfigs}
          alturaUsuario={alturaUsuario}
          onSaveAltura={onSaveAltura}
          onOpenRelatorio={() => setIsRelatorioModalOpen(true)}
        />
      )}

      {/* 6. EXERCÍCIOS & TREINOS (ABA 23) */}
      {activeTab === "exercicios" && (
        <ExerciciosView
          exercicios={exercicios}
          onOpenRegistroModal={() => {
            setEditingExercicio(null);
            setIsExercicioModalOpen(true);
          }}
          onEditExercicio={handleOpenEditExercicio}
          onDeleteExercicio={handleDeleteExercicioItem}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && deleteConfirm.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 text-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2.5 bg-rose-500/10 rounded-xl">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white">
                  Confirmar Exclusão
                </h3>
                <p className="text-xs text-slate-400">
                  {deleteConfirm.type === "consulta"
                    ? "Excluir Consulta Médica"
                    : deleteConfirm.type === "receita"
                    ? "Excluir Receita Médica"
                    : deleteConfirm.type === "infracao"
                    ? "Excluir Infração de Trânsito"
                    : deleteConfirm.type === "saude"
                    ? "Excluir Registro de Saúde"
                    : "Excluir Análise de Alimento"}
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl space-y-1 text-xs">
              <p className="font-semibold text-white truncate">
                {deleteConfirm.title}
              </p>
              {deleteConfirm.subtitle && (
                <p className="text-slate-400 text-[11px]">
                  {deleteConfirm.subtitle}
                </p>
              )}
            </div>

            <p className="text-xs text-slate-300">
              Tem certeza que deseja excluir este registro do sistema?
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                disabled={isDeleting}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!deleteConfirm) return;
                  setIsDeleting(true);
                  try {
                    if (deleteConfirm.type === "consulta") {
                      await onDeleteConsulta(deleteConfirm.id);
                    } else if (deleteConfirm.type === "receita") {
                      await onDeleteReceita(deleteConfirm.id);
                    } else if (deleteConfirm.type === "infracao") {
                      await onDeleteInfracao(deleteConfirm.id);
                    } else if (deleteConfirm.type === "alimento") {
                      if (onDeleteAlimento) {
                        await onDeleteAlimento(deleteConfirm.id);
                      }
                    } else if (deleteConfirm.type === "saude") {
                      if (onDeleteRegistroSaude) {
                        await onDeleteRegistroSaude(deleteConfirm.id);
                      }
                    }
                    setDeleteConfirm(null);
                  } catch (err) {
                    console.error("Erro ao excluir registro:", err);
                  } finally {
                    setIsDeleting(false);
                  }
                }}
                disabled={isDeleting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 shadow-lg shadow-rose-950/40"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isDeleting ? "Excluindo..." : "Confirmar Exclusão"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Consulta */}
      {isConsultaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs text-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-base text-white">Agendar Consulta Médica</h3>
              <button onClick={() => setIsConsultaModalOpen(false)}>
                <X className="w-5 h-5 text-slate-400 hover:text-white" />
              </button>
            </div>

            <form onSubmit={handleSaveConsultaSubmit} className="space-y-3">
              <div>
                <label className="text-slate-400 block mb-1">Especialidade</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Cardiologia"
                  value={consultaForm.Especialidade}
                  onChange={(e) => setConsultaForm({ ...consultaForm, Especialidade: e.target.value.toUpperCase() })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white uppercase"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Médico</label>
                  <input
                    type="text"
                    value={consultaForm.Médico}
                    onChange={(e) => setConsultaForm({ ...consultaForm, Médico: e.target.value.toUpperCase() })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white uppercase"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Status</label>
                  <select
                    value={consultaForm.Status}
                    onChange={(e) => setConsultaForm({ ...consultaForm, Status: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                  >
                    <option value="Agendada">Agendada</option>
                    <option value="Realizada">Realizada</option>
                    <option value="Cancelada">Cancelada</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Data</label>
                  <input
                    type="date"
                    required
                    value={consultaForm.Data}
                    onChange={(e) => setConsultaForm({ ...consultaForm, Data: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Horas</label>
                  <input
                    type="time"
                    value={consultaForm.Horas}
                    onChange={(e) => setConsultaForm({ ...consultaForm, Horas: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Local</label>
                <input
                  type="text"
                  placeholder="Ex: Hospital Albert Einstein - Morumbi"
                  value={consultaForm.Local}
                  onChange={(e) => setConsultaForm({ ...consultaForm, Local: e.target.value.toUpperCase() })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white uppercase"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsConsultaModalOpen(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl"
                >
                  Salvar Consulta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Receita */}
      {isReceitaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs text-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-base text-white">Cadastrar Receita Médica</h3>
              <button onClick={() => setIsReceitaModalOpen(false)}>
                <X className="w-5 h-5 text-slate-400 hover:text-white" />
              </button>
            </div>

            <form onSubmit={handleSaveReceitaSubmit} className="space-y-3">
              <div>
                <label className="text-slate-400 block mb-1">Medicamento</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Amoxicilina 500mg"
                  value={receitaForm.Medicamento}
                  onChange={(e) => setReceitaForm({ ...receitaForm, Medicamento: e.target.value.toUpperCase() })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white uppercase"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Dosagem</label>
                  <input
                    type="text"
                    placeholder="Ex: 1 comprimido"
                    value={receitaForm.Dosagem}
                    onChange={(e) => setReceitaForm({ ...receitaForm, Dosagem: e.target.value.toUpperCase() })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white uppercase"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Frequência</label>
                  <input
                    type="text"
                    placeholder="Ex: De 8 em 8 horas"
                    value={receitaForm.Frequência}
                    onChange={(e) => setReceitaForm({ ...receitaForm, Frequência: e.target.value.toUpperCase() })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Data Vencimento</label>
                  <input
                    type="date"
                    value={receitaForm.Data_Vencimento}
                    onChange={(e) => setReceitaForm({ ...receitaForm, Data_Vencimento: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Médico Prescritor</label>
                  <input
                    type="text"
                    value={receitaForm.Médico}
                    onChange={(e) => setReceitaForm({ ...receitaForm, Médico: e.target.value.toUpperCase() })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white uppercase"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsReceitaModalOpen(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl"
                >
                  Salvar Receita
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Infração */}
      {isInfracaoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs text-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-base text-white">Registrar Infração de Trânsito</h3>
              <button onClick={() => setIsInfracaoModalOpen(false)}>
                <X className="w-5 h-5 text-slate-400 hover:text-white" />
              </button>
            </div>

            <form onSubmit={handleSaveInfracaoSubmit} className="space-y-3">
              <div>
                <label className="text-slate-400 block mb-1">Título / Infração</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Avanço de sinal vermelho"
                  value={infracaoForm.Título}
                  onChange={(e) => setInfracaoForm({ ...infracaoForm, Título: e.target.value.toUpperCase() })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white uppercase"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Veículo</label>
                  <select
                    value={infracaoForm.Veículo}
                    onChange={(e) => setInfracaoForm({ ...infracaoForm, Veículo: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                  >
                    {veiculos.map((v) => (
                      <option key={v.Id} value={v.Modelo}>
                        {v.Modelo} ({v.Placa})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Valor (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={infracaoForm.Valor}
                    onChange={(e) => setInfracaoForm({ ...infracaoForm, Valor: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-bold"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsInfracaoModalOpen(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl"
                >
                  Salvar Infração
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Manual Food / Meal Modal */}
      <RegistroRapidoAlimentoModal
        isOpen={isRegistroRapidoModalOpen}
        onClose={() => setIsRegistroRapidoModalOpen(false)}
        onSaveAlimento={handleSaveAlimentoItem}
      />

      {/* AI Food / Meal Analysis Modal */}
      <AnalisarAlimentoModal
        isOpen={isFoodModalOpen}
        onClose={() => setIsFoodModalOpen(false)}
        onSaveAlimento={handleSaveAlimentoItem}
      />

      {/* Edit Food Analysis Modal */}
      <EditarAlimentoModal
        isOpen={isEditAlimentoModalOpen}
        alimento={editingAlimento}
        onClose={() => {
          setIsEditAlimentoModalOpen(false);
          setEditingAlimento(null);
        }}
        onSave={handleSaveAlimentoItem}
      />

      {/* Biometric Health Modal (20_Controle_Saude) */}
      <RegistroSaudeModal
        isOpen={isRegistroSaudeModalOpen}
        onClose={() => {
          setIsRegistroSaudeModalOpen(false);
          setEditingRegistroSaude(null);
        }}
        onSave={handleSaveRegistroSaudeSubmit}
        initialData={editingRegistroSaude}
        defaultTipo={defaultTipoRegistro}
        alturaUsuario={alturaUsuario}
      />

      {/* Exercise & Workout Modal (23_Exercicios) */}
      <RegistroExercicioModal
        isOpen={isExercicioModalOpen}
        onClose={() => {
          setIsExercicioModalOpen(false);
          setEditingExercicio(null);
        }}
        onSave={handleSaveExercicioSubmit}
        initialData={editingExercicio}
      />

      {/* Consolidated Health Report Modal */}
      <SaudeRelatorioModal
        isOpen={isRelatorioModalOpen}
        onClose={() => setIsRelatorioModalOpen(false)}
        registrosSaude={registrosSaude}
        exercicios={exercicios}
        alturaUsuario={alturaUsuario}
        lembretesConfigs={lembretesConfigs}
        consultas={consultas}
        receitas={receitas}
      />
    </div>
  );
};
