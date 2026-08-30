import React, { useState, useMemo } from "react";
import {
  Fuel,
  Info,
  MapPin,
  ExternalLink,
  Gauge,
  User,
  CheckCircle2,
  FileText,
  CreditCard,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
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
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
    return fuelEntries.reduce((acc, curr: any) => {
      const val =
        parseCurrency(curr["Valor Pago"]) ||
        parseCurrency(curr.Valor_Pago) ||
        parseCurrency(curr["Valor_Pago"]) ||
        parseCurrency(curr.Valor) ||
        parseCurrency(curr["Valor"]);
      return acc + val;
    }, 0);
  }, [fuelEntries]);

  const totalLitros = useMemo(() => {
    return fuelEntries.reduce((acc, curr: any) => {
      const l = parseCurrency(curr.Litros) || parseCurrency(curr["Litros"]);
      return acc + l;
    }, 0);
  }, [fuelEntries]);

  const precoMedioLitro = totalLitros > 0 ? totalGasto / totalLitros : 0;

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white tracking-tight">
              Histórico de Abastecimentos
            </h2>
            <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-slate-800 text-[10px] text-slate-300 border border-slate-700/70 font-medium">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              Sincronizado
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Registros de combustível sincronizados em tempo real com a aba principal de lançamentos.
          </p>
        </div>

        <button
          onClick={onOpenNewFueling}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-colors shadow-xs shrink-0 cursor-pointer"
        >
          <Fuel className="w-4 h-4" />
          <span>+ Novo Abastecimento</span>
        </button>
      </div>

      {/* Info Callout */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex items-start gap-3 text-xs text-slate-300">
        <div className="p-2 rounded-lg bg-slate-800 text-slate-300 border border-slate-700/60 shrink-0 mt-0.5">
          <Info className="w-4 h-4" />
        </div>
        <div>
          <p className="font-semibold text-white">Visão Unificada de Combustível</p>
          <p className="text-slate-400 mt-0.5">
            Preço por litro, quilometragem, autonomia média, posto, motorista e comprovantes são vinculados automaticamente aos lançamentos financeiros.
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-1">
          <span className="text-slate-400 text-xs">Total Gasto em Combustível</span>
          <p className="text-2xl font-bold text-white tracking-tight">
            R$ {formatCurrency(totalGasto)}
          </p>
          <p className="text-[11px] text-slate-500">{fuelEntries.length} abastecimentos registrados</p>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-1">
          <span className="text-slate-400 text-xs">Volume Total Abastecido</span>
          <p className="text-2xl font-bold text-white tracking-tight">
            {formatCurrency(totalLitros)} <span className="text-sm font-normal text-slate-400">Litros</span>
          </p>
          <p className="text-[11px] text-slate-500">Gasolina / Etanol / Diesel</p>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-1">
          <span className="text-slate-400 text-xs">Preço Médio por Litro</span>
          <p className="text-2xl font-bold text-white tracking-tight">
            R$ {formatCurrency(precoMedioLitro)}
          </p>
          <p className="text-[11px] text-slate-500">Média geral ponderada</p>
        </div>
      </div>

      {/* Abastecimentos List (Compact 2-Line Pattern with Expandable Drawer) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h3 className="font-bold text-white text-sm">Registros de Abastecimento</h3>
          <span className="text-xs text-slate-400">{fuelEntries.length} itens</span>
        </div>

        {fuelEntries.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs bg-slate-900 border border-slate-800 rounded-2xl space-y-2">
            <p>Nenhum abastecimento registrado até o momento.</p>
            <button
              onClick={onOpenNewFueling}
              className="text-emerald-400 hover:underline font-medium cursor-pointer"
            >
              + Adicionar primeiro abastecimento
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {fuelEntries.map((item, idx) => {
              const itemId = String(item.Id || `abast-${idx}`);
              const isExpanded = expandedId === itemId;
              const itemAny = item as any;
              const valor =
                parseCurrency(itemAny["Valor Pago"]) ||
                parseCurrency(item.Valor_Pago) ||
                parseCurrency(itemAny["Valor_Pago"]) ||
                parseCurrency(item.Valor) ||
                parseCurrency(itemAny["Valor"]);
              const litros = parseCurrency(item.Litros) || parseCurrency(itemAny["Litros"]);
              const preco = parseCurrency(item.Preco_Litro) || parseCurrency(itemAny["Preço_Litro"]) || (litros > 0 ? valor / litros : 0);
              const km = parseCurrency(item.Km_Atual);
              const kmPercorrido = parseCurrency(item.Km_Percorrido);
              const mediaKmL = parseCurrency(item.Media_KmL);
              const postoName = getPostoName(item);
              const veiculoName = item.Veiculo || item.Descricao_Do_Veiculo || "Veículo";
              const isTanqueCheio =
                String(item.Completou_O_Tanque || "").trim().toUpperCase() === "SIM" ||
                String(item.Completou_O_Tanque || "").trim().toUpperCase() === "TRUE" ||
                String(item.Completou_O_Tanque || "").trim().toUpperCase() === "S";
              const isPago = String(item.Status || "").toUpperCase() === "PAGO" || !item.Status;

              return (
                <div
                  key={itemId}
                  className="bg-slate-900 border border-slate-800 hover:border-slate-700/80 rounded-2xl transition-colors overflow-hidden"
                >
                  {/* Linha Principal Compacta (2 Linhas) */}
                  <div
                    onClick={() => toggleExpand(itemId)}
                    className="p-3.5 sm:p-4 flex items-center justify-between gap-3 cursor-pointer select-none"
                  >
                    {/* Lado Esquerdo: Ícone Neutro + Linha 1 (Veículo e Tags) + Linha 2 (Data, Litros, Preço/L) */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="p-2 sm:p-2.5 rounded-xl bg-slate-800 text-slate-300 border border-slate-700/60 shrink-0">
                        <Fuel className="w-4 h-4" />
                      </div>

                      <div className="min-w-0 space-y-0.5 flex-1">
                        {/* Linha 1: Veículo + Badges Neutros */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-white text-xs sm:text-sm tracking-tight truncate max-w-[160px] sm:max-w-xs">
                            {veiculoName}
                          </span>
                          {item.Tipo_Combustivel && (
                            <span className="px-1.5 py-0.5 rounded-md bg-slate-800 text-[10px] font-medium text-slate-300 border border-slate-700/70">
                              {item.Tipo_Combustivel}
                            </span>
                          )}
                          {postoName && (
                            <span className="px-1.5 py-0.5 rounded-md bg-slate-800/80 text-[10px] font-medium text-slate-400 border border-slate-700/60 truncate max-w-[120px]">
                              {postoName}
                            </span>
                          )}
                          {isTanqueCheio && (
                            <span className="px-1.5 py-0.5 rounded-md bg-slate-800 text-[10px] font-medium text-slate-300 border border-slate-700/70">
                              Tanque Cheio
                            </span>
                          )}
                        </div>

                        {/* Linha 2: Data • Litros • Preço/L • KM */}
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 truncate flex-wrap">
                          <span>{item.Data}</span>
                          {litros > 0 && (
                            <>
                              <span>•</span>
                              <span className="text-slate-300 font-medium">{formatCurrency(litros)} L</span>
                            </>
                          )}
                          {preco > 0 && (
                            <>
                              <span>•</span>
                              <span>R$ {formatCurrency(preco)}/L</span>
                            </>
                          )}
                          {km > 0 && (
                            <>
                              <span>•</span>
                              <span className="font-mono text-slate-300">{km.toLocaleString()} KM</span>
                            </>
                          )}
                          {mediaKmL > 0 && (
                            <>
                              <span>•</span>
                              <span className="text-emerald-400 font-medium">{mediaKmL.toFixed(2)} km/L</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Lado Direito: Valor Total alinhado na MESMA linha + Ponto de Status + Chevron */}
                    <div className="flex items-center gap-2.5 shrink-0">
                      {/* Ponto indicador de status discreto */}
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          isPago ? "bg-emerald-400 shadow-xs shadow-emerald-400/50" : "bg-amber-400 shadow-xs shadow-amber-400/50"
                        }`}
                        title={isPago ? "Pago" : "Pendente"}
                      />

                      {/* Valor total */}
                      <span className="font-bold text-white text-xs sm:text-sm tracking-tight whitespace-nowrap">
                        R$ {formatCurrency(valor)}
                      </span>

                      {/* Botão de expansão da gaveta */}
                      <div className="text-slate-400 hover:text-white p-1">
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Gaveta de Detalhes Expansível */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-2 border-t border-slate-800/80 bg-slate-950/50 space-y-3 animate-in fade-in-50 duration-150 text-xs">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                        <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-0.5">
                          <span className="text-[10px] text-slate-500 block">Km Percorrido</span>
                          <span className="font-semibold text-slate-200">
                            {kmPercorrido > 0 ? `+${kmPercorrido.toLocaleString()} KM` : "—"}
                          </span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-0.5">
                          <span className="text-[10px] text-slate-500 block">Autonomia Média</span>
                          <span className="font-semibold text-emerald-400">
                            {mediaKmL > 0 ? `${mediaKmL.toFixed(2)} km/L` : "—"}
                          </span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-0.5">
                          <span className="text-[10px] text-slate-500 block">Motorista</span>
                          <span className="font-semibold text-slate-200 truncate block">
                            {item.Motorista || "—"}
                          </span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-0.5">
                          <span className="text-[10px] text-slate-500 block">Pagamento</span>
                          <span className="font-semibold text-slate-200 truncate block">
                            {item.Cartao ? `Cartão: ${item.Cartao}` : item.Conta ? `Conta: ${item.Conta}` : "—"}
                          </span>
                        </div>
                      </div>

                      {item.Descricao && item.Descricao !== "Abastecimento" && (
                        <p className="text-slate-300 text-[11px]">
                          <strong>Descrição:</strong> {item.Descricao}
                        </p>
                      )}

                      {item.Observacoes && (
                        <p className="text-slate-400 text-[11px] italic bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                          "{item.Observacoes}"
                        </p>
                      )}

                      {/* Ações da Gaveta (Mapa, Comprovante) */}
                      <div className="flex items-center gap-3 pt-1 flex-wrap">
                        {(item.Localizacao_Do_Posto || postoName) && (
                          <button
                            type="button"
                            onClick={() => openMaps(item)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 text-xs font-medium transition-colors cursor-pointer"
                          >
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            <span>Ver Posto no Google Maps</span>
                            <ExternalLink className="w-3 h-3 opacity-60" />
                          </button>
                        )}

                        {item.Comprovante_Url && (
                          <a
                            href={item.Comprovante_Url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 text-xs font-medium transition-colors"
                          >
                            <FileText className="w-3.5 h-3.5 text-slate-400" />
                            <span>Abrir Comprovante</span>
                            <ExternalLink className="w-3 h-3 opacity-60" />
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};


