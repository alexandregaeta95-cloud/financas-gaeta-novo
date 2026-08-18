import React, { useState, useEffect } from "react";
import { ShieldAlert, MapPin, Plus, Edit2, Trash2, X, Navigation, Volume2, VolumeX, BellRing } from "lucide-react";
import { ZonaDeRisco } from "../types";
import { generateNewId } from "../services/api";

interface Props {
  zonas: ZonaDeRisco[];
  onSaveZona: (zona: ZonaDeRisco) => Promise<void>;
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

export const ZonasDeRiscoView: React.FC<Props> = ({ zonas, onSaveZona }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingZona, setEditingZona] = useState<ZonaDeRisco | null>(null);

  // User current geolocation
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [activeAlertZone, setActiveAlertZone] = useState<ZonaDeRisco | null>(null);
  const [isMuted, setIsMuted] = useState(false);

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
  const playRiskAlertSound = () => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (ctx.state === "suspended") {
        ctx.resume();
      }
      const now = ctx.currentTime;

      // Pulse 1: 880Hz -> 1046.5Hz
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sawtooth";
      osc1.frequency.setValueAtTime(880, now);
      osc1.frequency.setValueAtTime(1046.5, now + 0.12);
      gain1.gain.setValueAtTime(0.35, now);
      gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.3);

      // Pulse 2: 880Hz -> 1174.66Hz (250ms later)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sawtooth";
      osc2.frequency.setValueAtTime(880, now + 0.25);
      osc2.frequency.setValueAtTime(1174.66, now + 0.38);
      gain2.gain.setValueAtTime(0.4, now + 0.25);
      gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.25);
      osc2.stop(now + 0.6);
    } catch (e) {
      console.log("Audio alert failed or muted:", e);
    }
  };

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
      return;
    }

    // Play immediately when entering the zone
    playRiskAlertSound();

    // Repeat automatically every 6 seconds while inside the zone
    const intervalId = setInterval(() => {
      playRiskAlertSound();
    }, 6000);

    return () => {
      clearInterval(intervalId);
    };
  }, [activeAlertZone, isMuted]);

  const handleOpenModal = (z?: ZonaDeRisco) => {
    if (z) {
      setEditingZona(z);
      setForm({ ...z });
    } else {
      setEditingZona(null);
      setForm({
        Descrição: "",
        Nível_De_Risco: "ALTO",
        Latitude: userLocation?.lat || -23.55052,
        Longitude: userLocation?.lng || -46.633308,
        "Raio_(M)": 500,
        Ativo: "SIM",
        Mensagem_De_Alerta: "CUIDADO: Zona de Alto Risco Registrada!",
        Observação: "",
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const item: ZonaDeRisco = {
      Id: editingZona?.Id || generateNewId("RISCO"),
      Descrição: form.Descrição || "Zona de Risco",
      Nível_De_Risco: form.Nível_De_Risco || "ALTO",
      Latitude: Number(form.Latitude) || 0,
      Longitude: Number(form.Longitude) || 0,
      "Raio_(M)": Number(form["Raio_(M)"]) || 300,
      Ativo: form.Ativo || "SIM",
      Mensagem_De_Alerta: form.Mensagem_De_Alerta || "Atenção!",
      Data_Registro: new Date().toISOString().split("T")[0],
      Observação: form.Observação || "",
    };
    await onSaveZona(item);
    setIsModalOpen(false);
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

        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Cadastrar Zona de Risco</span>
        </button>
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
                      {z.Descrição}
                    </h3>
                    <span
                      className={`text-[10px] font-extrabold px-2 py-0.5 rounded ${
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

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs text-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4">
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
                <label className="text-slate-400 block mb-1">Descrição do Local</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Trecho com alto índice de assaltos / alagamento"
                  value={form.Descrição}
                  onChange={(e) => setForm({ ...form, Descrição: e.target.value.toUpperCase() })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white uppercase"
                />
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
                    onChange={(e) => setForm({ ...form, Longitude: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Mensagem de Alerta</label>
                <input
                  type="text"
                  value={form.Mensagem_De_Alerta}
                  onChange={(e) => setForm({ ...form, Mensagem_De_Alerta: e.target.value.toUpperCase() })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white uppercase"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
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
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
