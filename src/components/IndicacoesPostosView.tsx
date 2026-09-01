import React, { useMemo } from "react";
import { Fuel, Trophy, TrendingDown, Gauge, MapPin, Sparkles } from "lucide-react";
import { Lancamento } from "../types";
import { parseCurrency, formatCurrency } from "../utils/formatters";

interface Props {
  lancamentos: Lancamento[];
}

function parseDateForSort(val: any, horaVal?: any): number {
  if (!val) return 0;
  let d: Date | null = null;
  if (val instanceof Date) {
    d = isNaN(val.getTime()) ? null : val;
  } else {
    const s = String(val).trim();
    if (s) {
      // DD/MM/YYYY or DD-MM-YYYY
      const brMatch = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
      if (brMatch) {
        const day = parseInt(brMatch[1], 10);
        const month = parseInt(brMatch[2], 10) - 1;
        const year = parseInt(brMatch[3], 10);
        d = new Date(year, month, day);
      } else {
        // YYYY-MM-DD
        const isoMatch = s.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
        if (isoMatch) {
          const year = parseInt(isoMatch[1], 10);
          const month = parseInt(isoMatch[2], 10) - 1;
          const day = parseInt(isoMatch[3], 10);
          d = new Date(year, month, day);
        } else {
          const parsed = new Date(s);
          if (!isNaN(parsed.getTime())) d = parsed;
        }
      }
    }
  }

  if (!d) return 0;
  let time = d.getTime();

  if (horaVal) {
    const hStr = String(horaVal).trim();
    const hMatch = hStr.match(/^(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?/);
    if (hMatch) {
      const hours = parseInt(hMatch[1], 10) || 0;
      const minutes = parseInt(hMatch[2], 10) || 0;
      const seconds = parseInt(hMatch[3], 10) || 0;
      time += (hours * 3600 + minutes * 60 + seconds) * 1000;
    }
  }

  return time;
}

function isValidPostoName(val: any): boolean {
  if (!val) return false;
  const trimmed = String(val).trim();
  if (trimmed.length < 2) return false;

  const upper = trimmed.toUpperCase();
  const invalidTokens = [
    "NÃO",
    "NAO",
    "SIM",
    "SI",
    "TRUE",
    "FALSE",
    "YES",
    "NO",
    "NOME_POSTO",
    "NOME POSTO",
    "POSTO",
    "POSTOS",
    "COMPLETOU_O_TANQUE",
    "COMPLETOU O TANQUE",
    "LOCALIZACAO_DO_POSTO",
    "LOCALIZAÇÃO_DO_POSTO",
    "COMPROVANTE_URL",
    "UNDEFINED",
    "NULL",
    "NAN",
    "-",
    "--",
    "S",
    "N",
  ];
  if (invalidTokens.includes(upper)) return false;

  // Rejeita coordenadas GPS puras no nome do posto (ex: "-23.55052,-46.633308")
  if (/^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/.test(trimmed)) {
    return false;
  }

  return true;
}

function getPostoName(entry: any): string {
  if (!entry) return "Posto Convencional";

  // 1. Tentar campos diretos do Nome do Posto / Posto
  const directCandidates = [
    entry.Nome_Posto,
    entry["Nome_Posto"],
    entry["Nome Posto"],
    entry.nomePosto,
    entry.nome_posto,
    entry.Posto,
    entry["Posto"],
    entry.posto,
  ];

  for (const cand of directCandidates) {
    if (cand !== null && cand !== undefined && isValidPostoName(cand)) {
      return String(cand).trim();
    }
  }

  // 2. Tentar extrair da Descrição se contiver nome do posto (ex: "Abastecimento - Posto Ipiranga")
  const desc = String(entry.Descricao || entry["Descrição"] || entry.descricao || "").trim();
  if (desc && isValidPostoName(desc)) {
    const descLower = desc.toLowerCase();
    if (descLower.startsWith("abastecimento - ") || descLower.startsWith("abastecimento – ")) {
      const parts = desc.split(/[-–]/);
      if (parts.length > 1) {
        const extracted = parts[1].trim();
        if (
          isValidPostoName(extracted) &&
          !extracted.toLowerCase().startsWith("veículo") &&
          !extracted.toLowerCase().startsWith("veiculo") &&
          !extracted.toLowerCase().startsWith("carro")
        ) {
          return extracted;
        }
      }
    } else if (descLower.includes("posto") && !descLower.startsWith("abastecimento")) {
      return desc;
    }
  }

  // 3. Tentar Localização se for textual (não GPS)
  const locCandidates = [
    entry.Localizacao_Do_Posto,
    entry["Localização_Do_Posto"],
    entry["Localizacao_Do_Posto"],
    entry.localizacao_do_posto,
  ];
  for (const loc of locCandidates) {
    if (loc && typeof loc === "string" && isValidPostoName(loc)) {
      return loc.trim();
    }
  }

  return "Posto Convencional";
}

function isFuelLancamento(l: any): boolean {
  if (!l) return false;
  const tipo = String(l.Tipo || l.tipo || "").trim().toUpperCase();
  const cat = String(l.Categoria || l.categoria || "").trim().toUpperCase();
  const status = String(l.Status || l.status || "").trim().toUpperCase();
  if (status === "EXCLUÍDO" || status === "EXCLUIDO" || status === "DELETED" || status === "CANCELADO") return false;

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
  // Filter all active fueling entries with resilient criteria
  const fuelEntries = useMemo(() => {
    return lancamentos.filter(isFuelLancamento);
  }, [lancamentos]);

  // Calculate dynamic stats grouped by Posto with live odometer delta calculation
  const rankedByEconomy = useMemo(() => {
    // 1. Group active fuel entries by vehicle identity
    const fuelEntriesByVehicle: Record<string, Lancamento[]> = {};

    fuelEntries.forEach((entry) => {
      const veicKey = String(
        entry.Veiculo ||
        (entry as any).veiculo ||
        entry.Descricao_Do_Veiculo ||
        (entry as any).Placa ||
        (entry as any).placa ||
        "VEICULO_PADRAO"
      ).trim().toUpperCase();

      if (!fuelEntriesByVehicle[veicKey]) {
        fuelEntriesByVehicle[veicKey] = [];
      }
      fuelEntriesByVehicle[veicKey].push(entry);
    });

    // 2. Stats grouped by Posto
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

    // 3. For each vehicle, sort fuelings chronologically (oldest to newest) and calculate dynamic Km/L between consecutive fuelings
    Object.values(fuelEntriesByVehicle).forEach((vehicleEntries) => {
      const sorted = [...vehicleEntries].sort((a, b) => {
        const timeA = parseDateForSort(a.Data ?? (a as any).data, a.Hora ?? (a as any).hora);
        const timeB = parseDateForSort(b.Data ?? (b as any).data, b.Hora ?? (b as any).hora);
        if (timeA !== timeB) return timeA - timeB;

        const kmA = parseCurrency(a.Km_Atual ?? (a as any).kmAtual ?? (a as any).KM ?? (a as any).km);
        const kmB = parseCurrency(b.Km_Atual ?? (b as any).kmAtual ?? (b as any).KM ?? (b as any).km);
        if (kmA !== kmB) return kmA - kmB;

        const createA = parseDateForSort(a.Data_Criacao ?? (a as any).dataCriacao);
        const createB = parseDateForSort(b.Data_Criacao ?? (b as any).dataCriacao);
        if (createA !== createB) return createA - createB;

        return String(a.Id || "").localeCompare(String(b.Id || ""));
      });

      for (let i = 0; i < sorted.length; i++) {
        const entry = sorted[i];
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
        if (price > 0) st.precoLitroList.push(price);

        // Recalcula Km/L dinamicamente comparando o odômetro consecutivo atual com o anterior existente
        if (i > 0) {
          const prevEntry = sorted[i - 1];
          const currentKm = parseCurrency(entry.Km_Atual ?? (entry as any).kmAtual ?? (entry as any).KM ?? (entry as any).km);
          const prevKm = parseCurrency(prevEntry.Km_Atual ?? (prevEntry as any).kmAtual ?? (prevEntry as any).KM ?? (prevEntry as any).km);

          if (currentKm > 0 && prevKm > 0 && currentKm > prevKm && litros > 0) {
            const kmPercorrido = currentKm - prevKm;
            const dynamicMediaKmL = kmPercorrido / litros;
            // Validação de sanidade (evita discrepâncias extremas de digitação)
            if (dynamicMediaKmL > 0 && dynamicMediaKmL <= 100) {
              st.mediaKmLList.push(dynamicMediaKmL);
            }
          }
        }
      }
    });

    // 4. Calculate averages per Posto
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

    // 5. Sort by Best KmL descending, and lowest price ascending
    return [...postosList].sort((a, b) => {
      if (b.avgKmL > 0 && a.avgKmL > 0 && b.avgKmL !== a.avgKmL) {
        return b.avgKmL - a.avgKmL;
      }
      if (a.avgPrice > 0 && b.avgPrice > 0 && a.avgPrice !== b.avgPrice) {
        return a.avgPrice - b.avgPrice;
      }
      return b.count - a.count;
    });
  }, [fuelEntries]);

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <div className="p-2 rounded-xl bg-slate-800 text-slate-300 border border-slate-700/60 shrink-0">
            <Fuel className="w-4 h-4" />
          </div>
          <span>Indicações — Postos Mais Econômicos</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Análise do histórico de abastecimentos ({fuelEntries.length} registros) para ranking de rendimento e custo por litro.
        </p>
      </div>

      {/* Top Winner Card */}
      {rankedByEconomy.length > 0 && (
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl space-y-4 relative overflow-hidden">
          <div className="flex items-center gap-2 text-slate-300 font-semibold text-xs uppercase tracking-wider">
            <div className="p-1.5 rounded-lg bg-slate-800 text-slate-300 border border-slate-700/60">
              <Trophy className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <span>Posto Recomendado nº 1</span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-2xl font-bold text-white">
                {rankedByEconomy[0].nome}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {rankedByEconomy[0].count} abastecimento(s) registrado(s) • Total de {rankedByEconomy[0].totalLitros > 0 ? `${rankedByEconomy[0].totalLitros.toFixed(1)}L` : `R$ ${formatCurrency(rankedByEconomy[0].totalValor)}`}
              </p>
            </div>

            <div className="flex items-center gap-4 bg-slate-950 p-4 rounded-2xl border border-slate-800 shrink-0">
              <div>
                <span className="text-[10px] text-slate-500 block font-medium">Média Rendimento</span>
                <span className="text-lg font-bold text-emerald-400 font-mono">
                  {rankedByEconomy[0].avgKmL > 0 ? `${rankedByEconomy[0].avgKmL.toFixed(2)} Km/L` : "—"}
                </span>
              </div>
              <div className="w-px h-8 bg-slate-800" />
              <div>
                <span className="text-[10px] text-slate-500 block font-medium">Preço Médio/L</span>
                <span className="text-lg font-bold text-white font-mono">
                  {rankedByEconomy[0].avgPrice > 0 ? `R$ ${formatCurrency(rankedByEconomy[0].avgPrice)}` : "—"}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Postos Ranked Table / Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="font-bold text-white text-sm">Ranking Completo de Postos</h3>
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
              className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:border-slate-700/80 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700/70 flex items-center justify-center font-bold text-slate-300 text-xs shrink-0">
                  #{idx + 1}
                </span>
                <div>
                  <h4 className="font-bold text-white text-sm">{p.nome}</h4>
                  <p className="text-slate-400 text-[11px]">
                    {p.count} abastecimento(s) • Total de {p.totalLitros > 0 ? `${p.totalLitros.toFixed(1)}L` : `R$ ${formatCurrency(p.totalValor)}`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 bg-slate-950 px-4 py-2 rounded-xl border border-slate-800/80 self-end sm:self-center">
                <div>
                  <span className="text-[10px] text-slate-500 block">Média Rendimento</span>
                  <span className="font-bold text-emerald-400 font-mono">
                    {p.avgKmL > 0 ? `${p.avgKmL.toFixed(2)} Km/L` : "—"}
                  </span>
                </div>
                <div className="w-px h-6 bg-slate-800/80" />
                <div>
                  <span className="text-[10px] text-slate-500 block">Preço Litro</span>
                  <span className="font-bold text-white font-mono">
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

