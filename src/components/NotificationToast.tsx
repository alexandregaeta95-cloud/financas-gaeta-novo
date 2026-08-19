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
} from "lucide-react";
import { AppNotification } from "../types";
import { ModuleView } from "./Navigation";

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
  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => {
      onClose();
    }, 7000);
    return () => clearTimeout(timer);
  }, [notification, onClose]);

  if (!notification) return null;

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
        className={`p-4 rounded-2xl border-2 shadow-2xl backdrop-blur-md text-xs space-y-2.5 ${getBorderColor()}`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-slate-800 border border-slate-700">
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
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-slate-300 text-xs leading-relaxed">
          {notification.message}
        </p>

        <div className="flex items-center justify-between pt-1 border-t border-slate-800">
          <button
            onClick={() => {
              onNavigate(notification.targetView as ModuleView);
              onClose();
            }}
            className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            <span>Ver no módulo</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onClose}
            className="text-[10px] text-slate-400 hover:text-slate-200"
          >
            Dispensar
          </button>
        </div>
      </div>
    </div>
  );
};
