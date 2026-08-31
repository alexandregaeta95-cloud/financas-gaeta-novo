import React, { useState, useMemo } from "react";
import {
  TrendingUp,
  Fuel,
  Car,
  ShieldAlert,
  LayoutDashboard,
  Clock,
  Target,
  CreditCard,
  HeartPulse,
  Activity,
  ShoppingBag,
  ArrowRight,
  Sparkles,
  Search,
  CheckCircle2,
  BarChart3,
  Compass,
} from "lucide-react";
import { ModuleView } from "./Navigation";
import { Lancamento } from "../types";
import { parseCurrency, formatCurrency } from "../utils/formatters";

interface Props {
  onNavigate: (view: ModuleView) => void;
  lancamentos?: Lancamento[];
}

type CategoriaIndicador = "TODOS" | "MOBILIDADE" | "FINANCAS" | "SAUDE";

interface IndicadorItem {
  id: string;
  titulo: string;
  subtitulo: string;
  categoria: "MOBILIDADE" | "FINANCAS" | "SAUDE";
  categoriaLabel: string;
  tag: string;
  tagColor: string;
  icon: React.FC<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  targetView: ModuleView;
  descricao: string;
  destaques: string[];
}

export const IndicadoresView: React.FC<Props> = ({ onNavigate, lancamentos = [] }) => {
  const [activeCategory, setActiveCategory] = useState<CategoriaIndicador>("TODOS");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Cálculo de dados rápidos para os cards (se disponíveis)
  const quickStats = useMemo(() => {
    let totalCorridas = 0;
    let countUber99 = 0;

    lancamentos.forEach((l) => {
      const cat = String(l.Categoria || "").toUpperCase();
      const desc = String(l.Descricao || "").toUpperCase();
      if (
        cat === "UBER" ||
        cat === "99" ||
        desc.includes("UBER") ||
        desc.includes("99")
      ) {
        totalCorridas += parseCurrency(l.Valor);
        countUber99++;
      }
    });

    return {
      totalCorridas,
      countUber99,
    };
  }, [lancamentos]);

  const indicadores: IndicadorItem[] = useMemo(
    () => [
      {
        id: "melhores_dias_horarios",
        titulo: "Melhores Dias e Horários (Uber & 99)",
        subtitulo: "Análise de rentabilidade e picos de demanda",
        categoria: "MOBILIDADE",
        categoriaLabel: "Mobilidade & App",
        tag: "Alta Rentabilidade",
        tagColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
        icon: TrendingUp,
        iconBg: "bg-emerald-500/10",
        iconColor: "text-emerald-400",
        targetView: "analise_corridas",
        descricao:
          "Comparativo detalhado de faturamento entre Uber e 99 por dia da semana, faixas de horário (Madrugada, Manhã, Tarde, Noite) e médias diárias.",
        destaques: [
          "Ranking de dias mais lucrativos",
          "Distribuição por períodos do dia",
          quickStats.totalCorridas > 0
            ? `R$ ${formatCurrency(quickStats.totalCorridas)} acumulados`
            : "Comparativo lado a lado Uber vs 99",
        ],
      },
      {
        id: "postos_economicos",
        titulo: "Postos Mais Econômicos & Combustível",
        subtitulo: "Ranking de preços e melhor custo-benefício",
        categoria: "MOBILIDADE",
        categoriaLabel: "Mobilidade & App",
        tag: "Economia",
        tagColor: "bg-amber-500/20 text-amber-300 border-amber-500/30",
        icon: Fuel,
        iconBg: "bg-amber-500/10",
        iconColor: "text-amber-400",
        targetView: "indicacoes_postos",
        descricao:
          "Comparativo de preços por litro registrados nos abastecimentos, histórico de variações e ranking dos postos mais baratos da região.",
        destaques: [
          "Menor preço por litro registrado",
          "Histórico de preços por estabelecimento",
          "Indicação de economia no tanque",
        ],
      },
      {
        id: "eficiencia_veicular",
        titulo: "Consumo & Eficiência Veicular (Km/L)",
        subtitulo: "Média de consumo e custo por quilômetro",
        categoria: "MOBILIDADE",
        categoriaLabel: "Mobilidade & App",
        tag: "Operação",
        tagColor: "bg-teal-500/20 text-teal-300 border-teal-500/30",
        icon: Car,
        iconBg: "bg-teal-500/10",
        iconColor: "text-teal-400",
        targetView: "abastecimentos",
        descricao:
          "Cálculo automático de autonomia e consumo (Km/L e Custo/Km) com base nos registros de tanque cheio e quilometragem do hodômetro.",
        destaques: [
          "Cálculo preciso de Km/Litro",
          "Custo médio por quilômetro rodado",
          "Histórico cronológico de abastecimento",
        ],
      },
      {
        id: "zonas_risco",
        titulo: "Zonas de Risco & Segurança em Trânsito",
        subtitulo: "Mapeamento e precauções operacionais",
        categoria: "MOBILIDADE",
        categoriaLabel: "Mobilidade & App",
        tag: "Segurança",
        tagColor: "bg-rose-500/20 text-rose-300 border-rose-500/30",
        icon: ShieldAlert,
        iconBg: "bg-rose-500/10",
        iconColor: "text-rose-400",
        targetView: "zonas_risco",
        descricao:
          "Registro e consulta de perímetros de risco e locais de atenção para prevenção e planejamento seguro de rotas em corridas.",
        destaques: [
          "Mapeamento de regiões críticas",
          "Horários de maior risco por local",
          "Dicas e protocolos de precaução",
        ],
      },
      {
        id: "balanco_geral",
        titulo: "Balanço Geral & Fluxo de Caixa",
        subtitulo: "Visão consolidada de entradas, saídas e saldo",
        categoria: "FINANCAS",
        categoriaLabel: "Finanças",
        tag: "Consolidado",
        tagColor: "bg-blue-500/20 text-blue-300 border-blue-500/30",
        icon: LayoutDashboard,
        iconBg: "bg-blue-500/10",
        iconColor: "text-blue-400",
        targetView: "dashboard",
        descricao:
          "Visão panorâmica da saúde financeira, com receitas acumuladas, despesas categorizadas, balanço líquido e saldo disponível.",
        destaques: [
          "Receitas vs Despesas do período",
          "Saldo líquido e taxa de poupança",
          "Evolução financeira consolidada",
        ],
      },
      {
        id: "painel_vencimentos",
        titulo: "Painel de Vencimentos & Previsão de Contas",
        subtitulo: "Controle de despesas pendentes e provisionamento",
        categoria: "FINANCAS",
        categoriaLabel: "Finanças",
        tag: "Previsão",
        tagColor: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
        icon: Clock,
        iconBg: "bg-indigo-500/10",
        iconColor: "text-indigo-400",
        targetView: "painel_contas",
        descricao:
          "Acompanhamento inteligente de contas do mês: pendentes, pagas e atrasadas, com totalização de valores já quitados e a pagar.",
        destaques: [
          "Status em tempo real (Pago / Pendente)",
          "Alertas visuais de vencimento próximo",
          "Provisionamento de desembolso mensal",
        ],
      },
      {
        id: "metas_orcamento",
        titulo: "Acompanhamento de Metas & Teto de Gastos",
        subtitulo: "Limites de orçamento por categoria",
        categoria: "FINANCAS",
        categoriaLabel: "Finanças",
        tag: "Planejamento",
        tagColor: "bg-purple-500/20 text-purple-300 border-purple-500/30",
        icon: Target,
        iconBg: "bg-purple-500/10",
        iconColor: "text-purple-400",
        targetView: "metas",
        descricao:
          "Definição de metas de gastos por categoria e barras de progresso visual indicando a porcentagem consumida do orçamento.",
        destaques: [
          "Teto de gastos por categoria",
          "Percentual de consumo do limite",
          "Alertas de estouro orçamentário",
        ],
      },
      {
        id: "contas_cartoes",
        titulo: "Bancos & Faturas de Cartões",
        subtitulo: "Saldos em conta e projeção de faturas",
        categoria: "FINANCAS",
        categoriaLabel: "Finanças",
        tag: "Patrimônio",
        tagColor: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
        icon: CreditCard,
        iconBg: "bg-cyan-500/10",
        iconColor: "text-cyan-400",
        targetView: "contas",
        descricao:
          "Controle de contas bancárias ativas, limites disponíveis em cartões de crédito e acompanhamento das datas de fechamento e vencimento.",
        destaques: [
          "Saldos conciliados por banco",
          "Limite e faturas de cartões",
          "Centralização de contas financeiras",
        ],
      },
      {
        id: "painel_saude",
        titulo: "Painel de Saúde, Sono & Biometria",
        subtitulo: "Pressão arterial, glicemia, peso e hidratação",
        categoria: "SAUDE",
        categoriaLabel: "Saúde & Rotina",
        tag: "Bem-estar",
        tagColor: "bg-rose-500/20 text-rose-300 border-rose-500/30",
        icon: HeartPulse,
        iconBg: "bg-rose-500/10",
        iconColor: "text-rose-400",
        targetView: "saude",
        descricao:
          "Métricas biográficas essenciais com histórico de medições, gráficos de pressão arterial, glicose em jejum, controle de água e café.",
        destaques: [
          "Gráficos de evolução de pressão e glicemia",
          "Contador de água e xícaras de café",
          "Lembretes e horários de medicação",
        ],
      },
      {
        id: "exercicios_atividade",
        titulo: "Atividades Físicas & Queima Calórica",
        subtitulo: "Frequência de treinos e condicionamento",
        categoria: "SAUDE",
        categoriaLabel: "Saúde & Rotina",
        tag: "Condicionamento",
        tagColor: "bg-orange-500/20 text-orange-300 border-orange-500/30",
        icon: Activity,
        iconBg: "bg-orange-500/10",
        iconColor: "text-orange-400",
        targetView: "saude",
        descricao:
          "Registro e análise de treinos realizados (musculação, corrida, ciclismo), duração, intensidade e estimativa de calorias gastas.",
        destaques: [
          "Histórico cronológico de treinos",
          "Gasto calórico acumulado",
          "Acompanhamento de intensidade e ritmo",
        ],
      },
      {
        id: "lista_mercado",
        titulo: "Lista Inteligente de Mercado & Compras",
        subtitulo: "Estimativa de gastos e leitura por foto",
        categoria: "FINANCAS",
        categoriaLabel: "Finanças / Rotina",
        tag: "Organização",
        tagColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
        icon: ShoppingBag,
        iconBg: "bg-emerald-500/10",
        iconColor: "text-emerald-400",
        targetView: "lista_mercado",
        descricao:
          "Planejamento de itens de mercado com marcação de comprados, cálculo de valor estimado e captura de itens via foto com IA.",
        destaques: [
          "Itens pendentes vs comprados",
          "Cálculo de orçamento previsto",
          "Leitura de lista por foto / câmera",
        ],
      },
    ],
    [quickStats]
  );

  // Filtragem dos cards
  const filteredIndicadores = useMemo(() => {
    return indicadores.filter((ind) => {
      // Categoria
      if (activeCategory !== "TODOS" && ind.categoria !== activeCategory) {
        return false;
      }

      // Busca
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchTitulo = ind.titulo.toLowerCase().includes(query);
        const matchSubtitulo = ind.subtitulo.toLowerCase().includes(query);
        const matchDesc = ind.descricao.toLowerCase().includes(query);
        const matchTag = ind.tag.toLowerCase().includes(query);
        const matchDestaques = ind.destaques.some((d) => d.toLowerCase().includes(query));

        if (!matchTitulo && !matchSubtitulo && !matchDesc && !matchTag && !matchDestaques) {
          return false;
        }
      }

      return true;
    });
  }, [indicadores, activeCategory, searchQuery]);

  return (
    <div className="space-y-6 pb-12 animate-in fade-in-50 duration-200">
      {/* Header Central de Indicadores */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-xl relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 bg-gradient-to-tr from-emerald-600 to-teal-500 text-white rounded-2xl shadow-lg">
                <BarChart3 className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Central de Indicadores & Análises
                </h1>
                <p className="text-xs sm:text-sm text-slate-400">
                  Acesso rápido e unificado a todas as ferramentas analíticas e métricas do sistema
                </p>
              </div>
            </div>
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar indicador ou métrica..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Category Tabs Filter */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 flex items-center gap-2 overflow-x-auto pb-1">
          <span className="text-xs font-semibold text-slate-400 mr-1 flex items-center gap-1">
            <Compass className="w-3.5 h-3.5" /> Módulos:
          </span>
          {[
            { id: "TODOS", label: "Todos os Indicadores" },
            { id: "MOBILIDADE", label: "🚗 Mobilidade & App" },
            { id: "FINANCAS", label: "💰 Finanças & Contas" },
            { id: "SAUDE", label: "🩺 Saúde & Rotina" },
          ].map((cat) => {
            const active = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id as CategoriaIndicador)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  active
                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-950/40"
                    : "bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid de Cards de Indicadores */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredIndicadores.map((ind) => {
          const Icon = ind.icon;

          return (
            <div
              key={ind.id}
              onClick={() => onNavigate(ind.targetView)}
              className="group p-5 rounded-3xl bg-slate-900 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-900/90 transition-all duration-200 shadow-lg hover:shadow-xl flex flex-col justify-between cursor-pointer relative overflow-hidden"
            >
              <div className="space-y-3">
                {/* Top Row: Icon + Tag */}
                <div className="flex items-center justify-between">
                  <div className={`p-2.5 rounded-2xl ${ind.iconBg} ${ind.iconColor} transition-transform group-hover:scale-105`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${ind.tagColor}`}
                  >
                    {ind.tag}
                  </span>
                </div>

                {/* Title & Subtitle */}
                <div>
                  <h3 className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">
                    {ind.titulo}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                    {ind.subtitulo}
                  </p>
                </div>

                {/* Description */}
                <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">
                  {ind.descricao}
                </p>

                {/* Bullet Highlights */}
                <div className="space-y-1 pt-2 border-t border-slate-800/80">
                  {ind.destaques.map((d, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-[11px] text-slate-300">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                      <span className="truncate">{d}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Button at bottom */}
              <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  {ind.categoriaLabel}
                </span>
                <div className="flex items-center gap-1 text-emerald-400 font-bold group-hover:translate-x-1 transition-transform">
                  <span>Acessar Análise</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredIndicadores.length === 0 && (
        <div className="p-12 text-center bg-slate-900 rounded-3xl border border-slate-800 text-slate-500 text-xs space-y-2">
          <p>Nenhum indicador encontrado para o filtro ou termo pesquisado.</p>
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
    </div>
  );
};
