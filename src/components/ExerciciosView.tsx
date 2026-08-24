import React, { useState, useMemo } from "react";
import {
  Dumbbell,
  Plus,
  Search,
  Calendar,
  Clock,
  Flame,
  Activity,
  Trash2,
  Edit2,
  TrendingUp,
  Award,
  Zap,
  Filter,
  CheckCircle2,
  CalendarDays,
  Timer,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";
import { ExercicioRegistro } from "../types";

interface Props {
  exercicios: ExercicioRegistro[];
  onOpenRegistroModal: () => void;
  onEditExercicio: (item: ExercicioRegistro) => void;
  onDeleteExercicio: (id: string) => void;
}

type PeriodFilter = "tudo" | "semana" | "mes" | "mes_anterior" | "custom";

export const ExerciciosView: React.FC<Props> = ({
  exercicios,
  onOpenRegistroModal,
  onEditExercicio,
  onDeleteExercicio,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("mes");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Helper de badge/cor por tipo de treino
  const getTipoBadgeInfo = (tipo: string) => {
    const t = tipo.toUpperCase();
    if (t.includes("MUSCULA")) {
      return {
        bg: "bg-indigo-500/10 text-indigo-300 border-indigo-500/20",
        icon: "🏋️",
        accent: "text-indigo-400",
      };
    }
    if (t.includes("CORRIDA")) {
      return {
        bg: "bg-amber-500/10 text-amber-300 border-amber-500/20",
        icon: "🏃",
        accent: "text-amber-400",
      };
    }
    if (t.includes("CAMINHA")) {
      return {
        bg: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
        icon: "🚶",
        accent: "text-emerald-400",
      };
    }
    if (t.includes("CICLISMO") || t.includes("BICICLETA") || t.includes("BIKE")) {
      return {
        bg: "bg-cyan-500/10 text-cyan-300 border-cyan-500/20",
        icon: "🚴",
        accent: "text-cyan-400",
      };
    }
    if (t.includes("NATA")) {
      return {
        bg: "bg-blue-500/10 text-blue-300 border-blue-500/20",
        icon: "🏊",
        accent: "text-blue-400",
      };
    }
    if (t.includes("FUNCIONAL") || t.includes("CROSSFIT")) {
      return {
        bg: "bg-rose-500/10 text-rose-300 border-rose-500/20",
        icon: "⚡",
        accent: "text-rose-400",
      };
    }
    if (t.includes("PILATES") || t.includes("ALONGA") || t.includes("YOGA")) {
      return {
        bg: "bg-teal-500/10 text-teal-300 border-teal-500/20",
        icon: "🧘",
        accent: "text-teal-400",
      };
    }
    if (t.includes("FUTEBOL") || t.includes("FUT")) {
      return {
        bg: "bg-lime-500/10 text-lime-300 border-lime-500/20",
        icon: "⚽",
        accent: "text-lime-400",
      };
    }
    return {
      bg: "bg-slate-500/10 text-slate-300 border-slate-500/20",
      icon: "🎯",
      accent: "text-slate-400",
    };
  };

  // Cálculo de Streak (Dias Seguidos Treinando)
  const streakInfo = useMemo(() => {
    if (!exercicios.length) return { currentStreak: 0, trainedToday: false };

    // Obter datas únicas formatadas YYYY-MM-DD
    const uniqueDates = new Set<string>();
    exercicios.forEach((item) => {
      if (item.data) {
        uniqueDates.add(item.data);
      }
    });

    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`;

    const trainedToday = uniqueDates.has(todayStr);
    const trainedYesterday = uniqueDates.has(yesterdayStr);

    if (!trainedToday && !trainedYesterday) {
      return { currentStreak: 0, trainedToday: false };
    }

    let streak = 0;
    let checkDate = trainedToday ? new Date(now) : new Date(yesterday);

    while (true) {
      const y = checkDate.getFullYear();
      const m = String(checkDate.getMonth() + 1).padStart(2, "0");
      const d = String(checkDate.getDate()).padStart(2, "0");
      const dateStr = `${y}-${m}-${d}`;

      if (uniqueDates.has(dateStr)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    return { currentStreak: streak, trainedToday };
  }, [exercicios]);

  // Cálculo de Treinos Nesta Semana
  const treinosSemanaCount = useMemo(() => {
    const now = new Date();
    const currentDayOfWeek = now.getDay(); // 0 = Domingo, 1 = Segunda...
    // Início da semana (Segunda-feira)
    const startOfWeek = new Date(now);
    const diff = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;
    startOfWeek.setDate(now.getDate() + diff);
    startOfWeek.setHours(0, 0, 0, 0);

    const weekDates = new Set<string>();
    exercicios.forEach((item) => {
      if (!item.data) return;
      const [y, m, d] = item.data.split("-").map(Number);
      if (y && m && d) {
        const itemDate = new Date(y, m - 1, d);
        if (itemDate >= startOfWeek && itemDate <= now) {
          weekDates.add(item.data);
        }
      }
    });

    return weekDates.size;
  }, [exercicios]);

  // Filtragem dos Exercícios por período e busca
  const filteredExercicios = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-indexed

    return exercicios.filter((item) => {
      // Filtro de Texto
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchTipo = item.tipoExercicio.toLowerCase().includes(term);
        const matchObs = (item.observacoes || "").toLowerCase().includes(term);
        const matchData = (item.data || "").includes(term);
        if (!matchTipo && !matchObs && !matchData) return false;
      }

      if (!item.data) return true;
      const [y, m, d] = item.data.split("-").map(Number);
      if (!y || !m || !d) return true;
      const itemDate = new Date(y, m - 1, d);

      // Filtro de Período
      if (periodFilter === "semana") {
        const currentDayOfWeek = now.getDay();
        const diff = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() + diff);
        startOfWeek.setHours(0, 0, 0, 0);
        return itemDate >= startOfWeek;
      }

      if (periodFilter === "mes") {
        return y === currentYear && m - 1 === currentMonth;
      }

      if (periodFilter === "mes_anterior") {
        const prevMonthDate = new Date(currentYear, currentMonth - 1, 1);
        return (
          y === prevMonthDate.getFullYear() &&
          m - 1 === prevMonthDate.getMonth()
        );
      }

      if (periodFilter === "custom") {
        if (customStartDate) {
          const [sy, sm, sd] = customStartDate.split("-").map(Number);
          const sDate = new Date(sy, sm - 1, sd);
          if (itemDate < sDate) return false;
        }
        if (customEndDate) {
          const [ey, em, ed] = customEndDate.split("-").map(Number);
          const eDate = new Date(ey, em - 1, ed, 23, 59, 59);
          if (itemDate > eDate) return false;
        }
      }

      return true;
    }).sort((a, b) => {
      // Ordenação mais recente primeiro
      const dateA = a.data ? `${a.data} ${a.hora || "00:00"}` : "";
      const dateB = b.data ? `${b.data} ${b.hora || "00:00"}` : "";
      return dateB.localeCompare(dateA);
    });
  }, [exercicios, searchTerm, periodFilter, customStartDate, customEndDate]);

  // Estatísticas do Período Filtrado
  const stats = useMemo(() => {
    const totalMinutos = filteredExercicios.reduce(
      (acc, curr) => acc + (curr.duracaoMinutos || 0),
      0
    );
    const totalCalorias = filteredExercicios.reduce(
      (acc, curr) => acc + (curr.caloriasQueimadas || 0),
      0
    );
    const mediaMinutos =
      filteredExercicios.length > 0
        ? Math.round(totalMinutos / filteredExercicios.length)
        : 0;

    const horas = Math.floor(totalMinutos / 60);
    const minutosRestantes = totalMinutos % 60;
    const tempoFormatado =
      horas > 0
        ? `${horas}h ${minutosRestantes > 0 ? `${minutosRestantes}m` : ""}`
        : `${minutosRestantes}m`;

    return {
      totalTreinos: filteredExercicios.length,
      totalMinutos,
      tempoFormatado,
      totalCalorias,
      mediaMinutos,
    };
  }, [filteredExercicios]);

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return "-";
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  return (
    <div className="space-y-6">
      {/* 1. Header com Resumo & Gamificação (Streak + Semana) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        {/* Streak de Treinos */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between shadow-lg relative overflow-hidden group hover:border-amber-500/30 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Sequência Atual
            </span>
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm ${
                streakInfo.currentStreak > 0
                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow-md shadow-amber-950/40"
                  : "bg-slate-800 text-slate-500"
              }`}
            >
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {streakInfo.currentStreak}
              </span>
              <span className="text-xs text-amber-400 font-bold">
                {streakInfo.currentStreak === 1 ? "dia" : "dias seguidos"}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {streakInfo.trainedToday
                ? "🔥 Treino de hoje concluído!"
                : "Treine hoje para manter o fogo aceso!"}
            </p>
          </div>
        </div>

        {/* Treinos na Semana */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between shadow-lg relative overflow-hidden hover:border-emerald-500/30 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Nesta Semana
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <CalendarDays className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {treinosSemanaCount}
              </span>
              <span className="text-xs text-emerald-400 font-bold">dias de 7</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {treinosSemanaCount >= 4
                ? "Meta semanal excelente!"
                : "Constância é o segredo do resultado"}
            </p>
          </div>
        </div>

        {/* Tempo Total no Período */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between shadow-lg relative overflow-hidden hover:border-teal-500/30 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Tempo Total
            </span>
            <div className="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30 flex items-center justify-center">
              <Timer className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {stats.tempoFormatado}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {stats.totalTreinos} {stats.totalTreinos === 1 ? "sessão" : "sessões"} no período
            </p>
          </div>
        </div>

        {/* Média por Sessão */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between shadow-lg relative overflow-hidden hover:border-indigo-500/30 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Média / Sessão
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {stats.mediaMinutos}
              </span>
              <span className="text-xs text-indigo-300 font-bold">min/treino</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {stats.totalCalorias > 0
                ? `${stats.totalCalorias} kcal gastas`
                : "Ritmo consistente"}
            </p>
          </div>
        </div>
      </div>

      {/* 2. Barra de Ações, Busca e Filtros de Período */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3.5 shadow-lg">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Pesquisar por exercício, data ou observação..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>

          {/* Action Button: Registrar Treino */}
          <button
            onClick={onOpenRegistroModal}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-emerald-950/40 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Registrar Treino</span>
          </button>
        </div>

        {/* Period Filter Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-800/80">
          <span className="text-[11px] font-medium text-slate-400 mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3 text-slate-500" /> Período:
          </span>
          <button
            onClick={() => setPeriodFilter("mes")}
            className={`px-3 py-1 text-xs rounded-lg font-medium transition-all ${
              periodFilter === "mes"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                : "bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200"
            }`}
          >
            Este Mês
          </button>
          <button
            onClick={() => setPeriodFilter("semana")}
            className={`px-3 py-1 text-xs rounded-lg font-medium transition-all ${
              periodFilter === "semana"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                : "bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200"
            }`}
          >
            Esta Semana
          </button>
          <button
            onClick={() => setPeriodFilter("mes_anterior")}
            className={`px-3 py-1 text-xs rounded-lg font-medium transition-all ${
              periodFilter === "mes_anterior"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                : "bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200"
            }`}
          >
            Mês Anterior
          </button>
          <button
            onClick={() => setPeriodFilter("tudo")}
            className={`px-3 py-1 text-xs rounded-lg font-medium transition-all ${
              periodFilter === "tudo"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                : "bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200"
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setPeriodFilter("custom")}
            className={`px-3 py-1 text-xs rounded-lg font-medium transition-all ${
              periodFilter === "custom"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                : "bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200"
            }`}
          >
            Personalizado
          </button>

          {/* Custom Date Pickers */}
          {periodFilter === "custom" && (
            <div className="flex items-center gap-1.5 w-full sm:w-auto mt-2 sm:mt-0 sm:ml-auto">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
              <span className="text-slate-500 text-xs">até</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          )}
        </div>
      </div>

      {/* 3. Listagem de Treinos */}
      {filteredExercicios.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 border-dashed rounded-3xl p-10 text-center flex flex-col items-center justify-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Dumbbell className="w-7 h-7" />
          </div>
          <div>
            <h4 className="text-base font-bold text-white">Nenhum treino encontrado</h4>
            <p className="text-xs text-slate-400 max-w-sm mt-1">
              {searchTerm
                ? "Nenhum resultado corresponde à sua pesquisa."
                : "Você ainda não registrou nenhum treino no período selecionado. Clique abaixo para registrar o primeiro!"}
            </p>
          </div>
          <button
            onClick={onOpenRegistroModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-emerald-950/40"
          >
            <Plus className="w-4 h-4" />
            <span>Registrar Primeiro Treino</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredExercicios.map((item) => {
            const badgeInfo = getTipoBadgeInfo(item.tipoExercicio);
            return (
              <div
                key={item.id}
                className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 transition-all duration-150 flex flex-col justify-between group shadow-sm hover:shadow-md"
              >
                <div>
                  {/* Top Bar: Tipo & Actions */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2.5 py-1 rounded-xl text-xs font-bold border flex items-center gap-1.5 ${badgeInfo.bg}`}
                      >
                        <span>{badgeInfo.icon}</span>
                        <span className="tracking-wide">{item.tipoExercicio}</span>
                      </span>

                      {item.intensidade && (
                        <span
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold border ${
                            item.intensidade === "INTENSO"
                              ? "bg-rose-500/10 text-rose-300 border-rose-500/20"
                              : item.intensidade === "MODERADO"
                              ? "bg-amber-500/10 text-amber-300 border-amber-500/20"
                              : "bg-teal-500/10 text-teal-300 border-teal-500/20"
                          }`}
                        >
                          {item.intensidade}
                        </span>
                      )}
                    </div>

                    {/* Edit & Delete Action Buttons */}
                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => onEditExercicio(item)}
                        className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition-colors"
                        title="Editar treino"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(item.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                        title="Excluir treino"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Metrics Bar: Duração, Calorias e Horário */}
                  <div className="flex flex-wrap items-center gap-3 mt-3 pt-2.5 border-t border-slate-800/60">
                    <div className="flex items-center gap-1.5 text-xs text-white font-bold bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                      <Clock className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{item.duracaoMinutos} min</span>
                    </div>

                    {item.caloriasQueimadas && item.caloriasQueimadas > 0 && (
                      <div className="flex items-center gap-1.5 text-xs text-amber-300 font-semibold bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                        <Flame className="w-3.5 h-3.5 text-amber-400" />
                        <span>{item.caloriasQueimadas} kcal</span>
                      </div>
                    )}

                    <div className="flex items-center gap-1.5 text-xs text-slate-400 ml-auto">
                      <Calendar className="w-3 h-3 text-slate-500" />
                      <span>{formatDateDisplay(item.data)}</span>
                      {item.hora && (
                        <span className="text-slate-500 font-mono text-[11px]">
                          às {item.hora}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Observações / Contexto */}
                  {item.observacoes && (
                    <div className="mt-2.5 p-2 bg-slate-950/60 border border-slate-800/80 rounded-xl text-xs text-slate-300 font-sans leading-relaxed">
                      {item.observacoes}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation Modal for Deletion */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Excluir Treino</h4>
                <p className="text-xs text-slate-400">
                  Tem certeza que deseja excluir este registro de treino?
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  onDeleteExercicio(deleteConfirmId);
                  setDeleteConfirmId(null);
                }}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl transition-colors shadow-md shadow-rose-950"
              >
                Confirmar Exclusão
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
