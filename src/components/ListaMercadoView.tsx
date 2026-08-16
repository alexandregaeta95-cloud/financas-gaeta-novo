import React, { useState } from "react";
import { ShoppingBag, Plus, Check, Trash2, Edit2, X, DollarSign } from "lucide-react";
import { ItemMercado } from "../types";
import { generateNewId } from "../services/api";
import { parseCurrency, formatCurrency } from "../utils/formatters";

interface Props {
  itens: ItemMercado[];
  onSaveItem: (item: ItemMercado) => Promise<void>;
}

export const ListaMercadoView: React.FC<Props> = ({ itens, onSaveItem }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ItemMercado | null>(null);
  const [quickInput, setQuickInput] = useState("");
  const [valorEstDisplay, setValorEstDisplay] = useState("");

  const [form, setForm] = useState<Partial<ItemMercado>>({
    Item: "Leite Integral",
    Categoria: "MERCADO",
    Quantidade: 2,
    Unidade: "L",
    Valor_Unitário: 5.5,
    Valor_Estimado: 11.0,
    Preco_Estimado: 11.0,
    Comprado: false,
    Observação: "",
  });

  // Helper to format currency mask in real-time as user types numbers (e.g. 10000 -> 100,00)
  const formatCurrencyInput = (raw: string): { numeric: number; formatted: string } => {
    const digits = raw.replace(/\D/g, "");
    if (!digits || digits === "0" || digits === "00") {
      return { numeric: 0, formatted: "" };
    }
    const num = Number(digits) / 100;
    const formatted = num.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return { numeric: num, formatted };
  };

  // Calculate totals safely
  const getItemTotal = (item: ItemMercado): number => {
    const directTotal = parseCurrency(item.Valor_Total);
    if (directTotal > 0) return directTotal;
    const estimated = parseCurrency(item.Preco_Estimado ?? item.Valor_Estimado);
    if (estimated > 0) return estimated;
    const qty = parseCurrency(item.Quantidade) || 1;
    const unitPrice = parseCurrency(item.Valor_Unitário);
    return qty * unitPrice;
  };

  const unpurchasedTotal = itens
    .filter((i) => !(i.Comprado === true || i.Comprado === "SIM"))
    .reduce((acc, curr) => acc + getItemTotal(curr), 0);

  const purchasedTotal = itens
    .filter((i) => i.Comprado === true || i.Comprado === "SIM")
    .reduce((acc, curr) => acc + getItemTotal(curr), 0);

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickInput.trim()) return;
    const item: ItemMercado = {
      Id: generateNewId("MERC"),
      Item: quickInput.trim(),
      Categoria: "MERCADO",
      Quantidade: 1,
      Unidade: "un",
      Preco_Estimado: 0,
      Valor_Estimado: 0,
      Comprado: false,
    };
    await onSaveItem(item);
    setQuickInput("");
  };

  const handleOpenModal = (item?: ItemMercado) => {
    if (item) {
      setEditingItem(item);
      const estNum = parseCurrency(item.Preco_Estimado ?? item.Valor_Estimado ?? 0);
      setForm({
        ...item,
        Preco_Estimado: estNum,
        Valor_Estimado: estNum,
      });
      setValorEstDisplay(estNum > 0 ? formatCurrency(estNum) : "");
    } else {
      setEditingItem(null);
      setForm({
        Item: "",
        Categoria: "MERCADO",
        Quantidade: 1,
        Unidade: "un",
        Valor_Unitário: 0,
        Valor_Estimado: 0,
        Preco_Estimado: 0,
        Comprado: false,
        Observação: "",
      });
      setValorEstDisplay("");
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseCurrency(form.Quantidade) || 1;
    const unitPrice = parseCurrency(form.Valor_Unitário);
    let totalVal = parseCurrency(form.Valor_Total);
    if (totalVal === 0 && unitPrice > 0) {
      totalVal = qty * unitPrice;
    }
    const estimatedVal = parseCurrency(form.Preco_Estimado ?? form.Valor_Estimado) || totalVal;

    const item: ItemMercado = {
      Id: editingItem?.Id || generateNewId("MERC"),
      Item: form.Item || "Item",
      Categoria: form.Categoria || "MERCADO",
      Quantidade: qty,
      Unidade: form.Unidade || "un",
      Valor_Unitário: unitPrice,
      Valor_Total: totalVal,
      Valor_Estimado: estimatedVal,
      Preco_Estimado: estimatedVal,
      Data_Pedido: form.Data_Pedido || new Date().toISOString().split("T")[0],
      Data_Compra: form.Data_Compra || "",
      Comprado: form.Comprado === true || form.Comprado === "SIM",
      Observação: form.Observação || "",
    };
    await onSaveItem(item);
    setIsModalOpen(false);
  };

  const handleToggleBought = async (item: ItemMercado) => {
    const isBought = item.Comprado === true || item.Comprado === "SIM";
    const estVal = parseCurrency(item.Preco_Estimado ?? item.Valor_Estimado ?? 0);
    await onSaveItem({
      ...item,
      Preco_Estimado: estVal,
      Valor_Estimado: estVal,
      Comprado: !isBought,
      Data_Compra: !isBought ? new Date().toISOString().split("T")[0] : "",
    });
  };

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-emerald-400" />
            Lista de Mercado
          </h2>
          <p className="text-xs text-slate-400">
            Aba <code className="text-emerald-400 font-mono">16_Lista_De_Mercado</code>
          </p>
        </div>

        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Adicionar Item Detalhado</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
          <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
            Total Estimado (Pendente)
          </span>
          <span className="text-xl font-extrabold text-amber-400">
            R$ {formatCurrency(unpurchasedTotal)}
          </span>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
          <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
            Já Comprado no Mês
          </span>
          <span className="text-xl font-extrabold text-emerald-400">
            R$ {formatCurrency(purchasedTotal)}
          </span>
        </div>
      </div>

      {/* Quick Add Bar */}
      <form onSubmit={handleQuickAdd} className="flex gap-2">
        <input
          type="text"
          placeholder="Adicionar item rápido (ex: Arroz, Feijão, Sabão em pó)..."
          value={quickInput}
          onChange={(e) => setQuickInput(e.target.value)}
          className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white"
        />
        <button
          type="submit"
          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-1 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Adicionar</span>
        </button>
      </form>

      {/* Items List */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-800">
        {itens.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            Sua lista de mercado está vazia.
          </div>
        ) : (
          itens.map((item, idx) => {
            const isBought = item.Comprado === true || item.Comprado === "SIM";
            const itemPrice = getItemTotal(item);

            return (
              <div
                key={`${item.Id || 'item'}-${idx}`}
                className={`p-3.5 flex items-center justify-between gap-3 text-xs transition-colors ${
                  isBought ? "bg-slate-950/50 opacity-60" : "hover:bg-slate-800/40"
                }`}
              >
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleToggleBought(item)}
                    className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                      isBought
                        ? "bg-emerald-500 border-emerald-500 text-slate-950"
                        : "border-slate-700 bg-slate-950 hover:border-emerald-500"
                    }`}
                  >
                    {isBought && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </button>

                  <div>
                    <span
                      className={`font-bold text-sm block ${
                        isBought ? "line-through text-slate-400" : "text-white"
                      }`}
                    >
                      {item.Item}
                    </span>
                    <span className="text-slate-400 text-[10px]">
                      Qtd: {item.Quantidade} {item.Unidade || "un"} • Categoria: {item.Categoria || "MERCADO"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {itemPrice > 0 && (
                    <span className={`font-mono font-bold ${isBought ? "text-slate-500" : "text-emerald-400"}`}>
                      R$ {formatCurrency(itemPrice)}
                    </span>
                  )}

                  <button
                    onClick={() => handleOpenModal(item)}
                    className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs text-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-base text-white">
                {editingItem ? "Editar Item do Mercado" : "Adicionar Item ao Mercado"}
              </h3>
              <button onClick={() => setIsModalOpen(false)}>
                <X className="w-5 h-5 text-slate-400 hover:text-white" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="text-slate-400 block mb-1">Nome do Item</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Leite, Café, Pão"
                  value={form.Item}
                  onChange={(e) => setForm({ ...form, Item: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Quantidade</label>
                  <input
                    type="number"
                    value={form.Quantidade}
                    onChange={(e) => setForm({ ...form, Quantidade: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Unidade</label>
                  <input
                    type="text"
                    value={form.Unidade}
                    onChange={(e) => setForm({ ...form, Unidade: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Valor Est. (R$)</label>
                  <div className="relative flex items-center">
                    <span className="absolute left-2.5 text-slate-400 font-semibold text-xs select-none">
                      R$
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="0,00"
                      value={valorEstDisplay}
                      onChange={(e) => {
                        const { numeric, formatted } = formatCurrencyInput(e.target.value);
                        setValorEstDisplay(formatted);
                        setForm((prev) => ({
                          ...prev,
                          Valor_Estimado: numeric,
                          Preco_Estimado: numeric,
                        }));
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 pl-8 text-white font-bold text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
