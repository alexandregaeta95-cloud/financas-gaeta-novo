import React, { useState, useMemo } from "react";
import {
  Car,
  Wrench,
  Calendar,
  Plus,
  Edit2,
  Trash2,
  AlertTriangle,
  Clock,
  X,
  Search,
} from "lucide-react";
import { Veiculo, ServicoOficina, ManutencaoAgendada } from "../types";
import { generateNewId } from "../services/api";
import { parseCurrency, formatCurrency } from "../utils/formatters";

type PeriodFilterType = "ALL" | "CURRENT_MONTH" | "LAST_MONTH" | "CUSTOM";

interface Props {
  veiculos: Veiculo[];
  servicos: ServicoOficina[];
  manutencoes: ManutencaoAgendada[];
  onSaveVeiculo: (veiculo: Veiculo) => Promise<void>;
  onSaveServico: (servico: ServicoOficina) => Promise<void>;
  onSaveManutencao: (manutencao: ManutencaoAgendada) => Promise<void>;
  onDeleteVeiculo: (id: string) => Promise<void>;
  onDeleteServico: (id: string) => Promise<void>;
  onDeleteManutencao: (id: string) => Promise<void>;
}

function parseDateSafely(val: any): Date | null {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  const s = String(val).trim();
  if (!s) return null;

  // DD/MM/YYYY or DD-MM-YYYY
  const brMatch = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (brMatch) {
    const day = parseInt(brMatch[1], 10);
    const month = parseInt(brMatch[2], 10) - 1;
    const year = parseInt(brMatch[3], 10);
    const d = new Date(year, month, day);
    return isNaN(d.getTime()) ? null : d;
  }

  // YYYY-MM-DD or ISO
  const isoMatch = s.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10) - 1;
    const day = parseInt(isoMatch[3], 10);
    const d = new Date(year, month, day);
    return isNaN(d.getTime()) ? null : d;
  }

  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

