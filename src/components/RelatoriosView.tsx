import React, { useState, useMemo } from "react";
import {
  FileText,
  Printer,
  Download,
  Target,
  HeartPulse,
  Pill,
  Search,
  ArrowRight,
  CheckCircle2,
  Calendar,
  Layers,
  Activity,
  FileCheck2,
  Sparkles,
} from "lucide-react";
import {
  MetaCategoria,
  Lancamento,
  RegistroSaude,
  ExercicioRegistro,
  LembreteSaudeConfig,
  ConsultaMedica,
  ReceitaMedica,
  ConsumoCafe,
  ConsumoAgua,
  ConfigAgua,
} from "../types";
import { MetasRelatorioModal } from "./MetasRelatorioModal";
import { SaudeRelatorioModal } from "./SaudeRelatorioModal";
import { exportReceitaPDF } from "../utils/receitaPdf";

interface Props {
  metas: MetaCategoria[];
  lancamentos: Lancamento[];
  registrosSaude: RegistroSaude[];
  exercicios: ExercicioRegistro[];
  consumosCafe?: ConsumoCafe[];
  consumosAgua?: ConsumoAgua[];
  configAgua?: ConfigAgua;
  alturaUsuario?: number;
  lembretesConfigs?: LembreteSaudeConfig[];
  consultas?: ConsultaMedica[];
  receitas?: ReceitaMedica[];
}

type CategoriaRelatorio = "TODOS" | "FINANCAS" | "SAUDE";

interface RelatorioCardItem {
  id: string;
  titulo: string;
  subtitulo: string;
  categoria: "FINANCAS" | "SAUDE";
  categoriaLabel: string;
  tag: string;
  tagColor: string;
  icon: React.FC<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  descricao: string;
  destaques: string[];
  actionLabel: string;
  onClick: () => void;
}

