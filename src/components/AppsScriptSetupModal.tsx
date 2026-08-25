import React, { useState } from "react";
import { GOOGLE_APPS_SCRIPT_CODE } from "../services/appsScriptTemplate";
import { saveAppsScriptUrl, testAppsScriptConnection, getSavedAppsScriptUrl } from "../services/api";
import { Copy, Check, ExternalLink, ShieldCheck, AlertCircle, RefreshCw, X, Server } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConnectedSuccess: () => void;
}

export const AppsScriptSetupModal: React.FC<Props> = ({ isOpen, onClose, onConnectedSuccess }) => {
  const [urlInput, setUrlInput] = useState(getSavedAppsScriptUrl());
  const [copied, setCopied] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  if (!isOpen) return null;

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_CODE);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      console.error("Falha ao copiar código:", err);
    }
  };

  const handleTestAndSave = async () => {
    const trimmed = urlInput.trim();
    if (!trimmed) {
      setTestResult({
        success: false,
        message: "Por favor, insira uma URL do Google Apps Script válida.",
      });
      return;
    }

    setTesting(true);
    setTestResult(null);

    saveAppsScriptUrl(trimmed);
    const result = await testAppsScriptConnection(trimmed);
    setTesting(false);
    setTestResult(result);

    if (result.success) {
      onConnectedSuccess();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl text-slate-100">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Server className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-white">
                Conectar ao Google Sheets
              </h2>
              <p className="text-xs text-slate-400">
                Configure a URL do Web App do Google Apps Script para sincronização
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-6 overflow-y-auto text-sm leading-relaxed text-slate-300">
          {/* Step 1: Copy Code */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-white flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 text-xs">
                  1
                </span>
                Código do Backend (Codigo.gs)
              </span>
              <button
                onClick={handleCopyCode}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition-colors shadow-sm"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? "Copiado para Área de Transferência!" : "Copiar Código Codigo.gs"}
              </button>
            </div>
            <p className="text-xs text-slate-400">
              Copie o script abaixo e cole em <strong>Extensões -&gt; Apps Script</strong> na sua planilha do Google Sheets.
            </p>
            <div className="relative">
              <pre className="p-3 bg-slate-900 border border-slate-800 rounded-lg text-[11px] font-mono text-emerald-300 max-h-36 overflow-y-auto whitespace-pre-wrap select-all">
                {GOOGLE_APPS_SCRIPT_CODE}
              </pre>
            </div>
          </div>

          {/* Step 2: Deployment Guide */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
            <span className="font-semibold text-white flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400">
                2
              </span>
              Como Publicar o Script na Planilha
            </span>
            <ol className="list-decimal list-inside space-y-1.5 text-slate-400 pl-1">
              <li>Clique em <strong>Implantar (Deploy)</strong> &gt; <strong>Nova Implantação (New Deployment)</strong>.</li>
              <li>Escolha o tipo: <strong>App da Web (Web App)</strong>.</li>
              <li>Executar como: <strong>Eu (Me)</strong>.</li>
              <li>Quem tem acesso: <strong>Qualquer pessoa (Anyone)</strong> (necessário para o proxy comunicar).</li>
              <li>Copie a <strong>URL do App da Web</strong> gerada e cole no campo abaixo.</li>
            </ol>
          </div>

          {/* Step 3: Input URL & Test */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <span className="font-semibold text-white flex items-center gap-2 text-xs">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400">
                3
              </span>
              Cole a URL do Web App
            </span>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="url"
                placeholder="https://script.google.com/macros/s/.../exec"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors normal-case font-mono"
              />
              <button
                onClick={handleTestAndSave}
                disabled={testing}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium text-xs rounded-lg transition-colors shadow-sm"
              >
                {testing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                {testing ? "Testando..." : "Testar e Salvar"}
              </button>
            </div>

            {/* Test Result Message */}
            {testResult && (
              <div
                className={`p-3 rounded-lg text-xs flex items-start gap-2 border ${
                  testResult.success
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                    : "bg-rose-500/10 border-rose-500/30 text-rose-300"
                }`}
              >
                {testResult.success ? (
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <p className="font-medium">{testResult.message}</p>
                  {testResult.success && (
                    <p className="text-[11px] text-emerald-400/80 mt-0.5">
                      Sua planilha oficial agora está conectada! As 19 abas e os IDs determinísticos foram inicializados.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 flex justify-end gap-2 bg-slate-950/50 rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
