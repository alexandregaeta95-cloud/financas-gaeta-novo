import React, { useEffect } from "react";
import {
  BellRing,
  X,
  ArrowRight,
  CalendarDays,
  HeartPulse,
  Car,
  Receipt,
  ShoppingBag,
  AlertTriangle,
  Volume2,
  VolumeX,
  Square,
  Check,
  Clock,
  AlarmClock,
} from "lucide-react";
import { AppNotification } from "../types";
import { ModuleView } from "./Navigation";
import { useAlarmSound } from "../hooks/useAlarmSound";
import { snoozeNotification } from "../services/snoozeService";

interface Props {
  notification: AppNotification | null;
  onClose: () => void;
  onNavigate: (view: ModuleView) => void;
  onSnooze?: (id: string, minutes: number) => void;
  onDismiss?: (id: string) => void;
}

export const NotificationToast: React.FC<Props> = ({
  notification,
  onClose,
  onNavigate,
  onSnooze,
  onDismiss,
}) => {
  const { isPlaying, activeAlarmId, triggerAlarm, stopAlarm } = useAlarmSound();

  const isCurrentAlarm =
    Boolean(notification?.isAlarm) ||
    Boolean(notification?.soundEnabled) ||
    (isPlaying && activeAlarmId === notification?.id);

  // Inicia o alarme sonoro em loop repetitivo se a notificação tiver som/alarme ativo
  useEffect(() => {
    if (!notification) return;

    if (notification.isAlarm || notification.soundEnabled) {
      triggerAlarm(notification.id, {
        title: notification.title,
        type: notification.type,
      });
    }

    // Se for um alarme sonoro ativo, NÃO fecha automaticamente em 7s (toca até o usuário parar ou escolher soneca)
    if (notification.isAlarm || notification.soundEnabled) {
      return;
    }

    const timer = setTimeout(() => {
      onClose();
    }, 7000);
    return () => clearTimeout(timer);
  }, [notification, triggerAlarm, onClose]);

  if (!notification) return null;

  const handleStopAndClose = () => {
    stopAlarm();
    if (notification && onDismiss) {
      onDismiss(notification.id);
    }
    onClose();
  };

  const handleSnooze = (minutes: number) => {
    stopAlarm();
    snoozeNotification(notification.id, minutes);
    if (onSnooze) {
      onSnooze(notification.id, minutes);
    }
    onClose();
  };

  const handleNavigate = () => {
    stopAlarm();
    if (notification && onDismiss) {
      onDismiss(notification.id);
    }
    onNavigate(notification.targetView as ModuleView);
    onClose();
  };

  const getIcon = () => {
    switch (notification.type) {
      case "agenda":
        return <CalendarDays className="w-5 h-5 text-indigo-400" />;
      case "saude":
        return <HeartPulse className="w-5 h-5 text-rose-400" />;
      case "veiculos":
        return <Car className="w-5 h-5 text-amber-400" />;
      case "financas":
        return <Receipt className="w-5 h-5 text-emerald-400" />;
      case "mercado":
        return <ShoppingBag className="w-5 h-5 text-teal-400" />;
      default:
        return <BellRing className="w-5 h-5 text-emerald-400" />;
    }
  };

  const getBorderColor = () => {
    if (isCurrentAlarm) {
      return "border-rose-500 shadow-2xl shadow-black ring-2 ring-rose-500/80 animate-pulse";
    }
    switch (notification.severity) {
      case "urgent":
        return "border-rose-500/90 shadow-2xl shadow-black ring-1 ring-rose-500/50";
      case "warning":
        return "border-amber-500/90 shadow-2xl shadow-black ring-1 ring-amber-500/50";
      default:
        return "border-slate-700 shadow-2xl shadow-black ring-1 ring-slate-800";
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm w-[calc(100vw-2rem)] sm:w-96 animate-in slide-in-from-top-3 fade-in duration-200">
      <div
        className={`p-4 rounded-2xl border-2 bg-slate-950 text-xs space-y-3 ${getBorderColor()}`}
      >
        {/* Banner do Alarme Sonoro Repetitivo */}
        {isCurrentAlarm && (
          <div className="flex items-center justify-between px-2.5 py-1.5 bg-rose-950 border border-rose-500/60 rounded-xl text-rose-200 font-bold text-[11px] animate-bounce">
            <div className="flex items-center gap-1.5">
              <Volume2 className="w-4 h-4 text-rose-400 animate-pulse" />
              <span>🔔 ALARME SONORO REPETINDO</span>
            </div>
            <span className="text-[10px] uppercase tracking-wider bg-rose-900 px-2 py-0.5 rounded-md font-mono text-rose-200 border border-rose-700/50">
              Loop Ativo
            </span>
          </div>
        )}

        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 shrink-0">
              {getIcon()}
            </div>
            <div>
              <span className="font-bold text-white text-sm block leading-tight">
                {notification.title}
              </span>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                {notification.type}
              </span>
            </div>
          </div>

          <button
            onClick={handleStopAndClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-900 transition-colors cursor-pointer"
            title="Fechar / Parar alarme"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-slate-100 text-xs leading-relaxed font-normal">
          {notification.message}
        </p>

        {/* Botão de Destaque para Parar o Alarme */}
        <button
          type="button"
          onClick={handleStopAndClose}
          className="w-full py-2.5 px-3 bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-extrabold rounded-xl shadow-lg shadow-rose-950/50 flex items-center justify-center gap-2 text-xs transition-transform active:scale-95 cursor-pointer"
        >
          <VolumeX className="w-4 h-4" />
          <span>🛑 PARAR ALARME / JÁ VI</span>
        </button>

        {/* Seção de Soneca (Me lembre em 5 min, 15 min, 30 min) */}
        <div className="pt-1 space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-slate-300 font-semibold px-0.5">
            <span className="flex items-center gap-1.5 text-amber-300">
              <AlarmClock className="w-3.5 h-3.5" />
              <span>Soneca (Me lembre em):</span>
            </span>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => handleSnooze(5)}
              className="py-2 px-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-amber-500/60 rounded-xl text-slate-100 hover:text-amber-300 font-bold text-center text-xs transition-all cursor-pointer flex items-center justify-center gap-1 shadow-sm"
              title="Adiar por 5 minutos"
            >
              <Clock className="w-3 h-3 text-amber-400" />
              <span>5 min</span>
            </button>
            <button
              type="button"
              onClick={() => handleSnooze(15)}
              className="py-2 px-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-amber-500/60 rounded-xl text-slate-100 hover:text-amber-300 font-bold text-center text-xs transition-all cursor-pointer flex items-center justify-center gap-1 shadow-sm"
              title="Adiar por 15 minutos"
            >
              <Clock className="w-3 h-3 text-amber-400" />
              <span>15 min</span>
            </button>
            <button
              type="button"
              onClick={() => handleSnooze(30)}
              className="py-2 px-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-amber-500/60 rounded-xl text-slate-100 hover:text-amber-300 font-bold text-center text-xs transition-all cursor-pointer flex items-center justify-center gap-1 shadow-sm"
              title="Adiar por 30 minutos"
            >
              <Clock className="w-3 h-3 text-amber-400" />
              <span>30 min</span>
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
          <button
            onClick={handleNavigate}
            className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
          >
            <span>Ver no módulo</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleStopAndClose}
            className="text-[11px] font-medium text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
          >
            {isCurrentAlarm ? "Silenciar & Dispensar" : "Dispensar"}
          </button>
        </div>
      </div>
    </div>
  );
};
