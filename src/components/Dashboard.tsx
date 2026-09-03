import React, { useMemo } from "react";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Fuel,
  PlusCircle,
  Car,
  Calendar,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  Fingerprint,
  ShieldCheck,
  BarChart3,
  FileText,
} from "lucide-react";
import { Lancamento, Abastecimento, Veiculo, SyncState, MetaCategoria } from "../types";
import { ModuleView } from "./Navigation";
import { parseCurrency, formatCurrency, formatDateBR } from "../utils/formatters";
import { calcularAlertasFinanceiros } from "../utils/financeAlertEngine";
import { AlertaFinanceiroCard } from "./AlertaFinanceiroCard";

interface Props {
  lancamentos: Lancamento[];
  metas?: MetaCategoria[];
  abastecimentos: Abastecimento[];
  veiculos: Veiculo[];
  syncState: SyncState;
  onNavigate: (view: ModuleView) => void;
  onOpenNewLancamentoModal: () => void;
  onOpenNewAbastecimentoModal: () => void;
  onOpenSetup: () => void;
  onOpenSecurity?: () => void;
  isBiometricsActive?: boolean;
}

// Helpers for resilient property resolution
function parseDateForSort(val: any): number {
  if (!val) return 0;
  const str = String(val).trim();
  if (str.includes("/")) {
    const parts = str.split("/");
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      return new Date(year, month, day).getTime() || 0;
    }
  }
  const timestamp = new Date(str).getTime();
  return isNaN(timestamp) ? 0 : timestamp;
}

function getItemDescricao(l: any): string {
  const val =
    l.Descricao ??
    l["Descrição"] ??
    l.descricao ??
    l["descrição"] ??
    l.Descricao_Do_Veiculo ??
    l["Descrição_Do_Veículo"] ??
    l.Item ??
    l.Titulo ??
    "";
  const str = String(val).trim();
  if (str && str !== "Descricao" && str !== "Descrição") return str;
  if (isFuelItem(l)) return "Abastecimento";
  return l.Categoria || l.Tipo || "Lançamento";
}

function getItemCategoria(l: any): string {
  return String(l.Categoria ?? l.categoria ?? (isFuelItem(l) ? "ABASTECIMENTO" : "Geral")).trim();
}

function getItemConta(l: any): string {
  const conta = l.Conta ?? l.conta ?? l.Banco_Id ?? l["Banco_Id"] ?? l.Banco ?? "";
  return String(conta).trim();
}

function getItemData(l: any): string {
  return formatDateBR(l.Data ?? l.data ?? "");
}

function isReceitaItem(l: any): boolean {
  const tipo = (l.Tipo || l.tipo || "").toString().toUpperCase();
  const cat = (l.Categoria || l.categoria || "").toString().toUpperCase();
  return tipo === "RECEITA" || cat === "RECEITA" || cat === "SALÁRIO" || cat === "SALARIO";
}

function isFuelItem(l: any): boolean {
  const tipo = (l.Tipo || l.tipo || "").toString().toUpperCase();
  const cat = (l.Categoria || l.categoria || "").toString().toUpperCase();
  return (
    tipo === "ABASTECIMENTO" ||
    cat === "ABASTECIMENTO" ||
    cat.includes("COMBUSTIVEL") ||
    cat.includes("COMBUSTÍVEL") ||
    Boolean(l.Nome_Posto || l.Posto || l["Nome_Posto"]) ||
    parseCurrency(l.Litros) > 0
  );
}

function isExcludedItem(l: any): boolean {
  const status = (l.Status || l.status || "").toString().toUpperCase();
  return status === "EXCLUÍDO" || status === "EXCLUIDO" || status === "DELETED";
}

