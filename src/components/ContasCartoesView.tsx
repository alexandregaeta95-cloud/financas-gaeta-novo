import React, { useState } from "react";
import {
  Landmark,
  CreditCard,
  Plus,
  Edit2,
  Trash2,
  X,
  FileText,
  Receipt,
  Check,
  Clock,
} from "lucide-react";
import { ContaBancaria, CartaoCredito, Lancamento } from "../types";
import { generateNewId } from "../services/api";
import { parseCurrency, formatCurrency, formatCurrencyInput, calculateCardBalance } from "../utils/formatters";
import { getFaturasPorCartao } from "../utils/faturaCartao";
import { ComboBox } from "./ComboBox";
import { VoiceInput } from "./VoiceInput";

const BANCOS_SUGESTOES = [
  "ITAÚ",
  "BRADESCO",
  "NUBANK",
  "BANCO DO BRASIL",
  "SANTANDER",
  "CAIXA ECONÔMICA",
  "INTER",
  "C6 BANK",
  "BTG PACTUAL",
  "SICOOB",
  "SICREDI",
  "XP INVESTIMENTOS",
  "MERCADO PAGO",
  "PAGBANK",
  "PICPAY",
];

const BANDEIRAS_SUGESTOES = [
  "MASTERCARD",
  "VISA",
  "ELO",
  "AMEX",
  "HIPERCARD",
  "ALELO",
  "TICKET",
  "SODEXO",
];

interface Props {
  contas: ContaBancaria[];
  cartoes: CartaoCredito[];
  lancamentos?: Lancamento[];
  onSaveConta: (conta: ContaBancaria) => Promise<void>;
  onSaveCartao: (cartao: CartaoCredito) => Promise<void>;
  onDeleteConta: (id: string) => Promise<void>;
  onDeleteCartao: (id: string) => Promise<void>;
}

