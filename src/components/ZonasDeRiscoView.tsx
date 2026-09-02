import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { ShieldAlert, MapPin, Plus, Edit2, Trash2, X, Navigation, Volume2, VolumeX, BellRing, Zap, Loader2 } from "lucide-react";
import { ZonaDeRisco } from "../types";
import { generateNewId } from "../services/api";
import { VoiceInput } from "./VoiceInput";
import { playAlertBeepSound, startAlarmLoop, stopAlarmLoop } from "../services/alarmSoundService";

const DEFAULT_TIPOS_OCORRENCIA = [
  "ASSALTO",
  "ALAGAMENTO",
  "ARRASTÃO",
  "ACIDENTE DE TRÂNSITO",
  "TRÁFICO / TIROTEIO",
  "FURTO DE VEÍCULO",
  "ILUMINAÇÃO PRECÁRIA",
  "BURACO / VIA DANIFICADA",
  "OUTROS",
];

interface Props {
  zonas: ZonaDeRisco[];
  onSaveZona: (zona: ZonaDeRisco) => Promise<void>;
  onDeleteZona?: (id: string) => Promise<void>;
}

// Haversine formula to compute distance in meters between two lat/lng points
function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; // metres
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // distance in meters
}

export const ZonasDeRiscoView: React.FC<Props> = ({ zonas, onSaveZona, onDeleteZona }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingZona, setEditingZona] = useState<ZonaDeRisco | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // User current geolocation
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [activeAlertZone, setActiveAlertZone] = useState<ZonaDeRisco | null>(null);
  const [isMuted, setIsMuted] = useState(false);

  // Dynamic available occurrence types
  const availableTipos = useMemo(() => {
    const set = new Set<string>(DEFAULT_TIPOS_OCORRENCIA.filter((t) => t !== "OUTROS"));
    zonas.forEach((z) => {
      if (z.Tipo_Ocorrencia && String(z.Tipo_Ocorrencia).trim()) {
        set.add(String(z.Tipo_Ocorrencia).trim().toUpperCase());
      }
    });
    return [...Array.from(set), "OUTROS"];
  }, [zonas]);

  const [selectedTipo, setSelectedTipo] = useState<string>("ASSALTO");
  const [customTipo, setCustomTipo] = useState<string>("");

  // Quick Risk Modal State
  const [isQuickModalOpen, setIsQuickModalOpen] = useState(false);
  const [quickNivel, setQuickNivel] = useState<"ALTO" | "MÉDIO" | "BAIXO">("ALTO");
  const [quickLocal, setQuickLocal] = useState<string>("");
  const [isQuickSaving, setIsQuickSaving] = useState(false);

  const [form, setForm] = useState<Partial<ZonaDeRisco>>({
    Descrição: "Entrada da Comunidade X - Alagamento/Assalto",
    Nível_De_Risco: "ALTO",
    Latitude: -23.55052,
    Longitude: -46.633308,
    "Raio_(M)": 500,
    Ativo: "SIM",
    Mensagem_De_Alerta: "CUIDADO: Zona de Alto Risco Registrada!",
    Observação: "Trancar portas e fechar vidros",
  });

  // Sound generator function using Web Audio API
  const playRiskAlertSound = useCallback(() => {
    playAlertBeepSound(0.38);
  }, []);

  // Start GPS Geolocation Tracking
  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setGeoError("Navegador não suporta geolocalização.");
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(coords);

        // Check against active zones
        let triggeredZone: ZonaDeRisco | null = null;
        for (const z of zonas) {
          const isActive = z.Ativo === true || z.Ativo === "SIM";
          if (isActive && z.Latitude && z.Longitude) {
            const dist = getDistanceMeters(
              coords.lat,
              coords.lng,
              Number(z.Latitude),
              Number(z.Longitude)
            );
            const radius = Number(z["Raio_(M)"]) || 300;
            if (dist <= radius) {
              triggeredZone = z;
              break;
            }
          }
        }

        setActiveAlertZone(triggeredZone);
      },
      (err) => {
        setGeoError("Permissão de GPS negada ou indisponível.");
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [zonas]);

  // Periodic Sound Alert Loop while inside an active risk zone
  useEffect(() => {
    if (!activeAlertZone || isMuted) {
      stopAlarmLoop();
      return;
    }

    // Inicia o alarme sonoro repetitivo centralizado
    startAlarmLoop(`zona_risco_${activeAlertZone.Id}`, {
      title: `⚠️ Zona de Risco: ${activeAlertZone.Descrição || activeAlertZone.Tipo_Ocorrencia}`,
      type: "seguranca",
      intervalMs: 4000,
      volume: 0.45,
    });

    return () => {
      stopAlarmLoop();
    };
  }, [activeAlertZone, isMuted]);

  const handleOpenModal = (z?: ZonaDeRisco) => {
    if (z) {
      setEditingZona(z);
      setForm({ ...z });
      const currentTipo = (z.Tipo_Ocorrencia || "").trim().toUpperCase();
      if (currentTipo && availableTipos.includes(currentTipo) && currentTipo !== "OUTROS") {
        setSelectedTipo(currentTipo);
        setCustomTipo("");
      } else if (currentTipo) {
        setSelectedTipo("OUTROS");
        setCustomTipo(currentTipo);
      } else {
        setSelectedTipo("ASSALTO");
        setCustomTipo("");
      }
    } else {
      setEditingZona(null);
      setSelectedTipo("ASSALTO");
      setCustomTipo("");
      setForm({
        Descrição: "",
        Nome_Local: "",
        Bairro_Cidade: "",
        Tipo_Ocorrencia: "ASSALTO",
        Nível_De_Risco: "ALTO",
        Latitude: userLocation?.lat || -23.55052,
        Longitude: userLocation?.lng || -46.633308,
        "Raio_(M)": 500,
        Ativo: "SIM",
        Mensagem_De_Alerta: "CUIDADO: ZONA DE ALTO RISCO REGISTRADA!",
        Observação: "",
      });
    }
    setIsModalOpen(true);
  };

  const handleOpenQuickModal = () => {
    setQuickNivel("ALTO");
    setQuickLocal("");
    setIsQuickModalOpen(true);
  };

  const handleQuickSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const localNome = (quickLocal.trim() || "PONTO DE RISCO GPS").toUpperCase();
    setIsQuickSaving(true);
    try {
      const item: ZonaDeRisco = {
        Id: generateNewId("RISCO"),
        Descrição: localNome,
        Nome_Local: localNome,
        Bairro_Cidade: "",
        Tipo_Ocorrencia: "OUTROS",
        Nivel_Risco: quickNivel,
        Nível_De_Risco: quickNivel,
        Latitude: userLocation?.lat || -23.55052,
        Longitude: userLocation?.lng || -46.633308,
        "Raio_(M)": 500,
        Ativo: "SIM",
        Mensagem_De_Alerta: `CUIDADO: ZONA DE RISCO ${quickNivel} REGISTRADA!`,
        Data_Registro: new Date().toISOString().split("T")[0],
        Observação: "",
        Observacoes: "",
      };
      setIsQuickModalOpen(false);
      onSaveZona(item);
    } finally {
      setIsQuickSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editingZona?.Id) return;
    const nome = editingZona.Descrição || editingZona.Nome_Local || "esta zona de risco";
    if (!window.confirm(`Deseja realmente excluir a zona de risco "${nome}"?`)) {
      return;
    }
    setIsModalOpen(false);
    if (onDeleteZona) {
      onDeleteZona(editingZona.Id);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const desc = (form.Descrição || form.Nome_Local || "ZONA DE RISCO").trim().toUpperCase();
    const obs = (form.Observação || form.Observacoes || "").trim().toUpperCase();
    const bairro = (form.Bairro_Cidade || "").trim().toUpperCase();
    const ocorrencia = (selectedTipo === "OUTROS" ? customTipo : selectedTipo || form.Tipo_Ocorrencia || "").trim().toUpperCase();
    const msg = (form.Mensagem_De_Alerta || "ATENÇÃO!").trim().toUpperCase();

    const item: ZonaDeRisco = {
      Id: editingZona?.Id || generateNewId("RISCO"),
      Descrição: desc,
      Nome_Local: desc,
      Bairro_Cidade: bairro,
      Tipo_Ocorrencia: ocorrencia,
      Nivel_Risco: form.Nível_De_Risco || "ALTO",
      Nível_De_Risco: form.Nível_De_Risco || "ALTO",
      Latitude: Number(form.Latitude) || 0,
      Longitude: Number(form.Longitude) || 0,
      "Raio_(M)": Number(form["Raio_(M)"]) || 300,
      Ativo: form.Ativo || "SIM",
      Mensagem_De_Alerta: msg,
      Data_Registro: form.Data_Registro || new Date().toISOString().split("T")[0],
      Observação: obs,
      Observacoes: obs,
    };
    setIsModalOpen(false);
    onSaveZona(item);
  };

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-rose-500" />
            Zonas de Risco
          </h2>
          <p className="text-xs text-slate-400">
            Aba <code className="text-emerald-400 font-mono">17_Zonas_De_Risco</code> • Monitoramento de localização em tempo real
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <button
            onClick={handleOpenQuickModal}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 text-slate-950 text-xs font-black rounded-xl transition-all shadow-lg shadow-rose-950/40 active:scale-95 animate-pulse"
          >
            <Zap className="w-4 h-4 fill-slate-950" />
            <span>Registrar Risco Agora</span>
          </button>

          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl transition-colors border border-slate-700"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Cadastro Completo</span>
          </button>
        </div>
      </div>

      {/* Geolocation Status Indicator */}
      <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <Navigation className="w-4 h-4 text-emerald-400 animate-pulse" />
          {userLocation ? (
            <span className="text-slate-300 font-mono">
              GPS Ativo: Lat {userLocation.lat.toFixed(5)}, Lng {userLocation.lng.toFixed(5)}
            </span>
          ) : (
            <span className="text-amber-400">{geoError || "Obtendo localização do dispositivo..."}</span>
          )}
        </div>
        <span className="text-[10px] text-slate-500">{zonas.length} áreas cadastradas</span>
      </div>

      {/* Proximity Risk Zone Alert Banner */}
      {activeAlertZone && (
        <div className="p-5 bg-rose-600 text-white rounded-2xl flex items-center justify-between gap-4 shadow-xl border-2 border-rose-400">
          <div className="flex items-center gap-3.5">
            <BellRing className="w-8 h-8 shrink-0 animate-bounce text-yellow-300" />
            <div>
              <h3 className="font-extrabold text-base uppercase tracking-wider flex items-center gap-2">
                ALERTA PROXIMIDADE: {activeAlertZone.Nível_De_Risco} RISCO
              </h3>
              <p className="text-xs font-semibold text-white">{activeAlertZone.Mensagem_De_Alerta}</p>
              <p className="text-[11px] text-rose-200 mt-0.5">"{activeAlertZone.Descrição}"</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                if (isMuted) {
                  setIsMuted(false);
                  playRiskAlertSound();
                } else {
                  setIsMuted(true);
                }
              }}
              className="flex items-center gap-1.5 px-3 py-2 bg-rose-800/80 hover:bg-rose-900 text-white text-xs font-bold rounded-xl transition-colors"
              title={isMuted ? "Reativar alarme sonoro" : "Silenciar alarme"}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-rose-300" /> : <Volume2 className="w-4 h-4 text-emerald-300 animate-pulse" />}
              <span>{isMuted ? "Silenciado" : "Alarme Ativo"}</span>
            </button>
          </div>
        </div>
      )}

      {/* Zonas List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {zonas.map((z, idx) => {
          const isActive = z.Ativo === true || z.Ativo === "SIM";

          return (
            <div
              key={`${z.Id || 'zona'}-${idx}`}
              className={`p-5 rounded-2xl border space-y-3 relative transition-colors ${
                isActive
                  ? "bg-slate-900 border-rose-500/30 hover:border-rose-500/60"
                  : "bg-slate-900/60 border-slate-800 opacity-60"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-3 rounded-xl ${
                      z.Nível_De_Risco === "EXTREMO" || z.Nível_De_Risco === "ALTO"
                        ? "bg-rose-500/10 text-rose-400"
                        : "bg-amber-500/10 text-amber-400"
                    }`}
                  >
                    <ShieldAlert className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base leading-tight">
                      {z.Descrição || z.Nome_Local}
                    </h3>
                    {(z.Bairro_Cidade || z.Tipo_Ocorrencia) && (
                      <p className="text-xs text-slate-400 mt-0.5">
                        {[z.Bairro_Cidade, z.Tipo_Ocorrencia].filter(Boolean).join(" • ")}
                      </p>
                    )}
                    <span
                      className={`text-[10px] font-extrabold px-2 py-0.5 rounded mt-1 inline-block ${
                        z.Nível_De_Risco === "EXTREMO"
                          ? "bg-rose-600 text-white"
                          : z.Nível_De_Risco === "ALTO"
                          ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                          : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                      }`}
                    >
                      RISCO {z.Nível_De_Risco}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleOpenModal(z)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs bg-slate-950 p-3 rounded-xl border border-slate-800">
                <div>
                  <span className="text-slate-500 text-[10px] block">Raio de Alerta</span>
                  <span className="font-bold text-rose-400 font-mono">{z["Raio_(M)"] || 300} metros</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block">Status Monitoramento</span>
                  <span className="font-bold text-emerald-400">{isActive ? "ATIVO" : "INATIVO"}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-500 text-[10px] block">Mensagem no Alerta</span>
                  <span className="text-slate-200">{z.Mensagem_De_Alerta || "Cuidado!"}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Risk Modal (Fast 1-touch capture) */}
      {isQuickModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs text-xs">
          <div className="bg-slate-900 border-2 border-amber-500/60 rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-2xl shadow-amber-500/10">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
                  <Zap className="w-5 h-5 fill-amber-400" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-white tracking-wide">
                    REGISTRO RÁPIDO DE RISCO
                  </h3>
                  <p className="text-[10px] text-emerald-400 font-mono">
                    📍 GPS: {userLocation ? `${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)}` : "Capturando posição..."}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsQuickModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleQuickSubmit} className="space-y-4">
              {/* Step 1: Nivel de Risco */}
              <div className="space-y-1.5">
                <label className="text-slate-300 font-bold block text-xs">
                  1. NÍVEL DE RISCO (1 TOQUE)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["ALTO", "MÉDIO", "BAIXO"] as const).map((lvl) => {
                    const isSelected = quickNivel === lvl;
                    const colorClass =
                      lvl === "ALTO"
                        ? isSelected
                          ? "bg-rose-600 text-white ring-2 ring-rose-400 font-black shadow-lg shadow-rose-600/30"
                          : "bg-rose-950/40 text-rose-300 border border-rose-800/60 hover:bg-rose-900/60"
                        : lvl === "MÉDIO"
                        ? isSelected
                          ? "bg-amber-500 text-slate-950 ring-2 ring-amber-300 font-black shadow-lg shadow-amber-500/30"
                          : "bg-amber-950/40 text-amber-300 border border-amber-800/60 hover:bg-amber-900/60"
                        : isSelected
                        ? "bg-blue-600 text-white ring-2 ring-blue-400 font-black shadow-lg shadow-blue-600/30"
                        : "bg-blue-950/40 text-blue-300 border border-blue-800/60 hover:bg-blue-900/60";

                    return (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => setQuickNivel(lvl)}
                        className={`py-3 px-2 rounded-xl text-center text-xs font-bold uppercase transition-all active:scale-95 ${colorClass}`}
                      >
                        {lvl}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 2: Nome do Local */}
              <div className="space-y-1.5">
                <label className="text-slate-300 font-bold block text-xs">
                  2. NOME DO LOCAL / REGIÃO
                </label>
                <VoiceInput
                  type="text"
                  required
                  autoFocus
                  placeholder="EX: VIADUTO / POSTO / CRUZAMENTO"
                  value={quickLocal}
                  onChange={(e) => setQuickLocal(e.target.value.toUpperCase())}
                  className="bg-slate-950 border border-slate-700 rounded-xl p-3 text-white text-sm font-semibold uppercase placeholder-slate-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  uppercase
                />
              </div>

              {/* Big Action Save Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isQuickSaving}
                  className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 text-slate-950 font-black text-sm rounded-xl flex items-center justify-center gap-2 shadow-xl shadow-rose-900/30 transition-all active:scale-95 disabled:opacity-50"
                >
                  {isQuickSaving ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin text-slate-950" />
                      <span>SALVANDO PONTO...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-5 h-5 fill-slate-950" />
                      <span>SALVAR RISCO AGORA</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs text-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-base text-white">
                {editingZona ? "Editar Zona de Risco" : "Cadastrar Zona de Risco"}
              </h3>
              <button onClick={() => setIsModalOpen(false)}>
                <X className="w-5 h-5 text-slate-400 hover:text-white" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="text-slate-400 block mb-1">Nome do Local / Descrição</label>
                <VoiceInput
                  type="text"
                  required
                  placeholder="Ex: ENTRADA DA COMUNIDADE X - ASSALTOS"
                  value={form.Descrição}
                  onChange={(e) => setForm({ ...form, Descrição: e.target.value.toUpperCase() })}
                  className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white uppercase"
                  uppercase
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Bairro / Cidade</label>
                  <VoiceInput
                    type="text"
                    placeholder="Ex: CENTRO"
                    value={form.Bairro_Cidade || ""}
                    onChange={(e) => setForm({ ...form, Bairro_Cidade: e.target.value.toUpperCase() })}
                    className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white uppercase"
                    uppercase
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Tipo de Ocorrência</label>
                  <select
                    value={selectedTipo}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSelectedTipo(val);
                      if (val !== "OUTROS") {
                        setForm((prev) => ({ ...prev, Tipo_Ocorrencia: val }));
                      } else {
                        setForm((prev) => ({ ...prev, Tipo_Ocorrencia: customTipo }));
                      }
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                  >
                    {availableTipos.map((tipo) => (
                      <option key={tipo} value={tipo}>
                        {tipo === "OUTROS" ? "OUTROS (DIGITAR NOVO)" : tipo}
                      </option>
                    ))}
                  </select>
                  {selectedTipo === "OUTROS" && (
                    <VoiceInput
                      type="text"
                      autoFocus
                      placeholder="DIGITE O NOVO TIPO"
                      value={customTipo}
                      onChange={(e) => {
                        const val = e.target.value.toUpperCase();
                        setCustomTipo(val);
                        setForm((prev) => ({ ...prev, Tipo_Ocorrencia: val }));
                      }}
                      className="mt-1.5 bg-slate-950 border border-rose-500/40 rounded-xl p-2.5 text-white uppercase placeholder-slate-600 focus:outline-none focus:border-rose-500"
                      uppercase
                    />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Nível de Risco</label>
                  <select
                    value={form.Nível_De_Risco}
                    onChange={(e) => setForm({ ...form, Nível_De_Risco: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                  >
                    <option value="BAIXO">BAIXO</option>
                    <option value="MÉDIO">MÉDIO</option>
                    <option value="ALTO">ALTO</option>
                    <option value="EXTREMO">EXTREMO</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Raio em Metros</label>
                  <input
                    type="number"
                    value={form["Raio_(M)"]}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setForm({ ...form, "Raio_(M)": Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Latitude</label>
                  <input
                    type="number"
                    step="any"
                    value={form.Latitude}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setForm({ ...form, Latitude: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Longitude</label>
                  <input
                    type="number"
                    step="any"
                    value={form.Longitude}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setForm({ ...form, Longitude: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Mensagem de Alerta</label>
                <VoiceInput
                  type="text"
                  value={form.Mensagem_De_Alerta}
                  onChange={(e) => setForm({ ...form, Mensagem_De_Alerta: e.target.value.toUpperCase() })}
                  className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white uppercase"
                  uppercase
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Observações</label>
                <VoiceInput
                  type="text"
                  placeholder="Ex: EVITAR À NOITE, FECHAR VIDROS"
                  value={form.Observação || form.Observacoes || ""}
                  onChange={(e) => setForm({ ...form, Observação: e.target.value.toUpperCase(), Observacoes: e.target.value.toUpperCase() })}
                  className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white uppercase"
                  uppercase
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                {editingZona ? (
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={handleDelete}
                    className="flex items-center gap-1.5 px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:border-rose-500/50 rounded-xl font-semibold text-xs transition-colors disabled:opacity-50"
                    title="Excluir Zona de Risco"
                  >
                    {isDeleting ? (
                      <Loader2 className="w-4 h-4 animate-spin text-rose-400" />
                    ) : (
                      <Trash2 className="w-4 h-4 text-rose-400" />
                    )}
                    <span>Excluir</span>
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-slate-400 hover:text-white"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl"
                  >
                    Salvar
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