export const Dashboard: React.FC<Props> = ({
  lancamentos,
  metas = [],
  abastecimentos,
  veiculos,
  syncState,
  onNavigate,
  onOpenNewLancamentoModal,
  onOpenNewAbastecimentoModal,
  onOpenSetup,
  onOpenSecurity,
  isBiometricsActive = false,
}) => {
  // Alertas Financeiros de Despesas vs Receitas (Diário, Semanal e Mensal)
  const alertasFinanceiros = useMemo(() => {
    return calcularAlertasFinanceiros(lancamentos, metas);
  }, [lancamentos, metas]);

  // Calculate Totals using robust currency parsing
  const activeLancamentos = lancamentos.filter((l) => !isExcludedItem(l));

  const totalReceitas = activeLancamentos
    .filter((l) => isReceitaItem(l))
    .reduce((acc, curr) => acc + parseCurrency(curr.Valor ?? (curr as any)["Valor"] ?? 0), 0);

  const totalDespesas = activeLancamentos
    .filter((l) => !isReceitaItem(l))
    .reduce((acc, curr) => acc + parseCurrency(curr.Valor ?? (curr as any)["Valor"] ?? 0), 0);

  const saldoLiquido = totalReceitas - totalDespesas;

  const totalAbastecimento = activeLancamentos
    .filter((l) => isFuelItem(l))
    .reduce((acc, curr) => acc + parseCurrency(curr.Valor ?? (curr as any)["Valor"] ?? 0), 0);

  const recentTransactions = [...activeLancamentos]
    .sort((a, b) => {
      const dateA = parseDateForSort(a.Data ?? (a as any).data);
      const dateB = parseDateForSort(b.Data ?? (b as any).data);
      return dateB - dateA;
    })
    .slice(0, 6);

  const primaryVehicle = veiculos[0];

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Alerta Financeiro de Despesas vs Receitas (Diário/Semanal/Mensal) */}
      <AlertaFinanceiroCard
        alertas={alertasFinanceiros}
        onNavigateToLancamentos={() => onNavigate("lancamentos")}
        onNavigateToMetas={() => onNavigate("metas")}
      />

      {/* Setup Warning Callout if Not Connected */}
      {!syncState.isConnected && (
        <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl shrink-0 mt-0.5">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-amber-300 text-sm">
                Conecte sua Planilha do Google Sheets
              </h3>
              <p className="text-xs text-amber-200/70 mt-0.5">
                Cole o script <code className="bg-slate-900 px-1.5 py-0.5 rounded font-mono text-[11px]">Codigo.gs</code> na sua planilha para sincronizar despesas e abastecimentos na nuvem.
              </p>
            </div>
          </div>
          <button
            onClick={onOpenSetup}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold rounded-xl text-xs transition-colors shrink-0 shadow-sm"
          >
            Configurar Agora
          </button>
        </div>
      )}

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Saldo Líquido */}
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Saldo Geral</span>
            <div className={`p-2 rounded-xl ${saldoLiquido >= 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"}`}>
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-2xl font-bold tracking-tight ${saldoLiquido >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
            R$ {formatCurrency(saldoLiquido)}
          </div>
          <p className="text-[11px] text-slate-500">Receitas acumuladas - Despesas</p>
        </div>

        {/* Receitas */}
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Receitas</span>
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-400 tracking-tight">
            + R$ {formatCurrency(totalReceitas)}
          </div>
          <div className="flex items-center gap-1 text-[11px] text-slate-400">
            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
            <span>Entradas confirmadas</span>
          </div>
        </div>

        {/* Despesas */}
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Despesas Totais</span>
            <div className="p-2 bg-rose-500/10 text-rose-400 rounded-xl">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-rose-400 tracking-tight">
            - R$ {formatCurrency(totalDespesas)}
          </div>
          <div className="flex items-center gap-1 text-[11px] text-slate-400">
            <ArrowDownRight className="w-3.5 h-3.5 text-rose-400" />
            <span>Inclui gastos veiculares</span>
          </div>
        </div>

        {/* Total Abastecimento */}
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Gastos com Combustível</span>
            <div className="p-2 bg-slate-800 text-slate-300 rounded-xl border border-slate-700/60">
              <Fuel className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">
            R$ {formatCurrency(totalAbastecimento)}
          </div>
          <p className="text-[11px] text-slate-500">
            {abastecimentos.length} abastecimentos registrados
          </p>
        </div>
      </div>

      {/* Quick Action Buttons */}
      <div className="grid grid-cols-1 gap-2.5 sm:gap-3">
        {onOpenSecurity && (
          <button
            onClick={onOpenSecurity}
            className={`w-full flex items-center justify-center gap-2 p-3 sm:p-3.5 rounded-xl text-xs sm:text-sm font-semibold border transition-all active:scale-95 text-center cursor-pointer ${
              isBiometricsActive
                ? "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                : "bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700"
            }`}
          >
            <Fingerprint className="w-4 h-4 shrink-0" />
            <span className="truncate">{isBiometricsActive ? "Biometria" : "Segurança"}</span>
          </button>
        )}
      </div>

      {/* Vehicle Overview Section */}
      {primaryVehicle && (
        <div className="p-5 bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-slate-800 rounded-xl text-emerald-400 border border-slate-700">
                <Car className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-white">
                  {primaryVehicle.Marca} {primaryVehicle.Modelo} ({primaryVehicle.Ano})
                </h4>
                <p className="text-xs text-slate-400">
                  Placa: <span className="font-mono text-slate-300">{primaryVehicle.Placa}</span> • {primaryVehicle.Combustivel}
                </p>
              </div>
            </div>
            <button
              onClick={() => onNavigate("veiculos")}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-800/80 text-xs">
            <div className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800">
              <span className="text-slate-400 text-[11px]">Hodômetro Atual</span>
              <p className="text-sm font-bold text-slate-200 mt-0.5">
                {Number(primaryVehicle.Km_Atual || 0).toLocaleString("pt-BR")} KM
              </p>
            </div>
            <div className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800">
              <span className="text-slate-400 text-[11px]">Último Abastecimento</span>
              <p className="text-sm font-bold text-amber-400 mt-0.5">
                {abastecimentos.length > 0
                  ? `R$ ${Number(abastecimentos[0].Valor_Total || 0).toFixed(2)}`
                  : "Nenhum"}
              </p>
            </div>
            <div className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800 col-span-2 sm:col-span-1">
              <span className="text-slate-400 text-[11px]">Total de Abastecimentos</span>
              <p className="text-sm font-bold text-emerald-400 mt-0.5">
                {abastecimentos.length} reg.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Recent Activity Section */}
      <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm text-white flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-400" />
            Últimos Lançamentos (1_Lancamentos)
          </h3>
          <button
            onClick={() => onNavigate("lancamentos")}
            className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1"
          >
            Ver Todos
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {recentTransactions.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs space-y-2 border border-dashed border-slate-800 rounded-xl">
            <p>Nenhum lançamento cadastrado ainda.</p>
            <button
              onClick={onOpenNewLancamentoModal}
              className="text-emerald-400 hover:underline font-medium"
            >
              + Adicionar primeiro lançamento
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80">
            {recentTransactions.map((tx, idx) => {
              const isReceita = isReceitaItem(tx);
              const isFuel = isFuelItem(tx);
              const desc = getItemDescricao(tx);
              const cat = getItemCategoria(tx);
              const conta = getItemConta(tx);
              const data = getItemData(tx);
              const valorNum = parseCurrency(tx.Valor ?? (tx as any)["Valor"] ?? 0);
              const isPago = String(tx.Status || "").toUpperCase() === "PAGO" || !tx.Status;

              return (
                <div
                  key={`${tx.Id || 'tx'}-${idx}`}
                  onClick={() => onNavigate("lancamentos")}
                  className="py-3 px-1 flex items-center justify-between gap-3 text-xs hover:bg-slate-800/30 rounded-xl transition-colors cursor-pointer"
                >
                  {/* Lado Esquerdo: Ícone Neutro + Descrição & Categoria (Linha 1) + Data/Conta (Linha 2) */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="p-2 rounded-xl shrink-0 bg-slate-800 text-slate-300 border border-slate-700/60">
                      {isFuel ? (
                        <Fuel className="w-3.5 h-3.5" />
                      ) : isReceita ? (
                        <TrendingUp className="w-3.5 h-3.5" />
                      ) : (
                        <TrendingDown className="w-3.5 h-3.5" />
                      )}
                    </div>

                    <div className="min-w-0 space-y-0.5 flex-1">
                      {/* Linha 1: Descrição + Badge Categoria Neutro */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-white text-xs sm:text-sm tracking-tight truncate max-w-[160px] sm:max-w-xs md:max-w-md">
                          {desc}
                        </span>
                        <span className="px-1.5 py-0.5 rounded-md bg-slate-800/90 text-[10px] font-medium text-slate-300 border border-slate-700/70">
                          {cat}
                        </span>
                      </div>

                      {/* Linha 2: Data • Conta */}
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400 truncate">
                        <span>{data}</span>
                        {conta && (
                          <>
                            <span>•</span>
                            <span className="text-slate-300 truncate max-w-[140px]">{conta}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Lado Direito: Valor alinhado na MESMA linha com ponto discreto de status */}
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Ponto indicador de status discreto */}
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        isPago ? "bg-emerald-400 shadow-xs shadow-emerald-400/50" : "bg-amber-400 shadow-xs shadow-amber-400/50"
                      }`}
                      title={isPago ? "Pago" : "Pendente"}
                    />

                    {/* Valor numérico em destaque com cor financeira */}
                    <span
                      className={`font-bold text-xs sm:text-sm tracking-tight whitespace-nowrap ${
                        isReceita ? "text-emerald-400" : "text-white"
                      }`}
                    >
                      {isReceita ? "+" : "-"} R$ {formatCurrency(valorNum)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
