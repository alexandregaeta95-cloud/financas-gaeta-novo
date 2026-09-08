import React, { useState, useEffect } from "react";
import { MapPin, Loader2, Fuel, Clock, Route as RouteIcon, DollarSign } from "lucide-react";
import { Veiculo, Lancamento } from "../types";
import { formatCurrency } from "../utils/formatters";

function EnderecoAutocomplete({
  label,
  placeholder,
  onSelect,
}: {
  label: string;
  placeholder: string;
  onSelect: (coords: [number, number], texto: string) => void;
}) {
  const [texto, setTexto] = useState("");
  const [sugestoes, setSugestoes] = useState<{ label: string; lat: number; lng: number }[]>([]);
  const [mostrando, setMostrando] = useState(false);
  const [buscando, setBuscando] = useState(false);
  const debounceRef = React.useRef<any>(null);

  const buscarSugestoes = (valor: string) => {
    setTexto(valor);
    onSelect([0, 0], ""); // limpa seleção anterior ao digitar de novo
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (valor.length < 3) {
      setSugestoes([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setBuscando(true);
      try {
        let url = `/api/endereco-sugestoes?texto=${encodeURIComponent(valor)}`;
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            async (pos) => {
              const resp = await fetch(`${url}&lat=${pos.coords.latitude}&lng=${pos.coords.longitude}`);
              const data = await resp.json();
              setSugestoes(data.sugestoes || []);
              setMostrando(true);
              setBuscando(false);
            },
            async () => {
              const resp = await fetch(url);
              const data = await resp.json();
              setSugestoes(data.sugestoes || []);
              setMostrando(true);
              setBuscando(false);
            }
          );
        } else {
          const resp = await fetch(url);
          const data = await resp.json();
          setSugestoes(data.sugestoes || []);
          setMostrando(true);
          setBuscando(false);
        }
      } catch (e) {
        setBuscando(false);
      }
    }, 500);
  };

  return (
    <div className="relative">
      <label className="text-slate-400 block mb-1 text-xs">{label}</label>
      <input
        type="text"
        placeholder={placeholder}
        value={texto}
        onChange={(e) => buscarSugestoes(e.target.value)}
        onFocus={() => sugestoes.length > 0 && setMostrando(true)}
        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
      />
      {buscando && (
        <span className="absolute right-3 top-9 text-slate-500 text-xs">buscando...</span>
      )}
      {mostrando && sugestoes.length > 0 && (
        <div className="absolute z-20 mt-1 w-full bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-xl max-h-56 overflow-y-auto">
          {sugestoes.map((s, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setTexto(s.label);
                onSelect([s.lng, s.lat], s.label);
                setMostrando(false);
                setSugestoes([]);
              }}
              className="w-full text-left px-3 py-2 text-xs text-slate-200 hover:bg-slate-800 border-b border-slate-800 last:border-0"
            >
              {s.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface Props {
  veiculos: Veiculo[];
  lancamentos: Lancamento[];
}

export const CalculadoraCorridaView: React.FC<Props> = ({ veiculos, lancamentos }) => {
  const [origemCoords, setOrigemCoords] = useState<[number, number] | null>(null);
  const [destinoCoords, setDestinoCoords] = useState<[number, number] | null>(null);
  const [origemTexto, setOrigemTexto] = useState("");
  const [destinoTexto, setDestinoTexto] = useState("");
  const [valorPorKm, setValorPorKm] = useState(1.2);
  const [valorPorHora, setValorPorHora] = useState(25);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [resultado, setResultado] = useState<{
    distanciaKm: number;
    duracaoMinutos: number;
  } | null>(null);

  const [esperaAtiva, setEsperaAtiva] = useState(false);
  const [inicioEspera, setInicioEspera] = useState<number | null>(null);
  const [segundosEsperaAcumulados, setSegundosEsperaAcumulados] = useState(0);
  const [segundosEsperaAoVivo, setSegundosEsperaAoVivo] = useState(0);

  useEffect(() => {
    if (!esperaAtiva || !inicioEspera) return;
    const interval = setInterval(() => {
      setSegundosEsperaAoVivo(Math.floor((Date.now() - inicioEspera) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [esperaAtiva, inicioEspera]);

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
    if (!origemCoords || !destinoCoords) {
      setErro("Selecione um endereço de origem e destino a partir das sugestões da lista.");
      return;
    }
    setLoading(true);
    setErro(null);
    setResultado(null);
    try {
      const resp = await fetch("/api/rota", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ origem: origemCoords, destino: destinoCoords }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        const detalheTexto = data.detalhe ? ` | Detalhe: ${JSON.stringify(data.detalhe)}` : "";
        throw new Error((data.error || "Erro ao calcular rota.") + detalheTexto);
      }
      setResultado(data);
    } catch (err: any) {
      console.error("Erro detalhado:", err);
      setErro(`Erro: ${err?.message || JSON.stringify(err)}`);
    } finally {
      setLoading(false);
    }
  };

  const iniciarEspera = () => {
    setInicioEspera(Date.now());
    setEsperaAtiva(true);
    setSegundosEsperaAoVivo(0);
  };

  const pararEspera = () => {
    if (inicioEspera) {
      const decorrido = Math.floor((Date.now() - inicioEspera) / 1000);
      setSegundosEsperaAcumulados((prev) => prev + decorrido);
    }
    setEsperaAtiva(false);
    setInicioEspera(null);
    setSegundosEsperaAoVivo(0);
  };

  const zerarEspera = () => {
    setEsperaAtiva(false);
    setInicioEspera(null);
    setSegundosEsperaAcumulados(0);
    setSegundosEsperaAoVivo(0);
  };

  const formatarTempo = (totalSegundos: number) => {
    const min = Math.floor(totalSegundos / 60);
    const seg = totalSegundos % 60;
    return `${String(min).padStart(2, "0")}:${String(seg).padStart(2, "0")}`;
  };

  const custoCombustivel = resultado ? (resultado.distanciaKm / mediaKmL) * precoLitroAtual : 0;
  const valorKmTotal = resultado ? resultado.distanciaKm * valorPorKm : 0;
  const tempoTotalMinutos = resultado ? resultado.duracaoMinutos + segundosEsperaAcumulados / 60 : 0;
  const valorTempoTotal = resultado ? (tempoTotalMinutos / 60) * valorPorHora : 0;
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
        <EnderecoAutocomplete
          label="Endereço de Origem"
          placeholder="Digite pelo menos 3 letras..."
          onSelect={(coords, texto) => {
            setOrigemCoords(coords[0] === 0 && coords[1] === 0 ? null : coords);
            setOrigemTexto(texto);
          }}
        />
        <EnderecoAutocomplete
          label="Endereço de Destino"
          placeholder="Digite pelo menos 3 letras..."
          onSelect={(coords, texto) => {
            setDestinoCoords(coords[0] === 0 && coords[1] === 0 ? null : coords);
            setDestinoTexto(texto);
          }}
        />

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
              <span className="text-slate-400 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Tempo (viagem + espera)</span>
              <span className="text-white font-semibold">R$ {formatCurrency(valorTempoTotal)}</span>
            </div>
          </div>

          <div className="bg-slate-950 border border-amber-500/30 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-amber-300 font-semibold flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> Tempo de Espera/Parada
              </span>
              <span className="text-sm font-mono font-bold text-white">
                {formatarTempo(segundosEsperaAcumulados + (esperaAtiva ? segundosEsperaAoVivo : 0))}
              </span>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={esperaAtiva ? pararEspera : iniciarEspera}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-colors ${
                  esperaAtiva
                    ? "bg-rose-600 hover:bg-rose-500 text-white"
                    : "bg-amber-600 hover:bg-amber-500 text-white"
                }`}
              >
                {esperaAtiva ? "⏸ Parar Espera" : "▶ Iniciar Espera"}
              </button>
              {!esperaAtiva && segundosEsperaAcumulados > 0 && (
                <button
                  type="button"
                  onClick={zerarEspera}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold transition-colors"
                >
                  Zerar
                </button>
              )}
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
