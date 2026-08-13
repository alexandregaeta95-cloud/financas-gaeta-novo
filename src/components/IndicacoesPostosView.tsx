import React from "react";
import { Fuel, Trophy, TrendingDown, Gauge, MapPin, Sparkles } from "lucide-react";
import { Lancamento } from "../types";
import { parseCurrency, formatCurrency } from "../utils/formatters";

interface Props {
  lancamentos: Lancamento[];
}

function getPostoName(entry: any): string {
  const name =
    entry.Nome_Posto ??
    entry["Nome_Posto"] ??
    entry.nomePosto ??
    entry.nome_posto ??
    entry["Nome Posto"] ??
    entry.Posto ??
    entry.posto ??
    entry.Localização_Do_Posto ??
    entry["Localização_Do_Posto"] ??
    entry.Localizacao_Do_Posto ??
    "";
  const trimmed = String(name).trim();
  if (trimmed && trimmed !== "Nome_Posto" && trimmed !== "Posto") {
    return trimmed;
  }
  return "Posto Convencional";
}

function isFuelLancamento(l: any): boolean {
  if (!l) return false;
  const tipo = String(l.Tipo || l.tipo || "").trim().toUpperCase();
  const cat = String(l.Categoria || l.categoria || "").trim().toUpperCase();
  const status = String(l.Status || l.status || "").trim().toUpperCase();
  if (status === "EXCLUÍDO" || status === "EXCLUIDO" || status === "DELETED") return false;

  return (
    tipo === "ABASTECIMENTO" ||
    cat === "ABASTECIMENTO" ||
    cat.includes("ABASTEC") ||
    cat.includes("COMBUSTIVEL") ||
    cat.includes("COMBUSTÍVEL") ||
    Boolean(l.Nome_Posto || l["Nome_Posto"] || l.nomePosto || l.Posto || l.posto) ||
    parseCurrency(l.Litros ?? l.litros) > 0 ||
    parseCurrency(l.Preco_Litro ?? l["Preço_Litro"]) > 0
  );
}

export const IndicacoesPostosView: React.FC<Props> = ({ lancamentos }) => {
  // Filter all fueling entries with resilient criteria
  const fuelEntries = lancamentos.filter(isFuelLancamento);

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
    const postoName = getPostoName(entry);

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
    const litros = parseCurrency(entry.Litros ?? (entry as any).litros ?? 0);
    const valor = parseCurrency(entry.Valor ?? (entry as any).valor ?? (entry as any).Valor_Total ?? 0);
    const media = parseCurrency(
      (entry as any)["Média_(Km/L)"] ??
      (entry as any)["Media_(Km/L)"] ??
      (entry as any).Media_KmL ??
      (entry as any).media_km_l ??
      (entry as any).mediaKmL ??
      0
    );
    const price = parseCurrency(
      entry.Preco_Litro ??
      (entry as any)["Preço_Litro"] ??
      (entry as any).preco_litro ??
      (entry as any).precoLitro ??
      (litros > 0 && valor > 0 ? valor / litros : 0)
    );

    st.count += 1;
    st.totalLitros += litros;
    st.totalValor += valor;

    if (media > 0) st.mediaKmLList.push(media);
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
    if (b.avgKmL > 0 && a.avgKmL > 0 && b.avgKmL !== a.avgKmL) {
      return b.avgKmL - a.avgKmL;
    }
    if (a.avgPrice > 0 && b.avgPrice > 0 && a.avgPrice !== b.avgPrice) {
      return a.avgPrice - b.avgPrice;
    }
    return b.count - a.count;
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
          Análise do histórico de abastecimentos da aba <code className="text-emerald-400 font-mono">1_Lancamentos</code> ({fuelEntries.length} registros computados) para ranking de rendimento e custo.
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
                {rankedByEconomy[0].count} abastecimento(s) registrado(s) • Total de {rankedByEconomy[0].totalLitros > 0 ? `${rankedByEconomy[0].totalLitros.toFixed(1)}L` : formatCurrency(rankedByEconomy[0].totalValor)}
              </p>
            </div>

            <div className="flex items-center gap-4 bg-slate-950/80 p-4 rounded-2xl border border-slate-800 shrink-0">
              <div>
                <span className="text-[10px] text-slate-400 block font-semibold">Média Rendimento</span>
                <span className="text-lg font-extrabold text-emerald-400 font-mono">
                  {rankedByEconomy[0].avgKmL > 0 ? `${rankedByEconomy[0].avgKmL.toFixed(2)} Km/L` : "—"}
                </span>
              </div>
              <div className="w-px h-8 bg-slate-800" />
              <div>
                <span className="text-[10px] text-slate-400 block font-semibold">Preço Médio/L</span>
                <span className="text-lg font-extrabold text-amber-400 font-mono">
                  {rankedByEconomy[0].avgPrice > 0 ? `R$ ${formatCurrency(rankedByEconomy[0].avgPrice)}` : "—"}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Postos Ranked Table / Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-white text-sm">Ranking Completo de Postos do Histórico</h3>
          <span className="text-xs text-slate-400">
            {rankedByEconomy.length} posto(s) identificado(s)
          </span>
        </div>

        {rankedByEconomy.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs bg-slate-900 border border-slate-800 rounded-2xl">
            Nenhum abastecimento encontrado na aba 1_Lancamentos. Registre lançamentos de abastecimento para visualizar a análise.
          </div>
        ) : (
          rankedByEconomy.map((p, idx) => (
            <div
              key={p.nome}
              className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:border-slate-700 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-slate-300 shrink-0">
                  #{idx + 1}
                </span>
                <div>
                  <h4 className="font-bold text-white text-sm">{p.nome}</h4>
                  <p className="text-slate-400">
                    {p.count} abastecimento(s) • Total de {p.totalLitros > 0 ? `${p.totalLitros.toFixed(1)}L` : `R$ ${formatCurrency(p.totalValor)}`}
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
                    {p.avgPrice > 0 ? `R$ ${formatCurrency(p.avgPrice)}` : "—"}
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
