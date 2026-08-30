import React from "react";
import {
  LayoutDashboard,
  Receipt,
  Fuel,
  Car,
  CreditCard,
  HeartPulse,
  MoreHorizontal,
  Wallet,
  Clock,
  Target,
  CalendarDays,
  ShieldAlert,
  ShoppingBag,
  Bell,
  Fingerprint,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useAlarmSound } from "../hooks/useAlarmSound";

export type ModuleView =
  | "dashboard"
  | "lancamentos"
  | "painel_contas"
  | "abastecimentos"
  | "indicacoes_postos"
  | "veiculos"
  | "contas"
  | "metas"
  | "saude"
  | "agenda"
  | "zonas_risco"
  | "lista_mercado";

interface Props {
  activeView: ModuleView;
  onSelectView: (view: ModuleView) => void;
  notificationCount?: number;
  onOpenNotifications?: () => void;
  onOpenSecurity?: () => void;
  isBiometricsActive?: boolean;
}

export const Navigation: React.FC<Props> = ({
  activeView,
  onSelectView,
  notificationCount = 0,
  onOpenNotifications,
  onOpenSecurity,
  isBiometricsActive = false,
}) => {
  const { isPlaying, stopAlarm } = useAlarmSound();

  const navItems: { id: ModuleView; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: "dashboard", label: "Início", icon: LayoutDashboard },
    { id: "lancamentos", label: "Finanças", icon: Receipt },
    { id: "painel_contas", label: "Painel Contas", icon: Clock },
    { id: "abastecimentos", label: "Abastecer", icon: Fuel },
    { id: "indicacoes_postos", label: "Postos", icon: Fuel },
    { id: "veiculos", label: "Veículos", icon: Car },
    { id: "contas", label: "Bancos & Cartões", icon: CreditCard },
    { id: "metas", label: "Metas", icon: Target },
    { id: "saude", label: "Saúde & Multas", icon: HeartPulse },
    { id: "agenda", label: "Agenda", icon: CalendarDays },
    { id: "zonas_risco", label: "Zonas Risco", icon: ShieldAlert },
    { id: "lista_mercado", label: "Mercado", icon: ShoppingBag },
  ];

  return (
    <>
      {/* Desktop Header Navbar */}
      <header className="hidden lg:flex items-center justify-between px-6 py-3 bg-slate-900 border-b border-slate-800 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md font-bold text-lg">
            FG
          </div>
          <div>
            <h1 className="font-bold text-base text-white tracking-tight leading-none">
              Finanças Gaeta
            </h1>
            <p className="text-[11px] text-slate-400">Sistema Integrado de Gestão</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <nav className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800/80 overflow-x-auto max-w-3xl">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectView(item.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    isActive
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {isPlaying && (
            <button
              onClick={() => stopAlarm()}
              className="px-2.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-lg shadow-rose-950/60 animate-bounce cursor-pointer"
              title="Alarme sonoro ativo! Clique para parar."
            >
              <VolumeX className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Parar Alarme</span>
            </button>
          )}

          {onOpenSecurity && (
            <button
              onClick={onOpenSecurity}
              className={`p-2 rounded-xl border transition-all shadow-xs ${
                isBiometricsActive
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
                  : "bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200"
              }`}
              title={isBiometricsActive ? "Segurança: Biometria Ativa" : "Configurar Biometria & PIN"}
            >
              <Fingerprint className="w-4 h-4" />
            </button>
          )}

          {onOpenNotifications && (
            <button
              onClick={onOpenNotifications}
              className="relative p-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition-all shadow-xs"
              title="Central de Notificações"
            >
              <Bell className="w-4 h-4" />
              {notificationCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-4.5 h-4.5 px-1 bg-rose-500 text-white text-[10px] font-extrabold rounded-full flex items-center justify-center animate-pulse shadow-md">
                  {notificationCount > 9 ? "9+" : notificationCount}
                </span>
              )}
            </button>
          )}
        </div>
      </header>

      {/* Mobile Top Header Banner */}
      <div className="flex lg:hidden items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800 sticky top-0 z-40">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold text-sm">
            FG
          </div>
          <span className="font-bold text-sm text-white">Finanças Gaeta</span>
        </div>

        <div className="flex items-center gap-2">
          {isPlaying && (
            <button
              onClick={() => stopAlarm()}
              className="p-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs flex items-center gap-1 shadow-md shadow-rose-950 animate-bounce cursor-pointer"
              title="Alarme sonoro ativo! Clique para parar."
            >
              <VolumeX className="w-4 h-4" />
            </button>
          )}

          {onOpenSecurity && (
            <button
              onClick={onOpenSecurity}
              className={`p-2 rounded-xl border transition-all ${
                isBiometricsActive
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                  : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
              }`}
              title="Segurança & Biometria"
            >
              <Fingerprint className="w-4 h-4" />
            </button>
          )}

          {onOpenNotifications && (
            <button
              onClick={onOpenNotifications}
              className="relative p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 hover:text-white transition-all"
              title="Central de Notificações"
            >
              <Bell className="w-4 h-4" />
              {notificationCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 bg-rose-500 text-white text-[9px] font-extrabold rounded-full flex items-center justify-center animate-pulse">
                  {notificationCount > 9 ? "9+" : notificationCount}
                </span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Mobile Bottom Scrollable Navigation Bar */}
      <nav className="flex lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 px-2 py-1 overflow-x-auto gap-2 items-center">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectView(item.id)}
              className={`flex flex-col items-center justify-center py-1.5 px-2.5 rounded-xl whitespace-nowrap transition-all ${
                isActive
                  ? "text-emerald-400 font-semibold bg-emerald-500/10"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Icon className="w-4 h-4 mb-0.5" />
              <span className="text-[10px]">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
};