export const ContasCartoesView: React.FC<Props> = ({
  contas,
  cartoes,
  lancamentos = [],
  onSaveConta,
  onSaveCartao,
  onDeleteConta,
  onDeleteCartao,
}) => {
  const [activeTab, setActiveTab] = useState<"contas" | "cartoes">("contas");

  // Delete Confirmation State
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    type: "conta" | "cartao";
    id: string;
    title: string;
    subtitle?: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Conta Modal State
  const [isContaModalOpen, setIsContaModalOpen] = useState(false);
  const [editingConta, setEditingConta] = useState<ContaBancaria | null>(null);
  const [saldoInicialDisplay, setSaldoInicialDisplay] = useState<string>("");
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
  const [limiteCartaoDisplay, setLimiteCartaoDisplay] = useState<string>("");
  const [cartaoForm, setCartaoForm] = useState<Partial<CartaoCredito>>({
    Nome: "CARTÃO MASTERCARD BLACK",
    Bandeira: "MASTERCARD",
    Limite_Total: 15000,
    Dia_Fechamento: 10,
    Dia_Vencimento: 20,
    Banco_ID: contas[0]?.Nome ? contas[0].Nome.toUpperCase() : "",
    Cor_Hex: "#1E293B",
    Ativo: "SIM",
  });

  // Histórico de Faturas Modal State
  const [historicoFaturasCartao, setHistoricoFaturasCartao] = useState<CartaoCredito | null>(null);

  const handleMarcarFaturaPaga = async (cartao: CartaoCredito, faturaKey: string, faturaLabel: string, saldo: number) => {
    const valorFmt = formatCurrency(saldo);
    const msg = `Deseja marcar a fatura de ${faturaLabel} (Saldo: R$ ${valorFmt}) do cartão ${cartao.Nome} como PAGA?\n\nIsso atualizará todas as faturas até este mês como pagas.`;
    if (!window.confirm(msg)) {
      return;
    }

    const updatedCartao: CartaoCredito = {
      ...cartao,
      Ultima_Fatura_Paga: faturaKey,
    };

    // Atualiza o modal imediatamente (otimista), salva em segundo plano
    setHistoricoFaturasCartao(updatedCartao);
    onSaveCartao(updatedCartao);
  };

  // Calculate dynamic current month spent sum for each card using calculateCardBalance
  const calculateCardSpent = (cartaoName: string) => {
    const cNameUpper = String(cartaoName || "").trim().toUpperCase();
    const card =
      cartoes.find((c) => String(c.Nome || "").trim().toUpperCase() === cNameUpper) ||
      ({ Nome: cartaoName } as CartaoCredito);
    return calculateCardBalance(card, lancamentos).currentSpent;
  };

  // Save Conta
  const handleOpenConta = (c?: ContaBancaria) => {
    if (c) {
      setEditingConta(c);
      setContaForm({ ...c });
      const valNum = parseCurrency(c.Saldo_Inicial);
      setSaldoInicialDisplay(valNum !== 0 ? formatCurrency(valNum) : "");
    } else {
      setEditingConta(null);
      setContaForm({
        Nome: "CONTA CORRENTE ITAÚ",
        Tipo: "BANCO",
        Saldo_Inicial: 1000,
        Saldo_Atual: 1000,
        Agência: "0123",
        Conta: "45678-9",
        Limite: 5000,
        Cor: "#059669",
        Ativa: true,
      });
      setSaldoInicialDisplay(formatCurrency(1000));
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
      Nome: String(contaForm.Nome || "NOVA CONTA").trim().toUpperCase(),
      Saldo_Inicial: saldoIni,
      Saldo_Atual: saldoAtu,
      Cor: contaForm.Cor || "#059669",
      Tipo: String(contaForm.Tipo || "BANCO").trim().toUpperCase(),
      Agência: String(contaForm.Agência || "").trim().toUpperCase(),
      Conta: String(contaForm.Conta || "").trim().toUpperCase(),
      Limite: parseCurrency(contaForm.Limite),
      Ativa: contaForm.Ativa !== false,
    };
    setIsContaModalOpen(false);
    onSaveConta(item);
  };

  // Save Cartão
  const handleOpenCartao = (card?: CartaoCredito) => {
    if (card) {
      setEditingCartao(card);
      const lim = parseCurrency(card.Limite_Total ?? card.Limite ?? 0);
      const fech = parseCurrency(card.Dia_Fechamento ?? card.Fechamento ?? 10);
      const venc = parseCurrency(card.Dia_Vencimento ?? card.Vencimento ?? 20);
      const cor = String(card.Cor_Hex ?? card.Cor ?? "#1E293B").toUpperCase();
      const band = String(card.Bandeira || "MASTERCARD").toUpperCase();
      const isAtivo = card.Ativo !== false && String(card.Ativo).toUpperCase() !== "NÃO" && String(card.Ativo).toUpperCase() !== "NAO";

      setCartaoForm({
        ...card,
        Nome: String(card.Nome || "").toUpperCase(),
        Bandeira: band,
        Limite_Total: lim,
        Dia_Fechamento: fech,
        Dia_Vencimento: venc,
        Cor_Hex: cor,
        Ativo: isAtivo ? "SIM" : "NÃO",
        Banco_ID: card.Banco_ID ? String(card.Banco_ID).toUpperCase() : "",
      });
      setLimiteCartaoDisplay(lim !== 0 ? formatCurrency(lim) : "");
    } else {
      setEditingCartao(null);
      setCartaoForm({
        Nome: "CARTÃO MASTERCARD BLACK",
        Bandeira: "MASTERCARD",
        Limite_Total: 15000,
        Dia_Fechamento: 10,
        Dia_Vencimento: 20,
        Banco_ID: contas[0]?.Nome ? String(contas[0].Nome).toUpperCase() : "",
        Cor_Hex: "#1E293B",
        Ativo: "SIM",
      });
      setLimiteCartaoDisplay(formatCurrency(15000));
    }
    setIsCartaoModalOpen(true);
  };

  const handleSaveCartaoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nomeUpper = String(cartaoForm.Nome || "NOVO CARTÃO").trim().toUpperCase();
    const bandeiraUpper = String(cartaoForm.Bandeira || "MASTERCARD").trim().toUpperCase();
    const limTotal = parseCurrency(cartaoForm.Limite_Total ?? cartaoForm.Limite ?? 0);
    const diaFech = parseCurrency(cartaoForm.Dia_Fechamento ?? cartaoForm.Fechamento ?? 10) || 10;
    const diaVenc = parseCurrency(cartaoForm.Dia_Vencimento ?? cartaoForm.Vencimento ?? 20) || 20;
    const corHex = String(cartaoForm.Cor_Hex ?? cartaoForm.Cor ?? "#1E293B").trim().toUpperCase();
    const isAtivo = cartaoForm.Ativo !== false && String(cartaoForm.Ativo).toUpperCase() !== "NÃO" && String(cartaoForm.Ativo).toUpperCase() !== "NAO";
    const spent = calculateCardSpent(nomeUpper);

    // Mapeamento exato das colunas da aba 18_Cartões_De_Crédito:
    // A-Id, B-Nome, C-Bandeira, D-Limite_Total, E-Dia_Fechamento, F-Dia_Vencimento, G-Cor_Hex, H-Ativo
    const item: CartaoCredito = {
      Id: editingCartao?.Id || generateNewId("CARD"),
      Nome: nomeUpper,
      Bandeira: bandeiraUpper,
      Limite_Total: limTotal,
      Dia_Fechamento: diaFech,
      Dia_Vencimento: diaVenc,
      Cor_Hex: corHex,
      Ativo: isAtivo ? "SIM" : "NÃO",
      Ultima_Fatura_Paga: cartaoForm.Ultima_Fatura_Paga || editingCartao?.Ultima_Fatura_Paga || "",
      // Aliases para compatibilidade
      Limite: limTotal,
      Fechamento: diaFech,
      Vencimento: diaVenc,
      Cor: corHex,
      Banco_ID: cartaoForm.Banco_ID ? String(cartaoForm.Banco_ID).trim().toUpperCase() : "",
      Gasto: spent,
    };

    setIsCartaoModalOpen(false);
    onSaveCartao(item);
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
              className="flex items-center gap-2 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-xl transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Conta Bancária</span>
            </button>
          </div>

          {contas.length === 0 ? (
            <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl text-slate-500 text-xs">
              Nenhuma conta bancária cadastrada ainda.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {contas.map((c, idx) => (
                <div
                  key={`${c.Id || 'conta'}-${idx}`}
                  className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-3 relative hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-xl bg-slate-800 text-slate-300 border border-slate-700/60">
                        <Landmark className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-base leading-tight">
                          {c.Nome}
                        </h3>
                        <span className="text-[10px] uppercase font-semibold text-slate-300 px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700/70 inline-block mt-0.5">
                          {c.Tipo}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenConta(c)}
                        className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                        title="Editar Conta"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() =>
                          setDeleteConfirm({
                            isOpen: true,
                            type: "conta",
                            id: c.Id,
                            title: c.Nome,
                            subtitle: `Tipo: ${c.Tipo} • Saldo: R$ ${formatCurrency(c.Saldo_Atual ?? c.Saldo_Inicial)}`,
                          })
                        }
                        className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                        title="Excluir Conta Bancária"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <div>
                      <span className="text-slate-500 text-[10px] block">Saldo Atual</span>
                      <span className={`font-bold ${(c.Saldo_Atual ?? c.Saldo_Inicial) >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        R$ {formatCurrency(c.Saldo_Atual ?? c.Saldo_Inicial)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] block">Saldo Inicial</span>
                      <span className="font-semibold text-slate-300">R$ {formatCurrency(c.Saldo_Inicial)}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] block">Limite Disponível</span>
                      <span className="font-semibold text-slate-300">
                        R$ {formatCurrency(c.Saldo_Atual ?? c.Saldo_Inicial)}
                      </span>
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
          )}
        </div>
      )}

      {/* 2. CARTÕES DE CRÉDITO */}
      {activeTab === "cartoes" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-400">
              Cartões de crédito com cálculo automático de limite disponível, faturas e abatimentos
            </span>
            <button
              onClick={() => handleOpenCartao()}
              className="flex items-center gap-2 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-xl transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Cartão de Crédito</span>
            </button>
          </div>

          {/* Cards Grid */}
          {cartoes.length === 0 ? (
            <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl text-slate-500 text-xs">
              Nenhum cartão de crédito cadastrado ainda.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {cartoes.map((card, idx) => {
                const cardBal = calculateCardBalance(card, lancamentos);
                const fechamento = card.Dia_Fechamento ?? card.Fechamento ?? 10;
                const vencimento = card.Dia_Vencimento ?? card.Vencimento ?? 20;
                const usedPct = cardBal.totalLimit > 0
                  ? Math.min(100, Math.round((cardBal.currentSpent / cardBal.totalLimit) * 100))
                  : 0;

                return (
                  <div
                    key={`${card.Id || 'card'}-${idx}`}
                    className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-4 relative hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-3 rounded-xl bg-slate-800 text-slate-300 border border-slate-700/60">
                          <CreditCard className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-bold text-white text-base leading-tight uppercase">
                            {card.Nome}
                          </h3>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] uppercase font-semibold text-slate-300 px-1.5 py-0.5 rounded-md bg-slate-800 border border-slate-700/70">
                              {card.Bandeira || "CARTÃO"}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              Fecha dia {fechamento} / Vence dia {vencimento}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenCartao(card)}
                          className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                          title="Editar Cartão"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() =>
                            setDeleteConfirm({
                              isOpen: true,
                              type: "cartao",
                              id: card.Id,
                              title: card.Nome,
                              subtitle: `Bandeira: ${card.Bandeira || "CARTÃO"} • Limite Total: R$ ${formatCurrency(card.Limite_Total ?? card.Limite ?? 0)}`,
                            })
                          }
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                          title="Excluir Cartão de Crédito"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Saldo / Limite Highlights */}
                    <div className="grid grid-cols-2 gap-2 text-xs bg-slate-950 p-3 rounded-xl border border-slate-800/80">
                      <div>
                        <span className="text-slate-500 text-[10px] block">Limite Disponível</span>
                        <span className={`font-bold text-sm ${cardBal.availableLimit > 0 ? "text-emerald-400" : "text-rose-400"}`}>
                          R$ {formatCurrency(cardBal.availableLimit)}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[10px] block">Fatura Atual</span>
                        <span className="font-bold text-white text-sm">
                          R$ {formatCurrency(cardBal.currentSpent)}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[10px] block">Limite Total</span>
                        <span className="font-semibold text-slate-300">
                          R$ {formatCurrency(cardBal.totalLimit)}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[10px] block">Total Pago / Abatido</span>
                        <span className="font-semibold text-slate-400">
                          R$ {formatCurrency(cardBal.paymentsTotal)}
                        </span>
                      </div>
                    </div>

                    {/* Botão Ver Histórico de Faturas */}
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => setHistoricoFaturasCartao(card)}
                        className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1.5 transition-colors py-0.5"
                        title="Ver histórico de faturas deste cartão"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Ver Histórico de Faturas</span>
                      </button>
                    </div>

                    {/* Limit Progress Bar */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">Uso do Limite:</span>
                        <span className={`font-semibold ${usedPct > 80 ? "text-rose-400" : "text-slate-300"}`}>
                          {usedPct}% utilizado
                        </span>
                      </div>
                      <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                        <div
                          className={`h-full transition-all ${
                            usedPct > 80 ? "bg-rose-500" : "bg-slate-500"
                          }`}
                          style={{ width: `${usedPct}%` }}
                        />
                      </div>
                    </div>

                    {card.Banco_ID && (
                      <div className="text-[11px] text-slate-400 border-t border-slate-800/80 pt-2 flex justify-between">
                        <span>Débito / Vinculado a:</span>
                        <strong className="text-slate-200 uppercase">{card.Banco_ID}</strong>
                      </div>
                    )}
                  </div>
                );
              })}
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
                  {deleteConfirm.type === "conta"
                    ? "Excluir Conta Bancária"
                    : "Excluir Cartão de Crédito"}
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
                onClick={() => {
                  if (!deleteConfirm) return;
                  const target = deleteConfirm;
                  setDeleteConfirm(null);
                  if (target.type === "conta") {
                    onDeleteConta(target.id);
                  } else if (target.type === "cartao") {
                    onDeleteCartao(target.id);
                  }
                }}
                disabled={isDeleting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 shadow-lg shadow-rose-950/40"
              >
                <Trash2 className="w-4 h-4" />
                <span>Confirmar Exclusão</span>
              </button>
            </div>
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
                <ComboBox
                  required
                  placeholder="Ex: Itaú Corrente Principal"
                  value={contaForm.Nome}
                  onChange={(val) => setContaForm({ ...contaForm, Nome: val })}
                  options={BANCOS_SUGESTOES}
                  showVoice
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
                  <div className="relative flex items-center">
                    <span className="absolute left-3 text-slate-400 font-semibold text-sm select-none">
                      R$
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="0,00"
                      value={saldoInicialDisplay}
                      onChange={(e) => {
                        const { numeric, formatted } = formatCurrencyInput(e.target.value);
                        setSaldoInicialDisplay(formatted);
                        setContaForm((prev) => ({
                          ...prev,
                          Saldo_Inicial: numeric,
                        }));
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 pl-10 text-white font-bold"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Agência</label>
                  <VoiceInput
                    type="text"
                    value={contaForm.Agência}
                    onChange={(e) => setContaForm({ ...contaForm, Agência: e.target.value.toUpperCase() })}
                    className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono uppercase"
                    uppercase
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Conta</label>
                  <VoiceInput
                    type="text"
                    value={contaForm.Conta}
                    onChange={(e) => setContaForm({ ...contaForm, Conta: e.target.value.toUpperCase() })}
                    className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono uppercase"
                    uppercase
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
                <VoiceInput
                  type="text"
                  required
                  placeholder="EX: NUBANK MASTERCARD BLACK"
                  value={cartaoForm.Nome}
                  onChange={(e) => setCartaoForm({ ...cartaoForm, Nome: e.target.value.toUpperCase() })}
                  className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white uppercase font-semibold"
                  uppercase
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Bandeira</label>
                  <ComboBox
                    value={cartaoForm.Bandeira || "MASTERCARD"}
                    onChange={(val) => setCartaoForm({ ...cartaoForm, Bandeira: val })}
                    options={BANDEIRAS_SUGESTOES}
                    placeholder="Selecione ou digite..."
                    showVoice
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Limite Total (R$)</label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3 text-slate-400 font-semibold text-sm select-none">
                      R$
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      required
                      placeholder="0,00"
                      value={limiteCartaoDisplay}
                      onChange={(e) => {
                        const { numeric, formatted } = formatCurrencyInput(e.target.value);
                        setLimiteCartaoDisplay(formatted);
                        setCartaoForm((prev) => ({
                          ...prev,
                          Limite_Total: numeric,
                          Limite: numeric,
                        }));
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 pl-10 text-white font-bold"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Dia Fechamento (1-31)</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    required
                    value={cartaoForm.Dia_Fechamento ?? cartaoForm.Fechamento ?? 10}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setCartaoForm({ ...cartaoForm, Dia_Fechamento: Number(e.target.value), Fechamento: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Dia Vencimento (1-31)</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    required
                    value={cartaoForm.Dia_Vencimento ?? cartaoForm.Vencimento ?? 20}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setCartaoForm({ ...cartaoForm, Dia_Vencimento: Number(e.target.value), Vencimento: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Cor de Identificação</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={cartaoForm.Cor_Hex || cartaoForm.Cor || "#1E293B"}
                      onChange={(e) => setCartaoForm({ ...cartaoForm, Cor_Hex: e.target.value.toUpperCase(), Cor: e.target.value.toUpperCase() })}
                      className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-0 p-0"
                    />
                    <input
                      type="text"
                      value={cartaoForm.Cor_Hex || cartaoForm.Cor || "#1E293B"}
                      onChange={(e) => setCartaoForm({ ...cartaoForm, Cor_Hex: e.target.value.toUpperCase(), Cor: e.target.value.toUpperCase() })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white font-mono text-xs uppercase"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Status</label>
                  <select
                    value={cartaoForm.Ativo === false || cartaoForm.Ativo === "NÃO" || cartaoForm.Ativo === "NAO" ? "NÃO" : "SIM"}
                    onChange={(e) => setCartaoForm({ ...cartaoForm, Ativo: e.target.value === "SIM" ? "SIM" : "NÃO" })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-semibold"
                  >
                    <option value="SIM">ATIVO (SIM)</option>
                    <option value="NÃO">INATIVO (NÃO)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Vincular à Conta Bancária (opcional)</label>
                <ComboBox
                  value={cartaoForm.Banco_ID || ""}
                  onChange={(val) => setCartaoForm({ ...cartaoForm, Banco_ID: val })}
                  options={contas.map((c) => ({
                    value: c.Nome.toUpperCase(),
                    label: c.Nome.toUpperCase(),
                    hint: c.Tipo ? c.Tipo.toUpperCase() : undefined,
                  }))}
                  placeholder="NENHUMA (INDEPENDENTE)"
                  uppercase={true}
                  allowClear={true}
                  showVoice={true}
                />
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

      {/* Modal Histórico de Faturas */}
      {historicoFaturasCartao && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs text-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-5 shadow-2xl space-y-4 text-slate-200 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">
                    Histórico de Faturas
                  </h3>
                  <p className="text-xs text-slate-400">
                    {historicoFaturasCartao.Nome} • Fechamento dia {historicoFaturasCartao.Dia_Fechamento ?? historicoFaturasCartao.Fechamento ?? 10} • Vencimento dia {historicoFaturasCartao.Dia_Vencimento ?? historicoFaturasCartao.Vencimento ?? 20}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setHistoricoFaturasCartao(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Lista de Faturas */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              {(() => {
                const faturas = getFaturasPorCartao(historicoFaturasCartao, lancamentos);
                if (faturas.length === 0) {
                  return (
                    <div className="p-8 text-center text-slate-500 text-xs">
                      Nenhum lançamento vinculado a este cartão encontrado.
                    </div>
                  );
                }
                return faturas.map((fat) => {
                  const dataVencStr = !isNaN(fat.vencimento.getTime())
                    ? fat.vencimento.toLocaleDateString("pt-BR")
                    : "";
                  return (
                    <div
                      key={fat.faturaKey}
                      className="bg-slate-950 border border-slate-800/80 rounded-xl p-3 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-xs">
                            {fat.label}
                          </span>
                          {fat.paga ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold border bg-emerald-500/10 text-emerald-400 border-emerald-500/30 flex items-center gap-1">
                              <Check className="w-3 h-3" />
                              Paga
                            </span>
                          ) : fat.fechada ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold border bg-amber-500/10 text-amber-400 border-amber-500/30 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Pendente
                            </span>
                          ) : (
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold border bg-blue-500/10 text-blue-400 border-blue-500/30">
                              Em Aberto
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400">
                          Vencimento: <strong className="text-slate-300">{dataVencStr}</strong>
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-[11px] pt-1.5 border-t border-slate-900 items-end">
                        <div>
                          <span className="text-slate-500 text-[10px] block">Total Gasto</span>
                          <span className="font-semibold text-slate-300">
                            R$ {formatCurrency(fat.totalGasto)}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 text-[10px] block">Total Pago</span>
                          <span className="font-semibold text-slate-400">
                            R$ {formatCurrency(fat.totalPago)}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 text-[10px] block">Saldo da Fatura</span>
                          <span className={`font-bold ${fat.saldo > 0 ? "text-rose-400" : "text-emerald-400"}`}>
                            R$ {formatCurrency(fat.saldo)}
                          </span>
                        </div>
                      </div>

                      {/* Botão Marcar como Paga se a fatura estiver Fechada e Pendente */}
                      {fat.fechada && !fat.paga && (
                        <div className="pt-2 border-t border-slate-900/80 flex justify-end">
                          <button
                            type="button"
                            onClick={() =>
                              handleMarcarFaturaPaga(
                                historicoFaturasCartao,
                                fat.faturaKey,
                                fat.label,
                                fat.saldo
                              )
                            }
                            className="px-2.5 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 transition-all shadow-xs"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Marcar como Paga</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                });
              })()}
            </div>

            {/* Footer */}
            <div className="pt-2 flex justify-end border-t border-slate-800">
              <button
                type="button"
                onClick={() => setHistoricoFaturasCartao(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
