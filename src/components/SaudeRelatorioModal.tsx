import React, { useState, useMemo } from "react";
import {
  X,
  Printer,
  Download,
  Activity,
  Heart,
  Scale,
  Droplets,
  Dumbbell,
  Calendar,
  Clock,
  Flame,
  TrendingDown,
  TrendingUp,
  Minus,
  CheckCircle2,
  AlertTriangle,
  FileText,
  User,
  ShieldCheck,
  Stethoscope,
  Pill,
} from "lucide-react";
import {
  RegistroSaude,
  ExercicioRegistro,
  LembreteSaudeConfig,
  ConsultaMedica,
  ReceitaMedica,
} from "../types";
import { formatDateBR } from "../utils/formatters";
import { calcularImc } from "../utils/imc";
import { exportReceitaPDF } from "../utils/receitaPdf";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  registrosSaude: RegistroSaude[];
  exercicios: ExercicioRegistro[];
  alturaUsuario?: number;
  lembretesConfigs?: LembreteSaudeConfig[];
  consultas?: ConsultaMedica[];
  receitas?: ReceitaMedica[];
}

type PeriodFilter = "30_dias" | "3_meses" | "6_meses" | "ano" | "tudo";

export const SaudeRelatorioModal: React.FC<Props> = ({
  isOpen,
  onClose,
  registrosSaude = [],
  exercicios = [],
  alturaUsuario,
  lembretesConfigs = [],
  consultas = [],
  receitas = [],
}) => {
  const [periodo, setPeriodo] = useState<PeriodFilter>("3_meses");

  // Effective height from user config or fallback
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

  // Date filtering logic
  const dateThreshold = useMemo(() => {
    const now = new Date();
    if (periodo === "30_dias") {
      const d = new Date(now);
      d.setDate(d.getDate() - 30);
      return d;
    }
    if (periodo === "3_meses") {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 3);
      return d;
    }
    if (periodo === "6_meses") {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 6);
      return d;
    }
    if (periodo === "ano") {
      const d = new Date(now);
      d.setFullYear(d.getFullYear() - 1);
      return d;
    }
    return null; // "tudo"
  }, [periodo]);

  const periodoLabel = useMemo(() => {
    switch (periodo) {
      case "30_dias":
        return "Últimos 30 Dias";
      case "3_meses":
        return "Últimos 3 Meses";
      case "6_meses":
        return "Últimos 6 Meses";
      case "ano":
        return "Último Ano (12 meses)";
      case "tudo":
        return "Histórico Completo";
      default:
        return "Período Selecionado";
    }
  }, [periodo]);

  // Filtered health records
  const filteredRegistros = useMemo(() => {
    if (!dateThreshold) return registrosSaude;
    return registrosSaude.filter((r) => {
      if (!r.Data_Hora) return true;
      const d = new Date(r.Data_Hora);
      return isNaN(d.getTime()) || d >= dateThreshold;
    });
  }, [registrosSaude, dateThreshold]);

  // Filtered workouts
  const filteredExercicios = useMemo(() => {
    if (!dateThreshold) return exercicios;
    return exercicios.filter((e) => {
      if (!e.data) return true;
      const d = new Date(e.data);
      return isNaN(d.getTime()) || d >= dateThreshold;
    });
  }, [exercicios, dateThreshold]);

  // -------------------------------------------------------------
  // 1. PESO & IMC STATS
  // -------------------------------------------------------------
  const pesoList = useMemo(() => {
    return filteredRegistros
      .filter((r) => r.Tipo_Registro === "PESO" || r.Tipo_Registro === "Peso")
      .sort((a, b) => new Date(a.Data_Hora).getTime() - new Date(b.Data_Hora).getTime());
  }, [filteredRegistros]);

  const pesoStats = useMemo(() => {
    if (pesoList.length === 0) return null;
    const values = pesoList.map((r) => r.Valor_Principal);
    const latest = pesoList[pesoList.length - 1].Valor_Principal;
    const first = pesoList[0].Valor_Principal;
    const diffPeriodo = latest - first;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = values.reduce((acc, curr) => acc + curr, 0) / values.length;
    const imcInfo = calcularImc(latest, effectiveAltura);

    const m = effectiveAltura / 100;
    const faixaMin = Math.round(18.5 * m * m * 10) / 10;
    const faixaMax = Math.round(24.9 * m * m * 10) / 10;

    return {
      latest,
      first,
      diffPeriodo,
      min,
      max,
      avg: avg.toFixed(1),
      count: pesoList.length,
      imcInfo,
      faixaMin,
      faixaMax,
      latestDate: pesoList[pesoList.length - 1].Data_Hora,
    };
  }, [pesoList, effectiveAltura]);

  // -------------------------------------------------------------
  // 2. PRESSÃO ARTERIAL STATS
  // -------------------------------------------------------------
  const pressaoList = useMemo(() => {
    return filteredRegistros
      .filter((r) => r.Tipo_Registro === "PRESSAO" || r.Tipo_Registro === "Pressão")
      .sort((a, b) => new Date(a.Data_Hora).getTime() - new Date(b.Data_Hora).getTime());
  }, [filteredRegistros]);

  const pressaoStats = useMemo(() => {
    if (pressaoList.length === 0) return null;
    const latest = pressaoList[pressaoList.length - 1];
    const sistolicas = pressaoList.map((r) => r.Valor_Principal);
    const diastolicas = pressaoList.map((r) => r.Valor_Secundario || 0);
    const batimentos = pressaoList.filter((r) => r.Batimentos_Bpm && r.Batimentos_Bpm > 0);

    const avgSis = Math.round(sistolicas.reduce((a, b) => a + b, 0) / sistolicas.length);
    const avgDia = Math.round(diastolicas.reduce((a, b) => a + b, 0) / diastolicas.length);
    const avgBpm =
      batimentos.length > 0
        ? Math.round(
            batimentos.reduce((a, b) => a + (b.Batimentos_Bpm || 0), 0) / batimentos.length
          )
        : null;

    const sis = latest.Valor_Principal;
    const dia = latest.Valor_Secundario || 0;
    let classificacao = "Normal";
    let isNormal = true;

    if (sis < 120 && dia < 80) {
      classificacao = "Ótima / Ideal";
      isNormal = true;
    } else if (sis <= 129 && dia <= 84) {
      classificacao = "Normal";
      isNormal = true;
    } else if (sis <= 139 || dia <= 89) {
      classificacao = "Pré-Hipertensão";
      isNormal = false;
    } else if (sis <= 159 || dia <= 99) {
      classificacao = "Hipertensão Estágio 1";
      isNormal = false;
    } else {
      classificacao = "Hipertensão Estágio 2";
      isNormal = false;
    }

    return {
      latestSis: sis,
      latestDia: dia,
      latestBpm: latest.Batimentos_Bpm,
      latestDate: latest.Data_Hora,
      avgSis,
      avgDia,
      avgBpm,
      classificacao,
      isNormal,
      count: pressaoList.length,
    };
  }, [pressaoList]);

  // -------------------------------------------------------------
  // 3. GLICEMIA STATS
  // -------------------------------------------------------------
  const glicemiaList = useMemo(() => {
    return filteredRegistros
      .filter((r) => r.Tipo_Registro === "GLICEMIA" || r.Tipo_Registro === "Glicemia")
      .sort((a, b) => new Date(a.Data_Hora).getTime() - new Date(b.Data_Hora).getTime());
  }, [filteredRegistros]);

  const glicemiaStats = useMemo(() => {
    if (glicemiaList.length === 0) return null;
    const latest = glicemiaList[glicemiaList.length - 1];
    const jejumList = glicemiaList.filter((r) => r.Contexto === "JEJUM" || !r.Contexto);
    const posList = glicemiaList.filter((r) => r.Contexto === "POS_REFEICAO");

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

    const totalValues = glicemiaList.map((r) => r.Valor_Principal);
    const avgGeral = Math.round(totalValues.reduce((a, b) => a + b, 0) / totalValues.length);

    return {
      latestVal: latest.Valor_Principal,
      latestContext: latest.Contexto === "POS_REFEICAO" ? "Pós-Refeição" : "Jejum",
      latestDate: latest.Data_Hora,
      avgJejum,
      avgPos,
      avgGeral,
      count: glicemiaList.length,
      jejumCount: jejumList.length,
      posCount: posList.length,
    };
  }, [glicemiaList]);

  // -------------------------------------------------------------
  // 4. EXERCÍCIOS & TREINOS STATS
  // -------------------------------------------------------------
  const exerciciosStats = useMemo(() => {
    if (filteredExercicios.length === 0) return null;

    const totalTreinos = filteredExercicios.length;
    const totalMinutos = filteredExercicios.reduce(
      (acc, curr) => acc + (curr.duracaoMinutos || 0),
      0
    );
    const totalCalorias = filteredExercicios.reduce(
      (acc, curr) => acc + (curr.caloriasQueimadas || 0),
      0
    );
    const mediaMinutos = Math.round(totalMinutos / totalTreinos);

    const horas = Math.floor(totalMinutos / 60);
    const minRest = totalMinutos % 60;
    const tempoFormatado = horas > 0 ? `${horas}h ${minRest > 0 ? `${minRest}m` : ""}` : `${minRest}m`;

    // Modalidade breakdown
    const modalidadesMap: { [key: string]: { count: number; minutos: number; calorias: number } } = {};
    filteredExercicios.forEach((e) => {
      const tipo = e.tipoExercicio || "OUTRO";
      if (!modalidadesMap[tipo]) {
        modalidadesMap[tipo] = { count: 0, minutos: 0, calorias: 0 };
      }
      modalidadesMap[tipo].count += 1;
      modalidadesMap[tipo].minutos += e.duracaoMinutos || 0;
      modalidadesMap[tipo].calorias += e.caloriasQueimadas || 0;
    });

    const modalidadesList = Object.entries(modalidadesMap)
      .map(([tipo, data]) => ({
        tipo,
        ...data,
        pct: Math.round((data.minutos / (totalMinutos || 1)) * 100),
      }))
      .sort((a, b) => b.minutos - a.minutos);

    return {
      totalTreinos,
      totalMinutos,
      tempoFormatado,
      totalCalorias,
      mediaMinutos,
      modalidadesList,
    };
  }, [filteredExercicios]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const dataAtualFormatada = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      {/* Styles for printing */}
      <style>{`
        @media print {
          @page {
            margin: 12mm 10mm 12mm 10mm;
            size: A4 portrait;
          }
          body {
            background-color: #ffffff !important;
            color: #0f172a !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
          .print-container {
            border: none !important;
            box-shadow: none !important;
            width: 100% !important;
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            background: #ffffff !important;
            color: #0f172a !important;
          }
          .print-card {
            background: #f8fafc !important;
            border: 1px solid #cbd5e1 !important;
            color: #0f172a !important;
            break-inside: avoid;
          }
          .print-table th {
            background: #f1f5f9 !important;
            color: #0f172a !important;
            border-color: #cbd5e1 !important;
          }
          .print-table td {
            border-color: #e2e8f0 !important;
            color: #0f172a !important;
          }
          .print-text-dark {
            color: #0f172a !important;
          }
          .print-text-muted {
            color: #475569 !important;
          }
          .print-section-break {
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }
      `}</style>

      <div className="print-container bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-5xl my-4 sm:my-8 shadow-2xl overflow-hidden flex flex-col text-slate-100 animate-in fade-in zoom-in-95 duration-200">
        {/* Top Control Bar (Hidden on print) */}
        <div className="no-print p-4 sm:p-5 bg-slate-950/80 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base leading-tight flex items-center gap-2">
                Relatório Geral de Saúde & Bem-Estar
                <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-300 text-[10px] font-semibold rounded-full border border-emerald-500/20">
                  Consolidado
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Visualização integrada de Peso, Pressão, Glicemia e Exercícios para consultas e acompanhamento
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Filter selectors */}
            <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={periodo}
                onChange={(e) => setPeriodo(e.target.value as PeriodFilter)}
                className="bg-transparent text-white font-medium focus:outline-none cursor-pointer"
              >
                <option value="30_dias" className="bg-slate-900 text-white">
                  Últimos 30 Dias
                </option>
                <option value="3_meses" className="bg-slate-900 text-white">
                  Últimos 3 Meses
                </option>
                <option value="6_meses" className="bg-slate-900 text-white">
                  Últimos 6 Meses
                </option>
                <option value="ano" className="bg-slate-900 text-white">
                  Último Ano
                </option>
                <option value="tudo" className="bg-slate-900 text-white">
                  Histórico Completo
                </option>
              </select>
            </div>

            {/* Print/Download Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-emerald-950/40 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir / Salvar PDF</span>
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
              title="Fechar visualização"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Report Body */}
        <div className="p-6 sm:p-8 space-y-6 overflow-y-auto max-h-[85vh] print:max-h-none print:overflow-visible print:p-0">
          
          {/* Executive Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-slate-800 print:border-slate-300 gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/10 print:bg-emerald-100 text-emerald-400 print:text-emerald-800 text-[11px] font-bold tracking-wider uppercase border border-emerald-500/20 print:border-emerald-300">
                  Prontuário Pessoal & Controle Clínico
                </span>
                <span className="text-xs text-slate-400 print-text-muted">
                  Período: <strong>{periodoLabel}</strong>
                </span>
              </div>
              <h1 className="text-2xl font-black tracking-tight text-white print-text-dark">
                Relatório Consolidado de Saúde
              </h1>
              <p className="text-xs text-slate-400 print-text-muted mt-0.5">
                Emissão: {dataAtualFormatada} • Altura Cadastrada: <strong>{effectiveAltura} cm</strong>
              </p>
            </div>

            <div className="flex items-center gap-3 bg-slate-950/60 print:bg-slate-100 p-3 rounded-2xl border border-slate-800 print:border-slate-300 text-xs">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 print:bg-emerald-200 border border-emerald-500/20 flex items-center justify-center text-emerald-400 print:text-emerald-800">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 print-text-muted">
                  Status Geral
                </span>
                <div className="font-bold text-white print-text-dark text-sm">
                  {pesoStats?.imcInfo?.classificacao || "Acompanhamento Ativo"}
                </div>
              </div>
            </div>
          </div>

          {/* 4 Top KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 print-section-break">
            {/* KPI 1: Peso / IMC */}
            <div className="print-card p-4 bg-slate-950/70 border border-slate-800 rounded-2xl flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 print-text-muted uppercase">
                  Peso & IMC
                </span>
                <Scale className="w-4 h-4 text-emerald-400 print:text-emerald-700" />
              </div>
              <div className="mt-2">
                <div className="text-xl sm:text-2xl font-black text-white print-text-dark">
                  {pesoStats ? `${pesoStats.latest.toFixed(1)} kg` : "--"}
                </div>
                <div className="text-[11px] font-medium text-emerald-400 print:text-emerald-700 mt-0.5">
                  {pesoStats?.imcInfo ? `IMC: ${pesoStats.imcInfo.imc} (${pesoStats.imcInfo.classificacao})` : "Sem pesagens"}
                </div>
              </div>
            </div>

            {/* KPI 2: Pressão Arterial */}
            <div className="print-card p-4 bg-slate-950/70 border border-slate-800 rounded-2xl flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 print-text-muted uppercase">
                  Pressão Arterial
                </span>
                <Heart className="w-4 h-4 text-rose-400 print:text-rose-700" />
              </div>
              <div className="mt-2">
                <div className="text-xl sm:text-2xl font-black text-white print-text-dark">
                  {pressaoStats ? `${pressaoStats.latestSis}/${pressaoStats.latestDia}` : "--"}
                  <span className="text-xs font-normal text-slate-400 print-text-muted ml-1">
                    mmHg
                  </span>
                </div>
                <div className="text-[11px] font-medium text-slate-300 print-text-dark mt-0.5">
                  {pressaoStats ? pressaoStats.classificacao : "Sem aferições"}
                </div>
              </div>
            </div>

            {/* KPI 3: Glicemia */}
            <div className="print-card p-4 bg-slate-950/70 border border-slate-800 rounded-2xl flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 print-text-muted uppercase">
                  Glicemia Média
                </span>
                <Droplets className="w-4 h-4 text-emerald-400 print:text-emerald-700" />
              </div>
              <div className="mt-2">
                <div className="text-xl sm:text-2xl font-black text-white print-text-dark">
                  {glicemiaStats ? `${glicemiaStats.avgGeral}` : "--"}
                  <span className="text-xs font-normal text-slate-400 print-text-muted ml-1">
                    mg/dL
                  </span>
                </div>
                <div className="text-[11px] font-medium text-emerald-400 print:text-emerald-700 mt-0.5">
                  {glicemiaStats?.avgJejum ? `Jejum: ~${glicemiaStats.avgJejum} mg/dL` : "Acompanhamento"}
                </div>
              </div>
            </div>

            {/* KPI 4: Exercícios */}
            <div className="print-card p-4 bg-slate-950/70 border border-slate-800 rounded-2xl flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 print-text-muted uppercase">
                  Atividade Física
                </span>
                <Dumbbell className="w-4 h-4 text-amber-400 print:text-amber-700" />
              </div>
              <div className="mt-2">
                <div className="text-xl sm:text-2xl font-black text-white print-text-dark">
                  {exerciciosStats ? exerciciosStats.tempoFormatado : "--"}
                </div>
                <div className="text-[11px] font-medium text-amber-400 print:text-amber-700 mt-0.5">
                  {exerciciosStats
                    ? `${exerciciosStats.totalTreinos} sessões (${exerciciosStats.totalCalorias} kcal)`
                    : "Sem treinos no período"}
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================= */}
          {/* SEÇÃO 1: PESO CORPORAL & EVOLUÇÃO DO IMC */}
          {/* ========================================================= */}
          <div className="print-card p-5 bg-slate-950/70 border border-slate-800 rounded-2xl space-y-4 print-section-break">
            <div className="flex items-center justify-between border-b border-slate-800 print:border-slate-300 pb-3">
              <h3 className="font-bold text-white print-text-dark text-sm uppercase tracking-wider flex items-center gap-2">
                <Scale className="w-4 h-4 text-emerald-400 print:text-emerald-700" />
                1. Peso Corporal & Evolução do IMC (Índice de Massa Corporal)
              </h3>
              <span className="text-[11px] text-slate-400 print-text-muted">
                {pesoStats ? `${pesoStats.count} registros` : "Nenhum registro"}
              </span>
            </div>

            {pesoStats ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 bg-slate-900 print:bg-slate-100 rounded-xl border border-slate-800/80 print:border-slate-200">
                    <span className="text-[10px] text-slate-400 print-text-muted block">Peso Atual</span>
                    <strong className="text-base text-white print-text-dark">{pesoStats.latest.toFixed(1)} kg</strong>
                  </div>
                  <div className="p-3 bg-slate-900 print:bg-slate-100 rounded-xl border border-slate-800/80 print:border-slate-200">
                    <span className="text-[10px] text-slate-400 print-text-muted block">Variação no Período</span>
                    <strong className={`text-base flex items-center gap-1 ${
                      pesoStats.diffPeriodo < 0
                        ? "text-emerald-400 print:text-emerald-700"
                        : pesoStats.diffPeriodo > 0
                        ? "text-amber-400 print:text-amber-700"
                        : "text-slate-300 print-text-dark"
                    }`}>
                      {pesoStats.diffPeriodo > 0 ? `+${pesoStats.diffPeriodo.toFixed(1)}` : pesoStats.diffPeriodo.toFixed(1)} kg
                    </strong>
                  </div>
                  <div className="p-3 bg-slate-900 print:bg-slate-100 rounded-xl border border-slate-800/80 print:border-slate-200">
                    <span className="text-[10px] text-slate-400 print-text-muted block">IMC Calculado (OMS)</span>
                    <strong className="text-base text-emerald-400 print:text-emerald-700">
                      {pesoStats.imcInfo?.imc} ({pesoStats.imcInfo?.classificacao})
                    </strong>
                  </div>
                  <div className="p-3 bg-slate-900 print:bg-slate-100 rounded-xl border border-slate-800/80 print:border-slate-200">
                    <span className="text-[10px] text-slate-400 print-text-muted block">Faixa Saudável Recomendada</span>
                    <strong className="text-base text-slate-200 print-text-dark">
                      {pesoStats.faixaMin} kg a {pesoStats.faixaMax} kg
                    </strong>
                  </div>
                </div>

                {/* Tabela de Pesagens */}
                <div className="overflow-x-auto">
                  <table className="print-table w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-900/60 print:bg-slate-100 text-slate-400 print-text-dark">
                        <th className="py-2 px-3 font-semibold">Data / Hora</th>
                        <th className="py-2 px-3 font-semibold">Peso (kg)</th>
                        <th className="py-2 px-3 font-semibold">IMC</th>
                        <th className="py-2 px-3 font-semibold">Classificação</th>
                        <th className="py-2 px-3 font-semibold">Observações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50 print:divide-slate-200">
                      {pesoList.slice(-6).reverse().map((p) => {
                        const imcItem = calcularImc(p.Valor_Principal, effectiveAltura);
                        return (
                          <tr key={p.Id} className="hover:bg-slate-900/30">
                            <td className="py-2 px-3 font-mono text-slate-300 print-text-dark">
                              {formatDateBR(p.Data_Hora.substring(0, 10))}
                            </td>
                            <td className="py-2 px-3 font-bold text-white print-text-dark">
                              {p.Valor_Principal.toFixed(1)} kg
                            </td>
                            <td className="py-2 px-3 font-mono text-slate-300 print-text-dark">
                              {imcItem?.imc || "--"}
                            </td>
                            <td className="py-2 px-3 text-slate-300 print-text-dark">
                              {imcItem?.classificacao || "--"}
                            </td>
                            <td className="py-2 px-3 text-slate-400 print-text-muted">
                              {p.Observacoes || "-"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 print-text-muted italic">
                Nenhum registro de peso encontrado no período selecionado.
              </p>
            )}
          </div>

          {/* ========================================================= */}
          {/* SEÇÃO 2: PRESSÃO ARTERIAL & FREQUÊNCIA CARDÍACA */}
          {/* ========================================================= */}
          <div className="print-card p-5 bg-slate-950/70 border border-slate-800 rounded-2xl space-y-4 print-section-break">
            <div className="flex items-center justify-between border-b border-slate-800 print:border-slate-300 pb-3">
              <h3 className="font-bold text-white print-text-dark text-sm uppercase tracking-wider flex items-center gap-2">
                <Heart className="w-4 h-4 text-rose-400 print:text-rose-700" />
                2. Pressão Arterial & Frequência Cardíaca
              </h3>
              <span className="text-[11px] text-slate-400 print-text-muted">
                {pressaoStats ? `${pressaoStats.count} medições` : "Nenhum registro"}
              </span>
            </div>

            {pressaoStats ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 bg-slate-900 print:bg-slate-100 rounded-xl border border-slate-800/80 print:border-slate-200">
                    <span className="text-[10px] text-slate-400 print-text-muted block">Última Leitura</span>
                    <strong className="text-base text-white print-text-dark">
                      {pressaoStats.latestSis}/{pressaoStats.latestDia} mmHg
                    </strong>
                  </div>
                  <div className="p-3 bg-slate-900 print:bg-slate-100 rounded-xl border border-slate-800/80 print:border-slate-200">
                    <span className="text-[10px] text-slate-400 print-text-muted block">Classificação Atual</span>
                    <strong className={`text-base ${pressaoStats.isNormal ? "text-emerald-400 print:text-emerald-700" : "text-amber-400 print:text-amber-700"}`}>
                      {pressaoStats.classificacao}
                    </strong>
                  </div>
                  <div className="p-3 bg-slate-900 print:bg-slate-100 rounded-xl border border-slate-800/80 print:border-slate-200">
                    <span className="text-[10px] text-slate-400 print-text-muted block">Média no Período</span>
                    <strong className="text-base text-slate-200 print-text-dark">
                      {pressaoStats.avgSis}/{pressaoStats.avgDia} mmHg
                    </strong>
                  </div>
                  <div className="p-3 bg-slate-900 print:bg-slate-100 rounded-xl border border-slate-800/80 print:border-slate-200">
                    <span className="text-[10px] text-slate-400 print-text-muted block">Batimentos Médios</span>
                    <strong className="text-base text-rose-400 print:text-rose-700">
                      {pressaoStats.avgBpm ? `${pressaoStats.avgBpm} bpm` : "--"}
                    </strong>
                  </div>
                </div>

                {/* Tabela de Pressão */}
                <div className="overflow-x-auto">
                  <table className="print-table w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-900/60 print:bg-slate-100 text-slate-400 print-text-dark">
                        <th className="py-2 px-3 font-semibold">Data / Hora</th>
                        <th className="py-2 px-3 font-semibold">Sistólica / Diastólica</th>
                        <th className="py-2 px-3 font-semibold">Pulso (BPM)</th>
                        <th className="py-2 px-3 font-semibold">Diagnóstico</th>
                        <th className="py-2 px-3 font-semibold">Observações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50 print:divide-slate-200">
                      {pressaoList.slice(-6).reverse().map((pr) => {
                        const sis = pr.Valor_Principal;
                        const dia = pr.Valor_Secundario || 0;
                        const statusDiag = sis < 130 && dia < 85 ? "Normal" : sis < 140 && dia < 90 ? "Atenção" : "Elevada";
                        return (
                          <tr key={pr.Id} className="hover:bg-slate-900/30">
                            <td className="py-2 px-3 font-mono text-slate-300 print-text-dark">
                              {formatDateBR(pr.Data_Hora.substring(0, 10))} {pr.Data_Hora.includes(" ") ? pr.Data_Hora.split(" ")[1] : ""}
                            </td>
                            <td className="py-2 px-3 font-bold text-white print-text-dark">
                              {sis} / {dia} mmHg
                            </td>
                            <td className="py-2 px-3 font-mono text-slate-300 print-text-dark">
                              {pr.Batimentos_Bpm ? `${pr.Batimentos_Bpm} bpm` : "-"}
                            </td>
                            <td className="py-2 px-3 text-slate-300 print-text-dark">
                              {statusDiag}
                            </td>
                            <td className="py-2 px-3 text-slate-400 print-text-muted">
                              {pr.Observacoes || "-"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 print-text-muted italic">
                Nenhum registro de pressão arterial encontrado no período selecionado.
              </p>
            )}
          </div>

          {/* ========================================================= */}
          {/* SEÇÃO 3: CONTROLE GLICÊMICO */}
          {/* ========================================================= */}
          <div className="print-card p-5 bg-slate-950/70 border border-slate-800 rounded-2xl space-y-4 print-section-break">
            <div className="flex items-center justify-between border-b border-slate-800 print:border-slate-300 pb-3">
              <h3 className="font-bold text-white print-text-dark text-sm uppercase tracking-wider flex items-center gap-2">
                <Droplets className="w-4 h-4 text-emerald-400 print:text-emerald-700" />
                3. Monitoramento Glicêmico (Glicose)
              </h3>
              <span className="text-[11px] text-slate-400 print-text-muted">
                {glicemiaStats ? `${glicemiaStats.count} medições` : "Nenhum registro"}
              </span>
            </div>

            {glicemiaStats ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 bg-slate-900 print:bg-slate-100 rounded-xl border border-slate-800/80 print:border-slate-200">
                    <span className="text-[10px] text-slate-400 print-text-muted block">Última Medição</span>
                    <strong className="text-base text-white print-text-dark">
                      {glicemiaStats.latestVal} mg/dL
                    </strong>
                  </div>
                  <div className="p-3 bg-slate-900 print:bg-slate-100 rounded-xl border border-slate-800/80 print:border-slate-200">
                    <span className="text-[10px] text-slate-400 print-text-muted block">Média em Jejum (Ideal &lt; 100)</span>
                    <strong className={`text-base ${glicemiaStats.avgJejum && glicemiaStats.avgJejum <= 100 ? "text-emerald-400 print:text-emerald-700" : "text-amber-400 print:text-amber-700"}`}>
                      {glicemiaStats.avgJejum ? `${glicemiaStats.avgJejum} mg/dL` : "--"}
                    </strong>
                  </div>
                  <div className="p-3 bg-slate-900 print:bg-slate-100 rounded-xl border border-slate-800/80 print:border-slate-200">
                    <span className="text-[10px] text-slate-400 print-text-muted block">Média Pós-Refeição (&lt; 140)</span>
                    <strong className="text-base text-slate-200 print-text-dark">
                      {glicemiaStats.avgPos ? `${glicemiaStats.avgPos} mg/dL` : "--"}
                    </strong>
                  </div>
                  <div className="p-3 bg-slate-900 print:bg-slate-100 rounded-xl border border-slate-800/80 print:border-slate-200">
                    <span className="text-[10px] text-slate-400 print-text-muted block">Média Geral Consolidada</span>
                    <strong className="text-base text-slate-200 print-text-dark">
                      {glicemiaStats.avgGeral} mg/dL
                    </strong>
                  </div>
                </div>

                {/* Tabela de Glicemia */}
                <div className="overflow-x-auto">
                  <table className="print-table w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-900/60 print:bg-slate-100 text-slate-400 print-text-dark">
                        <th className="py-2 px-3 font-semibold">Data / Hora</th>
                        <th className="py-2 px-3 font-semibold">Valor Glicêmico</th>
                        <th className="py-2 px-3 font-semibold">Momento</th>
                        <th className="py-2 px-3 font-semibold">Meta de Referência</th>
                        <th className="py-2 px-3 font-semibold">Observações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50 print:divide-slate-200">
                      {glicemiaList.slice(-6).reverse().map((gl) => {
                        const isJejum = gl.Contexto === "JEJUM" || !gl.Contexto;
                        const meta = isJejum ? "< 100 mg/dL" : "< 140 mg/dL";
                        return (
                          <tr key={gl.Id} className="hover:bg-slate-900/30">
                            <td className="py-2 px-3 font-mono text-slate-300 print-text-dark">
                              {formatDateBR(gl.Data_Hora.substring(0, 10))}
                            </td>
                            <td className="py-2 px-3 font-bold text-white print-text-dark">
                              {gl.Valor_Principal} mg/dL
                            </td>
                            <td className="py-2 px-3 text-slate-300 print-text-dark">
                              {isJejum ? "Jejum" : "Pós-Refeição"}
                            </td>
                            <td className="py-2 px-3 font-mono text-slate-400 print-text-muted">
                              {meta}
                            </td>
                            <td className="py-2 px-3 text-slate-400 print-text-muted">
                              {gl.Observacoes || "-"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 print-text-muted italic">
                Nenhum registro de glicemia encontrado no período selecionado.
              </p>
            )}
          </div>

          {/* ========================================================= */}
          {/* SEÇÃO 4: ATIVIDADE FÍSICA & EXERCÍCIOS (23_Exercicios) */}
          {/* ========================================================= */}
          <div className="print-card p-5 bg-slate-950/70 border border-slate-800 rounded-2xl space-y-4 print-section-break">
            <div className="flex items-center justify-between border-b border-slate-800 print:border-slate-300 pb-3">
              <h3 className="font-bold text-white print-text-dark text-sm uppercase tracking-wider flex items-center gap-2">
                <Dumbbell className="w-4 h-4 text-amber-400 print:text-amber-700" />
                4. Atividade Física & Exercícios Praticados
              </h3>
              <span className="text-[11px] text-slate-400 print-text-muted">
                {exerciciosStats ? `${exerciciosStats.totalTreinos} treinos` : "Nenhum registro"}
              </span>
            </div>

            {exerciciosStats ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 bg-slate-900 print:bg-slate-100 rounded-xl border border-slate-800/80 print:border-slate-200">
                    <span className="text-[10px] text-slate-400 print-text-muted block">Total de Sessões</span>
                    <strong className="text-base text-white print-text-dark">{exerciciosStats.totalTreinos} treinos</strong>
                  </div>
                  <div className="p-3 bg-slate-900 print:bg-slate-100 rounded-xl border border-slate-800/80 print:border-slate-200">
                    <span className="text-[10px] text-slate-400 print-text-muted block">Tempo Total Acumulado</span>
                    <strong className="text-base text-emerald-400 print:text-emerald-700">{exerciciosStats.tempoFormatado}</strong>
                  </div>
                  <div className="p-3 bg-slate-900 print:bg-slate-100 rounded-xl border border-slate-800/80 print:border-slate-200">
                    <span className="text-[10px] text-slate-400 print-text-muted block">Média por Treino</span>
                    <strong className="text-base text-slate-200 print-text-dark">{exerciciosStats.mediaMinutos} min / sessão</strong>
                  </div>
                  <div className="p-3 bg-slate-900 print:bg-slate-100 rounded-xl border border-slate-800/80 print:border-slate-200">
                    <span className="text-[10px] text-slate-400 print-text-muted block">Calorias Estimadas</span>
                    <strong className="text-base text-amber-400 print:text-amber-700">{exerciciosStats.totalCalorias} kcal</strong>
                  </div>
                </div>

                {/* Distribuição por modalidade */}
                <div className="p-3 bg-slate-900/60 print:bg-slate-100 rounded-xl border border-slate-800 print:border-slate-200 space-y-2">
                  <span className="text-[11px] font-bold text-slate-300 print-text-dark uppercase tracking-wider block">
                    Distribuição por Modalidade
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                    {exerciciosStats.modalidadesList.map((m) => (
                      <div key={m.tipo} className="p-2 bg-slate-950 print:bg-white rounded-lg border border-slate-800 print:border-slate-200">
                        <div className="flex justify-between items-center font-bold text-white print-text-dark text-xs">
                          <span>{m.tipo}</span>
                          <span className="text-emerald-400 print:text-emerald-700">{m.pct}%</span>
                        </div>
                        <div className="text-[10px] text-slate-400 print-text-muted flex justify-between mt-1">
                          <span>{m.count} treinos</span>
                          <span>{m.minutos} min</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tabela de Treinos Recentes */}
                <div className="overflow-x-auto">
                  <table className="print-table w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-900/60 print:bg-slate-100 text-slate-400 print-text-dark">
                        <th className="py-2 px-3 font-semibold">Data</th>
                        <th className="py-2 px-3 font-semibold">Tipo de Exercício</th>
                        <th className="py-2 px-3 font-semibold">Duração</th>
                        <th className="py-2 px-3 font-semibold">Intensidade</th>
                        <th className="py-2 px-3 font-semibold">Calorias</th>
                        <th className="py-2 px-3 font-semibold">Observações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50 print:divide-slate-200">
                      {filteredExercicios.slice(-6).reverse().map((ex) => (
                        <tr key={ex.id} className="hover:bg-slate-900/30">
                          <td className="py-2 px-3 font-mono text-slate-300 print-text-dark">
                            {formatDateBR(ex.data)}
                          </td>
                          <td className="py-2 px-3 font-bold text-white print-text-dark">
                            {ex.tipoExercicio}
                          </td>
                          <td className="py-2 px-3 font-mono text-slate-200 print-text-dark">
                            {ex.duracaoMinutos} min
                          </td>
                          <td className="py-2 px-3 text-slate-300 print-text-dark">
                            {ex.intensidade || "MODERADO"}
                          </td>
                          <td className="py-2 px-3 font-mono text-amber-400 print:text-amber-700">
                            {ex.caloriasQueimadas ? `${ex.caloriasQueimadas} kcal` : "-"}
                          </td>
                          <td className="py-2 px-3 text-slate-400 print-text-muted">
                            {ex.observacoes || "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 print-text-muted italic">
                Nenhum registro de exercício físico encontrado no período selecionado.
              </p>
            )}
          </div>

          {/* ========================================================= */}
          {/* SEÇÃO 5: CONSULTAS E HISTÓRICO MÉDICO */}
          {/* ========================================================= */}
          {(consultas.length > 0 || receitas.length > 0) && (
            <div className="print-card p-5 bg-slate-950/70 border border-slate-800 rounded-2xl space-y-4 print-section-break">
              <div className="flex items-center justify-between border-b border-slate-800 print:border-slate-300 pb-3">
                <h3 className="font-bold text-white print-text-dark text-sm uppercase tracking-wider flex items-center gap-2">
                  <Stethoscope className="w-4 h-4 text-emerald-400 print:text-emerald-700" />
                  5. Consultas & Medicamentos Registrados
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* Consultas */}
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-slate-300 print-text-dark uppercase tracking-wider flex items-center gap-1.5">
                    <Stethoscope className="w-3.5 h-3.5 text-emerald-400" />
                    Últimas Consultas Médicas
                  </span>
                  {consultas.length > 0 ? (
                    <div className="space-y-1.5">
                      {consultas.slice(0, 3).map((c) => (
                        <div key={c.Id} className="p-2.5 bg-slate-900 print:bg-slate-100 rounded-xl border border-slate-800 print:border-slate-200">
                          <div className="flex justify-between font-bold text-white print-text-dark">
                            <span>{c.Especialidade}</span>
                            <span className="text-slate-400 font-mono text-[10px]">{formatDateBR(c.Data)}</span>
                          </div>
                          <div className="text-[11px] text-slate-400 print-text-muted mt-0.5">
                            {c.Medico && `Dr(a). ${c.Medico}`} {c.Local && `• ${c.Local}`}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-500 italic">Nenhuma consulta cadastrada.</p>
                  )}
                </div>

                {/* Receitas / Medicamentos */}
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-slate-300 print-text-dark uppercase tracking-wider flex items-center gap-1.5">
                    <Pill className="w-3.5 h-3.5 text-rose-400" />
                    Receitas / Medicamentos
                  </span>
                  {receitas.length > 0 ? (
                    <div className="space-y-1.5">
                      {receitas.slice(0, 5).map((r) => (
                        <div key={r.Id} className="p-2.5 bg-slate-900 print:bg-slate-100 rounded-xl border border-slate-800 print:border-slate-200 flex items-center justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-center font-bold text-white print-text-dark">
                              <span className="truncate">{r.Medicamento}</span>
                              <span className="text-slate-400 font-mono text-[10px] shrink-0 ml-2">{formatDateBR(r.Data || r.Data_Emissão)}</span>
                            </div>
                            <div className="text-[11px] text-slate-400 print-text-muted mt-0.5 truncate">
                              {(r.Dosagem || r.Posologia) && `Dosagem: ${r.Dosagem || r.Posologia}`}
                              {(r.Médico || r.Medico) && ` • Médico: ${r.Médico || r.Medico}`}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => exportReceitaPDF(r)}
                            className="p-1.5 bg-slate-800 hover:bg-emerald-500/20 text-slate-300 hover:text-emerald-400 border border-slate-700 hover:border-emerald-500/40 rounded-lg transition-colors print:hidden shrink-0"
                            title="Baixar PDF da Receita"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-500 italic">Nenhum medicamento cadastrado.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Report Footer */}
          <div className="pt-6 border-t border-slate-800 print:border-slate-300 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 print-text-muted gap-2">
            <div>
              Sistema de Controle Pessoal • Módulo Integrado de Saúde & Atividades Físicas
            </div>
            <div>
              Documento gerado eletronicamente para acompanhamento clínico pessoal.
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
