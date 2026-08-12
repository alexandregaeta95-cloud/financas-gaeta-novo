import React from "react";
import {
  LayoutDashboard,
  Receipt,
  Fuel,
  Car,
  CreditCard,
  HeartPulse,
  MoreHorizontal,
  Wallet
} from "lucide-react";

export type ModuleView =
  | "dashboard"
  | "lancamentos"
  | "abastecimentos"
  | "veiculos"
  | "contas"
  | "saude"
  | "outros";

interface Props {
  activeView: ModuleView;
  onSelectView: (view: ModuleView) => void;
}

export const Navigation: React.FC<Props> = ({ activeView, onSelectView }) => {
  const navItems: { id: ModuleView; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: "dashboard", label: "Início", icon: LayoutDashboard },
    { id: "lancamentos", label: "Finanças", icon: Receipt },
    { id: "abastecimentos", label: "Abastecer", icon: Fuel },
    { id: "veiculos", label: "Veículos", icon: Car },
    { id: "contas", label: "Contas", icon: CreditCard },
    { id: "saude", label: "Saúde", icon: HeartPulse },
    { id: "outros", label: "Outros", icon: MoreHorizontal },
  ];

  return (
    <>
      {/* Desktop Header Navbar */}
      <header className="hidden md:flex items-center justify-between px-6 py-3 bg-slate-900 border-b border-slate-800 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md font-bold text-lg">
            FG
          </div>
          <div>
            <h1 className="font-bold text-base text-white tracking-tight leading-none">
              Finanças Gaeta
            </h1>
            <p className="text-[11px] text-slate-400">Gestão Pessoal & Veículo</p>
          </div>
        </div>

        <nav className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800/80">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectView(item.id)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </header>

      {/* Mobile Header Banner */}
      <div className="flex md:hidden items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800 sticky top-0 z-40">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold text-sm">
            FG
          </div>
          <span className="font-bold text-sm text-white">Finanças Gaeta</span>
        </div>
      </div>

      {/* Mobile Bottom Navigation Bar (PWA friendly) */}
      <nav className="flex md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 px-2 py-1 justify-around items-center">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectView(item.id)}
              className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-xl transition-all ${
                isActive
                  ? "text-emerald-400 font-semibold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Icon className={`w-5 h-5 mb-0.5 ${isActive ? "text-emerald-400 scale-110" : ""}`} />
              <span className="text-[10px] tracking-tight">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
};
