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
} from "lucide-react";
import { AppNotification } from "../types";
import { ModuleView } from "./Navigation";
import { useAlarmSound } from "../hooks/useAlarmSound";

interface Props {
  notification: AppNotification | null;
  onClose: () => void;
  onNavigate: (view: ModuleView) => void;
}

export const NotificationToast: React.FC<Props> = ({
  notification,
  onClose,
  onNavigate,
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

    // Se for um alarme sonoro ativo, NÃO fecha automaticamente em 7s (toca até o usuário parar)
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
    onClose();
  };

  const handleNavigate = () => {
    stopAlarm();
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
      return "border-rose-500 shadow-rose-950/80 bg-slate-900 ring-2 ring-rose-500/40 animate-pulse";
    }
    switch (notification.severity) {
      case "urgent":
        return "border-rose-500/80 shadow-rose-950/40 bg-slate-900";
      case "warning":
        return "border-amber-500/80 shadow-amber-950/40 bg-slate-900";
      default:
        return "border-emerald-500/80 shadow-emerald-950/40 bg-slate-900";
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm w-[calc(100vw-2rem)] sm:w-96 animate-in slide-in-from-top-3 fade-in duration-200">
      <div
        className={`p-4 rounded-2xl border-2 shadow-2xl backdrop-blur-md text-xs space-y-3 ${getBorderColor()}`}
      >
        {/* Banner do Alarme Sonoro Repetitivo */}
        {isCurrentAlarm && (
          <div className="flex items-center justify-between px-2.5 py-1.5 bg-rose-500/20 border border-rose-500/40 rounded-xl text-rose-300 font-bold text-[11px] animate-bounce">
            <div className="flex items-center gap-1.5">
              <Volume2 className="w-4 h-4 text-rose-400 animate-pulse" />
              <span>🔔 ALARME SONORO REPETINDO</span>
            </div>
            <span className="text-[10px] uppercase tracking-wider bg-rose-500/30 px-2 py-0.5 rounded-md font-mono">
              Loop Ativo
            </span>
          </div>
        )}

        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-slate-800 border border-slate-700">
              {getIcon()}
            </div>
            <div>
              <span className="font-extrabold text-white text-xs block leading-tight">
                {notification.title}
              </span>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                {notification.type}
              </span>
            </div>
          </div>

          <button
            onClick={handleStopAndClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            title="Fechar / Parar alarme"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-slate-300 text-xs leading-relaxed">
          {notification.message}
        </p>

        {/* Botão de Destaque para Parar o Alarme quando estiver tocando */}
        {isCurrentAlarm && (
          <button
            type="button"
            onClick={handleStopAndClose}
            className="w-full py-2.5 px-3 bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-extrabold rounded-xl shadow-lg shadow-rose-950/50 flex items-center justify-center gap-2 text-xs transition-transform active:scale-95 cursor-pointer"
          >
            <VolumeX className="w-4 h-4" />
            <span>🛑 PARAR ALARME / JÁ VI</span>
          </button>
        )}

        <div className="flex items-center justify-between pt-1 border-t border-slate-800">
          <button
            onClick={handleNavigate}
            className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
          >
            <span>Ver no módulo</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleStopAndClose}
            className="text-[10px] text-slate-400 hover:text-slate-200 cursor-pointer"
          >
            {isCurrentAlarm ? "Silenciar & Dispensar" : "Dispensar"}
          </button>
        </div>
      </div>
    </div>
  );
};
