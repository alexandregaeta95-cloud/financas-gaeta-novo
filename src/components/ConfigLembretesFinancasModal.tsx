import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  Bell,
  Clock,
  TrendingDown,
  TrendingUp,
  Check,
  Save,
  AlertCircle,
  Loader2,
  Sparkles,
  Volume2,
  VolumeX,
} from "lucide-react";
import { LembreteFinancasConfig, Lancamento } from "../types";
import { formatarHora } from "../utils/formatters";
import { testAlarmSound } from "../services/alarmSoundService";

interface ConfigLembretesFinancasModalProps {
  isOpen: boolean;
  onClose: () => void;
  configs: LembreteFinancasConfig[];
  lancamentos?: Lancamento[];
  onSaveConfigs: (updatedConfigs: LembreteFinancasConfig[]) => Promise<void> | void;
}

export const ConfigLembretesFinancasModal: React.FC<ConfigLembretesFinancasModalProps> = ({
  isOpen,
  onClose,
  configs,
  lancamentos = [],
  onSaveConfigs,
}) => {
  // Estado Despesas
  const [despesasAtivo, setDespesasAtivo] = useState(true);
  const [despesasSom, setDespesasSom] = useState(true);
  const [despesasH1, setDespesasH1] = useState("08:30");
  const [despesasH2, setDespesasH2] = useState("13:30");
  const [despesasH3, setDespesasH3] = useState("20:00");

  // Estado Receitas
  const [receitasAtivo, setReceitasAtivo] = useState(true);
  const [receitasSom, setReceitasSom] = useState(true);
  const [receitasH1, setReceitasH1] = useState("09:00");
  const [receitasH2, setReceitasH2] = useState("18:00");
  const [receitasH3, setReceitasH3] = useState("");

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isTestingAudio, setIsTestingAudio] = useState(false);

  // Análise estatística de horários baseada no histórico de lançamentos e timestamps reais
  const suggestedTimes = useMemo(() => {
    const defaultSuggestions = {
      despesas: { h1: "08:30", h2: "13:30", h3: "20:00", count: 0, reason: "Horários padrão recomendados para sua rotina (Manhã, Almoço e Noite)." },
      receitas: { h1: "09:00", h2: "18:00", h3: "", count: 0, reason: "Início e fim de expediente comercial (09:00 e 18:00)." },
    };

    if (!lancamentos || lancamentos.length === 0) return defaultSuggestions;

    const extractHours = (items: Lancamento[]) => {
      const hoursList: number[] = [];
      items.forEach((l) => {
        // Tenta extrair hora de Data_Criacao, Data_Hora ou observações
        const dataHora = String(l.Data_Criacao || (l as any).Data_Hora || (l as any).data_criacao || "");
        const match = dataHora.match(/[T\s](\d{1,2}):(\d{2})/);
        if (match) {
          hoursList.push(parseInt(match[1], 10));
        } else if (l.Observacoes) {
          const matchObs = l.Observacoes.match(/(\d{1,2}):(\d{2})/);
          if (matchObs) hoursList.push(parseInt(matchObs[1], 10));
        }
      });
      return hoursList;
    };

    const despesasItems = lancamentos.filter((l) => {
      const tipo = String(l.Tipo || "").toUpperCase();
      return tipo.includes("DESPESA") || tipo.includes("ABASTECIMENTO");
    });
    const receitasItems = lancamentos.filter((l) => {
      const tipo = String(l.Tipo || "").toUpperCase();
      return tipo.includes("RECEITA");
    });

    const despesasHours = extractHours(despesasItems);
    const receitasHours = extractHours(receitasItems);

    let despH1 = "08:30";
    let despH2 = "13:30";
    let despH3 = "20:00";
    let despReason = "Horários padrão recomendados para sua rotina (Manhã, Almoço e Noite). Novos lançamentos agora registram timestamp automático.";

    if (despesasHours.length >= 3) {
      const manha = despesasHours.filter((h) => h >= 6 && h < 12);
      const tarde = despesasHours.filter((h) => h >= 12 && h < 18);
      const noite = despesasHours.filter((h) => h >= 18 || h < 6);

      if (manha.length > 0) {
        const avgManha = Math.round(manha.reduce((a, b) => a + b, 0) / manha.length);
        despH1 = `${String(avgManha).padStart(2, "0")}:00`;
      }
      if (tarde.length > 0) {
        const avgTarde = Math.round(tarde.reduce((a, b) => a + b, 0) / tarde.length);
        despH2 = `${String(avgTarde).padStart(2, "0")}:30`;
      }
      if (noite.length > 0) {
        const avgNoite = Math.round(noite.reduce((a, b) => a + b, 0) / noite.length);
        despH3 = `${String(avgNoite).padStart(2, "0")}:00`;
      }
      despReason = `Baseado em ${despesasHours.length} horários reais identificados nos seus lançamentos!`;
    }

    return {
      despesas: { h1: despH1, h2: despH2, h3: despH3, count: despesasItems.length, reason: despReason },
      receitas: { h1: "09:00", h2: "18:00", h3: "", count: receitasItems.length, reason: `Início e fim de expediente comercial (09:00 e 18:00).` },
    };
  }, [lancamentos]);

  // Carrega configurações existentes quando abrir
  useEffect(() => {
    if (configs && configs.length > 0) {
      const despesasCfg = configs.find(
        (c) =>
          c.Id === "LEMBRETE_DESPESAS" ||
          c.id === "LEMBRETE_DESPESAS" ||
          String(c.Tipo || c.tipo || "").toLowerCase().includes("despesa")
      );
      if (despesasCfg) {
        const rawAtivo = despesasCfg.Ativo ?? despesasCfg.ativo;
        const ativo =
          rawAtivo === "SIM" ||
          rawAtivo === "sim" ||
          rawAtivo === true ||
          rawAtivo === "TRUE" ||
          rawAtivo === "true" ||
          rawAtivo === 1 ||
          rawAtivo === "1";
        setDespesasAtivo(ativo);

        const rawSom = despesasCfg.Som_Alarme ?? despesasCfg.somAlarme;
        const som = rawSom !== "NAO" && rawSom !== "nao" && rawSom !== false;
        setDespesasSom(som);

        const h1 = formatarHora(despesasCfg.Horario_1 || despesasCfg.horario1 || "");
        const h2 = formatarHora(despesasCfg.Horario_2 || despesasCfg.horario2 || "");
        const h3 = formatarHora(despesasCfg.Horario_3 || despesasCfg.horario3 || "");
        if (h1) setDespesasH1(h1);
        if (h2) setDespesasH2(h2);
        if (h3) setDespesasH3(h3);
      }

      const receitasCfg = configs.find(
        (c) =>
          c.Id === "LEMBRETE_RECEITAS" ||
          c.id === "LEMBRETE_RECEITAS" ||
          String(c.Tipo || c.tipo || "").toLowerCase().includes("receita")
      );
      if (receitasCfg) {
        const rawAtivo = receitasCfg.Ativo ?? receitasCfg.ativo;
        const ativo =
          rawAtivo === "SIM" ||
          rawAtivo === "sim" ||
          rawAtivo === true ||
          rawAtivo === "TRUE" ||
          rawAtivo === "true" ||
          rawAtivo === 1 ||
          rawAtivo === "1";
        setReceitasAtivo(ativo);

        const rawSom = receitasCfg.Som_Alarme ?? receitasCfg.somAlarme;
        const som = rawSom !== "NAO" && rawSom !== "nao" && rawSom !== false;
        setReceitasSom(som);

        const h1 = formatarHora(receitasCfg.Horario_1 || receitasCfg.horario1 || "");
        const h2 = formatarHora(receitasCfg.Horario_2 || receitasCfg.horario2 || "");
        const h3 = formatarHora(receitasCfg.Horario_3 || receitasCfg.horario3 || "");
        if (h1) setReceitasH1(h1);
        if (h2) setReceitasH2(h2);
        if (h3 !== undefined) setReceitasH3(h3);
      }
    }
  }, [configs, isOpen]);

  const handleApplySuggestions = () => {
    setDespesasH1(suggestedTimes.despesas.h1);
    setDespesasH2(suggestedTimes.despesas.h2);
    setDespesasH3(suggestedTimes.despesas.h3);
    setReceitasH1(suggestedTimes.receitas.h1);
    setReceitasH2(suggestedTimes.receitas.h2);
  };

  const handleTestAudio = () => {
    setIsTestingAudio(true);
    testAlarmSound();
    setTimeout(() => {
      setIsTestingAudio(false);
    }, 4000);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setErrorMessage(null);
    setSaveSuccess(false);

    try {
      const nowStr = new Date().toLocaleString("pt-BR");

      const updatedDespesas: LembreteFinancasConfig = {
        Id: "LEMBRETE_DESPESAS",
        id: "LEMBRETE_DESPESAS",
        Tipo: "Despesas",
        tipo: "Despesas",
        Ativo: despesasAtivo ? "SIM" : "NAO",
        ativo: despesasAtivo ? "SIM" : "NAO",
        Som_Alarme: despesasSom ? "SIM" : "NAO",
        somAlarme: despesasSom ? "SIM" : "NAO",
        Horario_1: formatarHora(despesasH1),
        horario1: formatarHora(despesasH1),
        Horario_2: formatarHora(despesasH2),
        horario2: formatarHora(despesasH2),
        Horario_3: formatarHora(despesasH3),
        horario3: formatarHora(despesasH3),
        Dias_Semana: "TODOS",
        diasSemana: "TODOS",
        Ultima_Atualizacao: nowStr,
        ultimaAtualizacao: nowStr,
      };

      const updatedReceitas: LembreteFinancasConfig = {
        Id: "LEMBRETE_RECEITAS",
        id: "LEMBRETE_RECEITAS",
        Tipo: "Receitas",
        tipo: "Receitas",
        Ativo: receitasAtivo ? "SIM" : "NAO",
        ativo: receitasAtivo ? "SIM" : "NAO",
        Som_Alarme: receitasSom ? "SIM" : "NAO",
        somAlarme: receitasSom ? "SIM" : "NAO",
        Horario_1: formatarHora(receitasH1),
        horario1: formatarHora(receitasH1),
        Horario_2: formatarHora(receitasH2),
        horario2: formatarHora(receitasH2),
        Horario_3: formatarHora(receitasH3),
        horario3: formatarHora(receitasH3),
        Dias_Semana: "TODOS",
        diasSemana: "TODOS",
        Ultima_Atualizacao: nowStr,
        ultimaAtualizacao: nowStr,
      };

      await onSaveConfigs([updatedDespesas, updatedReceitas]);
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 1200);
    } catch (err: any) {
      console.error("Erro ao salvar configurações de lembretes financeiros:", err);
      setErrorMessage(err?.message || "Erro ao salvar configurações na planilha.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Lembretes de Finanças</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-800/60 rounded-full">
                  26_Config_Lembretes_Financas
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Horários diários com alarme sonoro para registrar seus gastos e receitas
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Card de Análise Inteligente do Histórico */}
          <div className="bg-gradient-to-r from-emerald-950/40 via-slate-900 to-emerald-950/40 border border-emerald-500/30 rounded-xl p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-emerald-300 uppercase tracking-wide">
                  Análise do Histórico (1_Lancamentos)
                </span>
              </div>
              <button
                type="button"
                onClick={handleApplySuggestions}
                className="px-3 py-1 bg-emerald-600/30 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/40 text-[11px] font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
              >
                <Sparkles className="w-3 h-3" />
                <span>Aplicar Sugestões</span>
              </button>
            </div>
            <p className="text-xs text-slate-300">
              {suggestedTimes.despesas.reason}
            </p>
            <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
              <div className="p-2 bg-slate-950/60 border border-slate-800 rounded-lg">
                <span className="text-[10px] text-slate-400 block font-semibold">Sugestão Despesas:</span>
                <span className="text-emerald-300 font-mono font-bold">
                  {suggestedTimes.despesas.h1}, {suggestedTimes.despesas.h2}, {suggestedTimes.despesas.h3}
                </span>
              </div>
              <div className="p-2 bg-slate-950/60 border border-slate-800 rounded-lg">
                <span className="text-[10px] text-slate-400 block font-semibold">Sugestão Receitas:</span>
                <span className="text-emerald-300 font-mono font-bold">
                  {suggestedTimes.receitas.h1}, {suggestedTimes.receitas.h2}
                </span>
              </div>
            </div>
          </div>

          {/* Teste de Alarme Sonoro Repetitivo */}
          <div className="flex items-center justify-between p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-lg">
                <Volume2 className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-200 block">Som do Alarme Repetitivo</span>
                <span className="text-[11px] text-slate-400">
                  O mesmo alarme sonoro contínuo das Zonas de Risco e Saúde
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleTestAudio}
              disabled={isTestingAudio}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-rose-300 border border-rose-500/30 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isTestingAudio ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Tocando...</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>🔊 Testar Som</span>
                </>
              )}
            </button>
          </div>

          {/* SEÇÃO 1: Lembrete de Despesas */}
          <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-lg">
                  <TrendingDown className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Lembretes de Despesas</h4>
                  <p className="text-[11px] text-slate-400">
                    Avisa para registrar despesas e abastecimentos do dia
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={despesasAtivo}
                  onChange={(e) => setDespesasAtivo(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-700 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            {despesasAtivo && (
              <div className="space-y-3 pt-2 border-t border-slate-700/40">
                {/* Switch de Som */}
                <div className="flex items-center justify-between text-xs text-slate-300 py-1">
                  <span className="flex items-center gap-1.5">
                    {despesasSom ? <Volume2 className="w-3.5 h-3.5 text-emerald-400" /> : <VolumeX className="w-3.5 h-3.5 text-slate-500" />}
                    <span>Tocar alarme sonoro repetitivo</span>
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={despesasSom}
                      onChange={(e) => setDespesasSom(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-8 h-4 bg-slate-700 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-500"></div>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-emerald-400" />
                      <span>1º Horário (Manhã)</span>
                    </label>
                    <input
                      type="time"
                      value={despesasH1}
                      onChange={(e) => setDespesasH1(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs font-mono focus:border-emerald-500 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-emerald-400" />
                      <span>2º Horário (Almoço)</span>
                    </label>
                    <input
                      type="time"
                      value={despesasH2}
                      onChange={(e) => setDespesasH2(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs font-mono focus:border-emerald-500 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-emerald-400" />
                      <span>3º Horário (Noite)</span>
                    </label>
                    <input
                      type="time"
                      value={despesasH3}
                      onChange={(e) => setDespesasH3(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs font-mono focus:border-emerald-500 focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* SEÇÃO 2: Lembrete de Receitas */}
          <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Lembretes de Receitas</h4>
                  <p className="text-[11px] text-slate-400">
                    Avisa para registrar entradas de pagamentos, salários ou Pix
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={receitasAtivo}
                  onChange={(e) => setReceitasAtivo(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-700 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            {receitasAtivo && (
              <div className="space-y-3 pt-2 border-t border-slate-700/40">
                {/* Switch de Som */}
                <div className="flex items-center justify-between text-xs text-slate-300 py-1">
                  <span className="flex items-center gap-1.5">
                    {receitasSom ? <Volume2 className="w-3.5 h-3.5 text-emerald-400" /> : <VolumeX className="w-3.5 h-3.5 text-slate-500" />}
                    <span>Tocar alarme sonoro repetitivo</span>
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={receitasSom}
                      onChange={(e) => setReceitasSom(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-8 h-4 bg-slate-700 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-500"></div>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-emerald-400" />
                      <span>1º Horário (Manhã)</span>
                    </label>
                    <input
                      type="time"
                      value={receitasH1}
                      onChange={(e) => setReceitasH1(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs font-mono focus:border-emerald-500 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-emerald-400" />
                      <span>2º Horário (Tarde)</span>
                    </label>
                    <input
                      type="time"
                      value={receitasH2}
                      onChange={(e) => setReceitasH2(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs font-mono focus:border-emerald-500 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-emerald-400" />
                      <span>3º Horário (Opcional)</span>
                    </label>
                    <input
                      type="time"
                      value={receitasH3}
                      onChange={(e) => setReceitasH3(e.target.value)}
                      placeholder="--:--"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs font-mono focus:border-emerald-500 focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {errorMessage && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center gap-2 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {saveSuccess && (
            <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-2 text-emerald-300 text-xs">
              <Check className="w-4 h-4 shrink-0" />
              <span>Configurações salvas e sincronizadas na planilha com sucesso!</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-2 shadow-lg shadow-emerald-950 disabled:opacity-50 cursor-pointer"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Salvando...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Salvar Horários</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
