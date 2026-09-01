import React, { useState, useEffect } from "react";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { useVoiceRecognition } from "../hooks/useVoiceRecognition";
import { isNextFieldCommand, focusNextField } from "../utils/voiceNavigation";

export interface VoiceButtonProps {
  onTranscript: (text: string) => void;
  uppercase?: boolean;
  className?: string;
  size?: "xs" | "sm" | "md";
  title?: string;
  disabled?: boolean;
  fieldRef?: React.RefObject<HTMLElement>;
}

export const VoiceButton: React.FC<VoiceButtonProps> = ({
  onTranscript,
  uppercase = false,
  className = "",
  size = "sm",
  title = "Ditar por voz (Português)",
  disabled = false,
  fieldRef,
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  const handleResult = (recognizedText: string, isFinal: boolean) => {
    if (!recognizedText) return;
    if (isFinal && isNextFieldCommand(recognizedText) && fieldRef?.current) {
      focusNextField(fieldRef.current);
      return;
    }
    const formatted = uppercase ? recognizedText.toUpperCase() : recognizedText;
    onTranscript(formatted);
  };

  const { isListening, isSupported, toggleListening, error } = useVoiceRecognition({
    lang: "pt-BR",
    continuous: false,
    interimResults: true,
    onResult: handleResult,
  });

  useEffect(() => {
    if (isListening) {
      setShowTooltip(true);
    } else {
      const timer = setTimeout(() => setShowTooltip(false), 800);
      return () => clearTimeout(timer);
    }
  }, [isListening]);

  if (!isSupported) {
    return null; // Gracefully hide if browser has zero speech support
  }

  const sizeClasses = {
    xs: "p-1 text-xs",
    sm: "p-1.5 text-xs",
    md: "p-2 text-sm",
  };

  const iconSizes = {
    xs: "w-3 h-3",
    sm: "w-3.5 h-3.5",
    md: "w-4 h-4",
  };

  return (
    <div className="relative inline-flex items-center">
      <button
        type="button"
        tabIndex={-1}
        disabled={disabled}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          toggleListening();
        }}
        title={isListening ? "Parar de ouvir" : title}
        className={`relative flex items-center justify-center rounded-lg transition-all cursor-pointer select-none ${
          sizeClasses[size]
        } ${
          isListening
            ? "bg-rose-500/20 text-rose-400 ring-2 ring-rose-500/60 shadow-lg shadow-rose-500/20 animate-pulse"
            : "text-slate-400 hover:text-emerald-400 hover:bg-slate-800/80 active:scale-95"
        } ${disabled ? "opacity-40 cursor-not-allowed" : ""} ${className}`}
      >
        {isListening ? (
          <>
            <Mic className={`${iconSizes[size]} text-rose-400 animate-bounce`} />
            <span className="absolute -top-1 -right-1 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
            </span>
          </>
        ) : (
          <Mic className={iconSizes[size]} />
        )}
      </button>

      {/* Floating Status Badge when listening */}
      {isListening && (
        <div className="absolute right-0 bottom-full mb-1.5 z-50 pointer-events-none whitespace-nowrap">
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-900/95 border border-rose-500/40 shadow-xl rounded-full text-[10px] font-semibold text-rose-300 animate-in fade-in zoom-in-95 duration-150">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping shrink-0" />
            <span>Ouvindo em português... Fale agora</span>
          </div>
        </div>
      )}

      {error && !isListening && showTooltip && (
        <div className="absolute right-0 bottom-full mb-1.5 z-50 pointer-events-none whitespace-nowrap">
          <div className="px-2.5 py-1 bg-rose-950/90 border border-rose-500/50 shadow-xl rounded-lg text-[10px] text-rose-200">
            {error}
          </div>
        </div>
      )}
    </div>
  );
};
