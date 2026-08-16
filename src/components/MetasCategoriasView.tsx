import React, { useState } from "react";
import { Target, Tag, Plus, Edit2, Trash2, X, AlertTriangle, CheckCircle2 } from "lucide-react";
import { MetaCategoria, CategoriaCustomizada, Lancamento } from "../types";
import { generateNewId } from "../services/api";
import { parseCurrency, formatCurrency } from "../utils/formatters";

interface Props {
  metas: MetaCategoria[];
  categoriasCustom: CategoriaCustomizada[];
  lancamentos: Lancamento[];
  onSaveMeta: (meta: MetaCategoria) => Promise<void>;
  onSaveCategoria: (cat: CategoriaCustomizada) => Promise<void>;
}

export const MetasCategoriasView: React.FC<Props> = ({
  metas,
  categoriasCustom,
  lancamentos,
  onSaveMeta,
  onSaveCategoria,
}) => {
  const [activeTab, setActiveTab] = useState<"metas" | "categorias">("metas");

  // Meta Modal
  const [isMetaModalOpen, setIsMetaModalOpen] = useState(false);
  const [editingMeta, setEditingMeta] = useState<MetaCategoria | null>(null);
  const [metaForm, setMetaForm] = useState<Partial<MetaCategoria>>({
    Categoria: "MERCADO",
    Valor_Meta: 800,
    Mes_Ano: new Date().toISOString().substring(0, 7),
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

  // Calculate current month spending for category
  const getCurrentMonthSpentForCategory = (catName: string) => {
    const currentMonth = new Date().toISOString().substring(0, 7);
    return lancamentos
      .filter((l) => {
        const t = String(l.Tipo || "").toLowerCase();
        return t === "despesa" || t === "abastecimento";
      })
      .filter((l) => {
        const s = String(l.Status || "").toUpperCase();
        return s !== "EXCLUÍDO" && s !== "EXCLUIDO" && s !== "DELETED";
      })
      .filter((l) => (l.Categoria || "").toUpperCase() === catName.toUpperCase())
      .filter((l) => (l.Data || "").startsWith(currentMonth))
      .reduce((acc, curr) => acc + parseCurrency(curr.Valor), 0);
  };

  const handleSaveMetaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const item: MetaCategoria = {
      Id: editingMeta?.Id || generateNewId("META"),
      Categoria: (metaForm.Categoria || "OUTROS").toUpperCase(),
      Valor_Meta: parseCurrency(metaForm.Valor_Meta),
      Mes_Ano: metaForm.Mes_Ano || new Date().toISOString().substring(0, 7),
      Alerta_Porcentagem: parseCurrency(metaForm.Alerta_Porcentagem) || 80,
    };
    await onSaveMeta(item);
    setIsMetaModalOpen(false);
  };

  const handleSaveCatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const item: CategoriaCustomizada = {
      Id: editingCat?.Id || generateNewId("CAT"),
      Nome: catForm.Nome || "Nova Categoria",
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
              Defina o teto mensal de gastos por categoria e acompanhe o progresso do mês atual
            </span>
            <button
              onClick={() => {
                setEditingMeta(null);
                setMetaForm({
                  Categoria: "MERCADO",
                  Valor_Meta: 800,
                  Mes_Ano: new Date().toISOString().substring(0, 7),
                  Alerta_Porcentagem: 80,
                });
                setIsMetaModalOpen(true);
              }}
              className="flex items-center gap-2 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-xl transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Meta</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {metas.map((m, idx) => {
              const spent = getCurrentMonthSpentForCategory(m.Categoria);
              const target = parseCurrency(m.Valor_Meta) || 1;
              const pct = Math.min(100, Math.round((spent / target) * 100));
              const isOver = spent > target;
              const isNear = pct >= (parseCurrency(m.Alerta_Porcentagem) || 80);

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

                    <button
                      onClick={() => {
                        setEditingMeta(m);
                        setMetaForm({ ...m });
                        setIsMetaModalOpen(true);
                      }}
                      className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Gasto do Mês:</span>
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
                        style={{ width: `${pct}%` }}
                      />
                    </div>

                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>Alerta em {m.Alerta_Porcentagem || 80}%</span>
                      <span>{pct}% atingido</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
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
              className="flex items-center gap-2 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-xl transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Categoria</span>
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {categoriasCustom.map((cat, idx) => (
              <div
                key={`${cat.Id || 'cat'}-${idx}`}
                className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: cat.Cor_Hex || "#10b981" }}
                  />
                  <div>
                    <h4 className="font-bold text-white text-xs">{cat.Nome}</h4>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">{cat.Tipo}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal Meta */}
      {isMetaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs text-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-base text-white">Configurar Meta de Categoria</h3>
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Valor Meta Mensal (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={metaForm.Valor_Meta}
                    onChange={(e) => setMetaForm({ ...metaForm, Valor_Meta: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-bold"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Alerta em (%)</label>
                  <input
                    type="number"
                    value={metaForm.Alerta_Porcentagem}
                    onChange={(e) => setMetaForm({ ...metaForm, Alerta_Porcentagem: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                  />
                </div>
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
              <h3 className="font-bold text-base text-white">Nova Categoria Customizada</h3>
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
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white uppercase"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Tipo</label>
                  <select
                    value={catForm.Tipo}
                    onChange={(e) => setCatForm({ ...catForm, Tipo: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                  >
                    <option value="Despesa">Despesa</option>
                    <option value="Receita">Receita</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Cor</label>
                  <input
                    type="color"
                    value={catForm.Cor_Hex}
                    onChange={(e) => setCatForm({ ...catForm, Cor_Hex: e.target.value })}
                    className="w-full h-10 bg-slate-950 border border-slate-800 rounded-xl p-1 cursor-pointer"
                  />
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
