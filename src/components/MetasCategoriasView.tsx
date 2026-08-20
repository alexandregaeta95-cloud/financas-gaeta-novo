import React, { useState } from "react";
import { Target, Tag, Plus, Edit2, Trash2, X, AlertTriangle, CheckCircle2 } from "lucide-react";
import { MetaCategoria, CategoriaCustomizada, Lancamento } from "../types";
import { generateNewId } from "../services/api";
import { parseCurrency, formatCurrency, formatCurrencyInput } from "../utils/formatters";

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

/**
 * Normalizes text removing accents, diacritics, extra spaces, and uppercase.
 */
function normalizeCategory(cat?: string | null): string {
  if (!cat) return "";
  return String(cat)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[_\-\s]+/g, " ")
    .trim()
    .toUpperCase();
}

/**
 * Checks if a meta category matches a lancamento category, ignoring accents/case
 * and handling common synonymous categories (such as Combustível / Abastecimento).
 */
function categoriesMatch(metaCat?: string | null, lancamentoCat?: string | null, lancamentoTipo?: string | null): boolean {
  const mNorm = normalizeCategory(metaCat);
  const lNorm = normalizeCategory(lancamentoCat);
  const tNorm = normalizeCategory(lancamentoTipo);

  if (!mNorm) return false;

  // Direct normalized match (e.g. "MERCADO" === "MERCADO", "SAUDE" === "SAUDE")
  if (mNorm === lNorm) return true;

  // Fuel / Abastecimento cross-matching
  const isFuelMeta = mNorm === "COMBUSTIVEL" || mNorm === "ABASTECIMENTO" || mNorm === "GASOLINA";
  const isFuelLancamento =
    lNorm === "COMBUSTIVEL" ||
    lNorm === "ABASTECIMENTO" ||
    lNorm === "GASOLINA" ||
    tNorm === "ABASTECIMENTO";

  if (isFuelMeta && isFuelLancamento) {
    return true;
  }

  // Supermercado / Mercado
  if (
    (mNorm === "MERCADO" && lNorm === "SUPERMERCADO") ||
    (mNorm === "SUPERMERCADO" && lNorm === "MERCADO")
  ) {
    return true;
  }

  return false;
}

/**
 * Month names map for PT-BR / EN
 */
const MONTH_NAMES_MAP: Record<string, number> = {
  jan: 1, janeiro: 1, january: 1,
  fev: 2, fevereiro: 2, february: 2,
  mar: 3, marco: 3, março: 3, march: 3,
  abr: 4, abril: 4, april: 4,
  mai: 5, maio: 5, may: 5,
  jun: 6, junho: 6, june: 6,
  jul: 7, julho: 7, july: 7,
  ago: 8, agosto: 8, august: 8,
  set: 9, setembro: 9, september: 9,
  out: 10, outubro: 10, october: 10,
  nov: 11, novembro: 11, november: 11,
  dez: 12, dezembro: 12, december: 12,
};

/**
 * Extracts normalized year and month from diverse date formats:
 * - Google Sheets serial numbers (e.g., 46253 -> year: 2026, month: 8)
 * - YYYY-MM-DD or YYYY-MM (e.g., "2026-08-19", "2026-08", "2026-07")
 * - DD/MM/YYYY or DD/MM/YY (e.g., "19/08/2026", "19/08/26")
 * - MM/YYYY or MM/YY (e.g., "08/2026", "07/2026", "07/26")
 * - Text months: "Julho/2026", "Jul/2026", "07"
 * - ISO with timestamp using UTC components to avoid timezone offsets
 */