export const VeiculosOficinaView: React.FC<Props> = ({
  veiculos,
  servicos,
  manutencoes,
  onSaveVeiculo,
  onSaveServico,
  onSaveManutencao,
  onDeleteVeiculo,
  onDeleteServico,
  onDeleteManutencao,
}) => {
  const [activeTab, setActiveTab] = useState<"veiculos" | "oficina" | "agendadas">("veiculos");

  // Filter and Search States
  const [periodFilter, setPeriodFilter] = useState<PeriodFilterType>("ALL");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Delete Confirmation State
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    type: "veiculo" | "servico" | "manutencao";
    id: string;
    title: string;
    subtitle?: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Veículo Modal State
  const [isVeiculoModalOpen, setIsVeiculoModalOpen] = useState(false);
  const [editingVeiculo, setEditingVeiculo] = useState<Veiculo | null>(null);
  const [veiculoForm, setVeiculoForm] = useState<Partial<Veiculo>>({
    Descrição: "",
    Motorista: "Alexandre",
    Placa: "",
    Renavam: "",
    Chassi: "",
    Marca: "Volkswagen",
    Modelo: "Polo TSI",
    Ano: new Date().getFullYear(),
    Ano_Fabricação: new Date().getFullYear(),
    Combustível: "Flex",
    Km_Atual: 24500,
    Ativo: true,
  });

  // Oficina (Serviço) Modal State
  const [isServicoModalOpen, setIsServicoModalOpen] = useState(false);
  const [editingServico, setEditingServico] = useState<ServicoOficina | null>(null);
  const [servicoForm, setServicoForm] = useState<Partial<ServicoOficina>>({
    Data: new Date().toISOString().split("T")[0],
    Descrição: "",
    KM: 0,
    Valor_A_PG: 0,
    Valor_Pago: 0,
    Oficina_Nome: "",
    Comprovante_Url: "",
    Observações: "",
    Veiculo: veiculos[0]?.Modelo || "CARRO",
  });

  // Manutenção Agendada Modal State
  const [isManutencaoModalOpen, setIsManutencaoModalOpen] = useState(false);
  const [editingManutencao, setEditingManutencao] = useState<ManutencaoAgendada | null>(null);
  const [manutencaoForm, setManutencaoForm] = useState<Partial<ManutencaoAgendada>>({
    Veículo: veiculos[0]?.Modelo || "CARRO",
    Descrição: "",
    Tipo_Agendamento: "Ambos",
    Data_Alvo: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split("T")[0],
    KM_Alvo: (veiculos[0]?.Km_Atual || 25000) + 10000,
    Recorrente: "SIM",
    Frequência_Meses: 12,
    Frequência_KM: 10000,
    Status: "PENDENTE",
    Prioridade: "Média",
    Oficina_Nome: "",
    Observações: "",
  });

  // Helper for Date Period Filter
  const isDateInPeriod = (dateStr?: string | null): boolean => {
    if (periodFilter === "ALL") return true;
    if (!dateStr) return true;

    const itemDate = parseDateSafely(dateStr);
    if (!itemDate) return true;

    const now = new Date();

    if (periodFilter === "CURRENT_MONTH") {
      return (
        itemDate.getFullYear() === now.getFullYear() &&
        itemDate.getMonth() === now.getMonth()
      );
    }

    if (periodFilter === "LAST_MONTH") {
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return (
        itemDate.getFullYear() === lastMonth.getFullYear() &&
        itemDate.getMonth() === lastMonth.getMonth()
      );
    }

    if (periodFilter === "CUSTOM") {
      const itemTime = new Date(
        itemDate.getFullYear(),
        itemDate.getMonth(),
        itemDate.getDate()
      ).getTime();

      if (startDate) {
        const startObj = parseDateSafely(startDate);
        if (startObj) {
          const startTime = new Date(
            startObj.getFullYear(),
            startObj.getMonth(),
            startObj.getDate()
          ).getTime();
          if (itemTime < startTime) return false;
        }
      }

      if (endDate) {
        const endObj = parseDateSafely(endDate);
        if (endObj) {
          const endTime = new Date(
            endObj.getFullYear(),
            endObj.getMonth(),
            endObj.getDate()
          ).getTime();
          if (itemTime > endTime) return false;
        }
      }

      return true;
    }

    return true;
  };

  // Filtered lists for each tab
  const filteredVeiculos = useMemo(() => {
    return veiculos.filter((v) => {
      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase();
      return (
        (v.Marca || "").toLowerCase().includes(q) ||
        (v.Modelo || "").toLowerCase().includes(q) ||
        (v.Placa || "").toLowerCase().includes(q) ||
        (v.Motorista || "").toLowerCase().includes(q) ||
        (v.Descrição || "").toLowerCase().includes(q)
      );
    });
  }, [veiculos, searchTerm]);

  const filteredServicos = useMemo(() => {
    return servicos
      .filter((s) => isDateInPeriod(s.Data))
      .filter((s) => {
        if (!searchTerm.trim()) return true;
        const q = searchTerm.toLowerCase();
        return (
          (s.Descrição || "").toLowerCase().includes(q) ||
          (s.Veiculo || "").toLowerCase().includes(q) ||
          (s.Oficina_Nome || "").toLowerCase().includes(q) ||
          (s.Observações || "").toLowerCase().includes(q)
        );
      });
  }, [servicos, periodFilter, startDate, endDate, searchTerm]);

  const filteredManutencoes = useMemo(() => {
    return manutencoes
      .filter((m) => isDateInPeriod(m.Data_Alvo))
      .filter((m) => {
        if (!searchTerm.trim()) return true;
        const q = searchTerm.toLowerCase();
        return (
          (m.Descrição || "").toLowerCase().includes(q) ||
          (m.Veículo || "").toLowerCase().includes(q) ||
          (m.Oficina_Nome || "").toLowerCase().includes(q) ||
          (m.Observações || "").toLowerCase().includes(q)
        );
      });
  }, [manutencoes, periodFilter, startDate, endDate, searchTerm]);

  // Open Veículo Modal
  const handleOpenVeiculo = (v?: Veiculo) => {
    if (v) {
      setEditingVeiculo(v);
      setVeiculoForm({ ...v });
    } else {
      setEditingVeiculo(null);
      setVeiculoForm({
        Descrição: "Carro de Uso Diário",
        Motorista: "Alexandre",
        Placa: "",
        Renavam: "",
        Chassi: "",
        Marca: "Volkswagen",
        Modelo: "Polo TSI",
        Ano: new Date().getFullYear(),
        Ano_Fabricação: new Date().getFullYear(),
        Combustível: "Flex",
        Km_Atual: 25000,
        Ativo: true,
      });
    }
    setIsVeiculoModalOpen(true);
  };

  const handleSaveVeiculoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const item: Veiculo = {
      Id: editingVeiculo?.Id || generateNewId("VEIC"),
      Descrição: veiculoForm.Descrição || veiculoForm.Modelo || "Veículo",
      Motorista: veiculoForm.Motorista || "",
      Placa: veiculoForm.Placa || "GAE-2026",
      Renavam: veiculoForm.Renavam || "",
      Chassi: veiculoForm.Chassi || "",
      Marca: veiculoForm.Marca || "VW",
      Modelo: veiculoForm.Modelo || "Polo",
      Ano: parseCurrency(veiculoForm.Ano) || new Date().getFullYear(),
      Ano_Fabricação: parseCurrency(veiculoForm.Ano_Fabricação) || parseCurrency(veiculoForm.Ano) || new Date().getFullYear(),
      Combustível: veiculoForm.Combustível || "Flex",
      Km_Atual: parseCurrency(veiculoForm.Km_Atual),
      Ativo: veiculoForm.Ativo !== false,
    };
    await onSaveVeiculo(item);
    setIsVeiculoModalOpen(false);
  };

  // Open Oficina Modal
  const handleOpenServico = (s?: ServicoOficina) => {
    if (s) {
      setEditingServico(s);
      setServicoForm({ ...s });
    } else {
      setEditingServico(null);
      const defaultVeic = veiculos[0];
      setServicoForm({
        Data: new Date().toISOString().split("T")[0],
        Descrição: "",
        KM: defaultVeic?.Km_Atual || 0,
        Valor_A_PG: 0,
        Valor_Pago: 0,
        Oficina_Nome: "",
        Comprovante_Url: "",
        Observações: "",
        Veiculo: defaultVeic?.Modelo || "CARRO",
      });
    }
    setIsServicoModalOpen(true);
  };

  const handleSaveServicoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const item: ServicoOficina = {
      Id: editingServico?.Id || generateNewId("OFI"),
      Data: servicoForm.Data || new Date().toISOString().split("T")[0],
      Descrição: servicoForm.Descrição || "Serviço de Oficina",
      KM: parseCurrency(servicoForm.KM),
      Valor_A_PG: parseCurrency(servicoForm.Valor_A_PG),
      Valor_Pago: parseCurrency(servicoForm.Valor_Pago),
      Oficina_Nome: servicoForm.Oficina_Nome || "",
      Comprovante_Url: servicoForm.Comprovante_Url || "",
      Observações: servicoForm.Observações || "",
      Veiculo: servicoForm.Veiculo || veiculos[0]?.Modelo || "CARRO",
    };
    await onSaveServico(item);
    setIsServicoModalOpen(false);
  };

  // Open Manutenção Modal
  const handleOpenManutencao = (m?: ManutencaoAgendada) => {
    if (m) {
      setEditingManutencao(m);
      setManutencaoForm({ ...m });
    } else {
      setEditingManutencao(null);
      const defaultVeic = veiculos[0];
      setManutencaoForm({
        Veículo: defaultVeic?.Modelo || "CARRO",
        Descrição: "Troca de Óleo e Filtros",
        Tipo_Agendamento: "Ambos",
        Data_Alvo: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split("T")[0],
        KM_Alvo: (parseCurrency(defaultVeic?.Km_Atual) || 25000) + 10000,
        Recorrente: "SIM",
        Frequência_Meses: 12,
        Frequência_KM: 10000,
        Status: "PENDENTE",
        Prioridade: "Média",
        Oficina_Nome: "",
        Observações: "",
      });
    }
    setIsManutencaoModalOpen(true);
  };

  const handleSaveManutencaoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const item: ManutencaoAgendada = {
      Id: editingManutencao?.Id || generateNewId("MANUT"),
      Veículo: manutencaoForm.Veículo || veiculos[0]?.Modelo || "CARRO",
      Descrição: manutencaoForm.Descrição || "Manutenção Agendada",
      Tipo_Agendamento: manutencaoForm.Tipo_Agendamento || "Ambos",
      Data_Alvo: manutencaoForm.Data_Alvo || "",
      KM_Alvo: parseCurrency(manutencaoForm.KM_Alvo),
      Recorrente: manutencaoForm.Recorrente || "SIM",
      Frequência_Meses: parseCurrency(manutencaoForm.Frequência_Meses) || 12,
      Frequência_KM: parseCurrency(manutencaoForm.Frequência_KM) || 10000,
      Status: manutencaoForm.Status || "PENDENTE",
      Prioridade: manutencaoForm.Prioridade || "Média",
      Oficina_Nome: manutencaoForm.Oficina_Nome || "",
      Observações: manutencaoForm.Observações || "",
    };
    await onSaveManutencao(item);
    setIsManutencaoModalOpen(false);
  };

  // Check upcoming maintenance alerts (Date <= 7 days or past, OR KM >= target - 500)
  const nowTime = new Date().getTime();
  const alertManutencoes = manutencoes.filter((m) => {
    if (m.Status === "CONCLUÍDO" || m.Status === "Concluída") return false;
    let isAlert = false;

    if (m.Data_Alvo) {
      const targetTime = new Date(m.Data_Alvo).getTime();
      const diffDays = (targetTime - nowTime) / (1000 * 3600 * 24);
      if (diffDays <= 7) isAlert = true;
    }

    if (m.KM_Alvo && m.KM_Alvo > 0) {
      const relatedVeic = veiculos.find(
        (v) => v.Modelo === m.Veículo || v.Descrição === m.Veículo
      );
      const currentKm = relatedVeic?.Km_Atual || 0;
      if (currentKm >= m.KM_Alvo - 500) isAlert = true;
    }

    return isAlert;
  });

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Car className="w-5 h-5 text-emerald-400" />
            Veículos & Oficina
          </h2>
          <p className="text-xs text-slate-400">
            Abas <code className="text-emerald-400 font-mono">9_Veiculos</code>,{" "}
            <code className="text-emerald-400 font-mono">14_Oficina</code>,{" "}
            <code className="text-emerald-400 font-mono">15_Manutenções_Agendadas</code>
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab("veiculos")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "veiculos"
                ? "bg-emerald-600 text-white shadow-xs"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Veículos ({filteredVeiculos.length})
          </button>
          <button
            onClick={() => setActiveTab("oficina")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "oficina"
                ? "bg-emerald-600 text-white shadow-xs"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Histórico Oficina ({filteredServicos.length})
          </button>
          <button
            onClick={() => setActiveTab("agendadas")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all relative ${
              activeTab === "agendadas"
                ? "bg-emerald-600 text-white shadow-xs"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Manutenções Agendadas ({filteredManutencoes.length})
            {alertManutencoes.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 bg-amber-500 text-slate-950 font-bold rounded-full text-[10px]">
                {alertManutencoes.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Maintenance Notification Banner */}
      {alertManutencoes.length > 0 && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs">
            <h4 className="font-bold text-amber-300">
              Atenção: {alertManutencoes.length} Manutenção(ões) Próxima(s) do Vencimento ou KM Alvo!
            </h4>
            <ul className="list-disc list-inside text-amber-200/80 space-y-0.5">
              {alertManutencoes.map((m, idx) => (
                <li key={`${m.Id || 'manut-alert'}-${idx}`}>
                  <strong>{m.Veículo}</strong>: {m.Descrição} —{" "}
                  {m.Data_Alvo && `Data Alvo: ${m.Data_Alvo}`}
                  {m.KM_Alvo && ` | KM Alvo: ${m.KM_Alvo}`}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Filter and Search Bar (Todos os Períodos, Mês Atual, Mês Passado, Selecionar Período) */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              placeholder={
                activeTab === "veiculos"
                  ? "Buscar por marca, modelo, placa ou motorista..."
                  : activeTab === "oficina"
                  ? "Buscar por serviço, veículo ou oficina..."
                  : "Buscar por manutenção, veículo ou oficina..."
              }
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          {/* Period Selector */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              <select
                value={periodFilter}
                onChange={(e) => setPeriodFilter(e.target.value as PeriodFilterType)}
                className="bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-8 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 cursor-pointer appearance-none"
              >
                <option value="ALL">Todos os Períodos</option>
                <option value="CURRENT_MONTH">Mês Atual</option>
                <option value="LAST_MONTH">Mês Passado</option>
                <option value="CUSTOM">Selecionar Período</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                  <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Custom Period Date Range Pickers (shown when periodFilter === "CUSTOM") */}
        {periodFilter === "CUSTOM" && (
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-800/80">
            <span className="text-xs text-slate-400 font-medium">Intervalo de Datas:</span>
            <div className="flex items-center gap-2">
              <label className="text-[11px] text-slate-400">Data Inicial:</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-[11px] text-slate-400">Data Final:</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* 1. VEÍCULOS TAB */}
      {activeTab === "veiculos" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-400">
              Gerencie seus veículos cadastrados (Aba 9_Veiculos)
            </span>
            <button
              onClick={() => handleOpenVeiculo()}
              className="flex items-center gap-2 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-xl transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Cadastrar Veículo</span>
            </button>
          </div>

          {filteredVeiculos.length === 0 ? (
            <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl text-slate-500 text-xs">
              Nenhum veículo encontrado com os filtros atuais.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredVeiculos.map((v, idx) => (
                <div
                  key={`${v.Id || 'veic'}-${idx}`}
                  className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-3 relative hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400">
                        <Car className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-base leading-tight">
                          {v.Marca} {v.Modelo}
                        </h3>
                        <p className="text-xs text-slate-400 font-mono">
                          Placa: <strong className="text-emerald-400">{v.Placa}</strong> • Ano: {v.Ano}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenVeiculo(v)}
                        className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                        title="Editar Veículo"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() =>
                          setDeleteConfirm({
                            isOpen: true,
                            type: "veiculo",
                            id: v.Id,
                            title: `${v.Marca} ${v.Modelo}`,
                            subtitle: `Placa: ${v.Placa || "Sem placa"} • Motorista: ${v.Motorista || "—"}`,
                          })
                        }
                        className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                        title="Excluir Veículo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <div>
                      <span className="text-slate-500 text-[10px] block">Motorista</span>
                      <span className="font-semibold text-slate-200">{v.Motorista || "—"}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] block">KM Atual</span>
                      <span className="font-bold text-emerald-400 font-mono">{v.Km_Atual} KM</span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] block">Combustível</span>
                      <span className="text-slate-300">{v.Combustível}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] block">Renavam</span>
                      <span className="text-slate-300 font-mono">{v.Renavam || "—"}</span>
                    </div>
                  </div>

                  {v.Descrição && (
                    <p className="text-xs text-slate-400 italic">"{v.Descrição}"</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 2. OFICINA (HISTÓRICO) TAB */}
      {activeTab === "oficina" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-400">
              Histórico de manutenções e reparos realizados (Aba 14_Oficina)
            </span>
            <button
              onClick={() => handleOpenServico()}
              className="flex items-center gap-2 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-xl transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Registrar Serviço</span>
            </button>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-800">
            {filteredServicos.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                Nenhum serviço de oficina encontrado no período selecionado.
              </div>
            ) : (
              filteredServicos.map((s, idx) => (
                <div key={`${s.Id || 'serv'}-${idx}`} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-xl bg-slate-800 text-emerald-400 shrink-0 mt-0.5">
                      <Wrench className="w-4 h-4" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-bold text-white text-sm">{s.Descrição}</h4>
                      <p className="text-slate-400 flex flex-wrap gap-3">
                        <span>Veículo: <strong className="text-slate-200">{s.Veiculo}</strong></span>
                        <span>Data: <strong className="text-slate-200">{s.Data}</strong></span>
                        <span>KM: <strong className="text-slate-200">{s.KM} KM</strong></span>
                        {s.Oficina_Nome && <span>Oficina: <strong className="text-slate-200">{s.Oficina_Nome}</strong></span>}
                      </p>
                      {s.Observações && <p className="text-slate-500 italic">"{s.Observações}"</p>}
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 border-t sm:border-0 border-slate-800 pt-2 sm:pt-0">
                    <div className="text-left sm:text-right">
                      <span className="font-bold text-rose-400 text-sm">
                        R$ {formatCurrency(parseCurrency(s.Valor_Pago) || parseCurrency(s.Valor_A_PG))}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenServico(s)}
                        className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                        title="Editar Serviço"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() =>
                          setDeleteConfirm({
                            isOpen: true,
                            type: "servico",
                            id: s.Id,
                            title: s.Descrição,
                            subtitle: `Veículo: ${s.Veiculo} • Data: ${s.Data} • Valor: R$ ${formatCurrency(parseCurrency(s.Valor_Pago) || parseCurrency(s.Valor_A_PG))}`,
                          })
                        }
                        className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                        title="Excluir Serviço"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 3. MANUTENÇÕES AGENDADAS TAB */}
      {activeTab === "agendadas" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-400">
              Planejamento de revisões e manutenções futuras (Aba 15_Manutenções_Agendadas)
            </span>
            <button
              onClick={() => handleOpenManutencao()}
              className="flex items-center gap-2 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-xl transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Agendar Manutenção</span>
            </button>
          </div>

          {filteredManutencoes.length === 0 ? (
            <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl text-slate-500 text-xs">
              Nenhuma manutenção agendada encontrada no período selecionado.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredManutencoes.map((m, idx) => {
                const isDone = m.Status === "CONCLUÍDO" || m.Status === "Concluída";
                return (
                  <div
                    key={`${m.Id || 'manut'}-${idx}`}
                    className={`p-4 rounded-2xl border space-y-3 ${
                      isDone
                        ? "bg-slate-900/50 border-slate-800/60 opacity-75"
                        : "bg-slate-900 border-slate-800"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className={`p-2 rounded-xl ${isDone ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"}`}>
                          <Clock className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="font-bold text-white text-sm">{m.Descrição}</h4>
                          <span className="text-xs text-slate-400">{m.Veículo}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() =>
                            onSaveManutencao({
                              ...m,
                              Status: isDone ? "PENDENTE" : "CONCLUÍDO",
                            })
                          }
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-colors ${
                            isDone
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : "bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20"
                          }`}
                        >
                          {isDone ? "CONCLUÍDO" : "MARCAR CONCLUÍDO"}
                        </button>
                        <button
                          onClick={() => handleOpenManutencao(m)}
                          className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                          title="Editar Manutenção"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() =>
                            setDeleteConfirm({
                              isOpen: true,
                              type: "manutencao",
                              id: m.Id,
                              title: m.Descrição,
                              subtitle: `Veículo: ${m.Veículo} • Data Alvo: ${m.Data_Alvo || "—"} • KM Alvo: ${m.KM_Alvo || "—"} KM`,
                            })
                          }
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                          title="Excluir Manutenção"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                      <div>
                        <span className="text-slate-500 text-[10px] block">Data Alvo</span>
                        <span className="font-semibold text-slate-200">{m.Data_Alvo || "—"}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[10px] block">KM Alvo</span>
                        <span className="font-bold text-amber-400 font-mono">{m.KM_Alvo || "—"} KM</span>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[10px] block">Recorrente</span>
                        <span className="text-slate-300">{m.Recorrente || "NÃO"} ({m.Frequência_Meses || 0} meses / {m.Frequência_KM || 0} KM)</span>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[10px] block">Oficina Recomendada</span>
                        <span className="text-slate-300">{m.Oficina_Nome || "A definir"}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && deleteConfirm.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 text-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2.5 bg-rose-500/10 rounded-xl">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white">
                  Confirmar Exclusão
                </h3>
                <p className="text-xs text-slate-400">
                  {deleteConfirm.type === "veiculo"
                    ? "Excluir Veículo"
                    : deleteConfirm.type === "servico"
                    ? "Excluir Histórico de Oficina"
                    : "Excluir Manutenção Agendada"}
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl space-y-1 text-xs">
              <p className="font-semibold text-white truncate">
                {deleteConfirm.title}
              </p>
              {deleteConfirm.subtitle && (
                <p className="text-slate-400 text-[11px]">
                  {deleteConfirm.subtitle}
                </p>
              )}
            </div>

            <p className="text-xs text-slate-300">
              Tem certeza que deseja excluir este registro? Esta ação marcará o registro como excluído na planilha.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                disabled={isDeleting}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!deleteConfirm) return;
                  setIsDeleting(true);
                  try {
                    if (deleteConfirm.type === "veiculo") {
                      await onDeleteVeiculo(deleteConfirm.id);
                    } else if (deleteConfirm.type === "servico") {
                      await onDeleteServico(deleteConfirm.id);
                    } else if (deleteConfirm.type === "manutencao") {
                      await onDeleteManutencao(deleteConfirm.id);
                    }
                    setDeleteConfirm(null);
                  } catch (err) {
                    console.error("Erro ao excluir registro:", err);
                  } finally {
                    setIsDeleting(false);
                  }
                }}
                disabled={isDeleting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 shadow-lg shadow-rose-950/40"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isDeleting ? "Excluindo..." : "Confirmar Exclusão"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Cadastro Veículo */}
      {isVeiculoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-base text-white">
                {editingVeiculo ? "Editar Veículo" : "Cadastrar Novo Veículo"}
              </h3>
              <button onClick={() => setIsVeiculoModalOpen(false)}>
                <X className="w-5 h-5 text-slate-400 hover:text-white" />
              </button>
            </div>

            <form onSubmit={handleSaveVeiculoSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Marca</label>
                  <input
                    type="text"
                    required
                    value={veiculoForm.Marca}
                    onChange={(e) => setVeiculoForm({ ...veiculoForm, Marca: e.target.value.toUpperCase() })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white uppercase"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Modelo</label>
                  <input
                    type="text"
                    required
                    value={veiculoForm.Modelo}
                    onChange={(e) => setVeiculoForm({ ...veiculoForm, Modelo: e.target.value.toUpperCase() })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Placa</label>
                  <input
                    type="text"
                    required
                    value={veiculoForm.Placa}
                    onChange={(e) => setVeiculoForm({ ...veiculoForm, Placa: e.target.value.toUpperCase() })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Ano Modelo</label>
                  <input
                    type="number"
                    value={veiculoForm.Ano}
                    onChange={(e) => setVeiculoForm({ ...veiculoForm, Ano: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">KM Atual</label>
                  <input
                    type="number"
                    value={veiculoForm.Km_Atual}
                    onChange={(e) => setVeiculoForm({ ...veiculoForm, Km_Atual: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Motorista</label>
                  <input
                    type="text"
                    value={veiculoForm.Motorista}
                    onChange={(e) => setVeiculoForm({ ...veiculoForm, Motorista: e.target.value.toUpperCase() })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white uppercase"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Combustível</label>
                  <select
                    value={veiculoForm.Combustível}
                    onChange={(e) => setVeiculoForm({ ...veiculoForm, Combustível: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white"
                  >
                    <option value="Flex">Flex</option>
                    <option value="Gasolina">Gasolina</option>
                    <option value="Etanol">Etanol</option>
                    <option value="Diesel">Diesel</option>
                    <option value="Elétrico">Elétrico</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsVeiculoModalOpen(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl"
                >
                  Salvar Veículo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Oficina */}
      {isServicoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-base text-white">Registrar Serviço de Oficina</h3>
              <button onClick={() => setIsServicoModalOpen(false)}>
                <X className="w-5 h-5 text-slate-400 hover:text-white" />
              </button>
            </div>

            <form onSubmit={handleSaveServicoSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Data</label>
                  <input
                    type="date"
                    required
                    value={servicoForm.Data}
                    onChange={(e) => setServicoForm({ ...servicoForm, Data: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Veículo</label>
                  <select
                    value={servicoForm.Veiculo}
                    onChange={(e) => setServicoForm({ ...servicoForm, Veiculo: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white"
                  >
                    {veiculos.map((v) => (
                      <option key={v.Id} value={v.Modelo}>
                        {v.Modelo} ({v.Placa})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Descrição do Serviço</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Troca de pastilhas de freio e alinhamento"
                  value={servicoForm.Descrição}
                  onChange={(e) => setServicoForm({ ...servicoForm, Descrição: e.target.value.toUpperCase() })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white uppercase"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">KM no Serviço</label>
                  <input
                    type="number"
                    value={servicoForm.KM}
                    onChange={(e) => setServicoForm({ ...servicoForm, KM: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Valor Pago (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={servicoForm.Valor_Pago}
                    onChange={(e) => setServicoForm({ ...servicoForm, Valor_Pago: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white font-bold"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Oficina Nome</label>
                  <input
                    type="text"
                    placeholder="Oficina Bosch"
                    value={servicoForm.Oficina_Nome}
                    onChange={(e) => setServicoForm({ ...servicoForm, Oficina_Nome: e.target.value.toUpperCase() })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white uppercase"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsServicoModalOpen(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl"
                >
                  Salvar Serviço
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Manutenção Agendada */}
      {isManutencaoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-base text-white">Agendar Manutenção Futura</h3>
              <button onClick={() => setIsManutencaoModalOpen(false)}>
                <X className="w-5 h-5 text-slate-400 hover:text-white" />
              </button>
            </div>

            <form onSubmit={handleSaveManutencaoSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Veículo</label>
                  <select
                    value={manutencaoForm.Veículo}
                    onChange={(e) => setManutencaoForm({ ...manutencaoForm, Veículo: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white"
                  >
                    {veiculos.map((v) => (
                      <option key={v.Id} value={v.Modelo}>
                        {v.Modelo} ({v.Placa})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Descrição</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Troca de Correia Dentada"
                    value={manutencaoForm.Descrição}
                    onChange={(e) => setManutencaoForm({ ...manutencaoForm, Descrição: e.target.value.toUpperCase() })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Data Alvo</label>
                  <input
                    type="date"
                    value={manutencaoForm.Data_Alvo}
                    onChange={(e) => setManutencaoForm({ ...manutencaoForm, Data_Alvo: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">KM Alvo</label>
                  <input
                    type="number"
                    value={manutencaoForm.KM_Alvo}
                    onChange={(e) => setManutencaoForm({ ...manutencaoForm, KM_Alvo: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsManutencaoModalOpen(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl"
                >
                  Salvar Agendamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
