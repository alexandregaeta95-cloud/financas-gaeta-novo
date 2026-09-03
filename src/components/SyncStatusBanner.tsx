import React from "react";
import { RefreshCw, CheckCircle2, AlertTriangle, Settings, Cloud, Database, Fingerprint, ShieldCheck } from "lucide-react";
import { SyncState } from "../types";

interface Props {
  syncState: SyncState;
  onSyncNow: () => void;
  onOpenSetup: () => void;
  onOpenSecurity?: () => void;
  isBiometricsActive?: boolean;
}

export const SyncStatusBanner: React.FC<Props> = ({
  syncState,
  onSyncNow,
  onOpenSetup,
  onOpenSecurity,
  isBiometricsActive = false,
}) => {
  return (
    <div className="bg-slate-900/90 border-b border-slate-800 px-4 py-2 text-xs flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-3">
        {syncState.isConnected ? (
          <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Google Sheets Conectado</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-amber-400 font-medium">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Modo Offline / Cache Local</span>
          </div>
        )}

        {syncState.lastSyncedAt && (
          <span className="text-slate-400 hidden sm:inline">
            • Última sync: {new Date(syncState.lastSyncedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
          </span>
        )}

        {syncState.errorMessage && (
          <span className="text-rose-400 truncate max-w-xs text-[11px]" title={syncState.errorMessage}>
            ⚠️ {syncState.errorMessage}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onSyncNow}
          disabled={syncState.isSyncing}
          className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md transition-colors text-xs font-medium disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${syncState.isSyncing ? "animate-spin text-emerald-400" : ""}`} />
          {syncState.isSyncing ? "Sincronizando..." : "Sincronizar"}
        </button>
      </div>
    </div>
  );
};