export const RelatoriosView: React.FC<Props> = ({
  metas = [],
  lancamentos = [],
  registrosSaude = [],
  exercicios = [],
  consumosCafe = [],
  consumosAgua = [],
  configAgua,
  alturaUsuario,
  lembretesConfigs = [],
  consultas = [],
  receitas = [],
}) => {
  const [activeCategory, setActiveCategory] = useState<CategoriaRelatorio>("TODOS");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modais dos Relatórios
  const [isMetasReportOpen, setIsMetasReportOpen] = useState(false);
  const [isSaudeReportOpen, setIsSaudeReportOpen] = useState(false);

  // Geração do relatório consolidado de receitas
  const handleExportTodasReceitas = () => {
    if (!receitas || receitas.length === 0) {
      alert("Nenhuma receita médica cadastrada para gerar o relatório.");
      return;
    }
    // Exporta a lista de receitas médicas diretamente
    exportReceitaPDF(receitas);
  };

  const relatorios: RelatorioCardItem[] = useMemo(
    () => [
      {
        id: "relatorio_metas",
        titulo: "Relatório de Metas & Orçamento (PDF)",
        subtitulo: "Análise de tetos, consumo mensal e comparativos",
        categoria: "FINANCAS",
        categoriaLabel: "Finanças & Metas",
        tag: "PDF / Impressão",
        tagColor: "bg-purple-500/20 text-purple-300 border-purple-500/30",
        icon: Target,
        iconBg: "bg-purple-500/10",
        iconColor: "text-purple-400",
        descricao:
          "Documento completo com demonstrativo de teto orçamentário por categoria, despesas executadas, percentual consumido, saldo restante e comparativo com anos e meses anteriores.",
        destaques: [
          "Tabela analítica com limites e valores realizados",
          "Percentual de consumo com alertas visuais",
          "Layout pronto para impressão e exportação em PDF",
        ],
        actionLabel: "Abrir Relatório de Metas",
        onClick: () => setIsMetasReportOpen(true),
      },
      {
        id: "relatorio_saude",
        titulo: "Relatório Consolidado de Saúde (PDF)",
        subtitulo: "Pressão, glicemia, peso/IMC, treinos e prescrições",
        categoria: "SAUDE",
        categoriaLabel: "Saúde & Biometria",
        tag: "Clínico / PDF",
        tagColor: "bg-rose-500/20 text-rose-300 border-rose-500/30",
        icon: HeartPulse,
        iconBg: "bg-rose-500/10",
        iconColor: "text-rose-400",
        descricao:
          "Relatório médico estruturado contendo histórico de medições de pressão arterial (sistólica/diastólica/pulso), curva de glicemia, índice de massa corporal (IMC), atividades físicas e consultas.",
        destaques: [
          "Quadro completo de biometria para levar a consultas",
          "Histórico de treinos e calorias gastas",
          "Filtro temporal personalizável (30 dias a 1 ano)",
        ],
        actionLabel: "Abrir Relatório de Saúde",
        onClick: () => setIsSaudeReportOpen(true),
      },
      {
        id: "relatorio_receitas",
        titulo: "Receituário Médico Oficial (PDF)",
        subtitulo: "Exportação de prescrições e posologias ativas",
        categoria: "SAUDE",
        categoriaLabel: "Saúde & Medicamentos",
        tag: "Documento Oficial",
        tagColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
        icon: Pill,
        iconBg: "bg-emerald-500/10",
        iconColor: "text-emerald-400",
        descricao:
          "Documento em padrão de receituário médico oficial com lista detalhada de remédios em uso, horários de administração, dosagem prescrita e orientações do médico responsável.",
        destaques: [
          "Formatação de receituário médico padrão",
          "Listagem de todos os medicamentos ativos e posologias",
          "Download direto em formato PDF",
        ],
        actionLabel: "Gerar Receituário PDF",
        onClick: handleExportTodasReceitas,
      },
    ],
    [receitas]
  );

  const filteredRelatorios = useMemo(() => {
    return relatorios.filter((rel) => {
      if (activeCategory !== "TODOS" && rel.categoria !== activeCategory) {
        return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchTitulo = rel.titulo.toLowerCase().includes(query);
        const matchSubtitulo = rel.subtitulo.toLowerCase().includes(query);
        const matchDesc = rel.descricao.toLowerCase().includes(query);
        const matchTag = rel.tag.toLowerCase().includes(query);
        const matchDestaques = rel.destaques.some((d) => d.toLowerCase().includes(query));

        if (!matchTitulo && !matchSubtitulo && !matchDesc && !matchTag && !matchDestaques) {
          return false;
        }
      }
      return true;
    });
  }, [relatorios, activeCategory, searchQuery]);

  return (
    <div className="space-y-6 pb-12 animate-in fade-in-50 duration-200">
      {/* Header Central de Relatórios */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-xl relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 bg-gradient-to-tr from-purple-600 to-indigo-600 text-white rounded-2xl shadow-lg">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Central de Relatórios & PDFs
                </h1>
                <p className="text-xs sm:text-sm text-slate-400">
                  Gere, visualize e imprima demonstrativos oficiais consolidados do sistema
                </p>
              </div>
            </div>
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar relatório ou documento..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Category Tabs Filter */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 flex items-center gap-2 overflow-x-auto pb-1">
          <span className="text-xs font-semibold text-slate-400 mr-1 flex items-center gap-1">
            <Layers className="w-3.5 h-3.5" /> Categorias:
          </span>
          {[
            { id: "TODOS", label: "Todos os Relatórios" },
            { id: "FINANCAS", label: "💰 Finanças & Orçamento" },
            { id: "SAUDE", label: "🩺 Saúde & Médico" },
          ].map((cat) => {
            const active = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id as CategoriaRelatorio)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  active
                    ? "bg-purple-600 text-white shadow-md shadow-purple-950/40"
                    : "bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid de Relatórios */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredRelatorios.map((rel) => {
          const Icon = rel.icon;

          return (
            <div
              key={rel.id}
              onClick={rel.onClick}
              className="group p-5 rounded-3xl bg-slate-900 border border-slate-800 hover:border-purple-500/50 hover:bg-slate-900/90 transition-all duration-200 shadow-lg hover:shadow-xl flex flex-col justify-between cursor-pointer relative overflow-hidden"
            >
              <div className="space-y-3">
                {/* Top Row: Icon + Tag */}
                <div className="flex items-center justify-between">
                  <div
                    className={`p-2.5 rounded-2xl ${rel.iconBg} ${rel.iconColor} transition-transform group-hover:scale-105`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${rel.tagColor}`}
                  >
                    {rel.tag}
                  </span>
                </div>

                {/* Title & Subtitle */}
                <div>
                  <h3 className="text-sm font-bold text-white group-hover:text-purple-400 transition-colors">
                    {rel.titulo}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                    {rel.subtitulo}
                  </p>
                </div>

                {/* Description */}
                <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">
                  {rel.descricao}
                </p>

                {/* Highlights */}
                <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
                  {rel.destaques.map((d, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-[11px] text-slate-300">
                      <CheckCircle2 className="w-3 h-3 text-purple-400 shrink-0" />
                      <span className="truncate">{d}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Button at bottom */}
              <div className="mt-5 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  {rel.categoriaLabel}
                </span>
                <div className="flex items-center gap-1.5 text-purple-400 font-bold group-hover:translate-x-1 transition-transform">
                  <Printer className="w-3.5 h-3.5" />
                  <span>{rel.actionLabel}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredRelatorios.length === 0 && (
        <div className="p-12 text-center bg-slate-900 rounded-3xl border border-slate-800 text-slate-500 text-xs space-y-2">
          <p>Nenhum relatório encontrado para o filtro selecionado.</p>
          <button
            onClick={() => {
              setActiveCategory("TODOS");
              setSearchQuery("");
            }}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-semibold cursor-pointer"
          >
            Limpar Filtros
          </button>
        </div>
      )}

      {/* Modal Relatório de Metas */}
      {isMetasReportOpen && (
        <MetasRelatorioModal
          isOpen={isMetasReportOpen}
          onClose={() => setIsMetasReportOpen(false)}
          metas={metas}
          lancamentos={lancamentos}
        />
      )}

      {/* Modal Relatório de Saúde */}
      {isSaudeReportOpen && (
        <SaudeRelatorioModal
          isOpen={isSaudeReportOpen}
          onClose={() => setIsSaudeReportOpen(false)}
          registrosSaude={registrosSaude}
          exercicios={exercicios}
          consumosCafe={consumosCafe}
          consumosAgua={consumosAgua}
          configAgua={configAgua}
          alturaUsuario={alturaUsuario}
          lembretesConfigs={lembretesConfigs}
          consultas={consultas}
          receitas={receitas}
        />
      )}
    </div>
  );
};
