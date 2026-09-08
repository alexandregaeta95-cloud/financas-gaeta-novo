import React, { useState } from "react";
import { MapPin, Loader2, Fuel, Clock, Route as RouteIcon, DollarSign } from "lucide-react";
import { VoiceInput } from "./VoiceInput";
import { Veiculo, Lancamento } from "../types";
import { formatCurrency } from "../utils/formatters";

interface Props {
  veiculos: Veiculo[];
  lancamentos: Lancamento[];
}

export const CalculadoraCorridaView: React.FC<Props> = ({ veiculos, lancamentos }) => {
  const [origem, setOrigem] = useState("");
  const [destino, setDestino] = useState("");
  const [valorPorKm, setValorPorKm] = useState(1.2);
  const [valorPorHora, setValorPorHora] = useState(25);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [resultado, setResultado] = useState<{
    distanciaKm: number;
    duracaoMinutos: number;
  } | null>(null);

  // Calcula Km/L médio a partir dos abastecimentos registrados
  const abastecimentos = lancamentos.filter(
    (l) => (l.Categoria === "ABASTECIMENTO" || l.Tipo === "ABASTECIMENTO") && Number((l as any).Media_KmL) > 0
  );
  const mediaKmL =
    abastecimentos.length > 0
      ? abastecimentos.reduce((acc, l) => acc + Number((l as any).Media_KmL || 0), 0) / abastecimentos.length
      : 10;

  const ultimoPrecoLitro =
    [...abastecimentos].sort((a, b) => (b.Data > a.Data ? 1 : -1))[0] as any;
  const precoLitroAtual = Number(ultimoPrecoLitro?.Preco_Litro) || 6.0;

  const handleCalcular = async () => {
    if (!origem.trim() || !destino.trim()) {
      setErro("Preencha origem e destino.");
      return;
    }
    setLoading(true);
    setErro(null);
    setResultado(null);
    try {
      const resp = await fetch("/api/rota", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ origem, destino }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Erro ao calcular rota.");
      setResultado(data);
    } catch (err: any) {
      console.error("Erro detalhado:", err);
      setErro(`Erro: ${err?.message || JSON.stringify(err)}`);
    } finally {
      setLoading(false);
    }
  };

  const custoCombustivel = resultado ? (resultado.distanciaKm / mediaKmL) * precoLitroAtual : 0;
  const valorKmTotal = resultado ? resultado.distanciaKm * valorPorKm : 0;
  const valorTempoTotal = resultado ? (resultado.duracaoMinutos / 60) * valorPorHora : 0;
  const totalSugerido = custoCombustivel + valorKmTotal + valorTempoTotal;

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <RouteIcon className="w-5 h-5 text-emerald-400" />
          Calculadora de Corrida Particular
        </h2>
        <p className="text-xs text-slate-400">
          Calcule o valor justo de uma corrida particular, cobrindo combustível, tempo e Km.
        </p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
        <div>
          <label className="text-slate-400 block mb-1 text-xs">Endereço de Origem</label>
          <VoiceInput
            type="text"
            placeholder="Ex: Bairro São Marcos, Campinas"
            value={origem}
            onChange={(e) => setOrigem(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
          />
        </div>
        <div>
          <label className="text-slate-400 block mb-1 text-xs">Endereço de Destino</label>
          <VoiceInput
            type="text"
            placeholder="Ex: Centro, Campinas"
            value={destino}
            onChange={(e) => setDestino(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-slate-400 block mb-1 text-xs">R$ por Km</label>
            <input
              type="number"
              step="0.01"
              value={valorPorKm}
              onFocus={(e) => e.target.select()}
              onChange={(e) => setValorPorKm(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
            />
          </div>
          <div>
            <label className="text-slate-400 block mb-1 text-xs">R$ por Hora</label>
            <input
              type="number"
              step="0.01"
              value={valorPorHora}
              onFocus={(e) => e.target.select()}
              onChange={(e) => setValorPorHora(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
            />
          </div>
        </div>

        <button
          onClick={handleCalcular}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-bold rounded-xl p-3 transition-colors"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
          <span>{loading ? "Calculando..." : "Calcular Corrida"}</span>
        </button>

        {erro && (
          <div className="bg-rose-950/40 border border-rose-500/30 rounded-xl p-3 text-rose-300 text-xs">
            {erro}
          </div>
        )}
      </div>

      {resultado && (
        <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-950 rounded-xl p-3">
              <span className="text-[10px] text-slate-400 block">Distância</span>
              <span className="text-lg font-bold text-white">{resultado.distanciaKm} km</span>
            </div>
            <div className="bg-slate-950 rounded-xl p-3">
              <span className="text-[10px] text-slate-400 block">Tempo Estimado</span>
              <span className="text-lg font-bold text-white">{resultado.duracaoMinutos} min</span>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-800">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400 flex items-center gap-1.5"><Fuel className="w-3.5 h-3.5" /> Combustível</span>
              <span className="text-white font-semibold">R$ {formatCurrency(custoCombustivel)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-400 flex items-center gap-1.5"><RouteIcon className="w-3.5 h-3.5" /> Km ({resultado.distanciaKm} × R$ {valorPorKm})</span>
              <span className="text-white font-semibold">R$ {formatCurrency(valorKmTotal)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-400 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Tempo</span>
              <span className="text-white font-semibold">R$ {formatCurrency(valorTempoTotal)}</span>
            </div>
          </div>

          <div className="flex justify-between items-center pt-3 border-t border-slate-700">
            <span className="text-sm font-bold text-white flex items-center gap-1.5"><DollarSign className="w-4 h-4 text-emerald-400" /> Valor Sugerido</span>
            <span className="text-2xl font-extrabold text-emerald-400">R$ {formatCurrency(totalSugerido)}</span>
          </div>
        </div>
      )}
    </div>
  );
};
