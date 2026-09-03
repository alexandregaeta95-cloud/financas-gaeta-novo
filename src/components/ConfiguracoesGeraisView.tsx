import React from "react";
import { Settings, Fingerprint, Bell, ChevronRight } from "lucide-react";

interface Props {
  onOpenSetup: () => void;
  onOpenSecurity: () => void;
  onOpenNotifications: () => void;
  isBiometricsActive?: boolean;
  notificationCount?: number;
}

export const ConfiguracoesGeraisView: React.FC<Props> = ({
  onOpenSetup,
  onOpenSecurity,
  onOpenNotifications,
  isBiometricsActive = false,
  notificationCount = 0,
}) => {
  const items = [
    {
      icon: Settings,
      title: "Configurar Google Sheets",
      subtitle: "Conectar ou reconfigurar a sincronização com sua planilha",
      onClick: onOpenSetup,
      color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    },
    {
      icon: Fingerprint,
      title: isBiometricsActive ? "Segurança (Biometria Ativa)" : "Segurança & Biometria",
      subtitle: "Configurar login por biometria e PIN",
      onClick: onOpenSecurity,
      color: isBiometricsActive
        ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
        : "text-slate-300 bg-slate-800 border-slate-700",
    },
    {
      icon: Bell,
      title: "Central de Notificações",
      subtitle: notificationCount > 0 ? `${notificationCount} notificação(ões) não lida(s)` : "Ver alertas e lembretes recentes",
      onClick: onOpenNotifications,
      color: "text-slate-300 bg-slate-800 border-slate-700",
      badge: notificationCount,
    },
  ];

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <Settings className="w-5 h-5 text-emerald-400" />
          Configurações Gerais
        </h2>
        <p className="text-xs text-slate-400">
          Central de ajustes e configurações do sistema.
        </p>
      </div>

      <div className="space-y-3">
        {items.map((item, idx) => (
          <button
            key={idx}
            onClick={item.onClick}
            className="w-full flex items-center gap-4 p-4 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl transition-all text-left"
          >
            <div className={`p-3 rounded-xl border shrink-0 relative ${item.color}`}>
              <item.icon className="w-5 h-5" />
              {item.badge ? (
                <span className="absolute -top-1.5 -right-1.5 min-w-4.5 h-4.5 px-1 bg-rose-500 text-white text-[10px] font-extrabold rounded-full flex items-center justify-center">
                  {item.badge > 9 ? "9+" : item.badge}
                </span>
              ) : null}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-white text-sm">{item.title}</h3>
              <p className="text-xs text-slate-400 truncate">{item.subtitle}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
};
