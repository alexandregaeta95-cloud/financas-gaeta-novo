import React, { useState } from "react";
import { Car, Wrench, Calendar, Plus, Edit2, Trash2, CheckCircle, Clock } from "lucide-react";
import { Veiculo, ServicoOficina, ManutencaoAgendada } from "../types";
import { generateNewId } from "../services/api";

interface Props {
  veiculos: Veiculo[];
  servicos: ServicoOficina[];
  manutencoes: ManutencaoAgendada[];
  onSaveVeiculo: (veiculo: Veiculo) => Promise<void>;
  onSaveServico: (servico: ServicoOficina) => Promise<void>;
  onSaveManutencao: (manutencao: ManutencaoAgendada) => Promise<void>;
}

export const VeiculosOficinaView: React.FC<Props> = ({
  veiculos,
  servicos,
  manutencoes,
  onSaveVeiculo,
  onSaveServico,
  onSaveManutencao,
}) => {
  const [activeTab, setActiveTab] = useState<"veiculos" | "oficina" | "agendadas">("veiculos");

  // Veículo Modal State
  const [isVeiculoModalOpen, setIsVeiculoModalOpen] = useState(false);
  const [veiculoForm, setVeiculoForm] = useState<Partial<Veiculo>>({
    Marca: "",
    Modelo: "",
    Ano: new Date().getFullYear(),
    Placa: "",
    Km_Atual: 0,
    Combustivel: "Flex",
    Ativo: true,
  });

  // Serviço Modal State
  const [isServicoModalOpen, setIsServicoModalOpen] = useState(false);
  const [servicoForm, setServicoForm] = useState<Partial<ServicoOficina>>({
    Data: new Date().toISOString().split("T")[0],
    Veiculo: veiculos[0]?.Modelo || "",
    Km_No_Servico: veiculos[0]?.Km_Atual || 0,
    Descricao_Servico: "",
    Oficina_Mecanica: "",
    Valor_Pecas: 0,
    Valor_Mao_Obra: 0,
    Valor_Total: 0,
  });

  const handleSaveVeiculo = async (e: React.FormEvent) => {
    e.preventDefault();
    const item: Veiculo = {
      Id: veiculoForm.Id || generateNewId("VEIC"),
      Marca: veiculoForm.Marca || "Marca",
      Modelo: veiculoForm.Modelo || "Modelo",
      Ano: Number(veiculoForm.Ano) || new Date().getFullYear(),
      Placa: veiculoForm.Placa || "AAA-0000",
      Km_Atual: Number(veiculoForm.Km_Atual) || 0,
      Combustivel: veiculoForm.Combustivel || "Flex",
      Ativo: true,
    };
    await onSaveVeiculo(item);
    setIsVeiculoModalOpen(false);
  };

  const handleSaveServico = async (e: React.FormEvent) => {
    e.preventDefault();
    const pecas = Number(servicoForm.Valor_Pecas) || 0;
    const maoObra = Number(servicoForm.Valor_Mao_Obra) || 0;
    const item: ServicoOficina = {
      Id: servicoForm.Id || generateNewId("OFI"),
      Data: servicoForm.Data || new Date().toISOString().split("T")[0],
      Veiculo: servicoForm.Veiculo || veiculos[0]?.Modelo || "Veículo",
      Km_No_Servico: Number(servicoForm.Km_No_Servico) || 0,
      Descricao_Servico: servicoForm.Descricao_Servico || "Manutenção",
      Oficina_Mecanica: servicoForm.Oficina_Mecanica || "",
      Valor_Pecas: pecas,
      Valor_Mao_Obra: maoObra,
      Valor_Total: pecas + maoObra,
      Observacoes: servicoForm.Observacoes || "",
    };
    await onSaveServico(item);
    setIsServicoModalOpen(false);
  };

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Veículos & Manutenção</h2>
          <p className="text-xs text-slate-400">
            Abas <code className="text-emerald-400 font-mono">9_Veiculos</code>,{" "}
            <code className="text-emerald-400 font-mono">14_Oficina</code>,{" "}
            <code className="text-emerald-400 font-mono">15_Manutenções_Agendadas</code>
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === "veiculos" && (
            <button
              onClick={() => {
                setVeiculoForm({
                  Marca: "",
                  Modelo: "",
                  Ano: new Date().getFullYear(),
                  Placa: "",
                  Km_Atual: 0,
                  Combustivel: "Flex",
                  Ativo: true,
                });
                setIsVeiculoModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl text-xs shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Cadastrar Veículo</span>
            </button>
          )}

          {activeTab === "oficina" && (
            <button
              onClick={() => {
                setServicoForm({
                  Data: new Date().toISOString().split("T")[0],
                  Veiculo: veiculos[0]?.Modelo || "",
                  Km_No_Servico: veiculos[0]?.Km_Atual || 0,
                  Descricao_Servico: "",
                  Oficina_Mecanica: "",
                  Valor_Pecas: 0,
                  Valor_Mao_Obra: 0,
                  Valor_Total: 0,
                });
                setIsServicoModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl text-xs shadow-sm"
            >
              <Wrench className="w-4 h-4" />
              <span>Novo Serviço de Oficina</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab("veiculos")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
            activeTab === "veiculos"
              ? "bg-slate-800 text-emerald-400 border border-emerald-500/30"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <Car className="w-4 h-4" />
          <span>Veículos Cadastrados ({veiculos.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("oficina")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
            activeTab === "oficina"
              ? "bg-slate-800 text-emerald-400 border border-emerald-500/30"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <Wrench className="w-4 h-4" />
          <span>Serviços de Oficina ({servicos.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("agendadas")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
            activeTab === "agendadas"
              ? "bg-slate-800 text-emerald-400 border border-emerald-500/30"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Manutenções Agendadas ({manutencoes.length})</span>
        </button>
      </div>

      {/* Tab Content: Veículos */}
      {activeTab === "veiculos" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {veiculos.map((v) => (
            <div key={v.Id} className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-white text-base">
                    {v.Marca} {v.Modelo}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Ano: {v.Ano} • {v.Combustivel}
                  </p>
                </div>
                <div className="p-2.5 bg-slate-800 text-emerald-400 rounded-xl">
                  <Car className="w-5 h-5" />
                </div>
              </div>

              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-xs space-y-1">
                <div className="flex justify-between text-slate-400">
                  <span>Placa:</span>
                  <span className="font-mono text-white font-bold">{v.Placa}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Hodômetro (KM):</span>
                  <span className="text-emerald-400 font-bold">{Number(v.Km_Atual).toLocaleString("pt-BR")} KM</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab Content: Oficina */}
      {activeTab === "oficina" && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          {servicos.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-xs">
              Nenhum serviço de manutenção cadastrado.
            </div>
          ) : (
            <div className="divide-y divide-slate-800/80 text-xs">
              {servicos.map((s) => (
                <div key={s.Id} className="p-4 flex items-center justify-between gap-3">
                  <div>
                    <span className="font-bold text-white text-sm">{s.Descricao_Servico}</span>
                    <p className="text-slate-400 text-[11px] mt-0.5">
                      Veículo: <strong className="text-slate-200">{s.Veiculo}</strong> • Data: {s.Data} • Oficina: {s.Oficina_Mecanica || "N/I"} ({s.Km_No_Servico} KM)
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-bold text-rose-400 text-sm">
                      R$ {Number(s.Valor_Total || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </span>
                    <p className="text-[10px] text-slate-500">
                      Peças: R${s.Valor_Pecas} | M.Obra: R${s.Valor_Mao_Obra}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab Content: Agendadas */}
      {activeTab === "agendadas" && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-xs text-slate-400">
          {manutencoes.length === 0 ? (
            <div className="text-center py-8">Nenhum agendamento futuro configurado.</div>
          ) : (
            <div className="space-y-2">
              {manutencoes.map((m) => (
                <div key={m.Id} className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex justify-between">
                  <div>
                    <span className="font-bold text-white">{m.Item_Manutencao}</span>
                    <p className="text-[11px]">Veículo: {m.Veiculo} • Alvo: {m.Km_Alvo} KM / {m.Data_Alvo}</p>
                  </div>
                  <span className="px-2 py-1 rounded bg-amber-500/10 text-amber-400 font-semibold text-[10px]">
                    {m.Status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Veiculo Modal */}
      {isVeiculoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 text-xs text-white">
            <h3 className="font-bold text-base">Cadastrar Novo Veículo (9_Veiculos)</h3>
            <form onSubmit={handleSaveVeiculo} className="space-y-3">
              <div>
                <label className="block text-slate-400 mb-1">Marca / Fabricante</label>
                <input
                  type="text"
                  placeholder="Ex: Honda, Volkswagen, Toyota"
                  value={veiculoForm.Marca}
                  onChange={(e) => setVeiculoForm({ ...veiculoForm, Marca: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Modelo</label>
                <input
                  type="text"
                  placeholder="Ex: Civic, Golf, Corolla"
                  value={veiculoForm.Modelo}
                  onChange={(e) => setVeiculoForm({ ...veiculoForm, Modelo: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 mb-1">Ano</label>
                  <input
                    type="number"
                    value={veiculoForm.Ano}
                    onChange={(e) => setVeiculoForm({ ...veiculoForm, Ano: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Placa</label>
                  <input
                    type="text"
                    placeholder="Ex: ABC-1D23"
                    value={veiculoForm.Placa}
                    onChange={(e) => setVeiculoForm({ ...veiculoForm, Placa: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-slate-400 mb-1">KM Atual (Número simples)</label>
                <input
                  type="number"
                  placeholder="Ex: 85000"
                  value={veiculoForm.Km_Atual}
                  onChange={(e) => setVeiculoForm({ ...veiculoForm, Km_Atual: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsVeiculoModalOpen(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 font-bold rounded-xl"
                >
                  Salvar Veículo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Serviço Modal */}
      {isServicoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 text-xs text-white">
            <h3 className="font-bold text-base">Novo Serviço de Oficina (14_Oficina)</h3>
            <form onSubmit={handleSaveServico} className="space-y-3">
              <div>
                <label className="block text-slate-400 mb-1">Descrição do Serviço</label>
                <input
                  type="text"
                  placeholder="Ex: Troca de Óleo + Filtro de Ar"
                  value={servicoForm.Descricao_Servico}
                  onChange={(e) => setServicoForm({ ...servicoForm, Descricao_Servico: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 mb-1">Valor Peças (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={servicoForm.Valor_Pecas || ""}
                    onChange={(e) => setServicoForm({ ...servicoForm, Valor_Pecas: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Mão de Obra (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={servicoForm.Valor_Mao_Obra || ""}
                    onChange={(e) => setServicoForm({ ...servicoForm, Valor_Mao_Obra: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsServicoModalOpen(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 font-bold rounded-xl"
                >
                  Salvar Serviço
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
