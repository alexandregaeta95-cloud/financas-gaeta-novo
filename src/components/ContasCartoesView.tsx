import React, { useState } from "react";
import {
  Landmark,
  CreditCard,
  Plus,
  Edit2,
  Trash2,
  X,
  Wallet,
  TrendingDown,
  Building2,
  DollarSign
} from "lucide-react";
import { ContaBancaria, CartaoCredito, Lancamento } from "../types";
import { generateNewId } from "../services/api";
import { parseCurrency, formatCurrency } from "../utils/formatters";

interface Props {
  contas: ContaBancaria[];
  cartoes: CartaoCredito[];
  lancamentos?: Lancamento[];
  onSaveConta: (conta: ContaBancaria) => Promise<void>;
  onSaveCartao: (cartao: CartaoCredito) => Promise<void>;
}

export const ContasCartoesView: React.FC<Props> = ({
  contas,
  cartoes,
  lancamentos = [],
  onSaveConta,
  onSaveCartao,
}) => {
  const [activeTab, setActiveTab] = useState<"contas" | "cartoes">("contas");

  // Conta Modal State
  const [isContaModalOpen, setIsContaModalOpen] = useState(false);
  const [editingConta, setEditingConta] = useState<ContaBancaria | null>(null);
  const [contaForm, setContaForm] = useState<Partial<ContaBancaria>>({
    Nome: "Conta Corrente Itaú",
    Tipo: "BANCO",
    Saldo_Inicial: 0,
    Saldo_Atual: 0,
    Agência: "",
    Conta: "",
    Limite: 0,
    Cor: "#059669",
    Ativa: true,
  });

  // Cartão Modal State
  const [isCartaoModalOpen, setIsCartaoModalOpen] = useState(false);
  const [editingCartao, setEditingCartao] = useState<CartaoCredito | null>(null);
  const [cartaoForm, setCartaoForm] = useState<Partial<CartaoCredito>>({
    Nome: "Cartão Itaú Mastercard Black",
    Limite: 15000,
    Fechamento: 10,
    Vencimento: 20,
    Banco_ID: contas[0]?.Nome || "",
    Cor: "#1e293b",
    Ativo: true,
    Bandeira: "Mastercard",
  });

  // Calculate dynamic current month spent sum for each card
  const calculateCardSpent = (cartaoName: string) => {
    const currentMonth = new Date().toISOString().substring(0, 7); // YYYY-MM
    return lancamentos
      .filter((l) => {
        const s = String(l.Status || "").toUpperCase();
        return s !== "EXCLUÍDO" && s !== "EXCLUIDO" && s !== "DELETED";
      })
      .filter((l) => (l.Cartão_Id || l.Cartao) === cartaoName)
      .filter((l) => (l.Data || "").startsWith(currentMonth))
      .reduce((acc, curr) => acc + parseCurrency(curr.Valor), 0);
  };

  // Save Conta
  const handleOpenConta = (c?: ContaBancaria) => {
    if (c) {
      setEditingConta(c);
      setContaForm({ ...c });
    } else {
      setEditingConta(null);
      setContaForm({
        Nome: "Conta Corrente Itaú",
        Tipo: "BANCO",
        Saldo_Inicial: 1000,
        Saldo_Atual: 1000,
        Agência: "0123",
        Conta: "45678-9",
        Limite: 5000,
        Cor: "#059669",
        Ativa: true,
      });
    }
    setIsContaModalOpen(true);
  };

  const handleSaveContaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const saldoIni = parseCurrency(contaForm.Saldo_Inicial);
    const saldoAtu = contaForm.Saldo_Atual !== undefined && contaForm.Saldo_Atual !== ""
      ? parseCurrency(contaForm.Saldo_Atual)
      : saldoIni;
    const item: ContaBancaria = {
      Id: editingConta?.Id || generateNewId("CONTA"),
      Nome: contaForm.Nome || "Nova Conta",
      Saldo_Inicial: saldoIni,
      Saldo_Atual: saldoAtu,
      Cor: contaForm.Cor || "#059669",
      Tipo: contaForm.Tipo || "BANCO",
      Agência: contaForm.Agência || "",
      Conta: contaForm.Conta || "",
      Limite: parseCurrency(contaForm.Limite),
      Ativa: contaForm.Ativa !== false,
    };
    await onSaveConta(item);
    setIsContaModalOpen(false);
  };

  // Save Cartão
  const handleOpenCartao = (card?: CartaoCredito) => {
    if (card) {
      setEditingCartao(card);
      setCartaoForm({ ...card });
    } else {
      setEditingCartao(null);
      setCartaoForm({
        Nome: "Cartão Mastercard Black",
        Limite: 15000,
        Fechamento: 10,
        Vencimento: 20,
        Banco_ID: contas[0]?.Nome || "",
        Cor: "#0f172a",
        Ativo: true,
        Bandeira: "Mastercard",
      });
    }
    setIsCartaoModalOpen(true);
  };

  const handleSaveCartaoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const spent = calculateCardSpent(cartaoForm.Nome || "");
    const item: CartaoCredito = {
      Id: editingCartao?.Id || generateNewId("CARD"),
      Nome: cartaoForm.Nome || "Novo Cartão",
      Limite: parseCurrency(cartaoForm.Limite),
      Fechamento: parseCurrency(cartaoForm.Fechamento) || 10,
      Vencimento: parseCurrency(cartaoForm.Vencimento) || 20,
      Cor: cartaoForm.Cor || "#0f172a",
      Banco_ID: cartaoForm.Banco_ID || "",
      Gasto: spent,
      Ativo: cartaoForm.Ativo !== false,
      Bandeira: cartaoForm.Bandeira || "Visa",
    };
    await onSaveCartao(item);
    setIsCartaoModalOpen(false);
  };

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Landmark className="w-5 h-5 text-emerald-400" />
            Contas Bancárias & Cartões de Crédito
          </h2>
          <p className="text-xs text-slate-400">
            Abas <code className="text-emerald-400 font-mono">5_Contas_Bancarias</code> e{" "}
            <code className="text-emerald-400 font-mono">18_Cartões_De_Crédito</code>
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab("contas")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "contas"
                ? "bg-emerald-600 text-white shadow-xs"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Contas Bancárias ({contas.length})
          </button>
          <button
            onClick={() => setActiveTab("cartoes")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "cartoes"
                ? "bg-emerald-600 text-white shadow-xs"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Cartões de Crédito ({cartoes.length})
          </button>
        </div>
      </div>

      {/* 1. CONTAS BANCÁRIAS */}
      {activeTab === "contas" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-400">
              Contas para liquidação de lançamentos
            </span>
            <button
              onClick={() => handleOpenConta()}
              className="flex items-center gap-2 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-xl transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Conta Bancária</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {contas.map((c, idx) => (
              <div
                key={`${c.Id || 'conta'}-${idx}`}
                className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-3 relative hover:border-slate-700 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400">
                      <Landmark className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-base leading-tight">
                        {c.Nome}
                      </h3>
                      <span className="text-[10px] uppercase font-bold text-slate-400 px-2 py-0.5 rounded bg-slate-800 border border-slate-700">
                        {c.Tipo}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleOpenConta(c)}
                    className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <div>
                    <span className="text-slate-500 text-[10px] block">Saldo Inicial</span>
                    <span className="font-semibold text-slate-200">R$ {formatCurrency(c.Saldo_Inicial)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] block">Limite Disponível</span>
                    <span className="font-bold text-emerald-400">R$ {formatCurrency(c.Limite)}</span>
                  </div>
                  {c.Agência && (
                    <div>
                      <span className="text-slate-500 text-[10px] block">Agência</span>
                      <span className="font-mono text-slate-300">{c.Agência}</span>
                    </div>
                  )}
                  {c.Conta && (
                    <div>
                      <span className="text-slate-500 text-[10px] block">Conta</span>
                      <span className="font-mono text-slate-300">{c.Conta}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. CARTÕES DE CRÉDITO */}
      {activeTab === "cartoes" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-400">
              Cartões de crédito com cálculo automático de faturas e gastos do mês
            </span>
            <button
              onClick={() => handleOpenCartao()}
              className="flex items-center gap-2 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-xl transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Cartão de Crédito</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {cartoes.map((card, idx) => {
              const currentSpent = calculateCardSpent(card.Nome);
              const limit = parseCurrency(card.Limite) || 1000;
              const usedPct = Math.min(100, Math.round((currentSpent / limit) * 100));

              return (
                <div
                  key={`${card.Id || 'card'}-${idx}`}
                  className="p-5 bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-2xl space-y-4 relative hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400">
                        <CreditCard className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-base leading-tight">
                          {card.Nome}
                        </h3>
                        <p className="text-xs text-slate-400">
                          {card.Bandeira || "Cartão"} • Fecha dia {card.Fechamento} / Vence dia {card.Vencimento}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleOpenCartao(card)}
                      className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Limit Progress Bar */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Fatura Atual (Gasto Mês):</span>
                      <strong className="text-amber-400">R$ {formatCurrency(currentSpent)}</strong>
                    </div>
                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          usedPct > 80 ? "bg-rose-500" : "bg-amber-500"
                        }`}
                        style={{ width: `${usedPct}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>Limite Total: R$ {formatCurrency(limit)}</span>
                      <span>{usedPct}% do limite</span>
                    </div>
                  </div>

                  {card.Banco_ID && (
                    <div className="text-[11px] text-slate-400 border-t border-slate-800/80 pt-2 flex justify-between">
                      <span>Débito em conta:</span>
                      <strong className="text-slate-200">{card.Banco_ID}</strong>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal Conta */}
      {isContaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs text-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-base text-white">
                {editingConta ? "Editar Conta Bancária" : "Nova Conta Bancária"}
              </h3>
              <button onClick={() => setIsContaModalOpen(false)}>
                <X className="w-5 h-5 text-slate-400 hover:text-white" />
              </button>
            </div>

            <form onSubmit={handleSaveContaSubmit} className="space-y-3">
              <div>
                <label className="text-slate-400 block mb-1">Nome da Conta / Banco</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Itaú Corrente Principal"
                  value={contaForm.Nome}
                  onChange={(e) => setContaForm({ ...contaForm, Nome: e.target.value.toUpperCase() })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white uppercase"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Tipo</label>
                  <select
                    value={contaForm.Tipo}
                    onChange={(e) => setContaForm({ ...contaForm, Tipo: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                  >
                    <option value="BANCO">BANCO</option>
                    <option value="PESSOAL">PESSOAL</option>
                    <option value="INVESTIMENTO">INVESTIMENTO</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Saldo Inicial (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={contaForm.Saldo_Inicial}
                    onChange={(e) => setContaForm({ ...contaForm, Saldo_Inicial: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Agência</label>
                  <input
                    type="text"
                    value={contaForm.Agência}
                    onChange={(e) => setContaForm({ ...contaForm, Agência: e.target.value.toUpperCase() })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Conta</label>
                  <input
                    type="text"
                    value={contaForm.Conta}
                    onChange={(e) => setContaForm({ ...contaForm, Conta: e.target.value.toUpperCase() })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono uppercase"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsContaModalOpen(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl"
                >
                  Salvar Conta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Cartão */}
      {isCartaoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs text-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-base text-white">
                {editingCartao ? "Editar Cartão de Crédito" : "Novo Cartão de Crédito"}
              </h3>
              <button onClick={() => setIsCartaoModalOpen(false)}>
                <X className="w-5 h-5 text-slate-400 hover:text-white" />
              </button>
            </div>

            <form onSubmit={handleSaveCartaoSubmit} className="space-y-3">
              <div>
                <label className="text-slate-400 block mb-1">Nome do Cartão</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Mastercard Black Itaú"
                  value={cartaoForm.Nome}
                  onChange={(e) => setCartaoForm({ ...cartaoForm, Nome: e.target.value.toUpperCase() })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white uppercase"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Limite (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={cartaoForm.Limite}
                    onChange={(e) => setCartaoForm({ ...cartaoForm, Limite: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-bold"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Dia Fechamento</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={cartaoForm.Fechamento}
                    onChange={(e) => setCartaoForm({ ...cartaoForm, Fechamento: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Dia Vencimento</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={cartaoForm.Vencimento}
                    onChange={(e) => setCartaoForm({ ...cartaoForm, Vencimento: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Vincular à Conta Bancária (opcional)</label>
                <select
                  value={cartaoForm.Banco_ID}
                  onChange={(e) => setCartaoForm({ ...cartaoForm, Banco_ID: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                >
                  <option value="">Nenhuma (Independente)</option>
                  {contas.map((c) => (
                    <option key={c.Id} value={c.Nome}>
                      {c.Nome}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCartaoModalOpen(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl"
                >
                  Salvar Cartão
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
