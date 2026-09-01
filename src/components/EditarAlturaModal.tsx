import React, { useState, useEffect } from "react";
import { X, Ruler, Check, Info, ArrowRight } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentAlturaCm: number;
  onSaveAltura: (novaAlturaCm: number) => Promise<void> | void;
}

export const EditarAlturaModal: React.FC<Props> = ({
  isOpen,
  onClose,
  currentAlturaCm,
  onSaveAltura,
}) => {
  const [altura, setAltura] = useState<string>(String(currentAlturaCm || 175));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (isOpen) {
      setAltura(String(currentAlturaCm || 175));
      setErrorMsg("");
    }
  }, [isOpen, currentAlturaCm]);

  if (!isOpen) return null;

  const parsedAltura = parseInt(altura, 10);
  const isValid = !isNaN(parsedAltura) && parsedAltura >= 100 && parsedAltura <= 250;

  // Calculo de faixa de peso saudável recomendada pela OMS (IMC 18.5 a 24.9)
  const minPesoIdeal = isValid
    ? Math.round(18.5 * Math.pow(parsedAltura / 100, 2) * 10) / 10
    : null;
  const maxPesoIdeal = isValid
    ? Math.round(24.9 * Math.pow(parsedAltura / 100, 2) * 10) / 10
    : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) {
      setErrorMsg("Informe uma altura válida entre 100 cm e 250 cm.");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSaveAltura(parsedAltura);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Erro ao salvar altura.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdjust = (delta: number) => {
    const curr = parseInt(altura, 10) || 175;
    const next = Math.max(100, Math.min(250, curr + delta));
    setAltura(String(next));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-850">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/20">
              <Ruler className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Configurar Altura</h3>
              <p className="text-xs text-slate-400">
                Usada para o cálculo automático de IMC e faixa saudável
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          {errorMsg && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs">
              {errorMsg}
            </div>
          )}

          {/* Altura Input with +/- buttons */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Sua Altura (em centímetros)
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleAdjust(-1)}
                className="w-11 h-11 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-base flex items-center justify-center border border-slate-700 transition-colors"
              >
                -1
              </button>
              <div className="relative flex-1">
                <input
                  type="number"
                  min="100"
                  max="250"
                  step="1"
                  required
                  value={altura}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setAltura(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-center text-xl font-black text-amber-400 focus:outline-none focus:border-amber-500"
                />
                <span className="absolute right-3.5 top-3 text-xs font-semibold text-slate-400">
                  cm
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleAdjust(1)}
                className="w-11 h-11 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-base flex items-center justify-center border border-slate-700 transition-colors"
              >
                +1
              </button>
            </div>

            {isValid && (
              <p className="text-center text-xs text-slate-400 mt-2 font-medium">
                Equivalente a <span className="text-amber-300 font-bold">{(parsedAltura / 100).toFixed(2).replace(".", ",")} metros</span>
              </p>
            )}
          </div>

          {/* Quick presets */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Atalhos rápidos
            </label>
            <div className="grid grid-cols-5 gap-1.5">
              {[160, 165, 170, 175, 180].map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => setAltura(String(h))}
                  className={`py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    parsedAltura === h
                      ? "bg-amber-500/20 border-amber-500/50 text-amber-300 shadow-xs"
                      : "bg-slate-800/60 border-slate-700/80 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {h} cm
                </button>
              ))}
            </div>
            <div className="grid grid-cols-5 gap-1.5 mt-1.5">
              {[182, 185, 188, 190, 195].map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => setAltura(String(h))}
                  className={`py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    parsedAltura === h
                      ? "bg-amber-500/20 border-amber-500/50 text-amber-300 shadow-xs"
                      : "bg-slate-800/60 border-slate-700/80 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {h} cm
                </button>
              ))}
            </div>
          </div>

          {/* Info Card on healthy weight range */}
          {isValid && minPesoIdeal && maxPesoIdeal && (
            <div className="bg-slate-850 border border-slate-800 p-3.5 rounded-xl space-y-2 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-slate-200">
                <Info className="w-3.5 h-3.5 text-emerald-400" />
                <span>Faixa de Peso Saudável (OMS)</span>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Para a altura de <strong className="text-white">{parsedAltura} cm</strong>, a faixa com IMC normal (18.5 a 24.9) fica entre:
              </p>
              <div className="flex items-center justify-center p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 font-black text-sm">
                {minPesoIdeal} kg &nbsp;—&nbsp; {maxPesoIdeal} kg
              </div>
              <p className="text-[10px] text-slate-500 text-center">
                * A altura fica salva na planilha e sincronizada em todos os seus dispositivos.
              </p>
            </div>
          )}

          {/* Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !isValid}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-2 shadow-lg shadow-emerald-950/40"
            >
              <Check className="w-4 h-4" />
              <span>{isSubmitting ? "Salvando..." : "Salvar Altura"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
