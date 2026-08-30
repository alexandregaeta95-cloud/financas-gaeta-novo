import React, { useState, useMemo } from "react";
import {
  Scale,
  Heart,
  Droplets,
  Plus,
  Search,
  Calendar,
  Trash2,
  Edit2,
  TrendingDown,
  TrendingUp,
  Minus,
  Info,
  ShieldAlert,
  Sparkles,
  Activity,
  Flame,
  Sun,
  Moon,
  Apple,
  Footprints,
  Clock,
  CheckCircle2,
  AlertTriangle,
  BellRing,
  Ruler,
  FileText,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  Area,
  AreaChart,
} from "recharts";
import { RegistroSaude, LembreteSaudeConfig } from "../types";
import { formatDateBR } from "../utils/formatters";
import { ConfigLembretesSaudeModal } from "./ConfigLembretesSaudeModal";
import { EditarAlturaModal } from "./EditarAlturaModal";
import { calcularImc } from "../utils/imc";
import { useAlarmSound } from "../hooks/useAlarmSound";
import { Volume2, VolumeX } from "lucide-react";

interface Props {
  registros: RegistroSaude[];
  onOpenNovoRegistro: (tipo?: "PESO" | "PRESSAO" | "GLICEMIA") => void;
  onEditRegistro: (registro: RegistroSaude) => void;
  onDeleteRegistro: (id: string) => void;
  lembretesConfigs?: LembreteSaudeConfig[];
  onSaveLembretesConfigs?: (configs: LembreteSaudeConfig[]) => Promise<void> | void;
  alturaUsuario?: number;
  onSaveAltura?: (alturaCm: number) => Promise<void> | void;
  onOpenRelatorio?: () => void;
}

type PeriodFilter = "all" | "this_month" | "last_month" | "custom";

