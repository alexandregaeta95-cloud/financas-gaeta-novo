import React, { useState } from "react";
import { Target, Tag, Plus, Edit2, Trash2, X, AlertTriangle, CheckCircle2, BarChart3 } from "lucide-react";
import { MetaCategoria, CategoriaCustomizada, Lancamento } from "../types";
import { generateNewId } from "../services/api";
import { parseCurrency, formatCurrency, formatCurrencyInput } from "../utils/formatters";
import {
  extractYearMonth,
  normalizeCategory,
  categoriesMatch,
  calculateSpentForCategoryAndMonth,
  getSpentForMeta,
} from "../utils/metasCalculations";
import { MetasRelatorioModal } from "./MetasRelatorioModal";
import { ComboBox } from "./ComboBox";
import { VoiceInput } from "./VoiceInput";
import { VoiceTextArea } from "./VoiceTextArea";

interface Props {
  metas: MetaCategoria[];
  categoriasCustom: CategoriaCustomizada[];
  lancamentos: Lancamento[];
  onSaveMeta: (meta: MetaCategoria) => Promise<void>;
  onSaveCategoria: (cat: CategoriaCustomizada) => Promise<void>;
  onDeleteMeta: (id: string) => Promise<void>;
  onDeleteCategoria: (id: string) => Promise<void>;
}

const MESES = [
  { value: "01", label: "01 - Janeiro" },
  { value: "02", label: "02 - Fevereiro" },
  { value: "03", label: "03 - Março" },
  { value: "04", label: "04 - Abril" },
  { value: "05", label: "05 - Maio" },
  { value: "06", label: "06 - Junho" },
  { value: "07", label: "07 - Julho" },
  { value: "08", label: "08 - Agosto" },
  { value: "09", label: "09 - Setembro" },
  { value: "10", label: "10 - Outubro" },
  { value: "11", label: "11 - Novembro" },
  { value: "12", label: "12 - Dezembro" },
];

const ANOS = [2024, 2025, 2026, 2027, 2028, 2029, 2030];

