import React, { useMemo } from "react";
import { Fuel, Lock, Info, MapPin, ExternalLink, Gauge, User, CheckCircle2, FileText, CreditCard } from "lucide-react";
import { Lancamento } from "../types";
import { parseCurrency, formatCurrency } from "../utils/formatters";

interface Props {
  lancamentos: Lancamento[];
  onOpenNewFueling: () => void;
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
  if (!entry) return "";

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

  return "";
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

export const AbastecimentosView: React.FC<Props> = ({ lancamentos, onOpenNewFueling }) => {
  // Filter all fueling entries directly from 1_Lancamentos
  const fuelEntries = useMemo(() => {
    return lancamentos
      .filter(isFuelLancamento)
      .sort((a, b) => {
        // Ordena por data decrescente
        const dateA = String(a.Data || "");
        const dateB = String(b.Data || "");
        return dateB.localeCompare(dateA);
      });
  }, [lancamentos]);

  // Helper to open Google Maps with saved coordinates or location name
  const openMaps = (item: Lancamento) => {
    const loc = (item.Localizacao_Do_Posto || "").trim();
    const postoName = getPostoName(item);
    
    // Check if loc has "lat,lng" format (e.g. -23.55052,-46.633308)
    const coordMatch = loc.match(/^(-?\d+(\.\d+)?)\s*,\s*(-?\d+(\.\d+)?)$/);
    if (coordMatch) {
      const lat = coordMatch[1];
      const lng = coordMatch[3];
      window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`, "_blank", "noopener,noreferrer");
    } else if (loc) {
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(loc)}`, "_blank", "noopener,noreferrer");
    } else if (postoName) {
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(postoName)}`, "_blank", "noopener,noreferrer");
    }
  };

  // Calculate Fuel Stats safely using parseCurrency from 1_Lancamentos
  const totalGasto = useMemo(() => {
    return fuelEntries.reduce(
      (acc, curr) => acc + (parseCurrency(curr.Valor_Pago) || parseCurrency(curr.Valor)),
      0
    );
  }, [fuelEntries]);

  const totalLitros = useMemo(() => {
    return fuelEntries.reduce(
      (acc, curr) => acc + parseCurrency(curr.Litros),
      0
    );
  }, [fuelEntries]);

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
            <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-[10px] text-emerald-400 border border-emerald-500/20 font-medium">
              <CheckCircle2 className="w-3 h-3" />
              Fonte Oficial (1_Lancamentos)
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Exibindo todos os registros de combustível com dados completos sincronizados da aba <strong className="text-emerald-300">1_Lancamentos</strong>.
          </p>
        </div>

        <button
          onClick={onOpenNewFueling}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition-colors shadow-sm shrink-0 cursor-pointer"
        >
          <Fuel className="w-4 h-4" />
          <span>+ Novo Abastecimento</span>
        </button>
      </div>

      {/* Info Callout */}
      <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-2xl flex items-start gap-3 text-xs text-slate-300">
        <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-slate-200">Visão Unificada de Combustível</p>
          <p className="text-slate-400 mt-0.5">
            Todos os campos de abastecimento (preço por litro, quilometragem, autonomia média, posto, motorista e comprovante) são lidos em tempo real da aba principal de lançamentos.
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
          <p className="text-[11px] text-slate-500">{fuelEntries.length} abastecimentos registrados</p>
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
          <p className="text-[11px] text-slate-500">Média geral ponderada</p>
        </div>
      </div>

      {/* Abastecimentos List */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        {fuelEntries.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs space-y-2">
            <p>Nenhum abastecimento registrado até o momento em 1_Lancamentos.</p>
            <button
              onClick={onOpenNewFueling}
              className="text-amber-400 hover:underline font-medium cursor-pointer"
            >
              + Adicionar primeiro abastecimento
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80">
            {fuelEntries.map((item, idx) => {
              console.log('DEBUG abastecimento:', item);
              const valor = parseCurrency(item.Valor_Pago) || parseCurrency(item.Valor);
              const litros = parseCurrency(item.Litros);
              const preco = parseCurrency(item.Preco_Litro) || (litros > 0 ? valor / litros : 0);
              const km = parseCurrency(item.Km_Atual);
              const kmPercorrido = parseCurrency(item.Km_Percorrido);
              const mediaKmL = parseCurrency(item.Media_KmL);
              const postoName = getPostoName(item);
              const veiculoName = item.Veiculo || item.Descricao_Do_Veiculo || "Veículo";
              const isTanqueCheio =
                String(item.Completou_O_Tanque || "").trim().toUpperCase() === "SIM" ||
                String(item.Completou_O_Tanque || "").trim().toUpperCase() === "TRUE" ||
                String(item.Completou_O_Tanque || "").trim().toUpperCase() === "S";

              return (
                <div
                  key={`${item.Id || 'abast'}-${idx}`}
                  className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-800/40 transition-colors text-xs"
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-xl shrink-0 mt-0.5 border border-amber-500/20">
                      <Fuel className="w-5 h-5" />
                    </div>
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-white text-sm">
                          {veiculoName}
                        </span>
                        {item.Tipo_Combustivel && (
                          <span className="px-2 py-0.5 rounded bg-amber-500/10 text-[10px] text-amber-300 border border-amber-500/20 font-medium">
                            {item.Tipo_Combustivel}
                          </span>
                        )}
                        {postoName && (
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300 border border-slate-700 flex items-center gap-1 font-medium">
                            {postoName}
                          </span>
                        )}
                        {isTanqueCheio && (
                          <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-[10px] text-emerald-400 border border-emerald-500/20 font-medium">
                            Tanque Cheio
                          </span>
                        )}
                        {(item.Localizacao_Do_Posto || postoName) && (
                          <button
                            type="button"
                            onClick={() => openMaps(item)}
                            title={
                              item.Localizacao_Do_Posto
                                ? `Abrir Google Maps (${item.Localizacao_Do_Posto})`
                                : `Buscar no Google Maps: ${postoName}`
                            }
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-medium transition-colors cursor-pointer"
                          >
                            <MapPin className="w-3 h-3" />
                            <span>Ver no Mapa</span>
                            <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-slate-400 text-[11px] flex-wrap">
                        <span>
                          Data: <strong className="text-slate-200">{item.Data}</strong>
                        </span>
                        {km > 0 && (
                          <span>
                            • Hodômetro: <strong className="text-amber-300 font-mono">{km.toLocaleString()} KM</strong>
                          </span>
                        )}
                        {kmPercorrido > 0 && (
                          <span>
                            • Percorrido: <strong className="text-slate-200 font-mono">+{kmPercorrido.toLocaleString()} KM</strong>
                          </span>
                        )}
                        {mediaKmL > 0 && (
                          <span className="inline-flex items-center gap-1 text-teal-400 font-medium">
                            <Gauge className="w-3 h-3" />
                            {mediaKmL.toFixed(2)} km/L
                          </span>
                        )}
                        {item.Motorista && (
                          <span className="inline-flex items-center gap-1 text-slate-400">
                            <User className="w-3 h-3 text-slate-500" />
                            {item.Motorista}
                          </span>
                        )}
                        {(item.Conta || item.Cartao) && (
                          <span className="inline-flex items-center gap-1 text-slate-400">
                            <CreditCard className="w-3 h-3 text-slate-500" />
                            {item.Cartao ? `Cartão: ${item.Cartao}` : `Conta: ${item.Conta}`}
                          </span>
                        )}
                        {item.Status && (
                          <span className="px-1.5 py-0.2 rounded bg-slate-800 text-[10px] text-slate-400 border border-slate-700">
                            {item.Status}
                          </span>
                        )}
                      </div>

                      {item.Descricao && item.Descricao !== "Abastecimento" && (
                        <p className="text-slate-400 text-[11px]">
                          {item.Descricao}
                        </p>
                      )}

                      {item.Observacoes && (
                        <p className="text-slate-400 text-[11px] italic">
                          "{item.Observacoes}"
                        </p>
                      )}

                      {item.Comprovante_Url && (
                        <div className="pt-0.5">
                          <a
                            href={item.Comprovante_Url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 hover:underline"
                          >
                            <FileText className="w-3 h-3" />
                            <span>Ver Comprovante Anexo</span>
                          </a>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="text-left md:text-right shrink-0 border-t md:border-0 border-slate-800 pt-2 md:pt-0">
                    <span className="text-base font-bold text-amber-400">
                      R$ {formatCurrency(valor)}
                    </span>
                    <p className="text-[11px] text-slate-400">
                      {formatCurrency(litros)} L @ R$ {formatCurrency(preco)}/L
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