export const ControleSaudeView: React.FC<Props> = ({
  registros,
  onOpenNovoRegistro,
  onEditRegistro,
  onDeleteRegistro,
  lembretesConfigs = [],
  onSaveLembretesConfigs,
  alturaUsuario,
  onSaveAltura,
  onOpenRelatorio,
}) => {
  const [activeTab, setActiveTab] = useState<"peso" | "pressao" | "glicemia" | "dicas">("peso");
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("all");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isLembretesModalOpen, setIsLembretesModalOpen] = useState(false);
  const [isAlturaModalOpen, setIsAlturaModalOpen] = useState(false);

  const { isPlaying, activeAlarmId, alarmTitle, stopAlarm } = useAlarmSound();

  const handleNovoRegistroWithAudio = (tipo?: "PESO" | "PRESSAO" | "GLICEMIA") => {
    stopAlarm();
    onOpenNovoRegistro(tipo);
  };

  // Extract altura from lembretesConfigs if not explicitly passed
  const effectiveAltura = useMemo(() => {
    if (alturaUsuario && alturaUsuario > 0) return alturaUsuario;
    const configRow = lembretesConfigs.find(
      (c) =>
        c.id === "CONFIG_PERFIL_ALTURA" ||
        c.Id === "CONFIG_PERFIL_ALTURA" ||
        c.tipo === "Perfil_Altura" ||
        c.Tipo === "Perfil_Altura"
    );
    if (configRow) {
      const val = parseInt(
        configRow.horario1 ||
          configRow.Horario_1 ||
          configRow.altura ||
          configRow.Valor_Principal ||
          "175",
        10
      );
      if (!isNaN(val) && val >= 100 && val <= 250) return val;
    }
    return 175;
  }, [alturaUsuario, lembretesConfigs]);

  // Filter records by Active Tab (or all for tips) and Period
  const filteredRegistros = useMemo(() => {
    let list = registros.filter((r) => {
      if (activeTab === "peso") {
        return r.Tipo_Registro === "PESO" || r.Tipo_Registro === "Peso";
      }
      if (activeTab === "pressao") {
        return r.Tipo_Registro === "PRESSAO" || r.Tipo_Registro === "Pressão";
      }
      if (activeTab === "glicemia") {
        return r.Tipo_Registro === "GLICEMIA" || r.Tipo_Registro === "Glicemia";
      }
      return true;
    });

    // Date/Period Filter
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-indexed

    if (periodFilter === "this_month") {
      list = list.filter((r) => {
        const d = new Date(r.Data_Hora);
        if (isNaN(d.getTime())) return true;
        return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
      });
    } else if (periodFilter === "last_month") {
      const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      list = list.filter((r) => {
        const d = new Date(r.Data_Hora);
        if (isNaN(d.getTime())) return true;
        return d.getFullYear() === prevYear && d.getMonth() === prevMonth;
      });
    } else if (periodFilter === "custom" && (customStartDate || customEndDate)) {
      list = list.filter((r) => {
        const dStr = r.Data_Hora.substring(0, 10);
        if (customStartDate && dStr < customStartDate) return false;
        if (customEndDate && dStr > customEndDate) return false;
        return true;
      });
    }

    // Search filter
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        (r) =>
          r.Observacoes?.toLowerCase().includes(q) ||
          r.Data_Hora?.toLowerCase().includes(q) ||
          String(r.Valor_Principal).includes(q) ||
          (r.Valor_Secundario !== undefined && String(r.Valor_Secundario).includes(q)) ||
          (r.Batimentos_Bpm !== undefined && String(r.Batimentos_Bpm).includes(q)) ||
          r.Contexto?.toLowerCase().includes(q)
      );
    }

    // Sort ascending by date for charts, descending for table
    return list.sort((a, b) => new Date(a.Data_Hora).getTime() - new Date(b.Data_Hora).getTime());
  }, [registros, activeTab, periodFilter, customStartDate, customEndDate, searchTerm]);

  // Descending list for table display
  const tableRegistros = useMemo(() => {
    return [...filteredRegistros].reverse();
  }, [filteredRegistros]);

  // Chart data preparation
  const chartData = useMemo(() => {
    return filteredRegistros.map((r) => {
      const labelDate = r.Data_Hora.includes(" ")
        ? r.Data_Hora.split(" ")[0]
        : r.Data_Hora.substring(0, 10);
      const displayDate = formatDateBR(labelDate);

      return {
        id: r.Id,
        fullDate: r.Data_Hora,
        data: displayDate,
        valorPrincipal: r.Valor_Principal,
        valorSecundario: r.Valor_Secundario,
        bpm: r.Batimentos_Bpm,
        contexto: r.Contexto,
        obs: r.Observacoes,
      };
    });
  }, [filteredRegistros]);

  // -------------------------------------------------------------
  // STATS CALCULATIONS
  // -------------------------------------------------------------
  const pesoStats = useMemo(() => {
    const list = filteredRegistros.filter(
      (r) => r.Tipo_Registro === "PESO" || r.Tipo_Registro === "Peso"
    );
    if (list.length === 0) return null;

    const values = list.map((r) => r.Valor_Principal);
    const latest = list[list.length - 1].Valor_Principal;
    const previous = list.length > 1 ? list[list.length - 2].Valor_Principal : latest;
    const diff = latest - previous;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = values.reduce((acc, curr) => acc + curr, 0) / values.length;
    const imc = calcularImc(latest, effectiveAltura);

    return {
      latest,
      diff,
      min,
      max,
      avg: avg.toFixed(1),
      count: list.length,
      imc,
    };
  }, [filteredRegistros, effectiveAltura]);

  // Faixa de peso saudável recomendada pela OMS (IMC 18.5 a 24.9)
  const faixaSaudavel = useMemo(() => {
    if (!effectiveAltura || effectiveAltura <= 0) return null;
    const m = effectiveAltura / 100;
    const min = Math.round(18.5 * m * m * 10) / 10;
    const max = Math.round(24.9 * m * m * 10) / 10;
    return { min, max };
  }, [effectiveAltura]);

  const pressaoStats = useMemo(() => {
    const list = filteredRegistros.filter(
      (r) => r.Tipo_Registro === "PRESSAO" || r.Tipo_Registro === "Pressão"
    );
    if (list.length === 0) return null;

    const latest = list[list.length - 1];
    const sistolicas = list.map((r) => r.Valor_Principal);
    const diastolicas = list.map((r) => r.Valor_Secundario || 0);

    const avgSis = sistolicas.reduce((a, b) => a + b, 0) / sistolicas.length;
    const avgDia = diastolicas.reduce((a, b) => a + b, 0) / diastolicas.length;

    // Classification of latest
    const sis = latest.Valor_Principal;
    const dia = latest.Valor_Secundario || 0;
    let classificacao = "Normal";
    let colorClass = "text-emerald-400";
    let bgBadge = "bg-emerald-500/15 border-emerald-500/30 text-emerald-300";

    if (sis < 120 && dia < 80) {
      classificacao = "Ótima / Ideal";
      colorClass = "text-emerald-400";
      bgBadge = "bg-emerald-500/15 border-emerald-500/30 text-emerald-300";
    } else if (sis <= 129 && dia <= 84) {
      classificacao = "Normal";
      colorClass = "text-teal-400";
      bgBadge = "bg-teal-500/15 border-teal-500/30 text-teal-300";
    } else if (sis <= 139 || dia <= 89) {
      classificacao = "Pré-Hipertensão";
      colorClass = "text-amber-400";
      bgBadge = "bg-amber-500/15 border-amber-500/30 text-amber-300";
    } else if (sis <= 159 || dia <= 99) {
      classificacao = "Hipertensão Estágio 1";
      colorClass = "text-orange-400";
      bgBadge = "bg-orange-500/15 border-orange-500/30 text-orange-300";
    } else {
      classificacao = "Hipertensão Estágio 2";
      colorClass = "text-rose-400";
      bgBadge = "bg-rose-500/15 border-rose-500/30 text-rose-300";
    }

    return {
      latestSis: sis,
      latestDia: dia,
      latestBpm: latest.Batimentos_Bpm,
      classificacao,
      colorClass,
      bgBadge,
      avgSis: Math.round(avgSis),
      avgDia: Math.round(avgDia),
      count: list.length,
    };
  }, [filteredRegistros]);

  const glicemiaStats = useMemo(() => {
    const list = filteredRegistros.filter(
      (r) => r.Tipo_Registro === "GLICEMIA" || r.Tipo_Registro === "Glicemia"
    );
    if (list.length === 0) return null;

    const latest = list[list.length - 1];
    const jejumList = list.filter((r) => r.Contexto === "JEJUM" || !r.Contexto);
    const posList = list.filter((r) => r.Contexto === "POS_REFEICAO");

    const avgJejum =
      jejumList.length > 0
        ? Math.round(
            jejumList.reduce((acc, curr) => acc + curr.Valor_Principal, 0) / jejumList.length
          )
        : null;

    const avgPos =
      posList.length > 0
        ? Math.round(
            posList.reduce((acc, curr) => acc + curr.Valor_Principal, 0) / posList.length
          )
        : null;

    return {
      latestVal: latest.Valor_Principal,
      latestContext: latest.Contexto || "JEJUM",
      avgJejum,
      avgPos,
      count: list.length,
    };
  }, [filteredRegistros]);

  return (
    <div className="space-y-6">
      {/* Alarme Sonoro Repetitivo Ativo na tela de Saúde */}
      {isPlaying && (
        <div className="bg-gradient-to-r from-rose-950/80 via-rose-900/60 to-rose-950/80 border-2 border-rose-500 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xl shadow-rose-950/80 animate-pulse">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-rose-500/20 text-rose-400 border border-rose-500/40 rounded-2xl shrink-0 animate-bounce">
              <Volume2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black uppercase tracking-wider bg-rose-600 text-white px-2 py-0.5 rounded-md shadow-xs">
                  ALARME REPETINDO
                </span>
                <span className="text-xs text-rose-300 font-bold">
                  {alarmTitle || "Hora de Medir Pressão ou Glicemia"}
                </span>
              </div>
              <p className="text-xs text-slate-200 mt-1">
                O lembrete sonoro continuará tocando até você confirmar ou registrar a sua medição.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => stopAlarm()}
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-rose-300 border border-rose-500/40 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <VolumeX className="w-4 h-4" />
              <span>🛑 Silenciar / Já vi</span>
            </button>
            <button
              onClick={() =>
                handleNovoRegistroWithAudio(
                  String(alarmTitle || "").toLowerCase().includes("glicemia")
                    ? "GLICEMIA"
                    : "PRESSAO"
                )
              }
              className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-extrabold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-lg shadow-rose-950 active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Registrar Agora</span>
            </button>
          </div>
        </div>
      )}

      {/* Top Banner with Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-800/80 border border-slate-700/70 p-4 sm:p-5 rounded-2xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Aba 20_Controle_Saude
            </span>
            <span className="text-xs text-slate-400">• Monitoramento Biométrico</span>
          </div>
          <h2 className="text-xl font-bold text-white mt-1 flex items-center gap-2">
            <span>Controle de Saúde & Biometria</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Acompanhe a evolução do seu peso, pressão arterial, glicemia e hábitos saudáveis.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 md:flex md:items-center gap-2 sm:gap-2.5">
          {onOpenRelatorio && (
            <button
              onClick={onOpenRelatorio}
              className="flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-750 text-emerald-400 border border-slate-700/80 hover:border-emerald-500/40 transition-all shadow-sm group cursor-pointer w-full md:w-auto"
              title="Abrir Relatório Consolidado de Saúde em PDF"
            >
              <FileText className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform shrink-0" />
              <span className="truncate">Relatório Geral (PDF)</span>
            </button>
          )}
          {onSaveLembretesConfigs && (
            <button
              onClick={() => setIsLembretesModalOpen(true)}
              className="flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700/80 hover:border-emerald-500/40 transition-all shadow-sm group cursor-pointer w-full md:w-auto"
              title="Configurar horários de lembretes diários para Pressão e Glicemia"
            >
              <BellRing className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform shrink-0" />
              <span className="truncate">Lembretes Diários</span>
            </button>
          )}
          <button
            onClick={() =>
              handleNovoRegistroWithAudio(
                activeTab === "peso"
                  ? "PESO"
                  : activeTab === "pressao"
                  ? "PRESSAO"
                  : activeTab === "glicemia"
                  ? "GLICEMIA"
                  : "PESO"
              )
            }
            className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-xl font-semibold text-xs transition-all shadow-lg shadow-emerald-950/40 cursor-pointer w-full md:w-auto"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span className="truncate">Novo Registro</span>
          </button>
        </div>
      </div>

      {/* Sub-tabs Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-800">
        <button
          onClick={() => setActiveTab("peso")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
            activeTab === "peso"
              ? "bg-amber-500/20 border border-amber-500/50 text-amber-300 shadow-xs"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
          }`}
        >
          <Scale className="w-4 h-4" />
          <span>⚖️ Peso Corporal</span>
          <span className="ml-1 px-1.5 py-0.2 text-[10px] rounded-full bg-slate-800 text-slate-300">
            {registros.filter((r) => r.Tipo_Registro === "PESO" || r.Tipo_Registro === "Peso").length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("pressao")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
            activeTab === "pressao"
              ? "bg-rose-500/20 border border-rose-500/50 text-rose-300 shadow-xs"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
          }`}
        >
          <Heart className="w-4 h-4" />
          <span>🩺 Pressão Arterial</span>
          <span className="ml-1 px-1.5 py-0.2 text-[10px] rounded-full bg-slate-800 text-slate-300">
            {registros.filter((r) => r.Tipo_Registro === "PRESSAO" || r.Tipo_Registro === "Pressão").length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("glicemia")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
            activeTab === "glicemia"
              ? "bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 shadow-xs"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
          }`}
        >
          <Droplets className="w-4 h-4" />
          <span>🩸 Glicemia</span>
          <span className="ml-1 px-1.5 py-0.2 text-[10px] rounded-full bg-slate-800 text-slate-300">
            {registros.filter((r) => r.Tipo_Registro === "GLICEMIA" || r.Tipo_Registro === "Glicemia").length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("dicas")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
            activeTab === "dicas"
              ? "bg-indigo-500/20 border border-indigo-500/50 text-indigo-300 shadow-xs"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>💡 Dicas de Hábitos Saudáveis</span>
        </button>
      </div>

      {/* FILTER BAR (For biometric tabs) */}
      {activeTab !== "dicas" && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-400 font-medium mr-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" /> Período:
            </span>
            <button
              onClick={() => setPeriodFilter("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                periodFilter === "all"
                  ? "bg-slate-700 text-white font-semibold shadow-xs"
                  : "bg-slate-800/50 text-slate-400 hover:text-white"
              }`}
            >
              Todos os Períodos
            </button>
            <button
              onClick={() => setPeriodFilter("this_month")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                periodFilter === "this_month"
                  ? "bg-emerald-600 text-white font-semibold shadow-xs"
                  : "bg-slate-800/50 text-slate-400 hover:text-white"
              }`}
            >
              Mês Atual
            </button>
            <button
              onClick={() => setPeriodFilter("last_month")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                periodFilter === "last_month"
                  ? "bg-emerald-600 text-white font-semibold shadow-xs"
                  : "bg-slate-800/50 text-slate-400 hover:text-white"
              }`}
            >
              Mês Passado
            </button>
            <button
              onClick={() => setPeriodFilter("custom")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                periodFilter === "custom"
                  ? "bg-slate-700 text-white font-semibold shadow-xs"
                  : "bg-slate-800/50 text-slate-400 hover:text-white"
              }`}
            >
              Selecionar Período
            </button>

            {periodFilter === "custom" && (
              <div className="flex items-center gap-2 mt-1 sm:mt-0">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="bg-slate-800 border border-slate-700 text-white text-xs px-2.5 py-1 rounded-lg focus:outline-none focus:border-emerald-500"
                />
                <span className="text-slate-500 text-xs">até</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="bg-slate-800 border border-slate-700 text-white text-xs px-2.5 py-1 rounded-lg focus:outline-none focus:border-emerald-500"
                />
              </div>
            )}
          </div>

          {/* Search */}
          <div className="relative w-full md:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por notas ou data..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700/80 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 1. ABA DE PESO CORPORAL */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "peso" && (
        <div className="space-y-6">
          {/* Perfil Biométrico & Configuração de Altura */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-700/70 p-4 sm:p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg shadow-black/20">
            <div className="flex items-center gap-3.5">
              <div className="p-3 bg-amber-500/15 text-amber-400 border border-amber-500/30 rounded-2xl shrink-0">
                <Ruler className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Perfil Biométrico
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                    Sincronizado na Planilha
                  </span>
                </div>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-xl font-black text-white">
                    {effectiveAltura} <span className="text-sm font-semibold text-slate-400">cm</span>
                  </span>
                  <span className="text-xs text-slate-400">
                    ({(effectiveAltura / 100).toFixed(2).replace(".", ",")} m)
                  </span>
                </div>
                {faixaSaudavel && (
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Faixa ideal OMS para esta altura:{" "}
                    <strong className="text-emerald-400">
                      {faixaSaudavel.min} kg – {faixaSaudavel.max} kg
                    </strong>
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 self-start md:self-center">
              {pesoStats?.imc && (
                <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700/80 px-3.5 py-2 rounded-xl">
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 uppercase block font-semibold">
                      IMC Atual
                    </span>
                    <span className="text-base font-black text-white">{pesoStats.imc.imc}</span>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${pesoStats.imc.corBadge}`}
                  >
                    {pesoStats.imc.classificacao}
                  </span>
                </div>
              )}

              <button
                onClick={() => setIsAlturaModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-750 text-amber-300 hover:text-amber-200 border border-amber-500/30 hover:border-amber-500/50 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Alterar Altura</span>
              </button>
            </div>
          </div>

          {/* KPI Cards */}
          {pesoStats && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="bg-slate-800/70 border border-slate-700/60 p-4 rounded-xl">
                <div className="text-xs text-slate-400 font-medium">Último Peso</div>
                <div className="text-2xl font-black text-amber-400 mt-1">
                  {pesoStats.latest}{" "}
                  <span className="text-sm font-semibold text-slate-400">kg</span>
                </div>
                <div className="flex items-center gap-1.5 mt-1.5 text-xs">
                  {pesoStats.diff < 0 ? (
                    <span className="flex items-center text-emerald-400 font-semibold">
                      <TrendingDown className="w-3.5 h-3.5 mr-0.5" />
                      {Math.abs(pesoStats.diff).toFixed(1)} kg vs anterior
                    </span>
                  ) : pesoStats.diff > 0 ? (
                    <span className="flex items-center text-rose-400 font-semibold">
                      <TrendingUp className="w-3.5 h-3.5 mr-0.5" />+
                      {pesoStats.diff.toFixed(1)} kg vs anterior
                    </span>
                  ) : (
                    <span className="text-slate-400">Estável</span>
                  )}
                </div>
              </div>

              {/* IMC KPI Card */}
              <div className="bg-slate-800/70 border border-slate-700/60 p-4 rounded-xl">
                <div className="text-xs text-slate-400 font-medium">IMC Atual (OMS)</div>
                {pesoStats.imc ? (
                  <>
                    <div className="text-2xl font-black text-white mt-1">
                      {pesoStats.imc.imc}
                    </div>
                    <div className="mt-1.5">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold border ${pesoStats.imc.corBadge}`}
                      >
                        {pesoStats.imc.classificacao}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-slate-400 mt-2 italic">—</div>
                )}
              </div>

              <div className="bg-slate-800/70 border border-slate-700/60 p-4 rounded-xl">
                <div className="text-xs text-slate-400 font-medium">Média do Período</div>
                <div className="text-2xl font-black text-white mt-1">
                  {pesoStats.avg}{" "}
                  <span className="text-sm font-semibold text-slate-400">kg</span>
                </div>
                <div className="text-xs text-slate-400 mt-1.5">
                  {pesoStats.count} medições
                </div>
              </div>

              <div className="bg-slate-800/70 border border-slate-700/60 p-4 rounded-xl">
                <div className="text-xs text-slate-400 font-medium">Menor Peso</div>
                <div className="text-2xl font-black text-emerald-400 mt-1">
                  {pesoStats.min}{" "}
                  <span className="text-sm font-semibold text-slate-400">kg</span>
                </div>
                <div className="text-xs text-slate-400 mt-1.5">Mínimo no período</div>
              </div>

              <div className="bg-slate-800/70 border border-slate-700/60 p-4 rounded-xl">
                <div className="text-xs text-slate-400 font-medium">Maior Peso</div>
                <div className="text-2xl font-black text-orange-400 mt-1">
                  {pesoStats.max}{" "}
                  <span className="text-sm font-semibold text-slate-400">kg</span>
                </div>
                <div className="text-xs text-slate-400 mt-1.5">Máximo no período</div>
              </div>
            </div>
          )}

          {/* Evolution Chart */}
          <div className="bg-slate-850 border border-slate-800 p-5 rounded-2xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-amber-400" />
                  Evolução do Peso Corporal & IMC
                </h3>
                <p className="text-xs text-slate-400">
                  Acompanhe a curva de variação do peso ao longo do tempo
                </p>
              </div>
            </div>

            {chartData.length > 0 ? (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorPeso" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                    <XAxis dataKey="data" stroke="#94a3b8" fontSize={11} />
                    <YAxis
                      domain={["dataMin - 1", "dataMax + 1"]}
                      stroke="#94a3b8"
                      fontSize={11}
                      unit=" kg"
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0f172a",
                        borderColor: "#334155",
                        borderRadius: "0.75rem",
                        color: "#fff",
                        fontSize: "12px",
                      }}
                      formatter={(val: any) => {
                        const num = parseFloat(val);
                        const imcInfo = calcularImc(num, effectiveAltura);
                        if (imcInfo) {
                          return [
                            `${num} kg (IMC ${imcInfo.imc} • ${imcInfo.classificacao})`,
                            "Peso Corporal",
                          ];
                        }
                        return [`${val} kg`, "Peso"];
                      }}
                      labelFormatter={(label, payload) => {
                        const it = payload?.[0]?.payload;
                        return it?.fullDate ? `Data: ${it.fullDate}` : `Data: ${label}`;
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="valorPrincipal"
                      stroke="#f59e0b"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorPeso)"
                      dot={{ fill: "#f59e0b", r: 4, stroke: "#0f172a", strokeWidth: 2 }}
                      activeDot={{ r: 6, fill: "#fbbf24" }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-40 flex flex-col items-center justify-center text-slate-400 text-xs border border-dashed border-slate-700/60 rounded-xl">
                <Scale className="w-8 h-8 text-slate-500 mb-2 opacity-50" />
                <span>Nenhum registro de peso no período selecionado.</span>
              </div>
            )}
          </div>

          {/* Records Table & Mobile Cards */}
          <div className="bg-slate-850 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Histórico de Pesagens</h3>
              <span className="text-xs text-slate-400 font-medium">{tableRegistros.length} registros</span>
            </div>

            {tableRegistros.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                Nenhum registro encontrado. Clique em "Novo Registro" para adicionar.
              </div>
            ) : (
              <>
                {/* Mobile Cards (telas < md) */}
                <div className="block md:hidden divide-y divide-slate-800/60 p-3 space-y-3">
                  {tableRegistros.map((reg, idx) => {
                    const imcInfo = calcularImc(reg.Valor_Principal, effectiveAltura);
                    return (
                      <div key={reg.Id || idx} className="bg-slate-900/90 border border-slate-800/80 p-3.5 rounded-xl space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-xs text-slate-300 font-medium">
                            <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <span>{reg.Data_Hora}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => onEditRegistro(reg)}
                              title="Editar registro"
                              className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => onDeleteRegistro(reg.Id)}
                              title="Excluir registro"
                              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-slate-800/60">
                          <div>
                            <span className="text-[10px] text-slate-400 uppercase block">Peso</span>
                            <span className="text-base font-black text-amber-400">{reg.Valor_Principal} kg</span>
                          </div>
                          {imcInfo && (
                            <div className="text-right">
                              <span className="text-[10px] text-slate-400 uppercase block">IMC (OMS)</span>
                              <div className="flex items-center gap-1.5 justify-end mt-0.5">
                                <span className="font-bold text-white text-xs">{imcInfo.imc}</span>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${imcInfo.corBadge}`}>
                                  {imcInfo.classificacao}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>

                        {reg.Observacoes && (
                          <div className="text-xs text-slate-400 bg-slate-950/60 p-2 rounded-lg border border-slate-800/40">
                            {reg.Observacoes}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Desktop Table (telas >= md) */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900/60 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                      <tr>
                        <th className="py-3 px-4">Data & Horário</th>
                        <th className="py-3 px-4">Peso</th>
                        <th className="py-3 px-4">IMC & Classificação (OMS)</th>
                        <th className="py-3 px-4">Observações</th>
                        <th className="py-3 px-4 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {tableRegistros.map((reg, idx) => {
                        const imcInfo = calcularImc(reg.Valor_Principal, effectiveAltura);
                        return (
                          <tr key={reg.Id || idx} className="hover:bg-slate-800/40 transition-colors">
                            <td className="py-3 px-4 text-slate-200 font-medium whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                                <span>{reg.Data_Hora}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <span className="text-sm font-black text-amber-400">
                                {reg.Valor_Principal} kg
                              </span>
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              {imcInfo ? (
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-white text-xs">{imcInfo.imc}</span>
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${imcInfo.corBadge}`}
                                  >
                                    {imcInfo.classificacao}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-slate-500 italic">—</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-slate-300">
                              {reg.Observacoes || <span className="text-slate-500 italic">—</span>}
                            </td>
                            <td className="py-3 px-4 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => onEditRegistro(reg)}
                                  title="Editar registro"
                                  className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition-colors"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => onDeleteRegistro(reg.Id)}
                                  title="Excluir registro"
                                  className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 2. ABA DE PRESSÃO ARTERIAL */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "pressao" && (
        <div className="space-y-6">
          {/* KPI Cards */}
          {pressaoStats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-800/70 border border-slate-700/60 p-4 rounded-xl">
                <div className="text-xs text-slate-400 font-medium">Última Aferição</div>
                <div className="text-2xl font-black text-rose-400 mt-1">
                  {pressaoStats.latestSis}/{pressaoStats.latestDia}{" "}
                  <span className="text-xs font-semibold text-slate-400">mmHg</span>
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <span
                    className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold border ${pressaoStats.bgBadge}`}
                  >
                    {pressaoStats.classificacao}
                  </span>
                  {pressaoStats.latestBpm ? (
                    <span className="inline-flex items-center gap-1 text-[10px] text-rose-300 bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.5 rounded-md font-semibold">
                      <Activity className="w-2.5 h-2.5" />
                      {pressaoStats.latestBpm} bpm
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="bg-slate-800/70 border border-slate-700/60 p-4 rounded-xl">
                <div className="text-xs text-slate-400 font-medium">Média Sistólica (Máx)</div>
                <div className="text-2xl font-black text-rose-400 mt-1">
                  {pressaoStats.avgSis}{" "}
                  <span className="text-xs font-semibold text-slate-400">mmHg</span>
                </div>
                <div className="text-xs text-slate-400 mt-1.5">Meta: &lt; 120 mmHg</div>
              </div>

              <div className="bg-slate-800/70 border border-slate-700/60 p-4 rounded-xl">
                <div className="text-xs text-slate-400 font-medium">Média Diastólica (Mín)</div>
                <div className="text-2xl font-black text-indigo-400 mt-1">
                  {pressaoStats.avgDia}{" "}
                  <span className="text-xs font-semibold text-slate-400">mmHg</span>
                </div>
                <div className="text-xs text-slate-400 mt-1.5">Meta: &lt; 80 mmHg</div>
              </div>

              <div className="bg-slate-800/70 border border-slate-700/60 p-4 rounded-xl">
                <div className="text-xs text-slate-400 font-medium">Aferições Registradas</div>
                <div className="text-2xl font-black text-white mt-1">
                  {pressaoStats.count}
                </div>
                <div className="text-xs text-slate-400 mt-1.5">No período filtrado</div>
              </div>
            </div>
          )}

          {/* Reference Classification Guide Banner */}
          <div className="p-3.5 bg-slate-850 border border-slate-800 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
              <Info className="w-4 h-4 text-indigo-400" />
              <span>Diretrizes de Pressão Arterial:</span>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-[11px]">
              <span className="text-emerald-400 font-medium">
                • <strong>Ótima:</strong> &lt; 120 e &lt; 80
              </span>
              <span className="text-teal-400 font-medium">
                • <strong>Normal:</strong> 120-129 e/ou 80-84
              </span>
              <span className="text-amber-400 font-medium">
                • <strong>Pré-hipertensão:</strong> 130-139 e/ou 85-89
              </span>
              <span className="text-rose-400 font-medium">
                • <strong>Hipertensão:</strong> ≥ 140 e/ou ≥ 90
              </span>
            </div>
          </div>

          {/* Evolution Chart */}
          <div className="bg-slate-850 border border-slate-800 p-5 rounded-2xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Heart className="w-4 h-4 text-rose-400" />
                  Evolução da Pressão Arterial (Sistólica & Diastólica)
                </h3>
                <p className="text-xs text-slate-400">
                  Valores em mmHg. Linhas de referência em 120 mmHg (sistólica) e 80 mmHg (diastólica).
                </p>
              </div>
            </div>

            {chartData.length > 0 ? (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                    <XAxis dataKey="data" stroke="#94a3b8" fontSize={11} />
                    <YAxis
                      domain={[40, 180]}
                      stroke="#94a3b8"
                      fontSize={11}
                      unit=" mmHg"
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0f172a",
                        borderColor: "#334155",
                        borderRadius: "0.75rem",
                        color: "#fff",
                        fontSize: "12px",
                      }}
                      formatter={(val: any, name: any) => [
                        `${val} mmHg`,
                        name === "valorPrincipal" ? "Sistólica (Máx)" : "Diastólica (Mín)",
                      ]}
                      labelFormatter={(label, payload) => {
                        const it = payload?.[0]?.payload;
                        return it?.fullDate ? `Data: ${it.fullDate}` : `Data: ${label}`;
                      }}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
                      formatter={(value) =>
                        value === "valorPrincipal" ? "Sistólica (Máxima)" : "Diastólica (Mínima)"
                      }
                    />
                    <ReferenceLine y={120} stroke="#10b981" strokeDasharray="3 3" label={{ value: "Ref. 120", fill: "#10b981", fontSize: 10 }} />
                    <ReferenceLine y={80} stroke="#6366f1" strokeDasharray="3 3" label={{ value: "Ref. 80", fill: "#6366f1", fontSize: 10 }} />
                    <Line
                      type="monotone"
                      dataKey="valorPrincipal"
                      name="valorPrincipal"
                      stroke="#f43f5e"
                      strokeWidth={3}
                      dot={{ fill: "#f43f5e", r: 4, stroke: "#0f172a", strokeWidth: 2 }}
                      activeDot={{ r: 6, fill: "#fda4af" }}
                    />
                    <Line
                      type="monotone"
                      dataKey="valorSecundario"
                      name="valorSecundario"
                      stroke="#818cf8"
                      strokeWidth={2.5}
                      dot={{ fill: "#818cf8", r: 4, stroke: "#0f172a", strokeWidth: 2 }}
                      activeDot={{ r: 6, fill: "#c7d2fe" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-40 flex flex-col items-center justify-center text-slate-400 text-xs border border-dashed border-slate-700/60 rounded-xl">
                <Heart className="w-8 h-8 text-slate-500 mb-2 opacity-50" />
                <span>Nenhum registro de pressão no período selecionado.</span>
              </div>
            )}
          </div>

          {/* Records Table & Mobile Cards */}
          <div className="bg-slate-850 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Histórico de Aferições de Pressão</h3>
              <span className="text-xs text-slate-400 font-medium">{tableRegistros.length} registros</span>
            </div>

            {tableRegistros.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                Nenhum registro de pressão encontrado.
              </div>
            ) : (
              <>
                {/* Mobile Cards (telas < md) */}
                <div className="block md:hidden divide-y divide-slate-800/60 p-3 space-y-3">
                  {tableRegistros.map((reg, idx) => {
                    const sis = reg.Valor_Principal;
                    const dia = reg.Valor_Secundario || 0;
                    let badge = "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
                    let label = "Ótima";

                    if (sis < 120 && dia < 80) {
                      label = "Ótima";
                      badge = "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
                    } else if (sis <= 129 && dia <= 84) {
                      label = "Normal";
                      badge = "bg-teal-500/15 text-teal-300 border-teal-500/30";
                    } else if (sis <= 139 || dia <= 89) {
                      label = "Pré-Hipertensão";
                      badge = "bg-amber-500/15 text-amber-300 border-amber-500/30";
                    } else if (sis <= 159 || dia <= 99) {
                      label = "Estágio 1";
                      badge = "bg-orange-500/15 text-orange-300 border-orange-500/30";
                    } else {
                      label = "Estágio 2";
                      badge = "bg-rose-500/15 text-rose-300 border-rose-500/30";
                    }

                    return (
                      <div key={reg.Id || idx} className="bg-slate-900/90 border border-slate-800/80 p-3.5 rounded-xl space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-xs text-slate-300 font-medium">
                            <Calendar className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                            <span>{reg.Data_Hora}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => onEditRegistro(reg)}
                              title="Editar registro"
                              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => onDeleteRegistro(reg.Id)}
                              title="Excluir registro"
                              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-slate-800/60">
                          <div>
                            <span className="text-[10px] text-slate-400 uppercase block">Aferição</span>
                            <div className="flex items-baseline gap-1 mt-0.5">
                              <span className="text-base font-black text-rose-400">{reg.Valor_Principal}</span>
                              <span className="text-slate-500">/</span>
                              <span className="text-base font-black text-indigo-400">{reg.Valor_Secundario || 0}</span>
                              <span className="text-[10px] text-slate-400 ml-0.5">mmHg</span>
                            </div>
                            {reg.Batimentos_Bpm ? (
                              <div className="text-[11px] text-rose-300 font-medium flex items-center gap-1 mt-0.5">
                                <Activity className="w-3 h-3 text-rose-400 inline" />
                                <span>{reg.Batimentos_Bpm} bpm</span>
                              </div>
                            ) : null}
                          </div>

                          <div className="text-right">
                            <span className="text-[10px] text-slate-400 uppercase block mb-1">Status</span>
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${badge}`}>
                              {label}
                            </span>
                          </div>
                        </div>

                        {reg.Observacoes && (
                          <div className="text-xs text-slate-400 bg-slate-950/60 p-2 rounded-lg border border-slate-800/40">
                            {reg.Observacoes}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Desktop Table (telas >= md) */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900/60 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                      <tr>
                        <th className="py-3 px-4">Data & Horário</th>
                        <th className="py-3 px-4">Aferição</th>
                        <th className="py-3 px-4">Classificação</th>
                        <th className="py-3 px-4">Observações</th>
                        <th className="py-3 px-4 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {tableRegistros.map((reg, idx) => {
                        const sis = reg.Valor_Principal;
                        const dia = reg.Valor_Secundario || 0;
                        let badge = "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
                        let label = "Ótima";

                        if (sis < 120 && dia < 80) {
                          label = "Ótima";
                          badge = "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
                        } else if (sis <= 129 && dia <= 84) {
                          label = "Normal";
                          badge = "bg-teal-500/15 text-teal-300 border-teal-500/30";
                        } else if (sis <= 139 || dia <= 89) {
                          label = "Pré-Hipertensão";
                          badge = "bg-amber-500/15 text-amber-300 border-amber-500/30";
                        } else if (sis <= 159 || dia <= 99) {
                          label = "Estágio 1";
                          badge = "bg-orange-500/15 text-orange-300 border-orange-500/30";
                        } else {
                          label = "Estágio 2";
                          badge = "bg-rose-500/15 text-rose-300 border-rose-500/30";
                        }

                        return (
                          <tr key={reg.Id || idx} className="hover:bg-slate-800/40 transition-colors">
                            <td className="py-3 px-4 text-slate-200 font-medium whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <Calendar className="w-3.5 h-3.5 text-rose-400" />
                                <span>{reg.Data_Hora}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <span className="text-sm font-black text-rose-400">
                                  {reg.Valor_Principal}
                                </span>
                                <span className="text-slate-500 mx-1">/</span>
                                <span className="text-sm font-black text-indigo-400">
                                  {reg.Valor_Secundario || 0}
                                </span>
                                <span className="text-[11px] text-slate-400 ml-1">mmHg</span>
                              </div>
                              {reg.Batimentos_Bpm ? (
                                <div className="text-[11px] text-rose-300 font-medium flex items-center gap-1 mt-0.5">
                                  <Activity className="w-3 h-3 text-rose-400 inline" />
                                  <span>{reg.Batimentos_Bpm} bpm</span>
                                </div>
                              ) : null}
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <span
                                className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${badge}`}
                              >
                                {label}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-slate-300">
                              {reg.Observacoes || <span className="text-slate-500 italic">—</span>}
                            </td>
                            <td className="py-3 px-4 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => onEditRegistro(reg)}
                                  title="Editar registro"
                                  className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => onDeleteRegistro(reg.Id)}
                                  title="Excluir registro"
                                  className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 3. ABA DE GLICEMIA */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "glicemia" && (
        <div className="space-y-6">
          {/* KPI Cards */}
          {glicemiaStats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-800/70 border border-slate-700/60 p-4 rounded-xl">
                <div className="text-xs text-slate-400 font-medium">Última Medição</div>
                <div className="text-2xl font-black text-emerald-400 mt-1">
                  {glicemiaStats.latestVal}{" "}
                  <span className="text-xs font-semibold text-slate-400">mg/dL</span>
                </div>
                <div className="text-xs text-slate-400 mt-1.5">
                  Contexto:{" "}
                  <strong className="text-emerald-300">
                    {glicemiaStats.latestContext === "JEJUM"
                      ? "Jejum"
                      : glicemiaStats.latestContext === "POS_REFEICAO"
                      ? "Pós-Refeição"
                      : glicemiaStats.latestContext}
                  </strong>
                </div>
              </div>

              <div className="bg-slate-800/70 border border-slate-700/60 p-4 rounded-xl">
                <div className="text-xs text-slate-400 font-medium">Média em Jejum</div>
                <div className="text-2xl font-black text-teal-400 mt-1">
                  {glicemiaStats.avgJejum ? `${glicemiaStats.avgJejum}` : "—"}{" "}
                  <span className="text-xs font-semibold text-slate-400">mg/dL</span>
                </div>
                <div className="text-xs text-slate-400 mt-1.5">Meta: 70 - 99 mg/dL</div>
              </div>

              <div className="bg-slate-800/70 border border-slate-700/60 p-4 rounded-xl">
                <div className="text-xs text-slate-400 font-medium">Média Pós-Refeição</div>
                <div className="text-2xl font-black text-indigo-400 mt-1">
                  {glicemiaStats.avgPos ? `${glicemiaStats.avgPos}` : "—"}{" "}
                  <span className="text-xs font-semibold text-slate-400">mg/dL</span>
                </div>
                <div className="text-xs text-slate-400 mt-1.5">Meta: &lt; 140 mg/dL</div>
              </div>

              <div className="bg-slate-800/70 border border-slate-700/60 p-4 rounded-xl">
                <div className="text-xs text-slate-400 font-medium">Total de Medições</div>
                <div className="text-2xl font-black text-white mt-1">
                  {glicemiaStats.count}
                </div>
                <div className="text-xs text-slate-400 mt-1.5">No período filtrado</div>
              </div>
            </div>
          )}

          {/* Reference Classification Guide Banner */}
          <div className="p-3.5 bg-slate-850 border border-slate-800 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
              <Info className="w-4 h-4 text-emerald-400" />
              <span>Valores de Referência para Glicemia:</span>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-[11px]">
              <span className="text-emerald-400 font-medium">
                • <strong>Jejum Normal:</strong> 70 a 99 mg/dL
              </span>
              <span className="text-amber-400 font-medium">
                • <strong>Jejum Alterado (Pré-diabetes):</strong> 100 a 125 mg/dL
              </span>
              <span className="text-rose-400 font-medium">
                • <strong>Glicemia Elevada (Diabetes):</strong> ≥ 126 mg/dL em jejum
              </span>
              <span className="text-teal-400 font-medium">
                • <strong>Pós-Prandial (2h após comer):</strong> &lt; 140 mg/dL
              </span>
            </div>
          </div>

          {/* Evolution Chart */}
          <div className="bg-slate-850 border border-slate-800 p-5 rounded-2xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Droplets className="w-4 h-4 text-emerald-400" />
                  Evolução da Glicemia Capilar (mg/dL)
                </h3>
                <p className="text-xs text-slate-400">
                  Pontos de controle de glicemia ao longo do tempo com linha de referência em 100 mg/dL.
                </p>
              </div>
            </div>

            {chartData.length > 0 ? (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorGlicemia" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                    <XAxis dataKey="data" stroke="#94a3b8" fontSize={11} />
                    <YAxis
                      domain={[50, 200]}
                      stroke="#94a3b8"
                      fontSize={11}
                      unit=" mg/dL"
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0f172a",
                        borderColor: "#334155",
                        borderRadius: "0.75rem",
                        color: "#fff",
                        fontSize: "12px",
                      }}
                      formatter={(val: any, name: any, item: any) => [
                        `${val} mg/dL (${item?.payload?.contexto || "Jejum"})`,
                        "Glicemia",
                      ]}
                      labelFormatter={(label, payload) => {
                        const it = payload?.[0]?.payload;
                        return it?.fullDate ? `Data: ${it.fullDate}` : `Data: ${label}`;
                      }}
                    />
                    <ReferenceLine y={100} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: "Limite Jejum 100", fill: "#f59e0b", fontSize: 10 }} />
                    <Area
                      type="monotone"
                      dataKey="valorPrincipal"
                      stroke="#10b981"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorGlicemia)"
                      dot={{ fill: "#10b981", r: 4, stroke: "#0f172a", strokeWidth: 2 }}
                      activeDot={{ r: 6, fill: "#34d399" }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-40 flex flex-col items-center justify-center text-slate-400 text-xs border border-dashed border-slate-700/60 rounded-xl">
                <Droplets className="w-8 h-8 text-slate-500 mb-2 opacity-50" />
                <span>Nenhum registro de glicemia no período selecionado.</span>
              </div>
            )}
          </div>

          {/* Records Table & Mobile Cards */}
          <div className="bg-slate-850 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Histórico de Glicemia</h3>
              <span className="text-xs text-slate-400 font-medium">{tableRegistros.length} registros</span>
            </div>

            {tableRegistros.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                Nenhum registro de glicemia encontrado.
              </div>
            ) : (
              <>
                {/* Mobile Cards (telas < md) */}
                <div className="block md:hidden divide-y divide-slate-800/60 p-3 space-y-3">
                  {tableRegistros.map((reg, idx) => {
                    const val = reg.Valor_Principal;
                    const ctx = reg.Contexto || "JEJUM";
                    let statusBadge = "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
                    let statusLabel = "Normal";

                    if (ctx === "JEJUM") {
                      if (val < 70) {
                        statusLabel = "Hipoglicemia (<70)";
                        statusBadge = "bg-rose-500/15 text-rose-300 border-rose-500/30";
                      } else if (val <= 99) {
                        statusLabel = "Normal (70-99)";
                        statusBadge = "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
                      } else if (val <= 125) {
                        statusLabel = "Atenção (100-125)";
                        statusBadge = "bg-amber-500/15 text-amber-300 border-amber-500/30";
                      } else {
                        statusLabel = "Elevada (≥126)";
                        statusBadge = "bg-rose-500/15 text-rose-300 border-rose-500/30";
                      }
                    } else {
                      if (val <= 140) {
                        statusLabel = "Normal Pós-Refeição";
                        statusBadge = "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
                      } else if (val <= 199) {
                        statusLabel = "Atenção (140-199)";
                        statusBadge = "bg-amber-500/15 text-amber-300 border-amber-500/30";
                      } else {
                        statusLabel = "Elevada (≥200)";
                        statusBadge = "bg-rose-500/15 text-rose-300 border-rose-500/30";
                      }
                    }

                    return (
                      <div key={reg.Id || idx} className="bg-slate-900/90 border border-slate-800/80 p-3.5 rounded-xl space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-xs text-slate-300 font-medium">
                            <Calendar className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span>{reg.Data_Hora}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => onEditRegistro(reg)}
                              title="Editar registro"
                              className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => onDeleteRegistro(reg.Id)}
                              title="Excluir registro"
                              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-slate-800/60">
                          <div>
                            <span className="text-[10px] text-slate-400 uppercase block">Glicemia</span>
                            <div className="flex items-baseline gap-1 mt-0.5">
                              <span className="text-base font-black text-emerald-400">{reg.Valor_Principal}</span>
                              <span className="text-[10px] text-slate-400">mg/dL</span>
                            </div>
                            <span className="inline-block mt-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                              {ctx === "JEJUM"
                                ? "Jejum"
                                : ctx === "POS_REFEICAO"
                                ? "Pós-Refeição"
                                : ctx === "PRE_REFEICAO"
                                ? "Pré-Refeição"
                                : ctx === "AO_DEITAR"
                                ? "Ao Deitar"
                                : ctx}
                            </span>
                          </div>

                          <div className="text-right">
                            <span className="text-[10px] text-slate-400 uppercase block mb-1">Status</span>
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${statusBadge}`}>
                              {statusLabel}
                            </span>
                          </div>
                        </div>

                        {reg.Observacoes && (
                          <div className="text-xs text-slate-400 bg-slate-950/60 p-2 rounded-lg border border-slate-800/40">
                            {reg.Observacoes}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Desktop Table (telas >= md) */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900/60 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                      <tr>
                        <th className="py-3 px-4">Data & Horário</th>
                        <th className="py-3 px-4">Glicemia</th>
                        <th className="py-3 px-4">Contexto</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Observações</th>
                        <th className="py-3 px-4 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {tableRegistros.map((reg, idx) => {
                        const val = reg.Valor_Principal;
                        const ctx = reg.Contexto || "JEJUM";
                        let statusBadge = "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
                        let statusLabel = "Normal";

                        if (ctx === "JEJUM") {
                          if (val < 70) {
                            statusLabel = "Hipoglicemia (<70)";
                            statusBadge = "bg-rose-500/15 text-rose-300 border-rose-500/30";
                          } else if (val <= 99) {
                            statusLabel = "Normal (70-99)";
                            statusBadge = "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
                          } else if (val <= 125) {
                            statusLabel = "Atenção (100-125)";
                            statusBadge = "bg-amber-500/15 text-amber-300 border-amber-500/30";
                          } else {
                            statusLabel = "Elevada (≥126)";
                            statusBadge = "bg-rose-500/15 text-rose-300 border-rose-500/30";
                          }
                        } else {
                          if (val <= 140) {
                            statusLabel = "Normal Pós-Refeição";
                            statusBadge = "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
                          } else if (val <= 199) {
                            statusLabel = "Atenção (140-199)";
                            statusBadge = "bg-amber-500/15 text-amber-300 border-amber-500/30";
                          } else {
                            statusLabel = "Elevada (≥200)";
                            statusBadge = "bg-rose-500/15 text-rose-300 border-rose-500/30";
                          }
                        }

                        return (
                          <tr key={reg.Id || idx} className="hover:bg-slate-800/40 transition-colors">
                            <td className="py-3 px-4 text-slate-200 font-medium whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                                <span>{reg.Data_Hora}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <span className="text-sm font-black text-emerald-400">
                                {reg.Valor_Principal}
                              </span>
                              <span className="text-[11px] text-slate-400 ml-1">mg/dL</span>
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                                {ctx === "JEJUM"
                                  ? "Jejum"
                                  : ctx === "POS_REFEICAO"
                                  ? "Pós-Refeição"
                                  : ctx === "PRE_REFEICAO"
                                  ? "Pré-Refeição"
                                  : ctx === "AO_DEITAR"
                                  ? "Ao Deitar"
                                  : ctx}
                              </span>
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <span
                                className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${statusBadge}`}
                              >
                                {statusLabel}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-slate-300">
                              {reg.Observacoes || <span className="text-slate-500 italic">—</span>}
                            </td>
                            <td className="py-3 px-4 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => onEditRegistro(reg)}
                                  title="Editar registro"
                                  className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition-colors"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => onDeleteRegistro(reg.Id)}
                                  title="Excluir registro"
                                  className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 4. ABA DE DICAS DE HÁBITOS SAUDÁVEIS */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "dicas" && (
        <div className="space-y-6">
          {/* Medical Disclaimer Banner */}
          <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-start gap-3 text-amber-200">
            <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-bold text-amber-300">
                Aviso de Saúde Preventiva & Orientação Médica
              </p>
              <p className="text-amber-200/90 leading-relaxed">
                As dicas e referências apresentadas neste módulo possuem finalidade exclusivamente educativa e informativa, visando incentivar o bem-estar e o autocuidado. Elas não substituem consultas médicas, diagnósticos clínicos, exames laboratoriais ou prescrições individualizadas de profissionais de saúde qualificados.
              </p>
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 1. Hidratação */}
            <div className="bg-slate-850 border border-slate-800 p-5 rounded-2xl space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/20">
                  <Droplets className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Hidratação Inteligente</h4>
                  <p className="text-xs text-slate-400">Regulação da pressão, função renal e digestão</p>
                </div>
              </div>
              <ul className="space-y-2 text-xs text-slate-300">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Meta diária:</strong> Recomenda-se cerca de 35 ml de água por kg de peso corporal (ex: 70 kg ≈ 2,4 litros diários).
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <span>
                    Distribua a ingestão ao longo de todo o dia, evitando grandes volumes logo antes de dormir.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <span>
                    A boa hidratação auxilia no equilíbrio do volume plasmático e previne picos falsos de viscosidade sanguínea.
                  </span>
                </li>
              </ul>
            </div>

            {/* 2. Alimentação Balanceada */}
            <div className="bg-slate-850 border border-slate-800 p-5 rounded-2xl space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                  <Apple className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Alimentação & Controle Glicêmico</h4>
                  <p className="text-xs text-slate-400">Densidade nutricional, fibras e moderação de sódio</p>
                </div>
              </div>
              <ul className="space-y-2 text-xs text-slate-300">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Priorize fibras solúveis:</strong> Vegetais, legumes, aveia e sementes (chia/linhaça) retardam a absorção de glicose.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Controle do sódio:</strong> Evite ultraprocessados para manter a pressão arterial em faixas ótimas (&lt; 120/80 mmHg).
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    Proteínas magras em todas as refeições promovem saciedade duradoura e preservação de massa magra.
                  </span>
                </li>
              </ul>
            </div>

            {/* 3. Atividade Física */}
            <div className="bg-slate-850 border border-slate-800 p-5 rounded-2xl space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/20">
                  <Footprints className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Movimento & Atividade Física</h4>
                  <p className="text-xs text-slate-400">Saúde cardiovascular, sensibilidade à insulina e peso</p>
                </div>
              </div>
              <ul className="space-y-2 text-xs text-slate-300">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Meta da OMS:</strong> Ao menos 150 a 300 minutos semanais de atividade física moderada (caminhadas, ciclismo) ou 75 min vigorosos.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Treino de força:</strong> 2 a 3 vezes por semana aumenta a captação de glicose pelo tecido muscular.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>
                    Pequenas caminhadas de 10 a 15 minutos após as principais refeições reduzem significativamente os picos de glicemia pós-prandial.
                  </span>
                </li>
              </ul>
            </div>

            {/* 4. Sono & Recuperação */}
            <div className="bg-slate-850 border border-slate-800 p-5 rounded-2xl space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/20">
                  <Moon className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Higiene do Sono & Estresse</h4>
                  <p className="text-xs text-slate-400">Regulação hormonal (cortisol, grelina e leptina)</p>
                </div>
              </div>
              <ul className="space-y-2 text-xs text-slate-300">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Duração ideal:</strong> 7 a 9 horas de sono de qualidade por noite para permitir o reparo celular e equilíbrio da pressão noturna.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                  <span>
                    Reduza telas azuis e luzes fortes 60 minutos antes de se deitar para otimizar a liberação natural de melatonina.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                  <span>
                    Privação de sono eleva o cortisol matinal, o que pode aumentar a resistência à insulina e a pressão sistólica.
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Configuração de Lembretes Diários */}
      {isLembretesModalOpen && onSaveLembretesConfigs && (
        <ConfigLembretesSaudeModal
          isOpen={isLembretesModalOpen}
          onClose={() => setIsLembretesModalOpen(false)}
          configs={lembretesConfigs}
          onSaveConfigs={onSaveLembretesConfigs}
        />
      )}

      {/* Modal de Configuração de Altura */}
      {isAlturaModalOpen && (
        <EditarAlturaModal
          isOpen={isAlturaModalOpen}
          onClose={() => setIsAlturaModalOpen(false)}
          currentAlturaCm={effectiveAltura}
          onSaveAltura={onSaveAltura || (() => {})}
        />
      )}
    </div>
  );
};
