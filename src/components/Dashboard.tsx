import React from "react";
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
  ChevronRight
} from "lucide-react";
import { Lancamento, Abastecimento, Veiculo, SyncState } from "../types";
import { ModuleView } from "./Navigation";
import { parseCurrency, formatCurrency, formatDateBR } from "../utils/formatters";

interface Props {
  lancamentos: Lancamento[];
  abastecimentos: Abastecimento[];
  veiculos: Veiculo[];
  syncState: SyncState;
  onNavigate: (view: ModuleView) => void;
  onOpenNewLancamentoModal: () => void;
  onOpenNewAbastecimentoModal: () => void;
  onOpenSetup: () => void;
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
  abastecimentos,
  veiculos,
  syncState,
  onNavigate,
  onOpenNewLancamentoModal,
  onOpenNewAbastecimentoModal,
  onOpenSetup,
}) => {
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
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">
            R$ {formatCurrency(saldoLiquido)}
          </div>
          <p className="text-[11px] text-slate-500">Receitas acumuladas - Despesas</p>
        </div>

        {/* Receitas */}
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Receitas</span>
            <div className="p-2 bg-teal-500/10 text-teal-400 rounded-xl">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-teal-400 tracking-tight">
            + R$ {formatCurrency(totalReceitas)}
          </div>
          <div className="flex items-center gap-1 text-[11px] text-teal-500/80">
            <ArrowUpRight className="w-3.5 h-3.5" />
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
          <div className="flex items-center gap-1 text-[11px] text-rose-500/80">
            <ArrowDownRight className="w-3.5 h-3.5" />
            <span>Inclui gastos veiculares</span>
          </div>
        </div>

        {/* Total Abastecimento */}
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Gastos com Combustível</span>
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl">
              <Fuel className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-amber-400 tracking-tight">
            R$ {formatCurrency(totalAbastecimento)}
          </div>
          <p className="text-[11px] text-slate-500">
            {abastecimentos.length} abastecimentos registrados
          </p>
        </div>
      </div>

      {/* Quick Action Buttons */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => onNavigate("lancamentos")}
          className="flex-1 min-w-[140px] flex items-center justify-center gap-2 p-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-xs transition-all shadow-md active:scale-95"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Novo Lançamento</span>
        </button>

        <button
          onClick={() => onNavigate("lancamentos")}
          className="flex-1 min-w-[140px] flex items-center justify-center gap-2 p-3.5 bg-slate-800 hover:bg-slate-700 text-amber-400 font-semibold rounded-xl text-xs border border-amber-500/20 transition-all active:scale-95"
        >
          <Fuel className="w-4 h-4" />
          <span>Registrar Abastecimento</span>
        </button>

        <button
          onClick={() => onNavigate("veiculos")}
          className="flex-1 min-w-[140px] flex items-center justify-center gap-2 p-3.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl text-xs border border-slate-700 transition-all active:scale-95"
        >
          <Car className="w-4 h-4" />
          <span>Gerenciar Veículo</span>
        </button>
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

              return (
                <div key={`${tx.Id || 'tx'}-${idx}`} className="py-3 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`p-2 rounded-xl shrink-0 ${
                        isReceita
                          ? "bg-teal-500/10 text-teal-400"
                          : isFuel
                          ? "bg-amber-500/10 text-amber-400"
                          : "bg-rose-500/10 text-rose-400"
                      }`}
                    >
                      {isFuel ? (
                        <Fuel className="w-4 h-4" />
                      ) : isReceita ? (
                        <TrendingUp className="w-4 h-4" />
                      ) : (
                        <TrendingDown className="w-4 h-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-slate-200 truncate">{desc}</p>
                      <p className="text-[11px] text-slate-500 truncate">
                        {cat} {conta ? `• ${conta}` : ""} {data ? `• ${data}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span
                      className={`font-bold ${
                        isReceita ? "text-teal-400" : "text-slate-200"
                      }`}
                    >
                      {isReceita ? "+" : "-"} R${" "}
                      {formatCurrency(valorNum)}
                    </span>
                    <p className="text-[10px] text-slate-500">{tx.Status || "Pago"}</p>
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
