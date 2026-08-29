import React, { useState, useEffect } from "react";
import {
  ShoppingBag,
  Plus,
  Check,
  Trash2,
  Edit2,
  X,
  DollarSign,
  ShoppingCart,
  Loader2,
  CheckCircle2,
  Clock,
  Bell,
  Calendar,
  Camera,
} from "lucide-react";
import { ItemMercado, ContaBancaria, Lancamento } from "../types";
import { generateNewId } from "../services/api";
import { parseCurrency, formatCurrency } from "../utils/formatters";
import { ComboBox } from "./ComboBox";
import { VoiceInput } from "./VoiceInput";
import { VoiceTextArea } from "./VoiceTextArea";
import { LerListaFotoModal } from "./LerListaFotoModal";

interface Props {
  itens: ItemMercado[];
  contas?: ContaBancaria[];
  onSaveItem: (item: ItemMercado) => Promise<void>;
  onDeleteItem?: (id: string) => Promise<void>;
  onSaveLancamento?: (lancamento: Lancamento) => Promise<void>;
  onClearLista?: () => Promise<void>;
}

export const ListaMercadoView: React.FC<Props> = ({
  itens,
  contas = [],
  onSaveItem,
  onDeleteItem,
  onSaveLancamento,
  onClearLista,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ItemMercado | null>(null);
  const [quickInput, setQuickInput] = useState("");
  const [valorEstDisplay, setValorEstDisplay] = useState("");

  // Delete Confirmation State
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    id: string;
    title: string;
    subtitle?: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Modal de Lembrete Geral de Compras
  const [isGeneralReminderModalOpen, setIsGeneralReminderModalOpen] = useState(false);
  const [isReadPhotoModalOpen, setIsReadPhotoModalOpen] = useState(false);
  const [generalReminderDate, setGeneralReminderDate] = useState(() => {
    return localStorage.getItem("gaeta_mercado_general_date") || "";
  });
  const [generalReminderTime, setGeneralReminderTime] = useState(() => {
    return localStorage.getItem("gaeta_mercado_general_time") || "10:00";
  });

  // Campos para a Finalização de Compra
  const [checkoutValorTotal, setCheckoutValorTotal] = useState<number>(0);
  const [checkoutValorTotalDisplay, setCheckoutValorTotalDisplay] = useState<string>("");
  const [checkoutValorPago, setCheckoutValorPago] = useState<number>(0);
  const [checkoutValorPagoDisplay, setCheckoutValorPagoDisplay] = useState<string>("");
  const [checkoutConta, setCheckoutConta] = useState<string>("");
  const [checkoutStatus, setCheckoutStatus] = useState<"Pago" | "Pendente">("Pago");
  const [checkoutObservacoes, setCheckoutObservacoes] = useState<string>("");
  const [isFinalizando, setIsFinalizando] = useState<boolean>(false);
  const [finalizadoSuccess, setFinalizadoSuccess] = useState<boolean>(false);

  // Auto-set default account if available and not selected
  useEffect(() => {
    if (!checkoutConta && contas.length > 0) {
      setCheckoutConta(contas[0].Nome);
    }
  }, [contas, checkoutConta]);

  const defaultCategorias = [
    "MERCADO",
    "HORTIFRUTI",
    "AÇOUGUE",
    "PADARIA",
    "LATICÍNIOS",
    "BEBIDAS",
    "LIMPEZA",
    "HIGIENE",
    "MERCEARIA",
    "CONGELADOS",
    "PET",
    "OUTROS",
  ];

  const categoriasSugeridas = Array.from(
    new Set([
      ...defaultCategorias,
      ...itens
        .map((i) => String(i.Categoria || "").trim().toUpperCase())
        .filter((c) => c.length > 0),
    ])
  );

  const itensSugeridos = Array.from(
    new Set(
      itens
        .map((i) => String(i.Item || "").trim().toUpperCase())
        .filter((name) => name.length > 0)
    )
  ).sort();

  const [form, setForm] = useState<Partial<ItemMercado>>({
    Item: "",
    Categoria: "MERCADO",
    Quantidade: 1,
    Unidade: "UN",
    Valor_Unitário: 0,
    Valor_Estimado: 0,
    Preco_Estimado: 0,
    Data_Lembrete: "",
    Hora_Lembrete: "10:00",
    Lembrete_Ativo: false,
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

  const totalListaEstimado = unpurchasedTotal + purchasedTotal;

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickInput.trim()) return;
    const item: ItemMercado = {
      Id: generateNewId("MERC"),
      Item: quickInput.trim().toUpperCase(),
      Categoria: "MERCADO",
      Quantidade: 1,
      Unidade: "UN",
      Preco_Estimado: 0,
      Valor_Estimado: 0,
      Comprado: false,
    };
    await onSaveItem(item);
    setQuickInput("");
  };

  const handleConfirmBatchItens = async (novosItens: ItemMercado[]) => {
    for (const item of novosItens) {
      await onSaveItem(item);
    }
  };

  const handleOpenModal = (item?: ItemMercado) => {
    if (item) {
      setEditingItem(item);
      const qty =
        item.Quantidade !== undefined && item.Quantidade !== null && !isNaN(Number(item.Quantidade))
          ? Number(item.Quantidade)
          : 1;
      let unitPrice = parseCurrency(item.Valor_Unitário);
      const totalEst = parseCurrency(item.Preco_Estimado ?? item.Valor_Estimado ?? item.Valor_Total);
      if (unitPrice === 0 && totalEst > 0 && qty > 0) {
        unitPrice = totalEst / qty;
      }
      const rawUnit = (item.Unidade || "").toUpperCase().trim();
      const normalizedUnit = rawUnit === "KG" ? "KG" : "UN";
      setForm({
        ...item,
        Quantidade: qty,
        Unidade: normalizedUnit,
        Valor_Unitário: unitPrice,
        Preco_Estimado: totalEst,
        Valor_Estimado: totalEst,
        Data_Lembrete: item.Data_Lembrete || "",
        Hora_Lembrete: item.Hora_Lembrete || "10:00",
        Lembrete_Ativo: item.Lembrete_Ativo !== false && item.Lembrete_Ativo !== "NÃO",
      });
      setValorEstDisplay(unitPrice > 0 ? formatCurrency(unitPrice) : "");
    } else {
      setEditingItem(null);
      setForm({
        Item: "",
        Categoria: "MERCADO",
        Quantidade: 1,
        Unidade: "UN",
        Valor_Unitário: 0,
        Valor_Estimado: 0,
        Preco_Estimado: 0,
        Data_Lembrete: "",
        Hora_Lembrete: "10:00",
        Lembrete_Ativo: false,
        Comprado: false,
        Observação: "",
      });
      setValorEstDisplay("");
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty =
      form.Quantidade !== "" && form.Quantidade !== undefined && !isNaN(Number(form.Quantidade))
        ? Number(form.Quantidade)
        : 1;
    const unitPrice = parseCurrency(form.Valor_Unitário ?? form.Preco_Estimado ?? form.Valor_Estimado);
    const totalEst = qty * unitPrice;

    const item: ItemMercado = {
      Id: editingItem?.Id || generateNewId("MERC"),
      Item: form.Item || "Item",
      Categoria: form.Categoria || "MERCADO",
      Quantidade: qty,
      Unidade: form.Unidade === "KG" ? "KG" : "UN",
      Valor_Unitário: unitPrice,
      Valor_Total: totalEst,
      Valor_Estimado: totalEst,
      Preco_Estimado: totalEst,
      Data_Pedido: form.Data_Pedido || new Date().toISOString().split("T")[0],
      Data_Compra: form.Data_Compra || "",
      Data_Lembrete: form.Data_Lembrete || "",
      Hora_Lembrete: form.Hora_Lembrete || "",
      Lembrete_Ativo: form.Data_Lembrete ? (form.Lembrete_Ativo ? "SIM" : "NÃO") : undefined,
      Comprado: form.Comprado === true || form.Comprado === "SIM",
      Observação: form.Observação || "",
    };
    await onSaveItem(item);
    setIsModalOpen(false);
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirm || !onDeleteItem) return;
    setIsDeleting(true);
    try {
      await onDeleteItem(deleteConfirm.id);
      setDeleteConfirm(null);
    } catch (err: any) {
      console.error("Erro ao excluir item:", err);
      alert(`Erro ao excluir item: ${err.message || err}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSaveGeneralReminder = (e: React.FormEvent) => {
    e.preventDefault();
    if (generalReminderDate) {
      localStorage.setItem("gaeta_mercado_general_date", generalReminderDate);
      localStorage.setItem("gaeta_mercado_general_time", generalReminderTime || "10:00");
    } else {
      localStorage.removeItem("gaeta_mercado_general_date");
      localStorage.removeItem("gaeta_mercado_general_time");
    }
    setIsGeneralReminderModalOpen(false);
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

  // Handler: Finalizar Compra -> Grava em 1_Lancamentos
  const handleFinalizarCompra = async () => {
    if (!onSaveLancamento) {
      alert("Função de salvar lançamento não configurada.");
      return;
    }

    // 1. Descrição: Concatenar nomes de todos os itens da lista
    const itemNames = itens
      .map((i) => (i.Item || "").trim())
      .filter((name) => name.length > 0);
    const descricaoConcatenada =
      itemNames.length > 0 ? itemNames.join(", ") : "SUPERMERCADO";

    // 2. Valor: total digitado pelo usuário no formulário, ou total estimado da lista
    const valorCalculado =
      checkoutValorTotal > 0
        ? checkoutValorTotal
        : totalListaEstimado > 0
        ? totalListaEstimado
        : 0;

    // 3. Valor Pago: valor digitado no campo "Valor Pago" (ou o total se Pago e não informado)
    const valorPagoCalculado =
      checkoutValorPago > 0
        ? checkoutValorPago
        : checkoutStatus === "Pago"
        ? valorCalculado
        : 0;

    setIsFinalizando(true);
    try {
      const novoLancamento: Lancamento = {
        Id: generateNewId("LANC"),
        Data: new Date().toISOString().split("T")[0],
        Tipo: "Despesa",
        Categoria: "SUPERMERCADO",
        Descricao: descricaoConcatenada,
        Valor: valorCalculado,
        Valor_Pago: valorPagoCalculado,
        Conta: checkoutConta || undefined,
        Status: checkoutStatus,
        Observacoes: checkoutObservacoes.trim() || undefined,
      };

      await onSaveLancamento(novoLancamento);

      setFinalizadoSuccess(true);
      setTimeout(() => setFinalizadoSuccess(false), 5000);

      // Limpar formulário de checkout
      setCheckoutValorTotal(0);
      setCheckoutValorTotalDisplay("");
      setCheckoutValorPago(0);
      setCheckoutValorPagoDisplay("");
      setCheckoutObservacoes("");

      // Perguntar se deseja limpar a lista de compras
      if (itens.length > 0 && onClearLista) {
        const querLimpar = window.confirm(
          "Compra finalizada com sucesso e registrada na aba 1_Lancamentos!\n\nDeseja limpar a lista de compras atual?"
        );
        if (querLimpar) {
          await onClearLista();
        }
      }
    } catch (err: any) {
      console.error("Erro ao finalizar compra:", err);
      alert(`Erro ao finalizar compra: ${err.message || err}`);
    } finally {
      setIsFinalizando(false);
    }
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
            {generalReminderDate && (
              <span className="ml-2 inline-flex items-center gap-1 text-teal-400 font-medium">
                • Lembrete agendado: {generalReminderDate} às {generalReminderTime}
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <button
            onClick={() => setIsReadPhotoModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-600/20 to-teal-600/20 hover:from-emerald-600/30 hover:to-teal-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-semibold rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer"
            title="Tirar foto ou enviar imagem de uma lista de compras para extrair itens com IA"
          >
            <Camera className="w-3.5 h-3.5 text-emerald-400" />
            <span>📷 Ler Lista por Foto</span>
          </button>

          <button
            onClick={() => setIsGeneralReminderModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 text-xs font-semibold rounded-xl transition-colors"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>{generalReminderDate ? "⏰ Lembrete Agendado" : "⏰ Agendar Ida ao Mercado"}</span>
          </button>

          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Adicionar Item</span>
          </button>
        </div>
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
        <div className="flex-1">
          <VoiceInput
            type="text"
            placeholder="Adicionar item rápido (ex: Arroz, Feijão, Sabão em pó)..."
            value={quickInput}
            onChange={(e) => setQuickInput(e.target.value.toUpperCase())}
            className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white uppercase focus:outline-none focus:border-emerald-500"
            uppercase
          />
        </div>
        <button
          type="submit"
          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-1 shrink-0 cursor-pointer"
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
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`font-bold text-sm ${
                          isBought ? "line-through text-slate-400" : "text-white"
                        }`}
                      >
                        {item.Item}
                      </span>
                      {!isBought && item.Data_Lembrete && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/20 text-[10px] font-semibold">
                          <Clock className="w-2.5 h-2.5" />
                          <span>
                            {item.Data_Lembrete}
                            {item.Hora_Lembrete ? ` às ${item.Hora_Lembrete}` : ""}
                          </span>
                        </span>
                      )}
                    </div>
                    <span className="text-slate-400 text-[10px]">
                      Qtd: {item.Quantidade} {item.Unidade ? String(item.Unidade).toUpperCase() : "UN"} • Categoria: {item.Categoria || "MERCADO"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {itemPrice > 0 && (
                    <span className={`font-mono font-bold mr-1 ${isBought ? "text-slate-500" : "text-emerald-400"}`}>
                      R$ {formatCurrency(itemPrice)}
                    </span>
                  )}

                  <button
                    onClick={() => handleOpenModal(item)}
                    className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                    title="Editar Item"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() =>
                      setDeleteConfirm({
                        isOpen: true,
                        id: item.Id,
                        title: item.Item || "Item",
                        subtitle: `Qtd: ${item.Quantidade} ${item.Unidade ? String(item.Unidade).toUpperCase() : "UN"} • Categoria: ${item.Categoria || "MERCADO"}`,
                      })
                    }
                    className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                    title="Excluir Item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Seção Finalizar Compra */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-sm text-white">Finalizar Compra</h3>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <span>Total da lista: <strong className="text-emerald-400 font-mono">R$ {formatCurrency(totalListaEstimado)}</strong></span>
            {finalizadoSuccess && (
              <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" /> Lançamento gravado!
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          {/* Campo Valor Total */}
          <div>
            <label className="text-slate-400 block mb-1 font-medium">Valor Total</label>
            <div className="relative flex items-center">
              <span className="absolute left-3 text-slate-400 font-semibold text-xs select-none">
                R$
              </span>
              <input
                type="text"
                inputMode="numeric"
                placeholder={formatCurrency(totalListaEstimado > 0 ? totalListaEstimado : 0)}
                value={checkoutValorTotalDisplay}
                onChange={(e) => {
                  const { numeric, formatted } = formatCurrencyInput(e.target.value);
                  setCheckoutValorTotalDisplay(formatted);
                  setCheckoutValorTotal(numeric);
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 pl-9 text-white font-bold text-xs focus:outline-hidden focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Campo Valor Pago */}
          <div>
            <label className="text-slate-400 block mb-1 font-medium">Valor Pago</label>
            <div className="relative flex items-center">
              <span className="absolute left-3 text-slate-400 font-semibold text-xs select-none">
                R$
              </span>
              <input
                type="text"
                inputMode="numeric"
                placeholder="0,00"
                value={checkoutValorPagoDisplay}
                onChange={(e) => {
                  const { numeric, formatted } = formatCurrencyInput(e.target.value);
                  setCheckoutValorPagoDisplay(formatted);
                  setCheckoutValorPago(numeric);
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 pl-9 text-white font-bold text-xs focus:outline-hidden focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Campo Conta */}
          <div>
            <label className="text-slate-400 block mb-1 font-medium">Conta</label>
            <select
              value={checkoutConta}
              onChange={(e) => setCheckoutConta(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white text-xs font-semibold focus:outline-hidden focus:border-emerald-500"
            >
              <option value="">Selecione uma conta...</option>
              {contas.map((c) => (
                <option key={c.Id || c.Nome} value={c.Nome}>
                  {c.Nome} {c.Tipo ? `(${c.Tipo})` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Campo Status */}
          <div>
            <label className="text-slate-400 block mb-1 font-medium">Status</label>
            <select
              value={checkoutStatus}
              onChange={(e) => setCheckoutStatus(e.target.value as "Pago" | "Pendente")}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white text-xs font-semibold focus:outline-hidden focus:border-emerald-500"
            >
              <option value="Pago">Pago</option>
              <option value="Pendente">Pendente</option>
            </select>
          </div>

          {/* Campo Observações */}
          <div>
            <label className="text-slate-400 block mb-1 font-medium">Observações</label>
            <VoiceInput
              type="text"
              placeholder="Ex: Compras do mês"
              value={checkoutObservacoes}
              onChange={(e) => setCheckoutObservacoes(e.target.value.toUpperCase())}
              className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white text-xs uppercase focus:outline-hidden focus:border-emerald-500"
              uppercase
            />
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={handleFinalizarCompra}
            disabled={isFinalizando}
            className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-colors shadow-lg shadow-emerald-950/40"
          >
            {isFinalizando ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Gravando em Lançamentos...</span>
              </>
            ) : (
              <>
                <ShoppingCart className="w-4 h-4" />
                <span>Finalizar Compra</span>
              </>
            )}
          </button>
        </div>
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
                <ComboBox
                  required
                  placeholder="Ex: Leite, Café, Pão"
                  value={form.Item || ""}
                  onChange={(val) => setForm({ ...form, Item: val })}
                  options={itensSugeridos}
                  showVoice
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Categoria</label>
                <ComboBox
                  placeholder="Ex: MERCADO, HORTIFRUTI, LIMPEZA, BEBIDAS..."
                  value={form.Categoria || ""}
                  onChange={(val) => setForm({ ...form, Categoria: val })}
                  options={categoriasSugeridas}
                  showVoice
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Quantidade</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="1"
                    value={form.Quantidade !== undefined && form.Quantidade !== null ? form.Quantidade : ""}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => {
                      const v = e.target.value;
                      setForm((prev) => ({
                        ...prev,
                        Quantidade: v === "" ? ("" as any) : Number(v),
                      }));
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-semibold focus:outline-hidden focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Unidade</label>
                  <select
                    value={form.Unidade === "KG" ? "KG" : "UN"}
                    onChange={(e) => setForm({ ...form, Unidade: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white text-xs font-semibold focus:outline-hidden focus:border-emerald-500"
                  >
                    <option value="UN">UN</option>
                    <option value="KG">KG</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">
                    Valor Est. (R$) <span className="text-[10px] text-slate-500 font-normal">(Unitário)</span>
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-2.5 text-slate-400 font-semibold text-xs select-none">
                      R$
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="0,00"
                      value={valorEstDisplay}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => {
                        const { numeric, formatted } = formatCurrencyInput(e.target.value);
                        setValorEstDisplay(formatted);
                        setForm((prev) => ({
                          ...prev,
                          Valor_Unitário: numeric,
                          Valor_Estimado: numeric,
                          Preco_Estimado: numeric,
                        }));
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 pl-8 text-white font-bold text-xs focus:outline-hidden focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Total Estimado</label>
                  <div className="relative flex items-center">
                    <span className="absolute left-2.5 text-emerald-400 font-semibold text-xs select-none">
                      R$
                    </span>
                    <input
                      type="text"
                      readOnly
                      tabIndex={-1}
                      value={formatCurrency(
                        (form.Quantidade !== "" && form.Quantidade !== undefined && !isNaN(Number(form.Quantidade))
                          ? Number(form.Quantidade)
                          : 0) *
                          (parseCurrency(form.Valor_Unitário ?? form.Preco_Estimado ?? form.Valor_Estimado) || 0)
                      )}
                      className="w-full bg-slate-950/70 border border-slate-800 text-emerald-400 font-mono font-bold rounded-xl p-2.5 pl-8 text-xs cursor-default select-none focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>

              {/* Lembrete de Compra deste Item */}
              <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2">
                <div className="flex items-center gap-1.5 text-teal-400 font-semibold text-xs">
                  <Clock className="w-4 h-4" />
                  <span>Lembrete de Compra (Opcional)</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-slate-400 block mb-1 text-[11px]">Data do Lembrete</label>
                    <input
                      type="date"
                      value={form.Data_Lembrete || ""}
                      onChange={(e) => setForm({ ...form, Data_Lembrete: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1 text-[11px]">Horário</label>
                    <input
                      type="time"
                      value={form.Hora_Lembrete || "10:00"}
                      onChange={(e) => setForm({ ...form, Hora_Lembrete: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Observações */}
              <div>
                <label className="text-slate-400 block mb-1">Observações</label>
                <VoiceTextArea
                  rows={2}
                  placeholder="Ex: Marca de preferência, detalhes..."
                  value={form.Observação || ""}
                  onChange={(e) => setForm({ ...form, Observação: e.target.value })}
                  className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white placeholder-slate-600 resize-none uppercase text-xs focus:outline-none focus:border-emerald-500"
                  uppercase
                />
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

      {/* Modal Lembrete Geral de Ida ao Mercado */}
      {isGeneralReminderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs text-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-teal-400">
                <Clock className="w-5 h-5" />
                <h3 className="font-bold text-base text-white">Agendar Ida ao Mercado</h3>
              </div>
              <button onClick={() => setIsGeneralReminderModalOpen(false)}>
                <X className="w-5 h-5 text-slate-400 hover:text-white" />
              </button>
            </div>

            <p className="text-slate-300 text-xs leading-relaxed">
              Defina o dia e horário que você pretende ir ao supermercado. O app enviará uma notificação lembrando você de conferir seus itens pendentes!
            </p>

            <form onSubmit={handleSaveGeneralReminder} className="space-y-3">
              <div>
                <label className="text-slate-400 block mb-1 font-medium">Data da Ida ao Mercado</label>
                <input
                  type="date"
                  required
                  value={generalReminderDate}
                  onChange={(e) => setGeneralReminderDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-medium">Horário Previsto</label>
                <input
                  type="time"
                  required
                  value={generalReminderTime}
                  onChange={(e) => setGeneralReminderTime(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                />
              </div>

              <div className="flex justify-between items-center gap-2 pt-3 border-t border-slate-800">
                {generalReminderDate ? (
                  <button
                    type="button"
                    onClick={() => {
                      setGeneralReminderDate("");
                      localStorage.removeItem("gaeta_mercado_general_date");
                      localStorage.removeItem("gaeta_mercado_general_time");
                      setIsGeneralReminderModalOpen(false);
                    }}
                    className="text-rose-400 hover:text-rose-300 text-xs font-semibold"
                  >
                    Remover Lembrete
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsGeneralReminderModalOpen(false)}
                    className="px-3 py-1.5 text-slate-400 hover:text-white"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl"
                  >
                    Salvar Lembrete
                  </button>
                </div>
              </div>
            </form>
          </div>
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
                  Excluir Item da Lista de Mercado
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

            <p className="text-xs text-slate-400">
              Tem certeza que deseja excluir este item? Esta ação removerá o registro da lista.
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white rounded-xl flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Excluindo...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Excluir</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Leitura de Lista por Foto (Gemini Vision) */}
      <LerListaFotoModal
        isOpen={isReadPhotoModalOpen}
        onClose={() => setIsReadPhotoModalOpen(false)}
        onConfirmItens={handleConfirmBatchItens}
        generateNewId={generateNewId}
      />
    </div>
  );
};
