import React, { useState, useEffect } from "react";
import {
  X,
  Building2,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Smartphone,
  ShieldCheck,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { BankNotificationService } from "../services/bankNotificationService";
import { ParsedPixTransaction } from "../utils/bankNotificationParser";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSimulatePix?: (sample: ParsedPixTransaction) => void;
}

export const PixConfigModal: React.FC<Props> = ({ isOpen, onClose, onSimulatePix }) => {
  const [isGranted, setIsGranted] = useState(false);
  const [isNative, setIsNative] = useState(false);
  const [checking, setChecking] = useState(false);

  const checkStatus = async () => {
    setChecking(true);
    try {
      const res = await BankNotificationService.checkPermission();
      setIsGranted(res.granted);
      setIsNative(res.isNative);
    } catch (err) {
      console.warn(err);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      checkStatus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleOpenSettings = async () => {
    await BankNotificationService.requestPermission();
    // Após voltar das configurações, re-checa em 2 segundos
    setTimeout(checkStatus, 2000);
  };

  const handleSimulate = (banco: "Nubank" | "PicPay" | "Itaú") => {
    if (!onSimulatePix) return;
    const now = Date.now();
    let sample: ParsedPixTransaction;

    if (banco === "Itaú") {
      sample = {
        id: `itau_sample_${now}`,
        rawId: `raw_itau_${now}`,
        banco: "Itaú",
        tipo: "RECEITA",
        valor: 1.0,
        valorFormatado: "R$ 1,00",
        pessoa: "Alexandre",
        descricaoSugerida: "PIX RECEBIDO - ALEXANDRE (ITAÚ)",
        timestamp: now,
        categoriaSugerida: "OUTRAS RECEITAS",
      };
    } else if (banco === "PicPay") {
      sample = {
        id: `picpay_sample_${now}`,
        rawId: `raw_picpay_${now}`,
        banco: "PicPay",
        tipo: "RECEITA",
        valor: 1.0,
        valorFormatado: "R$ 1,00",
        pessoa: "Alexandre",
        descricaoSugerida: "PIX RECEBIDO - ALEXANDRE (PICPAY)",
        timestamp: now,
        categoriaSugerida: "OUTRAS RECEITAS",
      };
    } else {
      sample = {
        id: `nubank_sample_${now}`,
        rawId: `raw_nubank_${now}`,
        banco: "Nubank",
        tipo: "RECEITA",
        valor: 1.0,
        valorFormatado: "R$ 1,00",
        pessoa: undefined,
        descricaoSugerida: "PIX RECEBIDO - NUBANK",
        timestamp: now,
        categoriaSugerida: "OUTRAS RECEITAS",
      };
    }

    onClose();
    onSimulatePix(sample);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs text-xs animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl space-y-4 p-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-base text-white">Leitor de Notificações PIX</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status da Permissão no Android */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                Acesso a Notificações do Android
              </span>
              <div className="flex items-center gap-1.5 mt-1">
                {isGranted ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span className="font-bold text-emerald-400">Ativo e Monitorando</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    <span className="font-bold text-amber-400">
                      {isNative ? "Permissão Pendente" : "Modo Web (Simulação disponível)"}
                    </span>
                  </>
                )}
              </div>
            </div>

            <button
              onClick={checkStatus}
              disabled={checking}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors"
              title="Atualizar status"
            >
              <RefreshCw className={`w-4 h-4 ${checking ? "animate-spin" : ""}`} />
            </button>
          </div>

          <p className="text-slate-400 text-xs leading-relaxed">
            Permite que o aplicativo leia notificações de PIX recebidas e enviadas para sugerir o lançamento
            automaticamente no sistema, sempre aguardando sua revisão antes de salvar.
          </p>

          {isNative && !isGranted && (
            <button
              onClick={handleOpenSettings}
              className="w-full py-2.5 px-3 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg shadow-amber-950/40"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Conceder Acesso nas Configurações</span>
            </button>
          )}
        </div>

        {/* Bancos Monitorados */}
        <div className="space-y-2">
          <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
            Bancos Monitorados:
          </span>
          <div className="grid grid-cols-3 gap-2">
            <div className="p-3 bg-slate-950 border border-purple-800/40 rounded-xl text-center">
              <span className="font-bold text-purple-300 block text-xs">Nubank</span>
              <span className="text-[10px] text-slate-500">Pix Recebido</span>
            </div>
            <div className="p-3 bg-slate-950 border border-emerald-800/40 rounded-xl text-center">
              <span className="font-bold text-emerald-300 block text-xs">PicPay</span>
              <span className="text-[10px] text-slate-500">Pix Recebido</span>
            </div>
            <div className="p-3 bg-slate-950 border border-amber-800/40 rounded-xl text-center">
              <span className="font-bold text-amber-300 block text-xs">Itaú</span>
              <span className="text-[10px] text-slate-500">Recebido / Enviado</span>
            </div>
          </div>
        </div>

        {/* Simulador para Testes */}
        <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2">
          <div className="flex items-center gap-1.5 text-slate-300 font-semibold text-xs">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Testar fluxo de sugestão na tela:</span>
          </div>
          <div className="grid grid-cols-3 gap-2 pt-1">
            <button
              onClick={() => handleSimulate("Itaú")}
              className="py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-amber-300 font-semibold rounded-lg text-[11px] transition-colors"
            >
              Simular Itaú
            </button>
            <button
              onClick={() => handleSimulate("Nubank")}
              className="py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-purple-300 font-semibold rounded-lg text-[11px] transition-colors"
            >
              Simular Nubank
            </button>
            <button
              onClick={() => handleSimulate("PicPay")}
              className="py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-emerald-300 font-semibold rounded-lg text-[11px] transition-colors"
            >
              Simular PicPay
            </button>
          </div>
        </div>

        <div className="pt-1">
          <button
            onClick={onClose}
            className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-semibold transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
