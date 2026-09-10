import React, { useState, useEffect } from "react";
import { MapPin, Loader2, Fuel, Clock, Route as RouteIcon, DollarSign } from "lucide-react";
import { Veiculo, Lancamento, HistoricoCorrida, PerfilUsuario, Motorista } from "../types";
import { formatCurrency } from "../utils/formatters";
import { exportReciboCorridaPDF } from "../utils/reciboCorridaPdf";

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
    if (valor.length < 4) {
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
    }, 900);
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
  historicoCorridas?: HistoricoCorrida[];
  motoristas?: Motorista[];
  onSaveCorrida?: (corrida: HistoricoCorrida) => Promise<void>;
  perfil?: PerfilUsuario | null;
}

export const CalculadoraCorridaView: React.FC<Props> = ({
  veiculos,
  lancamentos,
  historicoCorridas = [],
  motoristas = [],
  onSaveCorrida,
  perfil,
}) => {
  const [veiculoSelecionado, setVeiculoSelecionado] = useState<string>(veiculos[0]?.Modelo || "");
  const [pontos, setPontos] = useState<{ coords: [number, number] | null; texto: string }[]>([
    { coords: null, texto: "" },
    { coords: null, texto: "" },
  ]);

  const rotaPathRef = React.useRef<SVGPathElement>(null);
  const [marcadoresParadas, setMarcadoresParadas] = useState<{ x: number; y: number }[]>([]);

  const adicionarParada = () => {
    setPontos((prev) => {
      const novo = [...prev];
      novo.splice(prev.length - 1, 0, { coords: null, texto: "" });
      return novo;
    });
  };

  const removerParada = (index: number) => {
    setPontos((prev) => prev.filter((_, i) => i !== index));
  };

  const atualizarPonto = (index: number, coords: [number, number] | null, texto: string) => {
    setErro(null);
    setPontos((prev) => {
      const novo = [...prev];
      novo[index] = { coords, texto };
      return novo;
    });
  };

  const [valorPorKm, setValorPorKm] = useState(1.2);
  const [valorPorHora, setValorPorHora] = useState(25);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [resultado, setResultado] = useState<{
    distanciaKm: number;
    duracaoMinutos: number;
  } | null>(null);

  useEffect(() => {
    if (!rotaPathRef.current) return;
    const numParadas = pontos.length - 2;
    if (numParadas <= 0) {
      setMarcadoresParadas([]);
      return;
    }
    const path = rotaPathRef.current;
    const totalLength = path.getTotalLength();
    const novosMarcadores: { x: number; y: number }[] = [];
    for (let i = 1; i <= numParadas; i++) {
      const fracao = i / (numParadas + 1);
      const ponto = path.getPointAtLength(totalLength * fracao);
      novosMarcadores.push({ x: ponto.x, y: ponto.y });
    }
    setMarcadoresParadas(novosMarcadores);
  }, [pontos.length, resultado]);

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
    (l) =>
      (l.Categoria === "ABASTECIMENTO" || l.Tipo === "ABASTECIMENTO") &&
      Number((l as any).Media_KmL) > 0 &&
      (veiculos.length <= 1 || (l as any).Veiculo === veiculoSelecionado)
  );
  const mediaKmL =
    abastecimentos.length > 0
      ? abastecimentos.reduce((acc, l) => acc + Number((l as any).Media_KmL || 0), 0) / abastecimentos.length
      : 10;

  const ultimoPrecoLitro =
    [...abastecimentos].sort((a, b) => (b.Data > a.Data ? 1 : -1))[0] as any;
  const precoLitroAtual = Number(ultimoPrecoLitro?.Preco_Litro) || 6.0;

  const handleCalcular = async () => {
    setErro(null);
    const coordenadasValidas = pontos.every((p) => p.coords !== null);
    if (!coordenadasValidas) {
      setErro("Selecione todos os endereços a partir das sugestões da lista.");
      return;
    }
    setLoading(true);
    setResultado(null);
    try {
      const resp = await fetch("/api/rota", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pontos: pontos.map((p) => p.coords) }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        const detalheTexto = data.detalhe ? ` | Detalhe: ${JSON.stringify(data.detalhe)}` : "";
        throw new Error((data.error || "Erro ao calcular rota.") + detalheTexto);
      }
      setErro(null);
      setResultado(data);
    } catch (err: any) {
      console.error("Erro detalhado:", err);
      setErro(`Erro: ${err?.message || JSON.stringify(err)}`);
    } finally {
      setLoading(false);
    }
  };

  const [salvo, setSalvo] = useState(false);
  const [observacoesCorrida, setObservacoesCorrida] = useState("");
  const [passageiro, setPassageiro] = useState("");
  const [cpfPassageiro, setCpfPassageiro] = useState("");
  const [mostrarCpfMotorista, setMostrarCpfMotorista] = useState(false);

  const handleSalvarCorrida = () => {
    if (!resultado || !onSaveCorrida) return;
    const veiculoAtual = veiculos.find((v) => v.Modelo === veiculoSelecionado) || veiculos[0];
    const paradasTexto = pontos
      .slice(1, -1)
      .map((p) => p.texto)
      .filter(Boolean)
      .join(" → ");

    onSaveCorrida({
      Id: `CORRIDA_${Date.now()}`,
      Data: new Date().toISOString().split("T")[0],
      Origem: pontos[0]?.texto || "",
      Destino: pontos[pontos.length - 1]?.texto || "",
      Paradas: paradasTexto,
      DistanciaKm: resultado.distanciaKm,
      DuracaoMinutos: resultado.duracaoMinutos,
      TempoEsperaMinutos: Math.round(segundosEsperaAcumulados / 60),
      CustoCombustivel: Number(custoCombustivel.toFixed(2)),
      ValorKm: Number(valorKmTotal.toFixed(2)),
      ValorTempo: Number(valorTempoTotal.toFixed(2)),
      ValorTotal: Number(totalSugerido.toFixed(2)),
      Observacoes: observacoesCorrida || "",
      Veiculo: veiculoAtual?.Modelo || "",
      Placa: veiculoAtual?.Placa || "",
      Motorista: veiculoAtual?.Motorista || "",
      Passageiro: passageiro || "",
      CpfPassageiro: cpfPassageiro || "",
    });
    setSalvo(true);
    setObservacoesCorrida("");
    setTimeout(() => setSalvo(false), 3000);
  };

  const handleRefazerCorrida = (corrida: HistoricoCorrida) => {
    if (!onSaveCorrida) return;
    onSaveCorrida({
      ...corrida,
      Id: `CORRIDA_${Date.now()}`,
      Data: new Date().toISOString().split("T")[0],
    });
  };

  const handleReimprimirRecibo = (corrida: HistoricoCorrida) => {
    const veiculoDaCorrida = veiculos.find((v) => v.Modelo === corrida.Veiculo);
    const motoristaDaCorrida = motoristas.find((m) => m.Nome === corrida.Motorista);
    exportReciboCorridaPDF({
      motorista: corrida.Motorista || "Motorista",
      celularMotorista: motoristaDaCorrida?.Celular,
      cpfMotorista: mostrarCpfMotorista ? motoristaDaCorrida?.CPF : undefined,
      veiculo: corrida.Veiculo || "Veículo",
      placa: corrida.Placa,
      passageiro: corrida.Passageiro || undefined,
      cpfPassageiro: corrida.CpfPassageiro || undefined,
      origem: corrida.Origem,
      paradas: corrida.Paradas ? corrida.Paradas.split(" → ").filter(Boolean) : [],
      destino: corrida.Destino,
      data: new Date(corrida.Data + "T00:00:00").toLocaleDateString("pt-BR"),
      hora: "—",
      distanciaKm: corrida.DistanciaKm,
      duracaoMinutos: corrida.DuracaoMinutos,
      tempoEsperaMinutos: corrida.TempoEsperaMinutos,
      valorTotal: corrida.ValorTotal,
      observacoes: corrida.Observacoes,
    });
  };

  const handleGerarRecibo = () => {
    if (!resultado) return;
    const now = new Date();
    const veiculoAtual = veiculos.find((v) => v.Modelo === veiculoSelecionado) || veiculos[0];
    const motoristaAtual = motoristas?.find(
      (m) => m.Nome?.trim().toUpperCase() === veiculoAtual?.Motorista?.trim().toUpperCase()
    );
    exportReciboCorridaPDF({
      motorista: motoristaAtual?.Nome || veiculoAtual?.Motorista || "Motorista",
      celularMotorista: motoristaAtual?.Celular || "",
      cpfMotorista: mostrarCpfMotorista ? motoristaAtual?.CPF : undefined,
      passageiro: passageiro || undefined,
      cpfPassageiro: cpfPassageiro || undefined,
      veiculo: veiculoAtual?.Modelo || "Veículo",
      placa: veiculoAtual?.Placa,
      origem: pontos[0]?.texto || "",
      paradas: pontos.slice(1, -1).map((p) => p.texto).filter(Boolean),
      destino: pontos[pontos.length - 1]?.texto || "",
      data: now.toLocaleDateString("pt-BR"),
      hora: now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      distanciaKm: resultado.distanciaKm,
      duracaoMinutos: resultado.duracaoMinutos,
      tempoEsperaMinutos: Math.round(segundosEsperaAcumulados / 60),
      valorTotal: totalSugerido,
      observacoes: observacoesCorrida,
    });
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
        {veiculos.length > 1 && (
          <div>
            <label className="text-slate-400 block mb-1 text-xs">Veículo</label>
            <select
              value={veiculoSelecionado}
              onChange={(e) => setVeiculoSelecionado(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
            >
              {veiculos.map((v) => (
                <option key={v.Modelo} value={v.Modelo}>
                  {v.Modelo}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="space-y-3">
          {pontos.map((ponto, idx) => {
            const isOrigem = idx === 0;
            const isDestinoFinal = idx === pontos.length - 1;
            const rotulo = isOrigem ? "Endereço de Origem" : isDestinoFinal ? "Destino Final" : `Parada ${idx}`;
            return (
              <div key={idx} className="flex items-end gap-2">
                <div className="flex-1">
                  <EnderecoAutocomplete
                    label={rotulo}
                    placeholder="Digite pelo menos 3 letras..."
                    onSelect={(coords, texto) => {
                      atualizarPonto(idx, coords[0] === 0 && coords[1] === 0 ? null : coords, texto);
                    }}
                  />
                </div>
                {!isOrigem && !isDestinoFinal && (
                  <button
                    type="button"
                    onClick={() => removerParada(idx)}
                    className="mb-0.5 px-3 py-2.5 bg-rose-950/50 hover:bg-rose-900/50 text-rose-400 rounded-xl text-xs"
                  >
                    Remover
                  </button>
                )}
              </div>
            );
          })}

          <button
            type="button"
            onClick={adicionarParada}
            className="w-full flex items-center justify-center gap-1.5 py-2 border border-dashed border-slate-700 hover:border-slate-500 text-slate-400 hover:text-slate-200 rounded-xl text-xs font-medium transition-colors"
          >
            + Adicionar Parada
          </button>
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

        {Boolean(erro) && (
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

          <div className="bg-slate-950 rounded-xl overflow-hidden py-2">
            <svg width="100%" viewBox="0 0 380 220" style={{ display: "block" }}>
              <defs>
                <path id="rotaLongaFinal" d="M 20 180 C 60 100, 140 60, 190 110 C 220 145, 260 160, 280 130 C 300 100, 260 80, 230 100 C 200 120, 210 160, 250 170 C 300 185, 340 150, 340 110 C 340 70, 300 40, 250 50 C 200 60, 180 30, 220 20 C 270 5, 340 30, 360 70" fill="none" />
              </defs>

              <g opacity={0.55}>
                <path d="M 190 20 C 190 80, 190 140, 190 200" fill="none" stroke="#e2e8f0" strokeWidth="15" strokeLinecap="round" />
                <path d="M 190 20 C 190 80, 190 140, 190 200" fill="none" stroke="#0f172a" strokeWidth="12" strokeLinecap="round" />
                <path d="M 190 20 C 190 80, 190 140, 190 200" fill="none" stroke="#e2e8f0" strokeWidth="1.2" strokeDasharray="4 6" />
              </g>
              <g opacity={0.6}>
                <path d="M 20 20 C 100 60, 280 160, 360 200" fill="none" stroke="#e2e8f0" strokeWidth="14" strokeLinecap="round" />
                <path d="M 20 20 C 100 60, 280 160, 360 200" fill="none" stroke="#0f172a" strokeWidth="11" strokeLinecap="round" />
                <path d="M 20 20 C 100 60, 280 160, 360 200" fill="none" stroke="#e2e8f0" strokeWidth="1.2" strokeDasharray="4 6" />
              </g>
              <g opacity={0.7}>
                <path d="M 20 200 C 100 160, 280 60, 360 20" fill="none" stroke="#e2e8f0" strokeWidth="14" strokeLinecap="round" />
                <path d="M 20 200 C 100 160, 280 60, 360 20" fill="none" stroke="#0f172a" strokeWidth="11" strokeLinecap="round" />
                <path d="M 20 200 C 100 160, 280 60, 360 20" fill="none" stroke="#e2e8f0" strokeWidth="1.2" strokeDasharray="4 6" />
              </g>
              <g opacity={0.8}>
                <path d="M 40 110 C 120 40, 260 40, 340 110" fill="none" stroke="#e2e8f0" strokeWidth="13" strokeLinecap="round" />
                <path d="M 40 110 C 120 40, 260 40, 340 110" fill="none" stroke="#0f172a" strokeWidth="10" strokeLinecap="round" />
                <path d="M 40 110 C 120 40, 260 40, 340 110" fill="none" stroke="#e2e8f0" strokeWidth="1.2" strokeDasharray="4 6" />
              </g>
              <g opacity={0.85}>
                <path d="M 40 130 C 120 200, 260 200, 340 130" fill="none" stroke="#e2e8f0" strokeWidth="13" strokeLinecap="round" />
                <path d="M 40 130 C 120 200, 260 200, 340 130" fill="none" stroke="#0f172a" strokeWidth="10" strokeLinecap="round" />
                <path d="M 40 130 C 120 200, 260 200, 340 130" fill="none" stroke="#e2e8f0" strokeWidth="1.2" strokeDasharray="4 6" />
              </g>

              <path d="M 20 180 C 60 100, 140 60, 190 110 C 220 145, 260 160, 280 130 C 300 100, 260 80, 230 100 C 200 120, 210 160, 250 170 C 300 185, 340 150, 340 110 C 340 70, 300 40, 250 50 C 200 60, 180 30, 220 20 C 270 5, 340 30, 360 70" fill="none" stroke="#dc2626" strokeWidth="9" strokeLinecap="round" strokeDasharray="5 5" />
              <path ref={rotaPathRef} d="M 20 180 C 60 100, 140 60, 190 110 C 220 145, 260 160, 280 130 C 300 100, 260 80, 230 100 C 200 120, 210 160, 250 170 C 300 185, 340 150, 340 110 C 340 70, 300 40, 250 50 C 200 60, 180 30, 220 20 C 270 5, 340 30, 360 70" fill="none" stroke="#0f172a" strokeWidth="6" strokeLinecap="round" />
              <path d="M 20 180 C 60 100, 140 60, 190 110 C 220 145, 260 160, 280 130 C 300 100, 260 80, 230 100 C 200 120, 210 160, 250 170 C 300 185, 340 150, 340 110 C 340 70, 300 40, 250 50 C 200 60, 180 30, 220 20 C 270 5, 340 30, 360 70" fill="none" stroke="#facc15" strokeWidth="1.4" strokeDasharray="4 5" />

              <circle cx="20" cy="180" r="6" fill="#10b981" />
              <circle cx="360" cy="70" r="6" fill="#f43f5e" />
              {marcadoresParadas.map((m, idx) => (
                <circle key={idx} cx={m.x} cy={m.y} r="6" fill="#f43f5e" stroke="#0f172a" strokeWidth="1.2" />
              ))}

              <g>
                <animateMotion dur="7s" repeatCount="indefinite" rotate="auto">
                  <mpath href="#rotaLongaFinal" />
                </animateMotion>
                <circle r="11" fill="#0f172a" stroke="#22d3ee" strokeWidth="1.4" />
                <text x="0" y="4.5" textAnchor="middle" fontSize="13" transform="scale(-1,1)">🚗</text>
              </g>
            </svg>
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="text-slate-400 block mb-1 text-xs">Passageiro (opcional)</label>
              <input
                type="text"
                value={passageiro}
                onChange={(e) => setPassageiro(e.target.value)}
                placeholder="Nome do cliente"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white text-xs"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1 text-xs">CPF do Passageiro (opcional)</label>
              <input
                type="text"
                value={cpfPassageiro}
                onChange={(e) => {
                  const nums = e.target.value.replace(/\D/g, "").slice(0, 11);
                  const formatted = nums.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
                  setCpfPassageiro(formatted);
                }}
                placeholder="000.000.000-00"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white text-xs"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={mostrarCpfMotorista}
              onChange={(e) => setMostrarCpfMotorista(e.target.checked)}
              className="w-4 h-4 rounded accent-emerald-500"
            />
            Mostrar meu CPF no recibo
          </label>

          <div>
            <label className="text-slate-400 block mb-1 text-xs">Observações (opcional)</label>
            <textarea
              value={observacoesCorrida}
              onChange={(e) => setObservacoesCorrida(e.target.value)}
              placeholder="Ex: Cliente pediu para esperar 10min no mercado..."
              rows={2}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white text-xs resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-2 mt-2">
            <button
              type="button"
              onClick={handleSalvarCorrida}
              disabled={salvo}
              className="flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-60 text-white font-semibold rounded-xl p-2.5 text-xs transition-colors"
            >
              {salvo ? "✓ Salva!" : "💾 Salvar no Histórico"}
            </button>
            <button
              type="button"
              onClick={handleGerarRecibo}
              className="flex items-center justify-center gap-1.5 bg-emerald-700 hover:bg-emerald-600 text-white font-semibold rounded-xl p-2.5 text-xs transition-colors"
            >
              🧾 Gerar Recibo PDF
            </button>
          </div>
        </div>
      )}

      {historicoCorridas.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-bold text-white">Histórico de Corridas</h3>
          {[...historicoCorridas].reverse().slice(0, 10).map((c) => (
            <div key={c.Id} className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs">
              <div className="flex justify-between items-center">
                <div className="min-w-0">
                  <p className="text-white font-semibold truncate">{c.Origem} → {c.Destino}</p>
                  <p className="text-slate-400">{c.Data} · {c.DistanciaKm}km · {c.DuracaoMinutos}min</p>
                </div>
                <span className="text-emerald-400 font-bold shrink-0 ml-2">R$ {formatCurrency(c.ValorTotal)}</span>
              </div>
              <div className="flex gap-1.5 mt-2">
                <button
                  onClick={() => handleRefazerCorrida(c)}
                  className="flex-1 flex items-center justify-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg py-1.5 text-[10px] font-semibold"
                >
                  🔁 Refazer
                </button>
                <button
                  onClick={() => handleReimprimirRecibo(c)}
                  className="flex-1 flex items-center justify-center gap-1 bg-emerald-800 hover:bg-emerald-700 text-white rounded-lg py-1.5 text-[10px] font-semibold"
                >
                  🧾 Reimprimir
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
