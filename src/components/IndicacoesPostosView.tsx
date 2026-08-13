import React from "react";
import { Fuel, Trophy, TrendingDown, Gauge, MapPin, Sparkles } from "lucide-react";
import { Lancamento } from "../types";

interface Props {
  lancamentos: Lancamento[];
}

export const IndicacoesPostosView: React.FC<Props> = ({ lancamentos }) => {
  // Filter all fueling entries
  const fuelEntries = lancamentos.filter(
    (l) =>
      l.Tipo === "Abastecimento" ||
      (l.Categoria || "").toUpperCase().includes("ABASTECIMENTO") ||
      (l.Litros && l.Litros > 0)
  );

  // Group by Posto
  const statsByPosto: Record<
    string,
    {
      nome: string;
      count: number;
      totalLitros: number;
      totalValor: number;
      mediaKmLList: number[];
      precoLitroList: number[];
    }
  > = {};

  fuelEntries.forEach((entry) => {
    const postoName = (entry.Posto || (entry as any).Nome_Posto || "Posto Não Especificado").trim();

    if (!statsByPosto[postoName]) {
      statsByPosto[postoName] = {
        nome: postoName,
        count: 0,
        totalLitros: 0,
        totalValor: 0,
        mediaKmLList: [],
        precoLitroList: [],
      };
    }

    const st = statsByPosto[postoName];
    st.count += 1;
    st.totalLitros += Number(entry.Litros || 0);
    st.totalValor += Number(entry.Valor || 0);

    const media = Number((entry as any)["Média_(Km/L)"] || (entry as any).Media_KmL || 0);
    if (media > 0) st.mediaKmLList.push(media);

    const price = Number(entry.Preco_Litro || (entry as any)["Preço_Litro"] || 0);
    if (price > 0) st.precoLitroList.push(price);
  });

  // Calculate averages
  const postosList = Object.values(statsByPosto).map((st) => {
    const avgKmL =
      st.mediaKmLList.length > 0
        ? st.mediaKmLList.reduce((a, b) => a + b, 0) / st.mediaKmLList.length
        : 0;

    const avgPrice =
      st.precoLitroList.length > 0
        ? st.precoLitroList.reduce((a, b) => a + b, 0) / st.precoLitroList.length
        : st.totalLitros > 0
        ? st.totalValor / st.totalLitros
        : 0;

    return {
      ...st,
      avgKmL,
      avgPrice,
    };
  });

  // Sort by Best KmL descending, and lowest price ascending
  const rankedByEconomy = [...postosList].sort((a, b) => {
    if (b.avgKmL !== a.avgKmL) return b.avgKmL - a.avgKmL;
    return a.avgPrice - b.avgPrice;
  });

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <Fuel className="w-5 h-5 text-amber-400" />
          Indicações — Postos de Gasolina Mais Econômicos
        </h2>
        <p className="text-xs text-slate-400">
          Análise do histórico de abastecimentos (<code className="text-emerald-400 font-mono">1_Lancamentos</code>) para ranking de melhor Média (Km/L) e menor Preço por Litro.
        </p>
      </div>

      {/* Top Winner Card */}
      {rankedByEconomy.length > 0 && (
        <div className="p-6 bg-gradient-to-r from-emerald-950/80 via-slate-900 to-slate-900 border border-emerald-500/40 rounded-3xl space-y-3 relative overflow-hidden">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
            <Trophy className="w-4 h-4 text-amber-400" />
            Posto Recomendado nº 1
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-2xl font-extrabold text-white">
                {rankedByEconomy[0].nome}
              </h3>
              <p className="text-xs text-slate-300">
                Apresentou a melhor combinação de rendimento por litro e custo médio.
              </p>
            </div>

            <div className="flex items-center gap-4 bg-slate-950/80 p-4 rounded-2xl border border-slate-800 shrink-0">
              <div>
                <span className="text-[10px] text-slate-400 block font-semibold">Média Rendimento</span>
                <span className="text-lg font-extrabold text-emerald-400 font-mono">
                  {rankedByEconomy[0].avgKmL > 0 ? `${rankedByEconomy[0].avgKmL.toFixed(2)} Km/L` : "N/D"}
                </span>
              </div>
              <div className="w-px h-8 bg-slate-800" />
              <div>
                <span className="text-[10px] text-slate-400 block font-semibold">Preço Média/L</span>
                <span className="text-lg font-extrabold text-amber-400 font-mono">
                  {rankedByEconomy[0].avgPrice > 0 ? `R$ ${rankedByEconomy[0].avgPrice.toFixed(2)}` : "N/D"}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Postos Ranked Table / Cards */}
      <div className="space-y-3">
        <h3 className="font-bold text-white text-sm">Ranking Completo de Postos do Histórico</h3>

        {rankedByEconomy.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs bg-slate-900 border border-slate-800 rounded-2xl">
            Nenhum abastecimento com informação de posto cadastrado ainda. Crie um abastecimento na tela de Lançamentos ou Abastecimentos para visualizar a análise.
          </div>
        ) : (
          rankedByEconomy.map((p, idx) => (
            <div
              key={p.nome}
              className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
            >
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-slate-300 shrink-0">
                  #{idx + 1}
                </span>
                <div>
                  <h4 className="font-bold text-white text-sm">{p.nome}</h4>
                  <p className="text-slate-400">
                    {p.count} abastecimento(s) • Total de {p.totalLitros.toFixed(1)}L
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 bg-slate-950 px-4 py-2 rounded-xl border border-slate-800/80">
                <div>
                  <span className="text-[10px] text-slate-500 block">Média (Km/L)</span>
                  <span className="font-bold text-emerald-400 font-mono">
                    {p.avgKmL > 0 ? `${p.avgKmL.toFixed(2)} Km/L` : "—"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Preço Litro</span>
                  <span className="font-bold text-amber-400 font-mono">
                    {p.avgPrice > 0 ? `R$ ${p.avgPrice.toFixed(2)}` : "—"}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
