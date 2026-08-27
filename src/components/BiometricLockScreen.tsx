import React, { useState, useEffect } from "react";
import {
  Fingerprint,
  Lock,
  KeyRound,
  ShieldCheck,
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import {
  authenticateWithBiometrics,
  verifyFallbackPin,
  isWebAuthnSupported,
} from "../services/biometricAuth";

interface Props {
  onUnlock: () => void;
}

export const BiometricLockScreen: React.FC<Props> = ({ onUnlock }) => {
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [usePinMode, setUsePinMode] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [showPinText, setShowPinText] = useState(false);
  const [isPinVerifying, setIsPinVerifying] = useState(false);
  const [unlockSuccess, setUnlockSuccess] = useState(false);

  // Auto trigger biometrics on initial mount
  useEffect(() => {
    let isMounted = true;
    const triggerInitialBiometrics = async () => {
      // Small timeout to allow component render
      await new Promise((r) => setTimeout(r, 400));
      if (!isMounted) return;

      setIsAuthenticating(true);
      setErrorMessage(null);
      const res = await authenticateWithBiometrics();
      if (!isMounted) return;
      setIsAuthenticating(false);

      if (res.success) {
        setUnlockSuccess(true);
        setTimeout(() => onUnlock(), 300);
      } else {
        if (res.error && !res.error.includes("cancelada")) {
          setErrorMessage(res.error);
        }
      }
    };

    triggerInitialBiometrics();

    return () => {
      isMounted = false;
    };
  }, [onUnlock]);

  const handleTriggerBiometrics = async () => {
    setIsAuthenticating(true);
    setErrorMessage(null);
    const res = await authenticateWithBiometrics();
    setIsAuthenticating(false);

    if (res.success) {
      setUnlockSuccess(true);
      setTimeout(() => onUnlock(), 300);
    } else {
      setErrorMessage(res.error || "Autenticação biométrica falhou.");
    }
  };

  const handleVerifyPin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!pinInput.trim()) {
      setErrorMessage("Por favor, digite o seu PIN de segurança.");
      return;
    }

    setIsPinVerifying(true);
    setErrorMessage(null);
    const success = await verifyFallbackPin(pinInput);
    setIsPinVerifying(false);

    if (success) {
      setUnlockSuccess(true);
      setTimeout(() => onUnlock(), 300);
    } else {
      setErrorMessage("PIN incorreto. Tente novamente.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-md">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col items-center text-center space-y-6 animate-in fade-in zoom-in-95 duration-200">
        
        {/* App Logo & Status Icon */}
        <div className="relative">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-xl shadow-emerald-500/20">
            {unlockSuccess ? (
              <CheckCircle2 className="w-10 h-10 animate-in zoom-in text-white" />
            ) : usePinMode ? (
              <KeyRound className="w-10 h-10 text-white" />
            ) : (
              <Fingerprint className="w-11 h-11 text-white" />
            )}
          </div>
          <div className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-slate-950 border-2 border-slate-900 text-emerald-400">
            <Lock className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Heading */}
        <div className="space-y-1.5">
          <h2 className="text-xl font-bold text-white tracking-tight">
            {unlockSuccess
              ? "Acesso Liberado!"
              : usePinMode
              ? "Autenticação por PIN"
              : "Finanças Gaeta Protegido"}
          </h2>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            {unlockSuccess
              ? "Carregando seus dados..."
              : usePinMode
              ? "Digite seu PIN de recuperação para desbloquear o sistema"
              : "Toque no leitor biométrico ou sensor de digital do seu dispositivo"}
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="w-full p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2.5 text-left">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Biometrics Action View */}
        {!usePinMode ? (
          <div className="w-full space-y-3">
            <button
              onClick={handleTriggerBiometrics}
              disabled={isAuthenticating || unlockSuccess}
              className={`w-full py-3.5 px-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2.5 transition-all shadow-lg active:scale-98 ${
                unlockSuccess
                  ? "bg-emerald-500 text-white"
                  : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/25"
              }`}
            >
              <Fingerprint className={`w-5 h-5 ${isAuthenticating ? "animate-pulse" : ""}`} />
              <span>
                {isAuthenticating
                  ? "Aguardando Digital / Biometria..."
                  : unlockSuccess
                  ? "Desbloqueado!"
                  : "Autenticar com Digital"}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setUsePinMode(true);
                setErrorMessage(null);
              }}
              className="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium transition-colors flex items-center justify-center gap-2"
            >
              <KeyRound className="w-3.5 h-3.5 text-slate-400" />
              <span>Usar PIN de Emergência</span>
            </button>
          </div>
        ) : (
          /* PIN Entry Mode */
          <form onSubmit={handleVerifyPin} className="w-full space-y-4">
            <div className="space-y-1 text-left">
              <label className="text-xs font-semibold text-slate-300 block">
                PIN de Desbloqueio
              </label>
              <div className="relative">
                <input
                  type={showPinText ? "text" : "password"}
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  placeholder="Digite seu PIN..."
                  autoFocus
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-hidden tracking-widest text-center"
                />
                <button
                  type="button"
                  onClick={() => setShowPinText(!showPinText)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                >
                  {showPinText ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <button
                type="submit"
                disabled={isPinVerifying || !pinInput.trim() || unlockSuccess}
                className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <span>{isPinVerifying ? "Verificando..." : "Desbloquear com PIN"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setUsePinMode(false);
                  setErrorMessage(null);
                  handleTriggerBiometrics();
                }}
                className="w-full py-2 text-xs text-slate-400 hover:text-slate-200 transition-colors"
              >
                Voltar para Biometria / Digital
              </button>
            </div>
          </form>
        )}

        {/* Security Reassurance Footer Note */}
        <div className="pt-2 border-t border-slate-800/80 w-full flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500/80" />
          <span>Acesso local protegido por WebAuthn</span>
        </div>
      </div>
    </div>
  );
};
