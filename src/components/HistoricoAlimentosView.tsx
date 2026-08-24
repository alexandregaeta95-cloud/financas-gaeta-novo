import React, { useState, useMemo } from "react";
import {
  Utensils,
  Search,
  Calendar,
  Filter,
  Plus,
  Edit2,
  Trash2,
  Eye,
  Flame,
  Zap,
  Wheat,
  Droplets,
  Camera,
  Sparkles,
  ChevronRight,
  X,
  AlertCircle,
  Clock,
  FileText,
  CheckCircle2,
} from "lucide-react";
import { AlimentoAnaliseResult } from "../types";
import { formatDateBR } from "../utils/formatters";

interface Props {
  alimentos: AlimentoAnaliseResult[];
  onOpenAnalysisModal: () => void;
  onOpenRegistroRapidoModal?: () => void;
  onSelectAlimento: (alimento: AlimentoAnaliseResult) => void;
  onEditAlimento: (alimento: AlimentoAnaliseResult) => void;
  onDeleteAlimento: (id: string) => void;
}

export const HistoricoAlimentosView: React.FC<Props> = ({
  alimentos,
  onOpenAnalysisModal,
  onOpenRegistroRapidoModal,
  onSelectAlimento,
  onEditAlimento,
  onDeleteAlimento,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [periodoFilter, setPeriodoFilter] = useState<
    "todos" | "mes_atual" | "mes_passado" | "custom"
  >("todos");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [selectedAlimentoDetalhes, setSelectedAlimentoDetalhes] =
    useState<AlimentoAnaliseResult | null>(null);

  // Filter list
  const filteredList = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    return alimentos.filter((item) => {
      // 1. Search text filter
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchName = item.nomePrato?.toLowerCase().includes(query);
        const matchDesc = item.descricao?.toLowerCase().includes(query);
        const matchObs = item.observacoes?.toLowerCase().includes(query);
        const matchItems = item.itensIdentificados?.some((i) =>
          i.item.toLowerCase().includes(query)
        );
        if (!matchName && !matchDesc && !matchObs && !matchItems) return false;
      }

      // Extract date
      const itemDateStr = item.data || (item.dataHora ? item.dataHora.split(" ")[0]?.split("/").reverse().join("-") : "");
      if (!itemDateStr) return true;

      const itemDate = new Date(itemDateStr + "T00:00:00");
      if (isNaN(itemDate.getTime())) return true;

      // 2. Period Filter
      if (periodoFilter === "mes_atual") {
        return (
          itemDate.getFullYear() === currentYear &&
          itemDate.getMonth() === currentMonth
        );
      }

      if (periodoFilter === "mes_passado") {
        const prevMonthDate = new Date(currentYear, currentMonth - 1, 1);
        return (
          itemDate.getFullYear() === prevMonthDate.getFullYear() &&
          itemDate.getMonth() === prevMonthDate.getMonth()
        );
      }

      if (periodoFilter === "custom") {
        if (dataInicio && itemDateStr < dataInicio) return false;
        if (dataFim && itemDateStr > dataFim) return false;
      }

      return true;
    });
  }, [alimentos, searchTerm, periodoFilter, dataInicio, dataFim]);

  // Totals calculations
  const totalKcal = useMemo(
    () => filteredList.reduce((acc, curr) => acc + (curr.caloriasEstimadas || 0), 0),
    [filteredList]
  );
  const totalProteinas = useMemo(
    () => filteredList.reduce((acc, curr) => acc + (curr.proteinasEstimadas || 0), 0),
    [filteredList]
  );
  const mediaKcalPorRefeicao = filteredList.length > 0
    ? Math.round(totalKcal / filteredList.length)
    : 0;

  return (
    <div className="space-y-6">
      {/* Top Banner / Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-400 font-medium">
              Refeições Registradas
            </span>
            <p className="text-xl font-bold text-white mt-0.5">
              {filteredList.length}{" "}
              <span className="text-xs text-slate-500 font-normal">
                / {alimentos.length} total
              </span>
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Utensils className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-400 font-medium">
              Total Calorias Filtradas
            </span>
            <p className="text-xl font-bold text-amber-400 mt-0.5">
              {totalKcal.toLocaleString("pt-BR")}{" "}
              <span className="text-xs text-amber-500/80 font-normal">kcal</span>
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Flame className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-400 font-medium">
              Média por Refeição
            </span>
            <p className="text-xl font-bold text-teal-400 mt-0.5">
              {mediaKcalPorRefeicao.toLocaleString("pt-BR")}{" "}
              <span className="text-xs text-teal-500/80 font-normal">kcal / ref</span>
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
            <Zap className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Action Bar & Filters */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Buscar refeição, prato, ingrediente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-9 pr-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Action Buttons: Registro Rápido & Nova Análise com Foto */}
          <div className="flex items-center gap-2 shrink-0">
            {onOpenRegistroRapidoModal && (
              <button
                onClick={onOpenRegistroRapidoModal}
                className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-amber-500/40 text-slate-200 hover:text-white text-xs font-bold rounded-xl transition-all shadow-sm shrink-0"
                title="Registrar alimento ou lanche manualmente sem usar foto ou IA"
              >
                <Plus className="w-4 h-4 text-amber-400" />
                <span>Registro Rápido</span>
              </button>
            )}

            <button
              onClick={onOpenAnalysisModal}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-emerald-950/40 shrink-0"
            >
              <Camera className="w-4 h-4" />
              <span>Nova Análise com Foto</span>
              <span className="px-1.5 py-0.2 bg-emerald-400/20 text-emerald-200 text-[10px] rounded-md font-mono">
                IA
              </span>
            </button>
          </div>
        </div>

        {/* Period Filter Buttons */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/80">
          <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1 mr-1">
            <Filter className="w-3.5 h-3.5 text-slate-500" /> Período:
          </span>

          <button
            onClick={() => setPeriodoFilter("todos")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              periodoFilter === "todos"
                ? "bg-emerald-600 text-white"
                : "bg-slate-950 border border-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            Todos os Períodos
          </button>

          <button
            onClick={() => setPeriodoFilter("mes_atual")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              periodoFilter === "mes_atual"
                ? "bg-emerald-600 text-white"
                : "bg-slate-950 border border-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            Mês Atual
          </button>

          <button
            onClick={() => setPeriodoFilter("mes_passado")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              periodoFilter === "mes_passado"
                ? "bg-emerald-600 text-white"
                : "bg-slate-950 border border-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            Mês Passado
          </button>

          <button
            onClick={() => setPeriodoFilter("custom")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              periodoFilter === "custom"
                ? "bg-emerald-600 text-white"
                : "bg-slate-950 border border-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            Selecionar Período
          </button>

          {/* Date range inputs if custom */}
          {periodoFilter === "custom" && (
            <div className="flex items-center gap-2 mt-1 sm:mt-0">
              <input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
              <span className="text-slate-500 text-xs">até</span>
              <input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          )}
        </div>
      </div>

      {/* List of Analyzed Foods */}
      {filteredList.length === 0 ? (
        <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-3xl space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400">
            <Utensils className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-white">
              Nenhuma análise de alimento encontrada
            </h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              {searchTerm || periodoFilter !== "todos"
                ? "Nenhum resultado corresponde aos filtros selecionados. Tente ajustar a busca."
                : "Fotografe suas refeições para salvar o histórico com estimativa de calorias, proteínas e composição dos alimentos."}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2.5">
            {onOpenRegistroRapidoModal && (
              <button
                onClick={onOpenRegistroRapidoModal}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-amber-500/40 text-slate-200 hover:text-white text-xs font-bold rounded-xl transition-all shadow-md"
              >
                <Plus className="w-4 h-4 text-amber-400" />
                <span>+ Registro Rápido</span>
              </button>
            )}
            <button
              onClick={onOpenAnalysisModal}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-emerald-950/40"
            >
              <Camera className="w-4 h-4" />
              <span>Análise com Foto (IA)</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredList.map((item) => (
            <div
              key={item.id}
              className="bg-slate-900 border border-slate-800 hover:border-emerald-500/40 rounded-2xl p-4 transition-all duration-200 flex flex-col justify-between space-y-3 group"
            >
              {/* Card Header & Main Info */}
              <div className="flex items-start gap-3">
                {/* Photo Thumbnail */}
                {item.imagemPreview ? (
                  <div
                    onClick={() => setSelectedAlimentoDetalhes(item)}
                    className="w-16 h-16 rounded-xl overflow-hidden border border-slate-800 shrink-0 cursor-pointer relative group/thumb"
                  >
                    <img
                      src={item.imagemPreview}
                      alt={item.nomePrato}
                      className="w-full h-full object-cover transition-transform group-hover/thumb:scale-105"
                    />
                    <div className="absolute inset-0 bg-slate-950/30 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center text-white">
                      <Eye className="w-4 h-4" />
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => setSelectedAlimentoDetalhes(item)}
                    className="w-16 h-16 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-500 shrink-0 cursor-pointer"
                  >
                    <Utensils className="w-6 h-6" />
                  </div>
                )}

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h4
                      onClick={() => setSelectedAlimentoDetalhes(item)}
                      className="text-sm font-bold text-white truncate cursor-pointer hover:text-emerald-400 transition-colors"
                      title={item.nomePrato}
                    >
                      {item.nomePrato}
                    </h4>
                    <span className="text-[10px] text-slate-500 font-mono shrink-0">
                      {item.dataHora || (item.data ? formatDateBR(item.data) : "Hoje")}
                    </span>
                  </div>

                  {item.descricao && (
                    <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">
                      {item.descricao}
                    </p>
                  )}

                  {/* Nutrients Pills */}
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[11px] font-bold">
                      <Flame className="w-3 h-3 text-amber-400" />
                      {item.caloriasEstimadas || 0} kcal
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-[11px] font-bold">
                      <Zap className="w-3 h-3 text-emerald-400" />
                      {item.proteinasEstimadas || 0}g prot
                    </span>
                    {item.carboidratosEstimados !== undefined && item.carboidratosEstimados > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-500/10 text-sky-300 border border-sky-500/20 text-[11px] font-medium hidden sm:inline-flex">
                        <Wheat className="w-3 h-3 text-sky-400" />
                        {item.carboidratosEstimados}g carb
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Items composition pills preview */}
              {item.itensIdentificados && item.itensIdentificados.length > 0 && (
                <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] text-slate-500 font-medium">Itens:</span>
                  {item.itensIdentificados.slice(0, 3).map((it, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 bg-slate-950 border border-slate-800 rounded-md text-[10px] text-slate-300 truncate max-w-[120px]"
                    >
                      {it.item}
                    </span>
                  ))}
                  {item.itensIdentificados.length > 3 && (
                    <span className="text-[10px] text-slate-500">
                      +{item.itensIdentificados.length - 3} mais
                    </span>
                  )}
                </div>
              )}

              {/* Card Footer Actions */}
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
                <button
                  onClick={() => setSelectedAlimentoDetalhes(item)}
                  className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1 transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Ver Detalhes</span>
                </button>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onEditAlimento(item)}
                    className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                    title="Editar informações da refeição"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onDeleteAlimento(item.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors"
                    title="Excluir refeição do histórico"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Details View Modal */}
      {selectedAlimentoDetalhes && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-slate-900">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Utensils className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-white">
                    {selectedAlimentoDetalhes.nomePrato}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {selectedAlimentoDetalhes.dataHora || (selectedAlimentoDetalhes.data ? formatDateBR(selectedAlimentoDetalhes.data) : "Data não informada")}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedAlimentoDetalhes(null)}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs">
              {/* Photo */}
              {selectedAlimentoDetalhes.imagemPreview && (
                <div className="rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 max-h-56 flex items-center justify-center">
                  <img
                    src={selectedAlimentoDetalhes.imagemPreview}
                    alt={selectedAlimentoDetalhes.nomePrato}
                    className="w-full h-full object-contain max-h-56"
                  />
                </div>
              )}

              {/* Description */}
              {selectedAlimentoDetalhes.descricao && (
                <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl text-slate-300">
                  <p className="leading-relaxed">{selectedAlimentoDetalhes.descricao}</p>
                </div>
              )}

              {/* Nutrients Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-1">
                  <span className="text-[11px] text-amber-400 font-medium flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5" /> Calorias
                  </span>
                  <p className="text-base font-bold text-amber-300">
                    {selectedAlimentoDetalhes.caloriasEstimadas || 0} kcal
                  </p>
                </div>

                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-1">
                  <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5" /> Proteínas
                  </span>
                  <p className="text-base font-bold text-emerald-300">
                    {selectedAlimentoDetalhes.proteinasEstimadas || 0}g
                  </p>
                </div>

                <div className="p-3 bg-sky-500/10 border border-sky-500/20 rounded-xl space-y-1">
                  <span className="text-[11px] text-sky-400 font-medium flex items-center gap-1">
                    <Wheat className="w-3.5 h-3.5" /> Carbos
                  </span>
                  <p className="text-base font-bold text-sky-300">
                    {selectedAlimentoDetalhes.carboidratosEstimados || 0}g
                  </p>
                </div>

                <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl space-y-1">
                  <span className="text-[11px] text-purple-400 font-medium flex items-center gap-1">
                    <Droplets className="w-3.5 h-3.5" /> Gorduras
                  </span>
                  <p className="text-base font-bold text-purple-300">
                    {selectedAlimentoDetalhes.gordurasEstimadas || 0}g
                  </p>
                </div>
              </div>

              {/* Items Identified */}
              {selectedAlimentoDetalhes.itensIdentificados &&
                selectedAlimentoDetalhes.itensIdentificados.length > 0 && (
                  <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2">
                    <h5 className="font-bold text-slate-300 flex items-center gap-1.5">
                      <Utensils className="w-3.5 h-3.5 text-emerald-400" />
                      Itens e Porções
                    </h5>
                    <div className="divide-y divide-slate-800 text-xs">
                      {selectedAlimentoDetalhes.itensIdentificados.map((it, idx) => (
                        <div
                          key={idx}
                          className="py-1.5 flex items-center justify-between gap-2"
                        >
                          <div>
                            <span className="text-white font-medium">{it.item}</span>
                            {it.porcaoAproximada && (
                              <span className="text-slate-400 text-[11px] ml-1.5">
                                ({it.porcaoAproximada})
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2.5 text-[11px] font-mono">
                            {it.calorias !== undefined && (
                              <span className="text-amber-400">{it.calorias} kcal</span>
                            )}
                            {it.proteinas !== undefined && (
                              <span className="text-emerald-400">{it.proteinas}g</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {/* Dicas Nutricionais */}
              {selectedAlimentoDetalhes.dicasNutricionais && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-300 text-xs flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <p>{selectedAlimentoDetalhes.dicasNutricionais}</p>
                </div>
              )}

              {/* Observações */}
              {selectedAlimentoDetalhes.observacoes && (
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 text-xs space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">
                    Observações do Usuário:
                  </span>
                  <p>{selectedAlimentoDetalhes.observacoes}</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-4 border-t border-slate-800 bg-slate-900">
              <button
                onClick={() => {
                  const item = selectedAlimentoDetalhes;
                  setSelectedAlimentoDetalhes(null);
                  onEditAlimento(item);
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors flex items-center gap-1.5"
              >
                <Edit2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Editar Registro</span>
              </button>

              <button
                onClick={() => setSelectedAlimentoDetalhes(null)}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
