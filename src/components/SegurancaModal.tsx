import React, { useState, useEffect } from "react";
import {
  Fingerprint,
  Lock,
  Unlock,
  KeyRound,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  X,
  RefreshCw,
  ShieldAlert,
  Info,
  Sliders,
  Sparkles,
} from "lucide-react";
import {
  isBiometricEnabled,
  isWebAuthnSupported,
  isPlatformBiometricsAvailable,
  registerBiometrics,
  disableBiometricAuth,
  authenticateWithBiometrics,
  updateFallbackPin,
  lockSessionNow,
} from "../services/biometricAuth";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onStatusChanged?: (enabled: boolean) => void;
}

export const SegurancaModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onStatusChanged,
}) => {
  const [enabled, setEnabled] = useState(false);
  const [platformSupported, setPlatformSupported] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);

  // Setup Step State
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [setupPin, setSetupPin] = useState("");
  const [setupPinConfirm, setSetupPinConfirm] = useState("");

  // Change PIN State
  const [isChangingPin, setIsChangingPin] = useState(false);
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");

  // Disable Confirmation State
  const [isConfirmingDisable, setIsConfirmingDisable] = useState(false);
  const [disablePin, setDisablePin] = useState("");

  useEffect(() => {
    if (isOpen) {
      setEnabled(isBiometricEnabled());
      setFeedback(null);
      setIsSettingUp(false);
      setIsChangingPin(false);
      setIsConfirmingDisable(false);
      setSetupPin("");
      setSetupPinConfirm("");
      setCurrentPin("");
      setNewPin("");
      setDisablePin("");

      isPlatformBiometricsAvailable().then((avail) => {
        setPlatformSupported(avail);
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleStartSetup = () => {
    setIsSettingUp(true);
    setFeedback(null);
  };

  const handleCompleteSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!setupPin || setupPin.length < 4) {
      setFeedback({ type: "error", message: "O PIN de emergência deve ter no mínimo 4 dígitos." });
      return;
    }
    if (setupPin !== setupPinConfirm) {
      setFeedback({ type: "error", message: "A confirmação do PIN não confere." });
      return;
    }

    setIsProcessing(true);
    setFeedback({ type: "info", message: "Toque no sensor biométrico quando solicitado pelo navegador..." });

    const res = await registerBiometrics(setupPin);
    setIsProcessing(false);

    if (res.success) {
      setEnabled(true);
      setIsSettingUp(false);
      setSetupPin("");
      setSetupPinConfirm("");
      setFeedback({
        type: "success",
        message: "Proteção biométrica ativada com sucesso! O sistema pedirá sua digital ao abrir novas sessões.",
      });
      if (onStatusChanged) onStatusChanged(true);
    } else {
      setFeedback({ type: "error", message: res.error || "Erro ao registrar biometria." });
    }
  };

  const handleTestBiometrics = async () => {
    setIsProcessing(true);
    setFeedback({ type: "info", message: "Aguardando leitura biométrica no sensor..." });
    const res = await authenticateWithBiometrics();
    setIsProcessing(false);

    if (res.success) {
      setFeedback({
        type: "success",
        message: "Biometria validada com sucesso! Seu sensor e chave WebAuthn estão funcionando perfeitamente.",
      });
    } else {
      setFeedback({ type: "error", message: res.error || "Falha na validação biométrica." });
    }
  };

  const handleSaveNewPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPin || newPin.length < 4) {
      setFeedback({ type: "error", message: "O novo PIN deve ter pelo menos 4 dígitos." });
      return;
    }

    setIsProcessing(true);
    const res = await updateFallbackPin(currentPin, newPin, false);
    setIsProcessing(false);

    if (res.success) {
      setIsChangingPin(false);
      setCurrentPin("");
      setNewPin("");
      setFeedback({ type: "success", message: "PIN de emergência alterado com sucesso!" });
    } else {
      setFeedback({ type: "error", message: res.error || "Erro ao atualizar PIN." });
    }
  };

  const handleConfirmDisable = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    const res = await disableBiometricAuth(disablePin);
    setIsProcessing(false);

    if (res.success) {
      setEnabled(false);
      setIsConfirmingDisable(false);
      setDisablePin("");
      setFeedback({
        type: "success",
        message: "A proteção biométrica foi desativada.",
      });
      if (onStatusChanged) onStatusChanged(false);
    } else {
      setFeedback({ type: "error", message: res.error || "Erro ao desativar proteção." });
    }
  };

  const handleLockImmediately = () => {
    lockSessionNow();
    if (onStatusChanged) onStatusChanged(true);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl text-slate-100 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Fingerprint className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-2">
                Segurança & Biometria (WebAuthn)
              </h2>
              <p className="text-xs text-slate-400">
                Trava de acesso inicial com sensor de digital ou reconhecimento facial
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-6 overflow-y-auto text-sm text-slate-300">
          
          {/* Feedback Alert */}
          {feedback && (
            <div
              className={`p-4 rounded-2xl border text-xs flex items-start gap-3 ${
                feedback.type === "success"
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                  : feedback.type === "error"
                  ? "bg-rose-500/10 border-rose-500/20 text-rose-300"
                  : "bg-blue-500/10 border-blue-500/20 text-blue-300"
              }`}
            >
              {feedback.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : feedback.type === "error" ? (
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              ) : (
                <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">{feedback.message}</div>
            </div>
          )}

          {/* Primary Biometric Toggle Box */}
          <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white text-sm">
                    Trava Biométrica ao Abrir o Sistema
                  </span>
                  {enabled ? (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                      ATIVADO
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[10px] font-bold">
                      DESATIVADO
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Exige autenticação por digital (Touch ID, Windows Hello ou sensor do celular) na abertura inicial do app para impedir acessos não autorizados.
                </p>
              </div>

              {/* Master Switch Button */}
              <div>
                {!enabled ? (
                  <button
                    onClick={handleStartSetup}
                    disabled={isProcessing || isSettingUp}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95 whitespace-nowrap flex items-center gap-2"
                  >
                    <Unlock className="w-3.5 h-3.5" />
                    <span>Ativar Biometria</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setIsConfirmingDisable(true)}
                    disabled={isProcessing}
                    className="px-3.5 py-1.5 bg-slate-800 hover:bg-rose-500/20 hover:text-rose-300 text-slate-300 font-semibold text-xs rounded-xl border border-slate-700 hover:border-rose-500/30 transition-all whitespace-nowrap"
                  >
                    Desativar
                  </button>
                )}
              </div>
            </div>

            {/* Platform Compatibility Note */}
            {!platformSupported && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  O navegador atual pode não ter sensor biométrico configurado no SO. O desbloqueio com PIN de emergência continuará disponível.
                </span>
              </div>
            )}
          </div>

          {/* Registration Setup Form */}
          {isSettingUp && !enabled && (
            <div className="p-5 rounded-2xl bg-gradient-to-b from-slate-950 to-slate-900 border border-emerald-500/30 space-y-4 animate-in fade-in">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <Sparkles className="w-4 h-4" />
                <span>Configurar Nova Chave Biométrica & PIN de Recuperação</span>
              </div>
              <p className="text-xs text-slate-300">
                Cadastre um <strong>PIN de emergência</strong> de 4 a 8 dígitos (usado caso o sensor biométrico falhe ou não seja reconhecido). Em seguida, toque no sensor biométrico.
              </p>

              <form onSubmit={handleCompleteSetup} className="space-y-4 pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300 block">
                      Criar PIN de Emergência (mín. 4 dígitos)
                    </label>
                    <input
                      type="password"
                      value={setupPin}
                      onChange={(e) => setSetupPin(e.target.value)}
                      placeholder="Ex: 1234"
                      required
                      className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-hidden tracking-widest"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300 block">
                      Confirmar PIN
                    </label>
                    <input
                      type="password"
                      value={setupPinConfirm}
                      onChange={(e) => setSetupPinConfirm(e.target.value)}
                      placeholder="Repita o PIN"
                      required
                      className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-hidden tracking-widest"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsSettingUp(false)}
                    className="px-3.5 py-2 text-xs text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isProcessing || !setupPin || setupPin !== setupPinConfirm}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    {isProcessing ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Fingerprint className="w-4 h-4" />
                    )}
                    <span>Escanear Digital & Confirmar</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Active Features & Actions */}
          {enabled && (
            <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-xs uppercase tracking-wider text-slate-400">
                  Gerenciamento da Chave
                </span>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleTestBiometrics}
                  disabled={isProcessing}
                  className="flex-1 min-w-[140px] px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 font-semibold rounded-xl text-xs border border-emerald-500/20 transition-all flex items-center justify-center gap-2"
                >
                  <Fingerprint className="w-4 h-4" />
                  <span>Testar Biometria</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsChangingPin(!isChangingPin);
                    setIsConfirmingDisable(false);
                  }}
                  className="flex-1 min-w-[140px] px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl text-xs border border-slate-700 transition-all flex items-center justify-center gap-2"
                >
                  <KeyRound className="w-4 h-4 text-amber-400" />
                  <span>Alterar PIN</span>
                </button>

                <button
                  type="button"
                  onClick={handleLockImmediately}
                  className="flex-1 min-w-[140px] px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl text-xs border border-slate-700 transition-all flex items-center justify-center gap-2"
                  title="Bloquear a sessão agora para testar o desbloqueio"
                >
                  <Lock className="w-4 h-4 text-slate-400" />
                  <span>Bloquear Agora</span>
                </button>
              </div>

              {/* Change PIN Box */}
              {isChangingPin && (
                <form onSubmit={handleSaveNewPin} className="p-4 bg-slate-900 rounded-xl border border-slate-800 space-y-3 pt-3">
                  <span className="font-semibold text-white text-xs block">Alterar PIN de Emergência</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">PIN Atual</label>
                      <input
                        type="password"
                        value={currentPin}
                        onChange={(e) => setCurrentPin(e.target.value)}
                        placeholder="PIN Atual"
                        required
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">Novo PIN (mín. 4 dígitos)</label>
                      <input
                        type="password"
                        value={newPin}
                        onChange={(e) => setNewPin(e.target.value)}
                        placeholder="Novo PIN"
                        required
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsChangingPin(false)}
                      className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isProcessing || !currentPin || !newPin}
                      className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl"
                    >
                      Salvar Novo PIN
                    </button>
                  </div>
                </form>
              )}

              {/* Disable Confirmation Form */}
              {isConfirmingDisable && (
                <form onSubmit={handleConfirmDisable} className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl space-y-3 pt-3">
                  <span className="font-semibold text-rose-300 text-xs block">Confirmar Desativação</span>
                  <p className="text-[11px] text-rose-200/80">
                    Digite seu PIN de segurança para confirmar a desativação da biometria:
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      type="password"
                      value={disablePin}
                      onChange={(e) => setDisablePin(e.target.value)}
                      placeholder="Digite seu PIN"
                      required
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                    />
                    <button
                      type="submit"
                      disabled={isProcessing || !disablePin}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-xs"
                    >
                      Desativar
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsConfirmingDisable(false)}
                      className="px-3 py-2 text-xs text-slate-400 hover:text-white"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* How It Works & Safety Reassurance */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2.5">
            <span className="font-semibold text-white text-xs flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Como funciona a segurança no Diz Aí:
            </span>
            <ul className="text-xs text-slate-400 space-y-2 list-disc list-inside">
              <li>
                <strong className="text-slate-300">Trava apenas ao abrir:</strong> A autenticação por digital só é solicitada ao abrir o sistema pela primeira vez ou após o app/navegador ser fechado e reaberto.
              </li>
              <li>
                <strong className="text-slate-300">Sem interrupções por inatividade:</strong> Trocar de aba, minimizar a janela ou ficar inativo NÃO bloqueia a tela enquanto a sessão estiver ativa.
              </li>
              <li>
                <strong className="text-slate-300">Lembretes e rotinas preservados:</strong> Alertas de remédios, água, consultas e timers continuam rodando normalmente em segundo plano.
              </li>
              <li>
                <strong className="text-slate-300">Privacidade absoluta:</strong> A sua digital fica protegida pelo hardware de segurança do seu próprio dispositivo (WebAuthn / FIDO2) e nunca é transmitida para a rede.
              </li>
            </ul>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-800 flex items-center justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
