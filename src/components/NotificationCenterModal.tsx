import React, { useState, useEffect } from "react";
import {
  Bell,
  BellRing,
  X,
  CheckCircle2,
  AlertTriangle,
  CalendarDays,
  HeartPulse,
  Car,
  Receipt,
  ShoppingBag,
  ExternalLink,
  Check,
  Volume2,
  VolumeX,
  Clock,
  AlarmClock,
  RotateCcw,
} from "lucide-react";
import { AppNotification } from "../types";
import { ModuleView } from "./Navigation";
import {
  getNotificationPermissionStatus,
  requestBrowserNotificationPermission,
  registerTireCalibrationNow,
} from "../services/notificationEngine";
import { useAlarmSound } from "../hooks/useAlarmSound";
import {
  snoozeNotification,
  cancelSnooze,
  getSnoozeInfo,
  subscribeSnooze,
  markCycleAsCompleted,
} from "../services/snoozeService";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  onDismiss: (id: string) => void;
  onDismissAll: () => void;
  onNavigate: (view: ModuleView) => void;
  onRefreshNotifications: () => void;
  onSnooze?: (id: string, minutes: number) => void;
}

export const NotificationCenterModal: React.FC<Props> = ({
  isOpen,
  onClose,
  notifications,
  onDismiss,
  onDismissAll,
  onNavigate,
  onRefreshNotifications,
  onSnooze,
}) => {
  const { isPlaying, activeAlarmId, alarmTitle, stopAlarm } = useAlarmSound();
  const [, setSnoozeTick] = useState(0);

  // Escuta alterações no estado de soneca
  useEffect(() => {
    const unsub = subscribeSnooze(() => {
      setSnoozeTick((t) => t + 1);
    });
    return unsub;
  }, []);

  if (!isOpen) return null;

  const permissionStatus = getNotificationPermissionStatus();

  const handleRequestPermission = async () => {
    const granted = await requestBrowserNotificationPermission();
    if (granted) {
      onRefreshNotifications();
    }
  };

  const handleCalibrationCheck = () => {
    registerTireCalibrationNow();
    onRefreshNotifications();
  };

  const handleDismissSingle = (id: string) => {
    stopAlarm();
    markCycleAsCompleted(id);
    onDismiss(id);
    onRefreshNotifications();
  };

  const handleSnoozeSingle = (id: string, minutes: number) => {
    stopAlarm();
    snoozeNotification(id, minutes);
    if (onSnooze) {
      onSnooze(id, minutes);
    }
    onRefreshNotifications();
  };

  const handleCancelSnooze = (id: string) => {
    cancelSnooze(id);
    onRefreshNotifications();
  };

  const handleDismissAllWithAudio = () => {
    stopAlarm();
    notifications.forEach((item) => {
      markCycleAsCompleted(item.id);
    });
    onDismissAll();
    onRefreshNotifications();
  };

  const handleNavigateWithAudio = (view: ModuleView) => {
    stopAlarm();
    onNavigate(view);
    onClose();
  };

  const getCategoryInfo = (type: AppNotification["type"]) => {
    switch (type) {
      case "agenda":
        return {
          label: "Agenda",
          icon: CalendarDays,
          color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/30",
        };
      case "saude":
        return {
          label: "Saúde & Multas",
          icon: HeartPulse,
          color: "text-rose-400 bg-rose-500/10 border-rose-500/30",
        };
      case "veiculos":
        return {
          label: "Veículos & Oficina",
          icon: Car,
          color: "text-amber-400 bg-amber-500/10 border-amber-500/30",
        };
      case "financas":
        return {
          label: "Finanças & Contas",
          icon: Receipt,
          color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
        };
      case "mercado":
        return {
          label: "Lista de Mercado",
          icon: ShoppingBag,
          color: "text-teal-400 bg-teal-500/10 border-teal-500/30",
        };
      default:
        return {
          label: "Geral",
          icon: BellRing,
          color: "text-slate-400 bg-slate-500/10 border-slate-500/30",
        };
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs text-xs">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-sm sm:text-base text-white flex items-center gap-2">
                Central de Lembretes & Notificações
                {notifications.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-mono font-bold">
                    {notifications.length}
                  </span>
                )}
              </h2>
              <p className="text-[11px] text-slate-400">
                Acompanhe vencimentos, compromissos e tarefas pendentes
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Banner de Alarme Sonoro Repetitivo Ativo */}
        {isPlaying && (
          <div className="p-3 sm:px-5 bg-rose-500/20 border-b border-rose-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-pulse">
            <div className="flex items-center gap-2 text-rose-300 font-bold text-xs">
              <Volume2 className="w-4 h-4 text-rose-400 shrink-0 animate-bounce" />
              <span>🔔 Alarme Sonoro Repetindo no momento! ({alarmTitle || "Alerta"})</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => {
                  stopAlarm();
                  if (activeAlarmId) {
                    handleDismissSingle(activeAlarmId);
                  }
                }}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-extrabold rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-rose-950 transition-transform active:scale-95 cursor-pointer"
              >
                <VolumeX className="w-4 h-4" />
                <span>🛑 Parar Alarme</span>
              </button>
            </div>
          </div>
        )}

        {/* Browser Permission Banner */}
        <div className="p-3 sm:px-5 bg-slate-950 border-b border-slate-800/80">
          {permissionStatus === "granted" ? (
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                <span className="font-medium">
                  Notificações do Navegador: <strong>Ativas</strong>
                </span>
              </div>
              <span className="text-[10px] text-slate-500">
                Alertas nativos com o app minimizado
              </span>
            </div>
          ) : permissionStatus === "denied" ? (
            <div className="flex items-center gap-2 text-amber-400 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>
                Notificações bloqueadas nas permissões do seu navegador.
              </span>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 text-slate-300">
                <Volume2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  Receba alertas na tela mesmo com o navegador minimizado:
                </span>
              </div>
              <button
                onClick={handleRequestPermission}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-colors shrink-0 shadow-xs"
              >
                🔔 Ativar Notificações
              </button>
            </div>
          )}
        </div>

        {/* Body Notification List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
          {notifications.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-14 h-14 mx-auto rounded-3xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white">
                  Tudo em dia por aqui!
                </h3>
                <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1">
                  Nenhum vencimento, consulta ou compromisso urgente para hoje.
                </p>
              </div>
            </div>
          ) : (
            notifications.map((item) => {
              const cat = getCategoryInfo(item.type);
              const CatIcon = cat.icon;
              const isUrgent = item.severity === "urgent";
              const snoozeInfo = getSnoozeInfo(item.id);
              const isSnoozed = Boolean(snoozeInfo);

              return (
                <div
                  key={item.id}
                  className={`p-3.5 rounded-2xl border transition-all ${
                    isUrgent
                      ? "bg-rose-950/20 border-rose-500/40 hover:border-rose-500/60"
                      : "bg-slate-950 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${cat.color}`}
                      >
                        <CatIcon className="w-3 h-3" />
                        {cat.label}
                      </span>
                      {isUrgent && (
                        <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase bg-rose-600 text-white tracking-wide">
                          Urgente
                        </span>
                      )}
                      {isSnoozed && snoozeInfo && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          <AlarmClock className="w-3 h-3 text-amber-400" />
                          <span>Soneca até {snoozeInfo.snoozedUntilFormatted} ({snoozeInfo.remainingMinutes} min)</span>
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => handleDismissSingle(item.id)}
                      className="text-slate-500 hover:text-slate-300 p-1 cursor-pointer"
                      title="Dispensar"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="mt-2 space-y-1">
                    <h4 className="font-bold text-xs text-white">
                      {item.title}
                    </h4>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {item.message}
                    </p>
                  </div>

                  {/* Ações Rápidas: Concluir / Finalizar e Adiar */}
                  <div className="mt-3 pt-2.5 border-t border-slate-800/80 space-y-2">
                    <button
                      onClick={() => handleDismissSingle(item.id)}
                      className="w-full py-2 px-3 bg-emerald-600/90 hover:bg-emerald-500 text-white font-extrabold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-xs transition-transform active:scale-95 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Concluído / Finalizada</span>
                    </button>

                    {/* Opções de Soneca / Adiar no Card */}
                    {isSnoozed ? (
                      <div className="flex items-center justify-between w-full bg-slate-900/60 p-2 rounded-xl border border-slate-800">
                        <span className="text-[11px] text-amber-300/90 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-amber-400" />
                          <span>Adiado por {snoozeInfo?.durationMinutes} min</span>
                        </span>
                        <button
                          onClick={() => handleCancelSnooze(item.id)}
                          className="px-2 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-lg text-[10px] font-bold border border-amber-500/40 flex items-center gap-1 cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Despertar agora</span>
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between w-full gap-2 bg-slate-900/40 p-1.5 px-2.5 rounded-xl border border-slate-800/60">
                        <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1 shrink-0">
                          <AlarmClock className="w-3 h-3 text-amber-400" />
                          <span>Adiar:</span>
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleSnoozeSingle(item.id, 5)}
                            className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-amber-500/50 rounded-lg text-slate-200 hover:text-amber-300 font-bold text-[10px] transition-colors cursor-pointer"
                            title="Adiar por 5 min"
                          >
                            5 min
                          </button>
                          <button
                            onClick={() => handleSnoozeSingle(item.id, 15)}
                            className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-amber-500/50 rounded-lg text-slate-200 hover:text-amber-300 font-bold text-[10px] transition-colors cursor-pointer"
                            title="Adiar por 15 min"
                          >
                            15 min
                          </button>
                          <button
                            onClick={() => handleSnoozeSingle(item.id, 30)}
                            className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-amber-500/50 rounded-lg text-slate-200 hover:text-amber-300 font-bold text-[10px] transition-colors cursor-pointer"
                            title="Adiar por 30 min"
                          >
                            30 min
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between">
                    {item.id === "veiculos_calibragem_pneus_7dias" ? (
                      <button
                        onClick={handleCalibrationCheck}
                        className="flex items-center gap-1 text-[11px] font-bold text-amber-400 hover:text-amber-300 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Marcar Calibragem Feita</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleNavigateWithAudio(item.targetView as ModuleView)}
                        className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 hover:text-emerald-300 cursor-pointer"
                      >
                        <span>Abrir no módulo</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    )}

                    <button
                      onClick={() => handleDismissSingle(item.id)}
                      className="text-[10px] text-slate-500 hover:text-slate-300 cursor-pointer"
                    >
                      Dispensar
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="p-3 px-5 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">
              {notifications.length} alerta(s) ativo(s)
            </span>
            <button
              onClick={handleDismissAllWithAudio}
              className="text-xs text-rose-400 hover:text-rose-300 font-semibold transition-colors cursor-pointer"
            >
              Limpar Todos os Alertas
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