function extractYearMonth(dateVal?: any): { year: number; month: number } | null {
  if (dateVal === null || dateVal === undefined || dateVal === "") return null;

  // If already a Date instance
  if (dateVal instanceof Date && !isNaN(dateVal.getTime())) {
    return { year: dateVal.getUTCFullYear(), month: dateVal.getUTCMonth() + 1 };
  }

  // If numeric serial number from Excel / Google Sheets
  const num = typeof dateVal === "number" ? dateVal : Number(String(dateVal).trim());
  if (!isNaN(num) && num >= 10000 && num <= 90000) {
    // Google Sheets epoch is 1899-12-30
    const utcDays = num - 25569;
    const utcValue = utcDays * 86400 * 1000;
    const d = new Date(utcValue);
    if (!isNaN(d.getTime())) {
      return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 };
    }
  }

  const str = String(dateVal).trim();
  if (!str) return null;

  // Format YYYY-MM or YYYY-MM-DD (e.g. "2026-08", "2026-07", "2026-07-01", "2026-07-01T00:00:00")
  const isoMatch = str.match(/^(\d{4})[-/.](\d{1,2})/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10);
    if (year > 1900 && month >= 1 && month <= 12) {
      return { year, month };
    }
  }

  // Format DD/MM/YYYY or DD-MM-YYYY or DD/MM/YY (standard Brazilian date)
  const brFullMatch = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/);
  if (brFullMatch) {
    const month = parseInt(brFullMatch[2], 10);
    let year = parseInt(brFullMatch[3], 10);
    if (year < 100) {
      year = year < 70 ? 2000 + year : 1900 + year;
    }
    if (year > 1900 && month >= 1 && month <= 12) {
      return { year, month };
    }
  }

  // Format MM/YYYY or MM-YYYY or MM/YY
  const myMatch = str.match(/^(\d{1,2})[-/.](\d{2,4})$/);
  if (myMatch) {
    const month = parseInt(myMatch[1], 10);
    let year = parseInt(myMatch[2], 10);
    if (year < 100) {
      year = year < 70 ? 2000 + year : 1900 + year;
    }
    if (year > 1900 && month >= 1 && month <= 12) {
      return { year, month };
    }
  }

  // Text month format: "Julho/2026", "Jul-2026", "Julho 2026"
  const textMonthMatch = str.toLowerCase().match(/^([a-zçãé]+)[-/\s]+(\d{2,4})$/);
  if (textMonthMatch) {
    const monthName = textMonthMatch[1].normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    let year = parseInt(textMonthMatch[2], 10);
    if (year < 100) {
      year = year < 70 ? 2000 + year : 1900 + year;
    }
    const month = MONTH_NAMES_MAP[monthName] || MONTH_NAMES_MAP[monthName.slice(0, 3)];
    if (month && year > 1900) {
      return { year, month };
    }
  }

  // Standalone month: "07" or "7" (assumes current year)
  const singleMonthMatch = str.match(/^0?([1-9]|1[0-2])$/);
  if (singleMonthMatch) {
    const month = parseInt(singleMonthMatch[1], 10);
    return { year: new Date().getUTCFullYear(), month };
  }

  // Fallback: Date.parse with UTC getters
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 };
  }

  return null;
}

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

  // Delete Confirmation State
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    type: "meta" | "categoria";
    id: string;
    title: string;
    subtitle?: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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
  const getSpentForMeta = (meta: MetaCategoria) => {
    const now = new Date();
    const targetYM = extractYearMonth(meta.Mes_Ano) || {
      year: now.getFullYear(),
      month: now.getMonth() + 1,
    };

    const metaCatNorm = normalizeCategory(meta.Categoria);
    const isIncomeMeta = metaCatNorm === "RECEITA" || metaCatNorm === "RENDIMENTO" || metaCatNorm === "SALARIO" || metaCatNorm === "ENTRADA";

    return lancamentos
      .filter((l) => {
        const t = String(l.Tipo || "").trim().toUpperCase();
        if (isIncomeMeta) {
          return t === "RECEITA";
        }
        return t === "DESPESA" || t === "ABASTECIMENTO";
      })
      .filter((l) => {
        const s = String(l.Status || "").trim().toUpperCase();
        return s !== "EXCLUÍDO" && s !== "EXCLUIDO" && s !== "DELETED" && s !== "CANCELADO";
      })
      .filter((l) => categoriesMatch(meta.Categoria, l.Categoria, l.Tipo))
      .filter((l) => {
        const lYM = extractYearMonth(l.Data);
        if (!lYM) return false;
        return lYM.year === targetYM.year && lYM.month === targetYM.month;
      })
      .reduce((acc, curr) => acc + parseCurrency(curr.Valor), 0);
  };

  const handleSaveMetaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const item: MetaCategoria = {
      Id: editingMeta?.Id || generateNewId("META"),
      Categoria: (metaForm.Categoria || "OUTROS").toUpperCase(),
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
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-400">
              Defina o teto mensal de gastos por categoria e acompanhe o progresso real dos lançamentos
            </span>
            <button
              onClick={() => handleOpenMetaModal()}
              className="flex items-center gap-2 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-xl transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Meta</span>
            </button>
          </div>

          {metas.length === 0 ? (
            <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl text-slate-500 text-xs">
              Nenhuma meta cadastrada ainda.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {metas.map((m, idx) => {
                const spent = getSpentForMeta(m);
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
                        <strong className={isOver ? "text-rose-400" : isNear ? "text-amber-400" : "text-emerald-400"}>
                          R$ {formatCurrency(spent)} / R$ {formatCurrency(target)}
                        </strong>
                      </div>

                      <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                        <div
                          className={`h-full transition-all ${
                            isOver
                              ? "bg-rose-500"
                              : isNear
                              ? "bg-amber-500"
                              : "bg-emerald-500"
                          }`}
                          style={{ width: `${pctBar}%` }}
                        />
                      </div>

                      <div className="flex justify-between text-[10px] text-slate-500">
                        <span>Alerta em {alertThreshold}%</span>
                        <span className={isOver ? "text-rose-400 font-bold" : isNear ? "text-amber-400 font-semibold" : ""}>
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
                    <div
                      className="w-3.5 h-3.5 rounded-full shrink-0"
                      style={{ backgroundColor: cat.Cor_Hex || "#10b981" }}
                    />
                    <div>
                      <h4 className="font-bold text-white text-xs">{cat.Nome}</h4>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">{cat.Tipo}</span>
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
                <input
                  type="text"
                  required
                  placeholder="Ex: MERCADO, SAÚDE, ABASTECIMENTO"
                  value={metaForm.Categoria}
                  onChange={(e) => setMetaForm({ ...metaForm, Categoria: e.target.value.toUpperCase() })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white uppercase"
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
                <input
                  type="text"
                  required
                  placeholder="Ex: ACADEMIA, VET, CURSOS"
                  value={catForm.Nome}
                  onChange={(e) => setCatForm({ ...catForm, Nome: e.target.value.toUpperCase() })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white uppercase font-semibold"
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
    </div>
  );
};
