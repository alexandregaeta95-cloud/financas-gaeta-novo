import React, { useState } from "react";
import {
  Plus,
  Search,
  Filter,
  Trash2,
  Edit2,
  TrendingUp,
  TrendingDown,
  Fuel,
  Check,
  X,
  AlertCircle
} from "lucide-react";
import { Lancamento, Veiculo, ContaBancaria } from "../types";
import { generateNewId } from "../services/api";
import { parseCurrency, formatCurrency } from "../utils/formatters";

interface Props {
  lancamentos: Lancamento[];
  veiculos: Veiculo[];
  contas: ContaBancaria[];
  onSaveLancamento: (lancamento: Lancamento) => Promise<void>;
  onDeleteLancamento: (id: string) => Promise<void>;
  isModalOpen: boolean;
  onCloseModal: () => void;
  onOpenModal: () => void;
  initialFuelingMode?: boolean;
}

export const LancamentosView: React.FC<Props> = ({
  lancamentos,
  veiculos,
  contas,
  onSaveLancamento,
  onDeleteLancamento,
  isModalOpen,
  onCloseModal,
  onOpenModal,
  initialFuelingMode = false,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("ALL");
  const [editingItem, setEditingItem] = useState<Lancamento | null>(null);
  const [saving, setSaving] = useState(false);

  // Form State
  const [formData, setFormData] = useState<Partial<Lancamento>>({
    Data: new Date().toISOString().split("T")[0],
    Tipo: initialFuelingMode ? "Abastecimento" : "Despesa",
    Categoria: initialFuelingMode ? "ABASTECIMENTO" : "Alimentação",
    Descricao: "",
    Valor: 0,
    Valor_Pago: 0,
    Conta: contas[0]?.Nome || "Conta Principal",
    Forma_Pagamento: "PIX",
    Status: "Pago",
    Observacoes: "",
    Veiculo: veiculos[0]?.Modelo || "",
    Km_Atual: veiculos[0]?.Km_Atual || 0,
    Litros: 0,
    Preco_Litro: 0,
    Posto: "",
  });

  const handleOpenNew = (isFuel: boolean = false) => {
    setEditingItem(null);
    setFormData({
      Data: new Date().toISOString().split("T")[0],
      Tipo: isFuel ? "Abastecimento" : "Despesa",
      Categoria: isFuel ? "ABASTECIMENTO" : "Alimentação",
      Descricao: "",
      Valor: 0,
      Valor_Pago: 0,
      Conta: contas[0]?.Nome || "Conta Principal",
      Forma_Pagamento: "PIX",
      Status: "Pago",
      Observacoes: "",
      Veiculo: veiculos[0]?.Modelo || "",
      Km_Atual: veiculos[0]?.Km_Atual || 0,
      Litros: 0,
      Preco_Litro: 0,
      Posto: "",
    });
    onOpenModal();
  };

  const handleOpenEdit = (item: Lancamento) => {
    setEditingItem(item);
    setFormData({ ...item });
    onOpenModal();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const isFuel = formData.Categoria === "ABASTECIMENTO" || formData.Tipo === "Abastecimento";
      const litros = parseCurrency(formData.Litros);
      const precoLitro = parseCurrency(formData.Preco_Litro);
      let finalValor = parseCurrency(formData.Valor);

      // Calculate total value for fuel if liters and price per liter provided
      if (isFuel && litros > 0 && precoLitro > 0 && finalValor === 0) {
        finalValor = litros * precoLitro;
      }

      const finalValorPago =
        formData.Valor_Pago !== undefined &&
        formData.Valor_Pago !== null &&
        String(formData.Valor_Pago).trim() !== ""
          ? parseCurrency(formData.Valor_Pago)
          : finalValor;

      const itemToSave: Lancamento = {
        Id: editingItem?.Id || generateNewId("LANC"),
        Data: formData.Data || new Date().toISOString().split("T")[0],
        Tipo: isFuel ? "Abastecimento" : (formData.Tipo || "Despesa"),
        Categoria: isFuel ? "ABASTECIMENTO" : (formData.Categoria || "Outros"),
        Subcategoria: formData.Subcategoria || "",
        Descricao: formData.Descricao || "",
        Valor: finalValor,
        Valor_Pago: finalValorPago,
        Conta: formData.Conta || "Conta Principal",
        Cartao: formData.Cartao || "",
        Forma_Pagamento: formData.Forma_Pagamento || "PIX",
        Status: formData.Status || "Pago",
        Observacoes: formData.Observacoes || "",
        Veiculo: isFuel ? formData.Veiculo : undefined,
        Km_Atual: isFuel ? parseCurrency(formData.Km_Atual) : undefined,
        Litros: isFuel ? litros : undefined,
        Preco_Litro: isFuel ? precoLitro : undefined,
        Posto: isFuel ? formData.Posto : undefined,
      };

      await onSaveLancamento(itemToSave);
      onCloseModal();
    } catch (err) {
      console.error("Erro ao salvar lançamento:", err);
    } finally {
      setSaving(false);
    }
  };

  // Filtered List
  const filteredList = lancamentos
    .filter((item) => item.Status !== "Excluído")
    .filter((item) => {
      if (filterType === "Despesa") return item.Tipo === "Despesa";
      if (filterType === "Receita") return item.Tipo === "Receita";
      if (filterType === "Abastecimento")
        return item.Tipo === "Abastecimento" || item.Categoria === "ABASTECIMENTO";
      return true;
    })
    .filter(
      (item) =>
        item.Descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.Categoria.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => new Date(b.Data).getTime() - new Date(a.Data).getTime());

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Module Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Lançamentos Financeiros</h2>
          <p className="text-xs text-slate-400">
            Aba oficial <code className="text-emerald-400 font-mono">1_Lancamentos</code> (Fonte principal de dados)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleOpenNew(false)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl text-xs transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Lançamento</span>
          </button>
          <button
            onClick={() => handleOpenNew(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/20 font-medium rounded-xl text-xs transition-colors"
          >
            <Fuel className="w-4 h-4" />
            <span>Abastecer</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Buscar por descrição ou categoria..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {[
            { id: "ALL", label: "Todos" },
            { id: "Despesa", label: "Despesas" },
            { id: "Receita", label: "Receitas" },
            { id: "Abastecimento", label: "Abastecimentos" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0 ${
                filterType === tab.id
                  ? "bg-slate-800 text-emerald-400 border border-emerald-500/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Transactions Table / List */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        {filteredList.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs space-y-2">
            <p>Nenhum lançamento encontrado para os filtros selecionados.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80">
            {filteredList.map((item, idx) => {
              const isReceita = item.Tipo === "Receita";
              const isFuel = item.Tipo === "Abastecimento" || item.Categoria === "ABASTECIMENTO";

              return (
                <div
                  key={`${item.Id || 'lanc'}-${idx}`}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-800/40 transition-colors text-xs"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={`p-2.5 rounded-xl shrink-0 mt-0.5 ${
                        isFuel
                          ? "bg-amber-500/10 text-amber-400"
                          : isReceita
                          ? "bg-teal-500/10 text-teal-400"
                          : "bg-rose-500/10 text-rose-400"
                      }`}
                    >
                      {isFuel ? (
                        <Fuel className="w-4 h-4" />
                      ) : isReceita ? (
                        <TrendingUp className="w-4 h-4" />
                      ) : (
                        <TrendingDown className="w-4 h-4" />
                      )}
                    </div>
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white text-sm truncate">
                          {item.Descricao}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-400 border border-slate-700">
                          {item.Categoria}
                        </span>
                      </div>
                      <p className="text-slate-400 text-[11px]">
                        Data: <span className="text-slate-300">{item.Data}</span> • Conta:{" "}
                        <span className="text-slate-300">{item.Conta || "Principal"}</span>
                        {isFuel && parseCurrency(item.Litros) > 0 && (
                          <span className="text-amber-400 ml-2">
                            • {formatCurrency(item.Litros)}L @ R$ {formatCurrency(item.Preco_Litro)}/L
                            {parseCurrency(item.Km_Atual) > 0 && ` (${item.Km_Atual} KM)`}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 border-t sm:border-0 border-slate-800 pt-2 sm:pt-0">
                    <div className="text-left sm:text-right">
                      <span
                        className={`text-sm font-bold ${
                          isReceita ? "text-teal-400" : "text-slate-200"
                        }`}
                      >
                        {isReceita ? "+" : "-"} R${" "}
                        {formatCurrency(item.Valor)}
                      </span>
                      <p className="text-[10px] text-slate-500">{item.Status}</p>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(item)}
                        className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDeleteLancamento(item.Id)}
                        className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                        title="Excluir (Soft delete)"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl text-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-base text-white">
                {editingItem ? "Editar Lançamento" : "Novo Lançamento / Abastecimento"}
              </h3>
              <button
                onClick={onCloseModal}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Tipo</label>
                  <select
                    value={formData.Tipo}
                    onChange={(e) => {
                      const t = e.target.value as any;
                      setFormData((prev) => ({
                        ...prev,
                        Tipo: t,
                        Categoria: t === "Abastecimento" ? "ABASTECIMENTO" : prev.Categoria,
                      }));
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white"
                  >
                    <option value="Despesa">Despesa</option>
                    <option value="Receita">Receita</option>
                    <option value="Abastecimento">Abastecimento</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Data</label>
                  <input
                    type="date"
                    value={formData.Data}
                    onChange={(e) => setFormData({ ...formData, Data: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Descrição</label>
                <input
                  type="text"
                  placeholder="Ex: Mercado, Salário, Abastecimento Shell..."
                  value={formData.Descricao}
                  onChange={(e) => setFormData({ ...formData, Descricao: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white placeholder-slate-600"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Categoria</label>
                  <input
                    type="text"
                    value={formData.Categoria}
                    onChange={(e) => setFormData({ ...formData, Categoria: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Valor Total (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.Valor || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, Valor: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white font-bold"
                    required={formData.Categoria !== "ABASTECIMENTO"}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Valor Pago (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Ex: 200.00"
                    value={
                      formData.Valor_Pago !== undefined && formData.Valor_Pago !== null
                        ? formData.Valor_Pago || ""
                        : ""
                    }
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        Valor_Pago: e.target.value === "" ? 0 : parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Forma de Pagamento</label>
                  <input
                    type="text"
                    placeholder="Ex: PIX, Cartão, Dinheiro"
                    value={formData.Forma_Pagamento || ""}
                    onChange={(e) => setFormData({ ...formData, Forma_Pagamento: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white"
                  />
                </div>
              </div>

              {/* Extra Fueling Fields if Categoria === ABASTECIMENTO */}
              {(formData.Categoria === "ABASTECIMENTO" || formData.Tipo === "Abastecimento") && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-3">
                  <span className="font-semibold text-amber-400 block flex items-center gap-1.5">
                    <Fuel className="w-4 h-4" /> Detalhes do Abastecimento (Espelho 4_Abastecimentos)
                  </span>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-400 text-[11px] mb-1">Litros</label>
                      <input
                        type="number"
                        step="0.001"
                        placeholder="Ex: 42.5"
                        value={formData.Litros || ""}
                        onChange={(e) => {
                          const lit = parseFloat(e.target.value) || 0;
                          const prc = Number(formData.Preco_Litro || 0);
                          setFormData((prev) => ({
                            ...prev,
                            Litros: lit,
                            Valor: prc > 0 ? lit * prc : prev.Valor,
                          }));
                        }}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 text-[11px] mb-1">Preço/Litro (R$)</label>
                      <input
                        type="number"
                        step="0.001"
                        placeholder="Ex: 5.89"
                        value={formData.Preco_Litro || ""}
                        onChange={(e) => {
                          const prc = parseFloat(e.target.value) || 0;
                          const lit = Number(formData.Litros || 0);
                          setFormData((prev) => ({
                            ...prev,
                            Preco_Litro: prc,
                            Valor: lit > 0 ? lit * prc : prev.Valor,
                          }));
                        }}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-400 text-[11px] mb-1">KM Atual</label>
                      <input
                        type="number"
                        placeholder="Ex: 85200"
                        value={formData.Km_Atual || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, Km_Atual: parseFloat(e.target.value) || 0 })
                        }
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 text-[11px] mb-1">Posto de Combustível</label>
                      <input
                        type="text"
                        placeholder="Ex: Posto Ipiranga Centro"
                        value={formData.Posto || ""}
                        onChange={(e) => setFormData({ ...formData, Posto: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-slate-400 mb-1">Observações</label>
                <textarea
                  rows={2}
                  placeholder="Observações adicionais..."
                  value={formData.Observacoes || ""}
                  onChange={(e) => setFormData({ ...formData, Observacoes: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white placeholder-slate-600 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={onCloseModal}
                  className="px-4 py-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl transition-colors"
                >
                  {saving ? "Salvando..." : "Salvar Lançamento"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