export const MetasCategoriasView: React.FC<Props> = ({
  metas,
  categoriasCustom,
  lancamentos,
  onSaveMeta,
  onSaveCategoria,
  onDeleteMeta,
  onDeleteCategoria,
}) => {
  const [activeTab, setActiveTab] = useState<"metas" | "categorias">("metas");

  const categoriasDisponiveis = React.useMemo(() => {
    const defaults = [
      "ALIMENTAÇÃO",
      "SUPERMERCADO",
      "TRANSPORTE",
      "MORADIA",
      "CONTAS",
      "SAÚDE",
      "LAZER",
      "EDUCAÇÃO",
      "VESTUÁRIO",
      "SERVIÇOS",
      "IMPOSTOS",
      "VEÍCULO",
      "ABASTECIMENTO",
      "PET",
      "OUTROS",
    ];
    const fromCustom = (categoriasCustom || [])
      .map((c) => String(c.Nome || "").trim().toUpperCase())
      .filter((n) => n.length > 0);
    const fromLancamentos = (lancamentos || [])
      .map((l) => String(l.Categoria || "").trim().toUpperCase())
      .filter((c) => c.length > 0);
    return Array.from(new Set([...defaults, ...fromCustom, ...fromLancamentos]));
  }, [categoriasCustom, lancamentos]);

  // Delete Confirmation State
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    type: "meta" | "categoria";
    id: string;
    title: string;
    subtitle?: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Report Modal
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  // Meta Modal & Fields
  const [isMetaModalOpen, setIsMetaModalOpen] = useState(false);
  const [editingMeta, setEditingMeta] = useState<MetaCategoria | null>(null);
  const [valorMetaDisplay, setValorMetaDisplay] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState<string>(
    String(new Date().getMonth() + 1).padStart(2, "0")
  );
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [metaForm, setMetaForm] = useState<Partial<MetaCategoria>>({
    Categoria: "MERCADO",
    Valor_Meta: 800,
    Mes_Ano: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`,
    Alerta_Porcentagem: 80,
  });

  // Categoria Modal
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<CategoriaCustomizada | null>(null);
  const [catForm, setCatForm] = useState<Partial<CategoriaCustomizada>>({
    Nome: "",
    Tipo: "Despesa",
    Icone: "Tag",
    Cor_Hex: "#10b981",
  });

  const handleOpenMetaModal = (m?: MetaCategoria) => {
    const now = new Date();
    if (m) {
      setEditingMeta(m);
      const parsedYM = extractYearMonth(m.Mes_Ano);
      const y = parsedYM?.year || now.getFullYear();
      const mo = parsedYM?.month
        ? String(parsedYM.month).padStart(2, "0")
        : String(now.getMonth() + 1).padStart(2, "0");

      setSelectedYear(y);
      setSelectedMonth(mo);
      const numericVal = parseCurrency(m.Valor_Meta);
      setValorMetaDisplay(numericVal > 0 ? formatCurrency(numericVal) : "");
      setMetaForm({
        ...m,
        Valor_Meta: numericVal,
        Mes_Ano: `${y}-${mo}`,
      });
    } else {
      setEditingMeta(null);
      const y = now.getFullYear();
      const mo = String(now.getMonth() + 1).padStart(2, "0");

      setSelectedYear(y);
      setSelectedMonth(mo);
      setValorMetaDisplay("800,00");
      setMetaForm({
        Categoria: "MERCADO",
        Valor_Meta: 800,
        Mes_Ano: `${y}-${mo}`,
        Alerta_Porcentagem: 80,
      });
    }
    setIsMetaModalOpen(true);
  };

  // Calculate actual spending (or earnings) for a meta based on its category and target month/year
  const calculateMetaSpent = (meta: MetaCategoria) => {
    return getSpentForMeta(meta, lancamentos);
  };

  const handleSaveMetaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const item: MetaCategoria = {
      Id: editingMeta?.Id || generateNewId("META"),
      Categoria: String(metaForm.Categoria || "OUTROS").toUpperCase(),
      Valor_Meta: parseCurrency(metaForm.Valor_Meta),
      Mes_Ano: `${selectedYear}-${selectedMonth}`,
      Alerta_Porcentagem: parseCurrency(metaForm.Alerta_Porcentagem) || 80,
    };
    await onSaveMeta(item);
    setIsMetaModalOpen(false);
  };

  const handleSaveCatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const item: CategoriaCustomizada = {
      Id: editingCat?.Id || generateNewId("CAT"),
      Nome: catForm.Nome ? catForm.Nome.toUpperCase() : "NOVA CATEGORIA",
      Tipo: catForm.Tipo || "Despesa",
      Icone: catForm.Icone || "Tag",
      Cor_Hex: catForm.Cor_Hex || "#10b981",
    };
    await onSaveCategoria(item);
    setIsCatModalOpen(false);
  };

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Target className="w-5 h-5 text-emerald-400" />
            Metas de Categoria & Categorias Customizadas
          </h2>
          <p className="text-xs text-slate-400">
            Abas <code className="text-emerald-400 font-mono">10_Metas_De_Categoria</code> e{" "}
            <code className="text-emerald-400 font-mono">11_Categorias_Customizadas</code>
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab("metas")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "metas"
                ? "bg-emerald-600 text-white shadow-xs"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Metas Mensais ({metas.length})
          </button>
          <button
            onClick={() => setActiveTab("categorias")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "categorias"
                ? "bg-emerald-600 text-white shadow-xs"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Categorias Customizadas ({categoriasCustom.length})
          </button>
        </div>
      </div>

      {/* 1. METAS DE CATEGORIA */}
      {activeTab === "metas" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span className="text-xs text-slate-400">
              Defina o teto mensal de gastos por categoria e acompanhe o progresso real dos lançamentos
            </span>
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                onClick={() => setIsReportModalOpen(true)}
                className="flex items-center gap-2 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 hover:border-slate-600 text-xs font-semibold rounded-xl transition-all shadow-xs"
                title="Visualizar relatório detalhado com gráficos e impressão em PDF"
              >
                <BarChart3 className="w-4 h-4 text-emerald-400" />
                <span>Relatório & Gráficos (PDF)</span>
              </button>

              <button
                onClick={() => handleOpenMetaModal()}
                className="flex items-center gap-2 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-xl transition-colors shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Nova Meta</span>
              </button>
            </div>
          </div>

          {metas.length === 0 ? (
            <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl text-slate-500 text-xs">
              Nenhuma meta cadastrada ainda.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {metas.map((m, idx) => {
                const spent = calculateMetaSpent(m);
                const target = parseCurrency(m.Valor_Meta) || 1;
                const pct = Math.round((spent / target) * 100);
                const pctBar = Math.min(100, pct);
                const isOver = spent > target;
                const alertThreshold = parseCurrency(m.Alerta_Porcentagem) || 80;
                const isNear = pct >= alertThreshold;

                return (
                  <div
                    key={`${m.Id || 'meta'}-${idx}`}
                    className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-3 relative hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-white text-base">{m.Categoria}</h3>
                        <span className="text-[10px] text-slate-400 font-mono">
                          Mês Referência: {m.Mes_Ano || "Atual"}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenMetaModal(m)}
                          className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                          title="Editar Meta"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() =>
                            setDeleteConfirm({
                              isOpen: true,
                              type: "meta",
                              id: m.Id,
                              title: `Meta: ${m.Categoria}`,
                              subtitle: `Valor: R$ ${formatCurrency(m.Valor_Meta)} • Mês: ${m.Mes_Ano || "Atual"} • Alerta: ${m.Alerta_Porcentagem || 80}%`,
                            })
                          }
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                          title="Excluir Meta"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">Gasto Realizado:</span>
                        <strong className={isOver ? "text-rose-400 font-bold" : isNear ? "text-amber-400 font-bold" : "text-white font-semibold"}>
                          R$ {formatCurrency(spent)}{" "}
                          <span className="text-slate-400 font-normal">/ R$ {formatCurrency(target)}</span>
                        </strong>
                      </div>

                      <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                        <div
                          className={`h-full transition-all ${
                            isOver
                              ? "bg-rose-500"
                              : isNear
                              ? "bg-amber-500"
                              : "bg-slate-500"
                          }`}
                          style={{ width: `${pctBar}%` }}
                        />
                      </div>

                      <div className="flex justify-between text-[10px] text-slate-500">
                        <span>Alerta em {alertThreshold}%</span>
                        <span className={isOver ? "text-rose-400 font-bold" : isNear ? "text-amber-400 font-semibold" : "text-slate-400"}>
                          {pct}% {isOver ? "ultrapassado" : "atingido"}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 2. CATEGORIAS CUSTOMIZADAS */}
      {activeTab === "categorias" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-400">
              Crie categorias personalizadas para classificação de despesas e receitas
            </span>
            <button
              onClick={() => {
                setEditingCat(null);
                setCatForm({
                  Nome: "",
                  Tipo: "Despesa",
                  Icone: "Tag",
                  Cor_Hex: "#10b981",
                });
                setIsCatModalOpen(true);
              }}
              className="flex items-center gap-2 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-xl transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Categoria</span>
            </button>
          </div>

          {categoriasCustom.length === 0 ? (
            <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl text-slate-500 text-xs">
              Nenhuma categoria customizada cadastrada ainda.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {categoriasCustom.map((cat, idx) => (
                <div
                  key={`${cat.Id || 'cat'}-${idx}`}
                  className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between gap-2 hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-slate-800 text-slate-300 border border-slate-700/60 shrink-0">
                      <Tag className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-xs">{cat.Nome}</h4>
                      <span className="text-[10px] text-slate-300 uppercase font-semibold px-1.5 py-0.2 rounded bg-slate-800 border border-slate-700/70 inline-block mt-0.5">
                        {cat.Tipo}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setEditingCat(cat);
                        setCatForm({ ...cat });
                        setIsCatModalOpen(true);
                      }}
                      className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                      title="Editar Categoria"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() =>
                        setDeleteConfirm({
                          isOpen: true,
                          type: "categoria",
                          id: cat.Id,
                          title: cat.Nome,
                          subtitle: `Tipo: ${cat.Tipo || "Despesa"}`,
                        })
                      }
                      className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                      title="Excluir Categoria"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
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
                  {deleteConfirm.type === "meta"
                    ? "Excluir Meta de Categoria"
                    : "Excluir Categoria Customizada"}
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
              Tem certeza que deseja excluir este registro? Esta ação marcará o registro como excluído na planilha.
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
                    if (deleteConfirm.type === "meta") {
                      await onDeleteMeta(deleteConfirm.id);
                    } else {
                      await onDeleteCategoria(deleteConfirm.id);
                    }
                    setDeleteConfirm(null);
                  } catch (err) {
                    console.error("Erro ao excluir:", err);
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

      {/* Modal Meta */}
      {isMetaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs text-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-base text-white">
                {editingMeta ? "Editar Meta de Categoria" : "Configurar Meta de Categoria"}
              </h3>
              <button onClick={() => setIsMetaModalOpen(false)}>
                <X className="w-5 h-5 text-slate-400 hover:text-white" />
              </button>
            </div>

            <form onSubmit={handleSaveMetaSubmit} className="space-y-3">
              <div>
                <label className="text-slate-400 block mb-1">Categoria</label>
                <ComboBox
                  required
                  placeholder="Ex: MERCADO, SAÚDE, ABASTECIMENTO"
                  value={metaForm.Categoria || ""}
                  onChange={(val) => setMetaForm({ ...metaForm, Categoria: val })}
                  options={categoriasDisponiveis}
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Valor Meta Mensal (R$)</label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-slate-400 font-semibold text-xs select-none">
                    R$
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="0,00"
                    required
                    value={valorMetaDisplay}
                    onChange={(e) => {
                      const { numeric, formatted } = formatCurrencyInput(e.target.value);
                      setValorMetaDisplay(formatted);
                      setMetaForm((prev) => ({ ...prev, Valor_Meta: numeric }));
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 pl-9 text-white font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Mês de Referência</label>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-medium cursor-pointer"
                  >
                    {MESES.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Ano</label>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono cursor-pointer"
                  >
                    {ANOS.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Alerta em (%)</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={metaForm.Alerta_Porcentagem || 80}
                  onChange={(e) => setMetaForm({ ...metaForm, Alerta_Porcentagem: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Observações da Meta</label>
                <VoiceTextArea
                  rows={2}
                  placeholder="Ex: Teto máximo para economia este mês..."
                  value={metaForm.Observação || ""}
                  onChange={(e) => setMetaForm({ ...metaForm, Observação: e.target.value })}
                  className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white placeholder-slate-600 resize-none uppercase text-xs focus:outline-none focus:border-emerald-500"
                  uppercase
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsMetaModalOpen(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl"
                >
                  Salvar Meta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Categoria */}
      {isCatModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs text-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-base text-white">
                {editingCat ? "Editar Categoria Customizada" : "Nova Categoria Customizada"}
              </h3>
              <button onClick={() => setIsCatModalOpen(false)}>
                <X className="w-5 h-5 text-slate-400 hover:text-white" />
              </button>
            </div>

            <form onSubmit={handleSaveCatSubmit} className="space-y-3">
              <div>
                <label className="text-slate-400 block mb-1">Nome da Categoria</label>
                <VoiceInput
                  type="text"
                  required
                  placeholder="Ex: ACADEMIA, VET, CURSOS"
                  value={catForm.Nome}
                  onChange={(e) => setCatForm({ ...catForm, Nome: e.target.value.toUpperCase() })}
                  className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white uppercase font-semibold"
                  uppercase
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Tipo</label>
                  <select
                    value={catForm.Tipo}
                    onChange={(e) => setCatForm({ ...catForm, Tipo: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-semibold"
                  >
                    <option value="Despesa">Despesa</option>
                    <option value="Receita">Receita</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Cor de Identificação</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={catForm.Cor_Hex || "#10b981"}
                      onChange={(e) => setCatForm({ ...catForm, Cor_Hex: e.target.value })}
                      className="w-10 h-10 bg-transparent border-0 rounded-xl cursor-pointer p-0"
                    />
                    <input
                      type="text"
                      value={catForm.Cor_Hex || "#10b981"}
                      onChange={(e) => setCatForm({ ...catForm, Cor_Hex: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono text-xs uppercase"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCatModalOpen(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl"
                >
                  Salvar Categoria
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Relatório Executivo de Metas & Gráficos / PDF */}
      <MetasRelatorioModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        metas={metas}
        lancamentos={lancamentos}
      />
    </div>
  );
};
