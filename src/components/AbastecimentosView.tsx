import React from "react";
import { Fuel, Lock, Info } from "lucide-react";
import { Abastecimento } from "../types";
import { parseCurrency, formatCurrency } from "../utils/formatters";

interface Props {
  abastecimentos: Abastecimento[];
  onOpenNewFueling: () => void;
}

export const AbastecimentosView: React.FC<Props> = ({ abastecimentos, onOpenNewFueling }) => {
  // Calculate Fuel Stats safely using parseCurrency
  const totalGasto = abastecimentos.reduce(
    (acc, curr) => acc + parseCurrency(curr.Valor_Total),
    0
  );
  const totalLitros = abastecimentos.reduce(
    (acc, curr) => acc + parseCurrency(curr.Litros),
    0
  );
  const precoMedioLitro = totalLitros > 0 ? totalGasto / totalLitros : 0;

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white tracking-tight">
              Histórico de Abastecimentos
            </h2>
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-800 text-[10px] text-amber-400 border border-amber-500/20">
              <Lock className="w-3 h-3" />
              Cópia Somente Leitura (4_Abastecimentos)
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Esta aba é espelhada automaticamente a partir dos lançamentos de categoria <strong className="text-amber-300">ABASTECIMENTO</strong> na aba <strong className="text-emerald-300">1_Lancamentos</strong>.
          </p>
        </div>

        <button
          onClick={onOpenNewFueling}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition-colors shadow-sm shrink-0"
        >
          <Fuel className="w-4 h-4" />
          <span>+ Novo Abastecimento (em 1_Lancamentos)</span>
        </button>
      </div>

      {/* Info Callout */}
      <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-2xl flex items-start gap-3 text-xs text-slate-300">
        <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-slate-200">Garantia de Integridade de Dados</p>
          <p className="text-slate-400 mt-0.5">
            Para evitar discrepâncias financeiras, os registros de combustível são gerados pela aba de lançamentos gerais. Qualquer alteração ou exclusão feita em <strong>1_Lancamentos</strong> reflete instantaneamente aqui.
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-1">
          <span className="text-slate-400 text-xs">Total Investido em Combustível</span>
          <p className="text-2xl font-bold text-amber-400">
            R$ {formatCurrency(totalGasto)}
          </p>
          <p className="text-[11px] text-slate-500">{abastecimentos.length} registros no histórico</p>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-1">
          <span className="text-slate-400 text-xs">Volume Total Abastecido</span>
          <p className="text-2xl font-bold text-slate-200">
            {formatCurrency(totalLitros)} <span className="text-sm font-normal text-slate-400">Litros</span>
          </p>
          <p className="text-[11px] text-slate-500">Gasolina / Etanol / Diesel</p>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-1">
          <span className="text-slate-400 text-xs">Preço Médio por Litro</span>
          <p className="text-2xl font-bold text-teal-400">
            R$ {formatCurrency(precoMedioLitro)}
          </p>
          <p className="text-[11px] text-slate-500">Média geral das bombas</p>
        </div>
      </div>

      {/* Abastecimentos List */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        {abastecimentos.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs space-y-2">
            <p>Nenhum abastecimento registrado até o momento.</p>
            <button
              onClick={onOpenNewFueling}
              className="text-amber-400 hover:underline font-medium"
            >
              + Adicionar primeiro abastecimento
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80">
            {abastecimentos.map((item, idx) => {
              const valor = parseCurrency(item.Valor_Total);
              const litros = parseCurrency(item.Litros);
              const preco = parseCurrency(item.Preco_Litro) || (litros > 0 ? valor / litros : 0);
              const km = parseCurrency(item.Km_Atual);

              return (
                <div
                  key={`${item.Id || 'abast'}-${idx}`}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-800/40 transition-colors text-xs"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-xl shrink-0 mt-0.5">
                      <Fuel className="w-5 h-5" />
                    </div>
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">
                          {item.Veiculo || "Veículo"}
                        </span>
                        {item.Posto && (
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300 border border-slate-700">
                            {item.Posto}
                          </span>
                        )}
                      </div>
                      <p className="text-slate-400 text-[11px]">
                        Data: <span className="text-slate-200">{item.Data}</span>
                        {km > 0 && (
                          <> • Hodômetro: <span className="text-amber-300 font-mono">{km} KM</span></>
                        )}
                      </p>
                      {item.Observacoes && (
                        <p className="text-slate-500 text-[11px] italic">"{item.Observacoes}"</p>
                      )}
                    </div>
                  </div>

                  <div className="text-left sm:text-right shrink-0 border-t sm:border-0 border-slate-800 pt-2 sm:pt-0">
                    <span className="text-sm font-bold text-amber-400">
                      R$ {formatCurrency(valor)}
                    </span>
                    <p className="text-[11px] text-slate-400">
                      {formatCurrency(litros)}L @ R$ {formatCurrency(preco)}/L
                    </p>
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
