import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  X,
  Building2,
  Calendar,
  Tag,
  DollarSign,
  AlertCircle,
  FileText,
} from "lucide-react";
import { ParsedPixTransaction } from "../utils/bankNotificationParser";
import { ContaBancaria, Lancamento, CategoriaCustomizada } from "../types";
import { getLocalTodayDateStr } from "../services/notificationEngine";
import { formatCurrencyInput } from "../utils/formatters";
import { VoiceInput } from "./VoiceInput";
import { VoiceTextArea } from "./VoiceTextArea";
import { ComboBox } from "./ComboBox";

interface Props {
  transactions: ParsedPixTransaction[];
  contasBancarias?: ContaBancaria[];
  categoriasCustom?: CategoriaCustomizada[];
  lancamentos?: Lancamento[];
  onConfirm: (lancamento: Partial<Lancamento>, rawId: string) => Promise<void>;
  onDismiss: (rawId: string) => void;
  onDismissAll: () => void;
}

export const PixSuggestionModal: React.FC<Props> = ({
  transactions,
  contasBancarias = [],
  categoriasCustom = [],
  lancamentos = [],
  onConfirm,
  onDismiss,
  onDismissAll,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const isSavingRef = useRef(false);

  // Transação atual na fila
  const currentTx = transactions[currentIndex] || transactions[0];

  const [formDescricao, setFormDescricao] = useState("");
  const [formValor, setFormValor] = useState(0);
  const [valorDisplay, setValorDisplay] = useState("");
  const [formTipo, setFormTipo] = useState<"RECEITA" | "DESPESA">("RECEITA");
  const [formData, setFormData] = useState("");
  const [formConta, setFormConta] = useState("");
  const [formCategoria, setFormCategoria] = useState("");
  const [formObservacoes, setFormObservacoes] = useState("");

  // Categorias disponíveis no sistema
  const categoriasDisponiveis = useMemo(() => {
    const isReceita = formTipo === "RECEITA";
    const defaults = isReceita
      ? [
          "UBER",
          "99",
          "SALÁRIO",
          "INVESTIMENTOS",
          "RENDIMENTOS",
          "FREELANCE",
          "REEMBOLSO",
          "VENDAS",
          "OUTRAS RECEITAS",
          "RECEITA",
          "OUTROS",
        ]
      : [
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
          "PET",
          "OUTRAS DESPESAS",
          "OUTROS",
        ];

    const fromCustom = (categoriasCustom || [])
      .filter((c) => {
        const t = String(c.Tipo || "").toUpperCase();
        if (isReceita) return t === "RECEITA" || t === "RECEITAS";
        return t !== "RECEITA" && t !== "RECEITAS";
      })
      .map((c) => String(c.Nome || "").trim().toUpperCase())
      .filter((n) => n.length > 0);

    const fromLancamentos = (lancamentos || [])
      .filter((l) => {
        const t = String(l.Tipo || "").toUpperCase();
        if (isReceita) return t === "RECEITA" || t === "RECEITAS";
        return t !== "RECEITA" && t !== "RECEITAS";
      })
      .map((l) => String(l.Categoria || "").trim().toUpperCase())
      .filter((c) => c.length > 0);

    return Array.from(new Set([...defaults, ...fromCustom, ...fromLancamentos]));
  }, [formTipo, categoriasCustom, lancamentos]);

  // Atualiza os campos do formulário sempre que a transação atual mudar
  useEffect(() => {
    if (!currentTx || isSavingRef.current) return;

    setFormDescricao(currentTx.descricaoSugerida || `PIX - ${currentTx.banco.toUpperCase()}`);
    const initialVal = currentTx.valor || 0;
    setFormValor(initialVal);
    setValorDisplay(
      initialVal > 0
        ? initialVal.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : ""
    );
    setFormTipo(currentTx.tipo);
    setFormData(getLocalTodayDateStr(new Date(currentTx.timestamp || Date.now())));
    setFormCategoria(currentTx.categoriaSugerida || (currentTx.tipo === "RECEITA" ? "OUTRAS RECEITAS" : "OUTRAS DESPESAS"));
    setFormObservacoes("");

    // Tenta encontrar uma conta bancária com o nome do banco
    const bancoNome = currentTx.banco.toLowerCase();
    const contaEncontrada = contasBancarias.find((c) => {
      const cNome = (c.Nome || "").toLowerCase();
      if (bancoNome === "itaú" && (cNome.includes("itau") || cNome.includes("itaú"))) return true;
      if (bancoNome === "nubank" && (cNome.includes("nubank") || cNome.includes("nu"))) return true;
      if (bancoNome === "picpay" && cNome.includes("picpay")) return true;
      return false;
    });

    if (contaEncontrada) {
      setFormConta(contaEncontrada.Nome);
    } else if (contasBancarias.length > 0) {
      setFormConta(contasBancarias[0].Nome);
    } else {
      setFormConta(currentTx.banco.toUpperCase());
    }
  }, [currentTx, contasBancarias]);

  if (!currentTx) return null;

  const handleSaveCurrent = async () => {
    // Proteção contra múltiplos cliques ou disparos simultâneos (race condition)
    if (isSavingRef.current || loading) return;
    isSavingRef.current = true;
    setLoading(true);

    try {
      const now = new Date();
      const horaFormatada = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

      const userObs = formObservacoes.toUpperCase().trim();
      const tagBanco = `IMPORTADO AUTOMATICAMENTE DE NOTIFICAÇÃO ${currentTx.banco.toUpperCase()}`;
      const observacoesFinal = userObs ? `${userObs} — ${tagBanco}` : tagBanco;

      const finalValor = Number(formValor) || currentTx.valor;

      const lancamento: Partial<Lancamento> = {
        Data: formData || getLocalTodayDateStr(now),
        Hora: horaFormatada,
        Tipo: formTipo,
        Descricao: formDescricao.toUpperCase().trim(),
        Valor: finalValor,
        Valor_Pago: finalValor,
        Conta: formConta.toUpperCase().trim(),
        Categoria: formCategoria.toUpperCase().trim(),
        Forma_Pagamento: "PIX",
        Status: "PAGO",
        Observacoes: observacoesFinal,
      };

      await onConfirm(lancamento, currentTx.rawId);

      // Avança ou fecha
      if (currentIndex >= transactions.length - 1) {
        setCurrentIndex(0);
      }
    } catch (err: any) {
      console.error("Erro ao confirmar PIX:", err);
    } finally {
      isSavingRef.current = false;
      setLoading(false);
    }
  };

  const handleDismissCurrent = () => {
    onDismiss(currentTx.rawId);
    if (currentIndex >= transactions.length - 1) {
      setCurrentIndex(Math.max(0, transactions.length - 2));
    }
  };

  // Cores de tema por banco
  const getBankBadge = () => {
    switch (currentTx.banco) {
      case "Nubank":
        return {
          bg: "bg-purple-950/60",
          border: "border-purple-800/80",
          text: "text-purple-300",
          accent: "text-purple-400",
        };
      case "Itaú":
        return {
          bg: "bg-amber-950/60",
          border: "border-amber-800/80",
          text: "text-amber-300",
          accent: "text-amber-400",
        };
      case "PicPay":
        return {
          bg: "bg-emerald-950/60",
          border: "border-emerald-800/80",
          text: "text-emerald-300",
          accent: "text-emerald-400",
        };
      default:
        return {
          bg: "bg-slate-800/60",
          border: "border-slate-700",
          text: "text-slate-300",
          accent: "text-slate-400",
        };
    }
  };

  const bankTheme = getBankBadge();
  const totalPendentes = transactions.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs text-xs animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl space-y-0">
        {/* Header do Banco */}
        <div className={`p-4 border-b ${bankTheme.border} ${bankTheme.bg} flex items-center justify-between`}>
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl bg-slate-950/60 border ${bankTheme.border} ${bankTheme.text}`}>
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`font-bold text-sm ${bankTheme.text}`}>{currentTx.banco}</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-slate-950/60 text-slate-400 border border-slate-800">
                  PIX DETECTADO
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Sugestão de lançamento automático</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {totalPendentes > 1 && (
              <span className="text-[10px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                {currentIndex + 1} de {totalPendentes}
              </span>
            )}
            <button
              onClick={handleDismissCurrent}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/60 transition-colors"
              title="Fechar / Descartar esta sugestão"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Card de Destaque da Transação */}
        <div className="p-5 space-y-4">
          <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-0.5">
                Valor Identificado
              </span>
              <div className="text-2xl font-black text-white tracking-tight flex items-baseline gap-1">
                <span>R$</span>
                <span>{formValor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              {currentTx.pessoa && (
                <p className="text-xs text-slate-400 mt-1">
                  {formTipo === "RECEITA" ? "De:" : "Para:"} <strong className="text-slate-200">{currentTx.pessoa}</strong>
                </p>
              )}
            </div>

            <div className="text-right">
              <span
                className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-xl border ${
                  formTipo === "RECEITA"
                    ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                    : "bg-rose-500/15 text-rose-400 border-rose-500/30"
                }`}
              >
                {formTipo === "RECEITA" ? (
                  <>
                    <ArrowDownLeft className="w-3.5 h-3.5" /> Receita (Entrada)
                  </>
                ) : (
                  <>
                    <ArrowUpRight className="w-3.5 h-3.5" /> Despesa (Saída)
                  </>
                )}
              </span>
            </div>
          </div>

          {/* Formulário de Revisão (Antes de Salvar) */}
          <div className="space-y-3 pt-1">
            <div>
              <label className="text-slate-400 block mb-1 text-[11px] font-medium flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-500" />
                Descrição do Lançamento
              </label>
              <VoiceInput
                type="text"
                placeholder="Descrição do lançamento..."
                value={formDescricao}
                onChange={(e) => setFormDescricao(e.target.value.toUpperCase())}
                className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white uppercase text-xs focus:border-amber-500 outline-none"
                uppercase
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-400 block mb-1 text-[11px] font-medium flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-slate-500" />
                  Valor Total (R$)
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-slate-400 font-semibold text-xs select-none">
                    R$
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="0,00"
                    value={valorDisplay}
                    onChange={(e) => {
                      const { numeric, formatted } = formatCurrencyInput(e.target.value);
                      setValorDisplay(formatted);
                      setFormValor(numeric);
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 pl-10 text-white font-bold text-xs focus:border-amber-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1 text-[11px] font-medium flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  Data
                </label>
                <input
                  type="date"
                  value={formData}
                  onChange={(e) => setFormData(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white text-xs focus:border-amber-500 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-400 block mb-1 text-[11px] font-medium flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-slate-500" />
                  Conta Bancária
                </label>
                {contasBancarias.length > 0 ? (
                  <select
                    value={formConta}
                    onChange={(e) => setFormConta(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white text-xs focus:border-amber-500 outline-none"
                  >
                    {contasBancarias.map((c) => (
                      <option key={c.Id || c.Nome} value={c.Nome}>
                        {c.Nome}
                      </option>
                    ))}
                    {!contasBancarias.some((c) => c.Nome === formConta) && formConta && (
                      <option value={formConta}>{formConta}</option>
                    )}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={formConta}
                    onChange={(e) => setFormConta(e.target.value.toUpperCase())}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white uppercase text-xs focus:border-amber-500 outline-none"
                  />
                )}
              </div>

              <div>
                <label className="text-slate-400 block mb-1 text-[11px] font-medium flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-slate-500" />
                  Categoria
                </label>
                <ComboBox
                  value={formCategoria}
                  onChange={(val) => setFormCategoria(val.toUpperCase())}
                  options={categoriasDisponiveis}
                  placeholder="Selecione ou digite..."
                  uppercase={true}
                  showVoice={true}
                  inputClassName="focus:border-amber-500"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-slate-400 text-[11px] font-medium flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-slate-500" />
                  Observações
                </label>
                <span className="text-[10px] text-amber-400/90 font-medium flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 text-amber-400" />
                  Revise antes de confirmar
                </span>
              </div>
              <VoiceTextArea
                rows={2}
                value={formObservacoes}
                onChange={(e) => setFormObservacoes(e.target.value.toUpperCase())}
                placeholder="Observações do lançamento (opcional)..."
                className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white text-xs uppercase focus:border-amber-500 outline-none"
                uppercase
              />
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={handleDismissCurrent}
              disabled={loading}
              className="flex-1 py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl font-semibold transition-colors flex items-center justify-center gap-1.5"
            >
              <X className="w-4 h-4 text-slate-400" />
              <span>Descartar</span>
            </button>

            <button
              type="button"
              onClick={handleSaveCurrent}
              disabled={loading}
              className="flex-1 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-950/40"
            >
              <Check className="w-4 h-4" />
              <span>{loading ? "Salvando..." : "Confirmar e Salvar"}</span>
            </button>
          </div>

          {totalPendentes > 1 && (
            <div className="text-center pt-1">
              <button
                type="button"
                onClick={onDismissAll}
                className="text-[11px] text-slate-500 hover:text-slate-400 underline"
              >
                Descartar todas as {totalPendentes} notificações
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
