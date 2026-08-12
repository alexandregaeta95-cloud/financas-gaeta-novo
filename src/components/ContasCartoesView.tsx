import React, { useState } from "react";
import { CreditCard, Landmark, Plus, Check } from "lucide-react";
import { ContaBancaria, CartaoCredito } from "../types";
import { generateNewId } from "../services/api";

interface Props {
  contas: ContaBancaria[];
  cartoes: CartaoCredito[];
  onSaveConta: (conta: ContaBancaria) => Promise<void>;
  onSaveCartao: (cartao: CartaoCredito) => Promise<void>;
}

export const ContasCartoesView: React.FC<Props> = ({ contas, cartoes, onSaveConta, onSaveCartao }) => {
  const [isContaModalOpen, setIsContaModalOpen] = useState(false);
  const [contaForm, setContaForm] = useState<Partial<ContaBancaria>>({
    Nome: "",
    Banco: "",
    Tipo: "Corrente",
    Saldo_Inicial: 0,
    Saldo_Atual: 0,
    Ativa: true,
  });

  const handleSaveConta = async (e: React.FormEvent) => {
    e.preventDefault();
    const item: ContaBancaria = {
      Id: contaForm.Id || generateNewId("CONTA"),
      Nome: contaForm.Nome || "Nova Conta",
      Banco: contaForm.Banco || "Banco",
      Tipo: contaForm.Tipo || "Corrente",
      Saldo_Inicial: Number(contaForm.Saldo_Inicial) || 0,
      Saldo_Atual: Number(contaForm.Saldo_Atual) || 0,
      Ativa: true,
    };
    await onSaveConta(item);
    setIsContaModalOpen(false);
  };

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Contas & Cartões</h2>
          <p className="text-xs text-slate-400">
            Abas <code className="text-emerald-400 font-mono">5_Contas_Bancarias</code>,{" "}
            <code className="text-emerald-400 font-mono">18_Cartões_De_Crédito</code>
          </p>
        </div>
        <button
          onClick={() => {
            setContaForm({
              Nome: "",
              Banco: "",
              Tipo: "Corrente",
              Saldo_Inicial: 0,
              Saldo_Atual: 0,
              Ativa: true,
            });
            setIsContaModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl text-xs shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Nova Conta</span>
        </button>
      </div>

      {/* Contas Grid */}
      <div className="space-y-3">
        <h3 className="font-bold text-sm text-white flex items-center gap-2">
          <Landmark className="w-4 h-4 text-emerald-400" />
          Contas Bancárias ({contas.length})
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {contas.map((c) => (
            <div key={c.Id} className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-white text-sm">{c.Nome}</h4>
                  <p className="text-[11px] text-slate-400">{c.Banco} ({c.Tipo})</p>
                </div>
                <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
                  <Landmark className="w-4 h-4" />
                </div>
              </div>
              <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-xs">
                <span className="text-slate-400">Saldo Atual:</span>
                <span className="font-bold text-emerald-400 text-sm">
                  R$ {Number(c.Saldo_Atual || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cartões Grid */}
      <div className="space-y-3">
        <h3 className="font-bold text-sm text-white flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-amber-400" />
          Cartões de Crédito ({cartoes.length})
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cartoes.map((card) => (
            <div key={card.Id} className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-white text-sm">{card.Nome}</h4>
                  <p className="text-[11px] text-slate-400">{card.Bandeira}</p>
                </div>
                <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl">
                  <CreditCard className="w-4 h-4" />
                </div>
              </div>
              <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-xs">
                <span className="text-slate-400">Limite Total:</span>
                <span className="font-bold text-slate-200">
                  R$ {Number(card.Limite_Total || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Conta Modal */}
      {isContaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 text-xs text-white">
            <h3 className="font-bold text-base">Cadastrar Conta Bancária (5_Contas_Bancarias)</h3>
            <form onSubmit={handleSaveConta} className="space-y-3">
              <div>
                <label className="block text-slate-400 mb-1">Nome da Conta / Apelido</label>
                <input
                  type="text"
                  placeholder="Ex: Itaú Corrente, Nubank Reserva"
                  value={contaForm.Nome}
                  onChange={(e) => setContaForm({ ...contaForm, Nome: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Instituição Bancária</label>
                <input
                  type="text"
                  placeholder="Ex: Itaú, Nubank, Bradesco"
                  value={contaForm.Banco}
                  onChange={(e) => setContaForm({ ...contaForm, Banco: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Saldo Atual (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={contaForm.Saldo_Atual}
                  onChange={(e) => setContaForm({ ...contaForm, Saldo_Atual: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 font-bold text-emerald-400"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsContaModalOpen(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 font-bold rounded-xl"
                >
                  Salvar Conta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
