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
  ChevronDown,
  ChevronUp,
  FileText,
  CheckCircle2,
  Volume2,
  VolumeX,
  Gauge,
  Check,
  Sparkles,
  RefreshCw,
  AlertOctagon,
} from "lucide-react";
import { Veiculo, ServicoOficina, ManutencaoAgendada, Infracao } from "../types";
import { generateNewId } from "../services/api";
import { parseCurrency, formatCurrency, formatCurrencyInput } from "../utils/formatters";
import { markCycleAsCompleted } from "../services/snoozeService";
import { ComboBox } from "./ComboBox";
import { VoiceInput } from "./VoiceInput";
import { VoiceTextArea } from "./VoiceTextArea";

const TEMPLATES_MANUTENCAO = [
  {
    label: "🚗 Calibrar Pneus",
    desc: "Calibrar Pneus",
    tipo: "Dias" as const,
    intervalo: 7,
    freqKm: 0,
    obs: "Verificar pressão a frio (ex: 32 psi dianteiros / 30 psi traseiros)",
  },
  {
    label: "🛢️ Troca de Óleo & Filtros",
    desc: "Troca de Óleo e Filtros",
    tipo: "Ambos" as const,
    intervalo: 180,
    freqKm: 10000,
    obs: "Óleo 5W30 Sintético + Filtros novos (óleo, ar e combustível)",
  },
  {
    label: "🔄 Rodízio de Pneus",
    desc: "Rodízio e Balanceamento",
    tipo: "KM" as const,
    intervalo: 0,
    freqKm: 10000,
    obs: "Inverter pneus dianteiros/traseiros e checar balanceamento",
  },
  {
    label: "🛑 Pastilhas de Freio",
    desc: "Checagem de Pastilhas e Freios",
    tipo: "Ambos" as const,
    intervalo: 365,
    freqKm: 20000,
    obs: "Verificar espessura das pastilhas e nível do fluido DOT4",
  },
  {
    label: "💨 Filtro do Ar-Condicionado",
    desc: "Troca do Filtro de Cabine e Higienização",
    tipo: "Dias" as const,
    intervalo: 180,
    freqKm: 0,
    obs: "Higienização interna e troca do elemento filtrante",
  },
  {
    label: "🔍 Revisão Geral Preventiva",
    desc: "Revisão Geral Preventiva",
    tipo: "Ambos" as const,
    intervalo: 365,
    freqKm: 10000,
    obs: "Suspensão, arrefecimento, velas, correias e freios",
  },
];

type PeriodFilterType = "ALL" | "CURRENT_MONTH" | "LAST_MONTH" | "CUSTOM";

interface Props {
  veiculos: Veiculo[];
  servicos: ServicoOficina[];
  manutencoes: ManutencaoAgendada[];
  infracoes?: Infracao[];
  onSaveVeiculo: (veiculo: Veiculo) => Promise<void>;
  onSaveServico: (servico: ServicoOficina) => Promise<void>;
  onSaveManutencao: (manutencao: ManutencaoAgendada) => Promise<void>;
  onSaveInfracao?: (infracao: Infracao) => Promise<void>;
  onDeleteVeiculo: (id: string) => Promise<void>;
  onDeleteServico: (id: string) => Promise<void>;
  onDeleteManutencao: (id: string) => Promise<void>;
  onDeleteInfracao?: (id: string) => Promise<void>;
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

function getDiffInDaysFromToday(dateStr?: string | null): number | null {
  if (!dateStr) return null;
  const d = parseDateSafely(dateStr);
  if (!d) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return Math.round((today.getTime() - d.getTime()) / (1000 * 3600 * 24));
}

function getCurrentTimeHHMM(): string {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

export const VeiculosOficinaView: React.FC<Props> = ({
  veiculos,
  servicos,
  manutencoes,
  infracoes = [],
  onSaveVeiculo,
  onSaveServico,
  onSaveManutencao,
  onSaveInfracao,
  onDeleteVeiculo,
  onDeleteServico,
  onDeleteManutencao,
  onDeleteInfracao,
}) => {
  const [activeTab, setActiveTab] = useState<"veiculos" | "oficina" | "agendadas" | "infracoes">("veiculos");
  const [expandedServicoId, setExpandedServicoId] = useState<string | null>(null);
  const [expandedManutencaoId, setExpandedManutencaoId] = useState<string | null>(null);

  // Filter and Search States
  const [periodFilter, setPeriodFilter] = useState<PeriodFilterType>("CURRENT_MONTH");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Delete Confirmation State
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    type: "veiculo" | "servico" | "manutencao" | "infracao";
    id: string;
    title: string;
    subtitle?: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Infracao Modal State
  const [isInfracaoModalOpen, setIsInfracaoModalOpen] = useState(false);
  const [editingInfracao, setEditingInfracao] = useState<Infracao | null>(null);
  const [infracaoForm, setInfracaoForm] = useState<Partial<Infracao>>({
    Protocolo: "MULT-2026-098",
    Auto_Infracao: "AIT-000000000",
    Título: "Excesso de Velocidade até 20%",
    Veículo: veiculos[0]?.Modelo || "Polo TSI",
    Placa: veiculos[0]?.Placa || "GAE-2026",
    Data: new Date().toISOString().split("T")[0],
    Hora_Infracao: "14:30",
    Descrição: "Transitar em velocidade superior à máxima permitida em até 20%",
    Valor: 130.16,
    Pontos: 4,
    Status: "EM_ANALISE",
    Localização: "Av. Paulista, 1000 - SP",
    Observação: "Aguardando prazo para recurso",
    Condutor: "",
    Orgao_Autuador: "",
    Orgao_Competente: "",
    Data_Notificacao_Penalidade: "",
    Data_Termino_Defesa: "",
    Data_Termino_Recurso: "",
    Data_Vencimento_Desconto: "",
    Numero_Renainf: "",
    Codigo_Infracao: "",
    Latitude: undefined,
    Longitude: undefined,
    Data_Notificacao_Autuacao: "",
    Data_Limite_Identificacao_Condutor: "",
    Status_Pagamento: "PENDENTE",
  });

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
  const [servicoKmDisplay, setServicoKmDisplay] = useState<string>("");
  const [servicoValorDisplay, setServicoValorDisplay] = useState<string>("");
  const [servicoValorPagoDisplay, setServicoValorPagoDisplay] = useState<string>("");
  const [servicoForm, setServicoForm] = useState<Partial<ServicoOficina>>({
    Data: new Date().toISOString().split("T")[0],
    Descrição: "",
    KM: 0,
    Valor: 0,
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
    Descrição: "Calibrar Pneus",
    Tipo_Agendamento: "Dias",
    Intervalo_Dias: 7,
    Data_Ultima_Realizacao: new Date().toISOString().split("T")[0],
    KM_Ultima_Realizacao: veiculos[0]?.Km_Atual || 0,
    Data_Alvo: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().split("T")[0],
    KM_Alvo: (veiculos[0]?.Km_Atual || 25000) + 10000,
    Recorrente: "SIM",
    Frequência_Meses: 12,
    Frequência_KM: 10000,
    Horario_Alerta: "08:00",
    Som_Alarme: true,
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
      .filter((m) => {
        // Se for lembrete recorrente por intervalo ou KM, sempre mantém visível no filtro Mês Atual ou Todos
        if (
          m.Intervalo_Dias ||
          m.Tipo_Agendamento === "Dias" ||
          m.Tipo_Agendamento === "KM" ||
          m.Tipo_Agendamento === "Ambos"
        ) {
          if (periodFilter === "ALL" || periodFilter === "CURRENT_MONTH") return true;
        }
        return isDateInPeriod(m.Data_Alvo || m.Data_Ultima_Realizacao);
      })
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

  // Lista dinâmica de sugestões de serviços e oficinas
  const servicosDisponiveis = useMemo(() => {
    const defaults = [
      "CALIBRAR PNEUS",
      "TROCA DE ÓLEO E FILTRO",
      "ALINHAMENTO E BALANCEAMENTO",
      "RODÍZIO DE PNEUS",
      "PASTILHAS DE FREIO",
      "DISCOS DE FREIO",
      "TROCA DE CORREIA DENTADA",
      "TROCA DE BATERIA",
      "SUSPENSÃO E AMORTECEDORES",
      "VELAS E CABOS DE IGNIÇÃO",
      "FILTRO DE AR E CABINE",
      "REVISÃO PREVENTIVA GERAL",
      "TROCA DE PNEUS",
      "EMBREAGEM",
    ];
    const fromExisting = servicos
      .map((s) => s.Descrição?.trim().toUpperCase())
      .filter(Boolean) as string[];
    const fromManut = manutencoes
      .map((m) => m.Descrição?.trim().toUpperCase())
      .filter(Boolean) as string[];
    return Array.from(new Set([...defaults, ...fromExisting, ...fromManut]));
  }, [servicos, manutencoes]);

  const oficinasDisponiveis = useMemo(() => {
    const fromExisting = servicos
      .map((s) => s.Oficina_Nome?.trim().toUpperCase())
      .filter(Boolean) as string[];
    return Array.from(new Set(fromExisting));
  }, [servicos]);

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

  const handleSaveVeiculoSubmit = (e: React.FormEvent) => {
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
    setIsVeiculoModalOpen(false);
    onSaveVeiculo(item);
  };

  // Open Oficina Modal
  const handleOpenServico = (s?: ServicoOficina) => {
    if (s) {
      setEditingServico(s);
      setServicoForm({ ...s });
      setServicoKmDisplay(s.KM && s.KM > 0 ? String(s.KM) : "");
      const val = s.Valor !== undefined && s.Valor !== null ? s.Valor : (s.Valor_A_PG || s.Valor_Pago || 0);
      setServicoValorDisplay(val > 0 ? formatCurrency(val) : "");
      const valPago = s.Valor_Pago ?? 0;
      setServicoValorPagoDisplay(valPago > 0 ? formatCurrency(valPago) : "");
    } else {
      setEditingServico(null);
      const defaultVeic = veiculos[0];
      const defaultKm = defaultVeic?.Km_Atual || 0;
      setServicoForm({
        Data: new Date().toISOString().split("T")[0],
        Descrição: "",
        KM: defaultKm,
        Valor: 0,
        Valor_A_PG: 0,
        Valor_Pago: 0,
        Oficina_Nome: "",
        Comprovante_Url: "",
        Observações: "",
        Veiculo: defaultVeic?.Modelo || "CARRO",
      });
      setServicoKmDisplay(defaultKm > 0 ? String(defaultKm) : "");
      setServicoValorDisplay("");
      setServicoValorPagoDisplay("");
    }
    setIsServicoModalOpen(true);
  };

  const handleSaveServicoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const kmNum = servicoKmDisplay ? parseInt(servicoKmDisplay.replace(/\D/g, ""), 10) || 0 : (parseCurrency(servicoForm.KM) || 0);
    const valorNum = parseCurrency(servicoValorDisplay) || parseCurrency(servicoForm.Valor) || 0;
    const valorPagoNum = parseCurrency(servicoValorPagoDisplay) || parseCurrency(servicoForm.Valor_Pago) || 0;

    const item: ServicoOficina = {
      Id: editingServico?.Id || generateNewId("OFI"),
      Data: servicoForm.Data || new Date().toISOString().split("T")[0],
      Descrição: servicoForm.Descrição || "Serviço de Oficina",
      KM: kmNum,
      Valor: valorNum,
      Valor_A_PG: valorNum,
      Valor_Pago: valorPagoNum,
      Oficina_Nome: servicoForm.Oficina_Nome || "",
      Comprovante_Url: servicoForm.Comprovante_Url || "",
      Observações: servicoForm.Observações || "",
      Veiculo: servicoForm.Veiculo || veiculos[0]?.Modelo || "CARRO",
    };
    setIsServicoModalOpen(false);
    onSaveServico(item);
  };

  // Open Manutenção Modal
  const handleOpenManutencao = (m?: ManutencaoAgendada) => {
    if (m) {
      setEditingManutencao(m);
      setManutencaoForm({
        ...m,
        Tipo_Agendamento: m.Tipo_Agendamento || (m.Intervalo_Dias ? "Dias" : "Ambos"),
        Intervalo_Dias: m.Intervalo_Dias || 7,
        Som_Alarme: m.Som_Alarme !== "NAO" && m.Som_Alarme !== false,
      });
    } else {
      setEditingManutencao(null);
      const defaultVeic = veiculos[0];
      const todayStr = new Date().toISOString().split("T")[0];
      setManutencaoForm({
        Veículo: defaultVeic?.Modelo || "CARRO",
        Descrição: "Calibrar Pneus",
        Tipo_Agendamento: "Dias",
        Intervalo_Dias: 7,
        Data_Ultima_Realizacao: todayStr,
        KM_Ultima_Realizacao: defaultVeic?.Km_Atual || 0,
        Data_Alvo: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().split("T")[0],
        KM_Alvo: (parseCurrency(defaultVeic?.Km_Atual) || 25000) + 10000,
        Recorrente: "SIM",
        Frequência_Meses: 12,
        Frequência_KM: 10000,
        Horario_Alerta: "08:00",
        Som_Alarme: true,
        Status: "PENDENTE",
        Prioridade: "Média",
        Oficina_Nome: "",
        Observações: "Verificar calibragem a frio (32 psi dianteiros / 30 psi traseiros)",
      });
    }
    setIsManutencaoModalOpen(true);
  };

  const handleApplyTemplate = (tmpl: typeof TEMPLATES_MANUTENCAO[0]) => {
    const defaultVeic = veiculos.find((v) => v.Modelo === manutencaoForm.Veículo) || veiculos[0];
    const currentKm = defaultVeic?.Km_Atual || 0;
    const today = new Date();
    const nextDate = tmpl.intervalo > 0
      ? new Date(today.getTime() + tmpl.intervalo * 24 * 3600 * 1000).toISOString().split("T")[0]
      : manutencaoForm.Data_Alvo;

    setManutencaoForm((prev) => ({
      ...prev,
      Descrição: tmpl.desc,
      Tipo_Agendamento: tmpl.tipo,
      Intervalo_Dias: tmpl.intervalo > 0 ? tmpl.intervalo : undefined,
      Frequência_KM: tmpl.freqKm > 0 ? tmpl.freqKm : undefined,
      KM_Alvo: tmpl.freqKm > 0 ? currentKm + tmpl.freqKm : prev.KM_Alvo,
      Data_Alvo: nextDate,
      Data_Ultima_Realizacao: today.toISOString().split("T")[0],
      KM_Ultima_Realizacao: currentKm,
      Observações: tmpl.obs,
      Som_Alarme: true,
    }));
  };

  const handleSaveManutencaoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const item: ManutencaoAgendada = {
      Id: editingManutencao?.Id || generateNewId("MANUT"),
      Veículo: manutencaoForm.Veículo || veiculos[0]?.Modelo || "CARRO",
      Descrição: manutencaoForm.Descrição || "Manutenção Agendada",
      Tipo_Agendamento: manutencaoForm.Tipo_Agendamento || "Dias",
      Data_Alvo: manutencaoForm.Data_Alvo || "",
      KM_Alvo: parseCurrency(manutencaoForm.KM_Alvo),
      Recorrente: manutencaoForm.Recorrente || "SIM",
      Frequência_Meses: parseCurrency(manutencaoForm.Frequência_Meses) || 12,
      Frequência_KM: parseCurrency(manutencaoForm.Frequência_KM),
      Intervalo_Dias: parseCurrency(manutencaoForm.Intervalo_Dias),
      Data_Ultima_Realizacao: manutencaoForm.Data_Ultima_Realizacao || new Date().toISOString().split("T")[0],
      KM_Ultima_Realizacao: parseCurrency(manutencaoForm.KM_Ultima_Realizacao),
      Horario_Alerta: manutencaoForm.Horario_Alerta || "08:00",
      Som_Alarme: manutencaoForm.Som_Alarme ? "SIM" : "NAO",
      Status: manutencaoForm.Status || "PENDENTE",
      Prioridade: manutencaoForm.Prioridade || "Média",
      Oficina_Nome: manutencaoForm.Oficina_Nome || "",
      Observações: manutencaoForm.Observações || "",
    };
    setIsManutencaoModalOpen(false);
    onSaveManutencao(item);
  };

  const handleOpenInfracao = (inf?: Infracao) => {
    if (inf) {
      setEditingInfracao(inf);
      setInfracaoForm({ ...inf });
    } else {
      const now = new Date();
      const horaAtual = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

      setEditingInfracao(null);
      setInfracaoForm({
        Protocolo: "",
        Auto_Infracao: "",
        Título: "",
        Veículo: "",
        Placa: "",
        Data: new Date().toISOString().split("T")[0],
        Hora_Infracao: horaAtual,
        Descrição: "",
        Valor: 0,
        Pontos: 0,
        Status: "EM_ANALISE",
        Localização: "",
        Observação: "",
        Condutor: "",
        Orgao_Autuador: "",
        Orgao_Competente: "",
        Data_Notificacao_Penalidade: "",
        Data_Termino_Defesa: "",
        Data_Termino_Recurso: "",
        Data_Vencimento_Desconto: "",
        Numero_Renainf: "",
        Codigo_Infracao: "",
        Latitude: undefined,
        Longitude: undefined,
        Data_Notificacao_Autuacao: "",
        Data_Limite_Identificacao_Condutor: "",
        Status_Pagamento: "PENDENTE",
      });
    }
    setIsInfracaoModalOpen(true);
  };

  const handleSaveInfracaoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onSaveInfracao) return;
    const isNew = !editingInfracao;
    const todayStr = new Date().toISOString().split("T")[0];
    const timeStr = getCurrentTimeHHMM();

    const selectedVeic = veiculos.find((v) => v.Modelo === infracaoForm.Veículo || v.Placa === infracaoForm.Placa);

    const item: Infracao = {
      Id: editingInfracao?.Id || generateNewId("MULTA"),
      Protocolo: infracaoForm.Protocolo || "",
      Auto_Infracao: infracaoForm.Auto_Infracao || "",
      Título: infracaoForm.Título || "Infração de Trânsito",
      Veículo: infracaoForm.Veículo || "Veículo",
      Placa: selectedVeic?.Placa || infracaoForm.Placa || "",
      Data: infracaoForm.Data || todayStr,
      Hora_Infracao: infracaoForm.Hora_Infracao || "",
      Descrição: infracaoForm.Descrição || infracaoForm.Título || "",
      Valor: parseCurrency(infracaoForm.Valor),
      Pontos: parseCurrency(infracaoForm.Pontos),
      Status: infracaoForm.Status || "EM_ANALISE",
      Localização: infracaoForm.Localização || "",
      Observação: infracaoForm.Observação || "",
      Data_Cadastro: isNew ? todayStr : (editingInfracao?.Data_Cadastro || todayStr),
      Hora_Cadastro: isNew ? timeStr : (editingInfracao?.Hora_Cadastro || timeStr),
      Condutor: infracaoForm.Condutor || "",
      Orgao_Autuador: infracaoForm.Orgao_Autuador || "",
      Orgao_Competente: infracaoForm.Orgao_Competente || "",
      Data_Notificacao_Penalidade: infracaoForm.Data_Notificacao_Penalidade || "",
      Data_Termino_Defesa: infracaoForm.Data_Termino_Defesa || "",
      Data_Termino_Recurso: infracaoForm.Data_Termino_Recurso || "",
      Data_Vencimento_Desconto: infracaoForm.Data_Vencimento_Desconto || "",
      Numero_Renainf: infracaoForm.Numero_Renainf || "",
      Codigo_Infracao: infracaoForm.Codigo_Infracao || "",
      Latitude: infracaoForm.Latitude !== undefined && infracaoForm.Latitude !== null ? Number(infracaoForm.Latitude) : 0,
      Longitude: infracaoForm.Longitude !== undefined && infracaoForm.Longitude !== null ? Number(infracaoForm.Longitude) : 0,
      Data_Notificacao_Autuacao: infracaoForm.Data_Notificacao_Autuacao || "",
      Data_Limite_Identificacao_Condutor: infracaoForm.Data_Limite_Identificacao_Condutor || "",
      Status_Pagamento: infracaoForm.Status_Pagamento || "PENDENTE",
    };
    setIsInfracaoModalOpen(false);
    onSaveInfracao(item);
  };

  // Realizar / Concluir Manutenção Hoje e Avançar Ciclo
  const handleCompleteManutencaoToday = (m: ManutencaoAgendada) => {
    const todayStr = new Date().toISOString().split("T")[0];
    const relatedVeic = veiculos.find(
      (v) => v.Modelo === m.Veículo || v.Placa === m.Veículo || v.Id === m.Veículo
    );
    const currentKm = relatedVeic?.Km_Atual || 0;

    // Registra no histórico de ciclos concluídos
    markCycleAsCompleted(`manutencao_intervalo_${m.Id}_${todayStr}`);
    markCycleAsCompleted(`manutencao_${m.Id}_hoje_${todayStr}`);
    markCycleAsCompleted(`manutencao_km_${m.Id}`);
    markCycleAsCompleted(`manutencao_freq_km_${m.Id}`);

    const intervaloDias = m.Intervalo_Dias ? Number(m.Intervalo_Dias) : 0;
    const freqKm = m.Frequência_KM ? Number(m.Frequência_KM) : 0;

    if (intervaloDias > 0 || freqKm > 0 || m.Tipo_Agendamento === "Ambos" || m.Recorrente === "SIM") {
      const nextDate = intervaloDias > 0
        ? new Date(Date.now() + intervaloDias * 24 * 3600 * 1000).toISOString().split("T")[0]
        : m.Data_Alvo;
      const nextKm = freqKm > 0 ? currentKm + freqKm : m.KM_Alvo;

      onSaveManutencao({
        ...m,
        Data_Ultima_Realizacao: todayStr,
        KM_Ultima_Realizacao: currentKm,
        Data_Alvo: nextDate,
        KM_Alvo: nextKm,
        Status: "PENDENTE",
      });
    } else {
      // Pontual
      onSaveManutencao({
        ...m,
        Data_Ultima_Realizacao: todayStr,
        KM_Ultima_Realizacao: currentKm,
        Status: m.Status === "CONCLUÍDO" || m.Status === "Concluída" ? "PENDENTE" : "CONCLUÍDO",
      });
    }
  };

  // Check upcoming maintenance alerts (Date <= 7 days or past, OR KM >= target - 500)
  const nowTime = new Date().getTime();
  const alertManutencoes = manutencoes.filter((m) => {
    if (m.Status === "CONCLUÍDO" || m.Status === "Concluída") return false;
    let isAlert = false;

    // Intervalo de dias
    if (m.Intervalo_Dias && m.Intervalo_Dias > 0 && m.Data_Ultima_Realizacao) {
      const diff = getDiffInDaysFromToday(m.Data_Ultima_Realizacao);
      if (diff !== null && Math.abs(diff) >= m.Intervalo_Dias) {
        return true;
      }
    }

    if (m.Data_Alvo) {
      const targetTime = new Date(m.Data_Alvo).getTime();
      const diffDays = (targetTime - nowTime) / (1000 * 3600 * 24);
      if (diffDays <= 3) isAlert = true;
    }

    if (m.KM_Alvo && m.KM_Alvo > 0) {
      const relatedVeic = veiculos.find(
        (v) => v.Modelo === m.Veículo || v.Descrição === m.Veículo || v.Placa === m.Veículo
      );
      const currentKm = relatedVeic?.Km_Atual || 0;
      if (currentKm >= m.KM_Alvo - 500) isAlert = true;
    }

    return isAlert;
  });

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-slate-800 text-slate-300 border border-slate-700/60 shrink-0">
              <Car className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Veículos & Oficina
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Controle de frota, histórico de serviços e plano preventivo de revisões.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="grid grid-cols-2 sm:grid-cols-4 sm:flex sm:items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 w-full sm:w-auto">
          <button
            onClick={() => setActiveTab("veiculos")}
            className={`px-3 py-2 sm:py-1.5 rounded-lg text-xs font-semibold transition-all text-center ${
              activeTab === "veiculos"
                ? "bg-slate-800 text-white border border-slate-700/80 shadow-xs"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Veículos ({filteredVeiculos.length})
          </button>
          <button
            onClick={() => setActiveTab("oficina")}
            className={`px-3 py-2 sm:py-1.5 rounded-lg text-xs font-semibold transition-all text-center ${
              activeTab === "oficina"
                ? "bg-slate-800 text-white border border-slate-700/80 shadow-xs"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Oficina ({filteredServicos.length})
          </button>
          <button
            onClick={() => setActiveTab("agendadas")}
            className={`px-3 py-2 sm:py-1.5 rounded-lg text-xs font-semibold transition-all text-center relative ${
              activeTab === "agendadas"
                ? "bg-slate-800 text-white border border-slate-700/80 shadow-xs"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Agendadas ({filteredManutencoes.length})
            {alertManutencoes.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.2 bg-amber-500 text-slate-950 font-bold rounded-full text-[10px]">
                {alertManutencoes.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("infracoes")}
            className={`px-3 py-2 sm:py-1.5 rounded-lg text-xs font-semibold transition-all text-center ${
              activeTab === "infracoes"
                ? "bg-slate-800 text-white border border-slate-700/80 shadow-xs"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Infrações ({infracoes.length})
          </button>
        </div>
      </div>

      {/* Maintenance Notification Banner */}
      {alertManutencoes.length > 0 && (
        <div className="p-4 bg-slate-900 border border-amber-500/30 rounded-2xl flex items-start gap-3">
          <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0 mt-0.5">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="space-y-1 text-xs">
            <h4 className="font-bold text-amber-300">
              {alertManutencoes.length} Manutenção(ões) Próxima(s) do Vencimento ou KM Alvo
            </h4>
            <ul className="list-disc list-inside text-slate-300 space-y-0.5">
              {alertManutencoes.map((m, idx) => (
                <li key={`${m.Id || 'manut-alert'}-${idx}`}>
                  <strong className="text-white">{m.Veículo}</strong>: {m.Descrição} —{" "}
                  {m.Data_Alvo && `Data Alvo: ${m.Data_Alvo}`}
                  {m.KM_Alvo && ` | KM Alvo: ${m.KM_Alvo.toLocaleString()} KM`}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none z-10" />
            <VoiceInput
              type="text"
              placeholder={
                activeTab === "veiculos"
                  ? "Buscar por marca, modelo, placa ou motorista..."
                  : activeTab === "oficina"
                  ? "Buscar por serviço, veículo ou oficina..."
                  : activeTab === "agendadas"
                  ? "Buscar por manutenção, veículo ou oficina..."
                  : "Buscar por infração, veículo ou placa..."
              }
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-9 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-slate-600 transition-colors"
            />
          </div>

          {/* Period Selector */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              <select
                value={periodFilter}
                onChange={(e) => setPeriodFilter(e.target.value as PeriodFilterType)}
                className="bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-8 py-2 text-xs text-white focus:outline-none focus:border-slate-600 cursor-pointer appearance-none"
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
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-slate-600"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-[11px] text-slate-400">Data Final:</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-slate-600"
              />
            </div>
          </div>
        )}
      </div>

      {/* 1. VEÍCULOS TAB */}
      {activeTab === "veiculos" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center px-1">
            <span className="text-xs text-slate-400">
              Veículos cadastrados ({filteredVeiculos.length})
            </span>
            <button
              onClick={() => handleOpenVeiculo()}
              className="flex items-center gap-2 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-xl transition-colors shadow-xs cursor-pointer"
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
                  className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-3 relative hover:border-slate-700/80 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-slate-800 text-slate-300 border border-slate-700/60 shrink-0">
                        <Car className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-base leading-tight">
                          {v.Marca} {v.Modelo}
                        </h3>
                        <p className="text-xs text-slate-400 font-mono mt-0.5">
                          Placa: <strong className="text-slate-200">{v.Placa || "—"}</strong> • Ano: {v.Ano}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenVeiculo(v)}
                        className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
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
                        className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
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
                      <span className="font-bold text-white font-mono">{v.Km_Atual} KM</span>
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

      {/* 2. OFICINA (HISTÓRICO) TAB - Compact 2-Line Pattern with Expandable Drawer */}
      {activeTab === "oficina" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center px-1">
            <span className="text-xs text-slate-400">
              Histórico de manutenções e reparos ({filteredServicos.length})
            </span>
            <button
              onClick={() => handleOpenServico()}
              className="flex items-center gap-2 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-xl transition-colors shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Registrar Serviço</span>
            </button>
          </div>

          {filteredServicos.length === 0 ? (
            <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl text-slate-500 text-xs">
              Nenhum serviço de oficina encontrado no período selecionado.
            </div>
          ) : (
            <div className="space-y-2">
              {filteredServicos.map((s, idx) => {
                const sId = String(s.Id || `serv-${idx}`);
                const isExpanded = expandedServicoId === sId;
                const valor = parseCurrency(s.Valor_Pago) || parseCurrency(s.Valor_A_PG);

                return (
                  <div
                    key={sId}
                    className="bg-slate-900 border border-slate-800 hover:border-slate-700/80 rounded-2xl transition-colors overflow-hidden"
                  >
                    {/* Linha Principal Compacta (2 Linhas) */}
                    <div
                      onClick={() => setExpandedServicoId(isExpanded ? null : sId)}
                      className="p-3.5 sm:p-4 flex items-center justify-between gap-3 cursor-pointer select-none"
                    >
                      {/* Lado Esquerdo: Ícone Neutro + Linha 1 (Serviço + Veículo) + Linha 2 (Data, KM, Oficina) */}
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="p-2 sm:p-2.5 rounded-xl bg-slate-800 text-slate-300 border border-slate-700/60 shrink-0">
                          <Wrench className="w-4 h-4" />
                        </div>

                        <div className="min-w-0 space-y-0.5 flex-1">
                          {/* Linha 1: Título do Serviço + Badge de Veículo */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-white text-xs sm:text-sm tracking-tight truncate max-w-[180px] sm:max-w-md">
                              {s.Descrição}
                            </span>
                            {s.Veiculo && (
                              <span className="px-1.5 py-0.5 rounded-md bg-slate-800 text-[10px] font-medium text-slate-300 border border-slate-700/70 truncate max-w-[120px]">
                                {s.Veiculo}
                              </span>
                            )}
                          </div>

                          {/* Linha 2: Data • KM • Oficina */}
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 truncate flex-wrap">
                            <span>{s.Data}</span>
                            {s.KM > 0 && (
                              <>
                                <span>•</span>
                                <span className="font-mono text-slate-300">{s.KM.toLocaleString()} KM</span>
                              </>
                            )}
                            {s.Oficina_Nome && (
                              <>
                                <span>•</span>
                                <span className="text-slate-300 truncate max-w-[140px]">{s.Oficina_Nome}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Lado Direito: Valor Total + Ações / Chevron */}
                      <div className="flex items-center gap-2.5 shrink-0">
                        {/* Ponto indicador de despesa */}
                        <span
                          className="w-2 h-2 rounded-full shrink-0 bg-rose-400 shadow-xs shadow-rose-400/50"
                          title="Despesa de Oficina"
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
                            <span className="text-[10px] text-slate-500 block">Veículo</span>
                            <span className="font-semibold text-slate-200 truncate block">{s.Veiculo}</span>
                          </div>
                          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-0.5">
                            <span className="text-[10px] text-slate-500 block">Oficina / Estabelecimento</span>
                            <span className="font-semibold text-slate-200 truncate block">{s.Oficina_Nome || "Não informada"}</span>
                          </div>
                          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-0.5">
                            <span className="text-[10px] text-slate-500 block">Quilometragem</span>
                            <span className="font-semibold text-white font-mono">{s.KM ? `${s.KM.toLocaleString()} KM` : "—"}</span>
                          </div>
                          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-0.5">
                            <span className="text-[10px] text-slate-500 block">Valor Orçado vs Pago</span>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-semibold text-slate-300">
                                {s.Valor !== undefined && s.Valor !== null && s.Valor > 0
                                  ? `R$ ${formatCurrency(s.Valor)}`
                                  : s.Valor_A_PG
                                  ? `R$ ${formatCurrency(s.Valor_A_PG)}`
                                  : "—"}
                              </span>
                              <span className="text-slate-500">→</span>
                              <span className="font-bold text-emerald-400">
                                R$ {formatCurrency(s.Valor_Pago || 0)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {s.Observações && (
                          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                            <span className="text-[10px] text-slate-500 block font-medium">Observações</span>
                            <p className="text-slate-300 text-[11px] italic">"{s.Observações}"</p>
                          </div>
                        )}

                        {/* Ações da Gaveta */}
                        <div className="flex items-center justify-between gap-3 pt-1 flex-wrap">
                          <div>
                            {s.Comprovante_Url && (
                              <a
                                href={s.Comprovante_Url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 text-xs font-medium transition-colors"
                              >
                                <FileText className="w-3.5 h-3.5 text-slate-400" />
                                <span>Abrir Nota / Comprovante</span>
                              </a>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleOpenServico(s)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 text-xs font-medium transition-colors cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              <span>Editar</span>
                            </button>
                            <button
                              onClick={() =>
                                setDeleteConfirm({
                                  isOpen: true,
                                  type: "servico",
                                  id: s.Id,
                                  title: s.Descrição,
                                  subtitle: `Veículo: ${s.Veiculo} • Data: ${s.Data} • Valor: R$ ${formatCurrency(valor)}`,
                                })
                              }
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-medium transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Excluir</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 3. MANUTENÇÕES AGENDADAS TAB - Compact 2-Line Pattern with Expandable Drawer */}
      {activeTab === "agendadas" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
            <div>
              <span className="text-xs font-semibold text-slate-300 block">
                Lembretes & Manutenções Preventivas ({filteredManutencoes.length})
              </span>
              <span className="text-[11px] text-slate-400">
                Calibragem de pneus, trocas de óleo por KM, revisões híbridas e preventivas periódicas
              </span>
            </div>
            <button
              onClick={() => handleOpenManutencao()}
              className="flex items-center justify-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl transition-colors shadow-xs cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Lembrete / Manutenção</span>
            </button>
          </div>

          {filteredManutencoes.length === 0 ? (
            <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl text-slate-400 text-xs space-y-3">
              <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-slate-300">
                <RefreshCw className="w-5 h-5" />
              </div>
              <p className="font-medium text-slate-300">Nenhum lembrete de manutenção cadastrado.</p>
              <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                Você pode cadastrar calibragem semanal de pneus, troca de óleo por KM, pastilhas de freio ou qualquer revisão periódica.
              </p>
              <button
                onClick={() => handleOpenManutencao()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Cadastrar Primeiro Lembrete</span>
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredManutencoes.map((m, idx) => {
                const mId = String(m.Id || `manut-${idx}`);
                const isExpanded = expandedManutencaoId === mId;
                const isDone = m.Status === "CONCLUÍDO" || m.Status === "Concluída";
                const intervalo = m.Intervalo_Dias ? Number(m.Intervalo_Dias) : 0;
                const freqKm = m.Frequência_KM ? Number(m.Frequência_KM) : 0;
                const isHybrid = m.Tipo_Agendamento === "Ambos" || (intervalo > 0 && freqKm > 0);
                const isKmOnly = m.Tipo_Agendamento === "KM" || (freqKm > 0 && !intervalo);
                const isDaysOnly = m.Tipo_Agendamento === "Dias" || (intervalo > 0 && !freqKm);

                return (
                  <div
                    key={mId}
                    className={`bg-slate-900 border rounded-2xl transition-colors overflow-hidden ${
                      isDone
                        ? "border-slate-800/60 opacity-80"
                        : "border-slate-800 hover:border-slate-700/80"
                    }`}
                  >
                    {/* Linha Principal Compacta (2 Linhas) */}
                    <div
                      onClick={() => setExpandedManutencaoId(isExpanded ? null : mId)}
                      className="p-3.5 sm:p-4 flex items-center justify-between gap-3 cursor-pointer select-none"
                    >
                      {/* Lado Esquerdo: Ícone Neutro + Linha 1 + Linha 2 */}
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div
                          className={`p-2 sm:p-2.5 rounded-xl bg-slate-800 border shrink-0 ${
                            isDone
                              ? "text-emerald-400 border-slate-700/60"
                              : isHybrid
                              ? "text-sky-400 border-slate-700/60"
                              : isKmOnly
                              ? "text-amber-400 border-slate-700/60"
                              : "text-emerald-400 border-slate-700/60"
                          }`}
                        >
                          {isKmOnly ? (
                            <Gauge className="w-4 h-4" />
                          ) : isHybrid ? (
                            <RefreshCw className="w-4 h-4" />
                          ) : (
                            <Clock className="w-4 h-4" />
                          )}
                        </div>

                        <div className="min-w-0 space-y-1 flex-1">
                          {/* Linha 1: Título + Veículo + Tag de Recorrência */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`font-semibold text-xs sm:text-sm tracking-tight truncate max-w-[200px] sm:max-w-md ${
                                isDone ? "text-slate-400 line-through" : "text-white"
                              }`}
                            >
                              {m.Descrição}
                            </span>

                            {m.Veículo && (
                              <span className="px-1.5 py-0.5 rounded-md bg-slate-800 text-[10px] font-medium text-slate-300 border border-slate-700/70 truncate max-w-[120px]">
                                {m.Veículo}
                              </span>
                            )}

                            {/* Badge de Recorrência */}
                            {isDaysOnly && intervalo > 0 && (
                              <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-[10px] font-medium">
                                A cada {intervalo} {intervalo === 1 ? "dia" : "dias"}
                              </span>
                            )}
                            {isKmOnly && freqKm > 0 && (
                              <span className="px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[10px] font-medium font-mono">
                                A cada {freqKm.toLocaleString()} KM
                              </span>
                            )}
                            {isHybrid && (
                              <span className="px-1.5 py-0.5 rounded-md bg-sky-500/10 text-sky-300 border border-sky-500/20 text-[10px] font-medium">
                                Híbrido: {intervalo > 0 ? `${intervalo}d` : `${m.Frequência_Meses || 6}m`} / {freqKm > 0 ? `${freqKm.toLocaleString()} KM` : "10.000 KM"}
                              </span>
                            )}

                            {m.Som_Alarme === "SIM" && (
                              <span className="p-0.5 text-slate-400" title="Alarme sonoro ativado">
                                <Volume2 className="w-3.5 h-3.5 text-slate-400" />
                              </span>
                            )}
                          </div>

                          {/* Linha 2: Próxima previsão • Última realização */}
                          <div className="flex items-center gap-2 text-[11px] text-slate-400 truncate flex-wrap">
                            {m.Data_Alvo && (
                              <span>
                                Próxima: <strong className="text-slate-200">{m.Data_Alvo}</strong>
                              </span>
                            )}
                            {m.KM_Alvo && m.KM_Alvo > 0 && (
                              <>
                                <span>•</span>
                                <span>
                                  KM Alvo: <strong className="font-mono text-slate-200">{m.KM_Alvo.toLocaleString()} KM</strong>
                                </span>
                              </>
                            )}
                            {m.Data_Ultima_Realizacao && (
                              <>
                                <span className="text-slate-600">•</span>
                                <span className="text-slate-400">
                                  Última: {m.Data_Ultima_Realizacao}
                                  {m.KM_Ultima_Realizacao ? ` (${Number(m.KM_Ultima_Realizacao).toLocaleString()} KM)` : ""}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Lado Direito: Botão Concluir Hoje / Ciclo + Chevron */}
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCompleteManutencaoToday(m);
                          }}
                          className="px-2.5 py-1 rounded-lg text-[10px] font-semibold border transition-colors cursor-pointer bg-slate-800 text-emerald-400 border-slate-700 hover:bg-slate-750 flex items-center gap-1"
                          title="Registrar que esta manutenção foi feita hoje e avançar para o próximo ciclo"
                        >
                          <Check className="w-3 h-3" />
                          <span>REALIZADO HOJE</span>
                        </button>

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
                            <span className="text-[10px] text-slate-500 block">Tipo & Recorrência</span>
                            <span className="font-semibold text-slate-200">
                              {isHybrid
                                ? `Híbrido (${intervalo}d / ${freqKm} KM)`
                                : isKmOnly
                                ? `Por KM (${freqKm} KM)`
                                : intervalo > 0
                                ? `A cada ${intervalo} dias`
                                : "Pontual"}
                            </span>
                          </div>

                          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-0.5">
                            <span className="text-[10px] text-slate-500 block">Última Realização</span>
                            <span className="font-semibold text-slate-200">
                              {m.Data_Ultima_Realizacao || "—"}{" "}
                              {m.KM_Ultima_Realizacao ? `(${Number(m.KM_Ultima_Realizacao).toLocaleString()} KM)` : ""}
                            </span>
                          </div>

                          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-0.5">
                            <span className="text-[10px] text-slate-500 block">Próxima Data / KM</span>
                            <span className="font-semibold text-slate-200">
                              {m.Data_Alvo || "—"} {m.KM_Alvo ? `/ ${Number(m.KM_Alvo).toLocaleString()} KM` : ""}
                            </span>
                          </div>

                          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-0.5">
                            <span className="text-[10px] text-slate-500 block">Alarme Sonoro & Hora</span>
                            <span className="font-semibold text-slate-200">
                              {m.Som_Alarme === "SIM" ? "🔔 Ativo" : "Silencioso"}{" "}
                              {m.Horario_Alerta ? `às ${m.Horario_Alerta}` : ""}
                            </span>
                          </div>
                        </div>

                        {m.Observações && (
                          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                            <span className="text-[10px] text-slate-500 block font-medium">Observações</span>
                            <p className="text-slate-300 text-[11px] italic">"{m.Observações}"</p>
                          </div>
                        )}

                        {/* Ações da Gaveta */}
                        <div className="flex items-center justify-end gap-2 pt-1">
                          <button
                            onClick={() => handleOpenManutencao(m)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 text-xs font-medium transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>Editar Configuração</span>
                          </button>
                          <button
                            onClick={() =>
                              setDeleteConfirm({
                                isOpen: true,
                                type: "manutencao",
                                id: m.Id,
                                title: m.Descrição,
                                subtitle: `Veículo: ${m.Veículo} • Recorrência: ${m.Tipo_Agendamento || "Dias"}`,
                              })
                            }
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-medium transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Excluir</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 4. INFRAÇÕES */}
      {activeTab === "infracoes" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-400">
              Histórico de multas e recursos de trânsito (Aba 8_Infracoes)
            </span>
            <button
              onClick={() => handleOpenInfracao()}
              className="flex items-center gap-2 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-xl transition-colors shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Registrar Infração</span>
            </button>
          </div>

          {infracoes.length === 0 ? (
            <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl text-slate-500 text-xs">
              Nenhuma infração cadastrada ainda.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {infracoes.map((inf, idx) => (
                <div
                  key={`${inf.Id || 'inf'}-${idx}`}
                  className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-3 relative hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-xl bg-rose-500/10 text-rose-400">
                        <AlertOctagon className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-base leading-tight">
                          {inf.Título || inf.Descrição}
                        </h3>
                        <p className="text-xs text-slate-400 font-mono">
                          Protocolo: {inf.Protocolo || "—"} • Veículo: {inf.Veículo} ({inf.Placa})
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenInfracao(inf)}
                        className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                        title="Editar Infração"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() =>
                          setDeleteConfirm({
                            isOpen: true,
                            type: "infracao",
                            id: inf.Id,
                            title: inf.Título || inf.Descrição,
                            subtitle: `Veículo: ${inf.Veículo} (${inf.Placa}) • Valor: R$ ${formatCurrency(inf.Valor)} • Protocolo: ${inf.Protocolo || "—"}`,
                          })
                        }
                        className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                        title="Excluir Infração"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <div>
                      <span className="text-slate-500 text-[10px] block">Valor da Multa</span>
                      <span className="font-bold text-rose-400">R$ {formatCurrency(inf.Valor)}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] block">Pontuação</span>
                      <span className="font-semibold text-amber-400">{inf.Pontos || 0} pts</span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] block">Status</span>
                      <span className="font-bold text-emerald-400">{inf.Status}</span>
                    </div>
                  </div>

                  {inf.Localização && (
                    <p className="text-xs text-slate-400">📍 Localização: {inf.Localização}</p>
                  )}
                </div>
              ))}
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
                    : deleteConfirm.type === "infracao"
                    ? "Excluir Infração de Trânsito"
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
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!deleteConfirm) return;
                  const { type, id } = deleteConfirm;
                  setDeleteConfirm(null);
                  if (type === "veiculo") {
                    onDeleteVeiculo(id);
                  } else if (type === "servico") {
                    onDeleteServico(id);
                  } else if (type === "manutencao") {
                    onDeleteManutencao(id);
                  } else if (type === "infracao") {
                    if (onDeleteInfracao) onDeleteInfracao(id);
                  }
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 shadow-lg shadow-rose-950/40 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Confirmar Exclusão</span>
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
                  <VoiceInput
                    type="text"
                    required
                    value={veiculoForm.Marca}
                    onChange={(e) => setVeiculoForm({ ...veiculoForm, Marca: e.target.value.toUpperCase() })}
                    className="bg-slate-950 border border-slate-800 rounded-xl p-2 text-white uppercase"
                    uppercase
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Modelo</label>
                  <VoiceInput
                    type="text"
                    required
                    value={veiculoForm.Modelo}
                    onChange={(e) => setVeiculoForm({ ...veiculoForm, Modelo: e.target.value.toUpperCase() })}
                    className="bg-slate-950 border border-slate-800 rounded-xl p-2 text-white uppercase"
                    uppercase
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Placa</label>
                  <VoiceInput
                    type="text"
                    required
                    value={veiculoForm.Placa}
                    onChange={(e) => setVeiculoForm({ ...veiculoForm, Placa: e.target.value.toUpperCase() })}
                    className="bg-slate-950 border border-slate-800 rounded-xl p-2 text-white font-mono uppercase"
                    uppercase
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
                    value={veiculoForm.Km_Atual !== undefined && veiculoForm.Km_Atual !== null ? veiculoForm.Km_Atual : ""}
                    onFocus={(e) => e.target.select()}
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                    onChange={(e) => {
                      const v = e.target.value;
                      setVeiculoForm({
                        ...veiculoForm,
                        Km_Atual: v === "" ? ("" as any) : Number(v),
                      });
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Motorista</label>
                  <VoiceInput
                    type="text"
                    value={veiculoForm.Motorista}
                    onChange={(e) => setVeiculoForm({ ...veiculoForm, Motorista: e.target.value.toUpperCase() })}
                    className="bg-slate-950 border border-slate-800 rounded-xl p-2 text-white uppercase"
                    uppercase
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-5 sm:p-6 space-y-4 shadow-2xl my-auto animate-in fade-in-50 duration-150 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
                  <Wrench className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">
                    {editingServico ? "Editar Serviço de Oficina" : "Registrar Serviço de Oficina"}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Registre os dados da manutenção e valores orçado/pago
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsServicoModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveServicoSubmit} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 text-xs font-medium block mb-1">Data</label>
                  <input
                    type="date"
                    required
                    value={servicoForm.Data}
                    onChange={(e) => setServicoForm({ ...servicoForm, Data: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white text-xs focus:border-emerald-500 outline-hidden"
                  />
                </div>
                <div>
                  <label className="text-slate-300 text-xs font-medium block mb-1">Veículo</label>
                  <ComboBox
                    value={servicoForm.Veiculo}
                    onChange={(val) => {
                      const selModelo = val;
                      const selectedVeic = veiculos.find(
                        (v) =>
                          v.Modelo === selModelo ||
                          v.Placa === selModelo
                      );
                      setServicoForm((prev) => ({ ...prev, Veiculo: selModelo }));
                      if (selectedVeic?.Km_Atual && (!servicoKmDisplay || servicoKmDisplay === "0")) {
                        setServicoKmDisplay(String(selectedVeic.Km_Atual));
                        setServicoForm((prev) => ({ ...prev, KM: selectedVeic.Km_Atual }));
                      }
                    }}
                    options={veiculos.map((v) => ({
                      value: v.Modelo,
                      label: v.Modelo,
                      hint: v.Placa ? `(${v.Placa})` : undefined,
                    }))}
                    placeholder="Selecione o veículo..."
                    showVoice={true}
                    uppercase={false}
                    inputClassName="focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 text-xs font-medium block mb-1">Descrição do Serviço</label>
                <ComboBox
                  required
                  placeholder="Ex: Troca de pastilhas de freio e alinhamento"
                  value={servicoForm.Descrição}
                  onChange={(val) => setServicoForm({ ...servicoForm, Descrição: val })}
                  options={servicosDisponiveis}
                  showVoice
                />
              </div>

              {/* Grid: KM e Oficina */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 text-xs font-medium block mb-1">KM no Serviço</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="Ex: 85200"
                    value={servicoKmDisplay}
                    onFocus={(e) => e.target.select()}
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, "");
                      setServicoKmDisplay(raw);
                      setServicoForm((prev) => ({
                        ...prev,
                        KM: raw ? parseInt(raw, 10) : 0,
                      }));
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white text-xs font-mono focus:border-emerald-500 outline-hidden"
                  />
                </div>
                <div>
                  <label className="text-slate-300 text-xs font-medium block mb-1">Oficina / Estabelecimento</label>
                  <ComboBox
                    placeholder="Ex: Oficina Bosch, Mecânica Silva..."
                    value={servicoForm.Oficina_Nome}
                    onChange={(val) => setServicoForm({ ...servicoForm, Oficina_Nome: val })}
                    options={oficinasDisponiveis}
                    showVoice
                  />
                </div>
              </div>

              {/* Grid: Valor (Orçado/Original) e Valor Pago */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-950/60 border border-slate-800/80 rounded-2xl">
                <div>
                  <label className="text-slate-300 text-xs font-medium block mb-1">
                    Valor (Orçado / Total) (R$)
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3 text-slate-400 font-semibold text-xs select-none">
                      R$
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="0,00"
                      value={servicoValorDisplay}
                      onFocus={(e) => e.target.select()}
                      onClick={(e) => (e.target as HTMLInputElement).select()}
                      onChange={(e) => {
                        const { numeric, formatted } = formatCurrencyInput(e.target.value);
                        setServicoValorDisplay(formatted);
                        setServicoForm((prev) => ({
                          ...prev,
                          Valor: numeric,
                          Valor_A_PG: numeric,
                        }));
                        if (!servicoValorPagoDisplay) {
                          setServicoValorPagoDisplay(formatted);
                          setServicoForm((prev) => ({
                            ...prev,
                            Valor: numeric,
                            Valor_A_PG: numeric,
                            Valor_Pago: numeric,
                          }));
                        }
                      }}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 pl-9 text-white text-xs font-medium focus:border-emerald-500 outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-emerald-400 text-xs font-semibold block mb-1">
                    Valor Pago (Realizado) (R$)
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3 text-emerald-400 font-semibold text-xs select-none">
                      R$
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="0,00"
                      value={servicoValorPagoDisplay}
                      onFocus={(e) => e.target.select()}
                      onClick={(e) => (e.target as HTMLInputElement).select()}
                      onChange={(e) => {
                        const { numeric, formatted } = formatCurrencyInput(e.target.value);
                        setServicoValorPagoDisplay(formatted);
                        setServicoForm((prev) => ({
                          ...prev,
                          Valor_Pago: numeric,
                        }));
                      }}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 pl-9 text-white text-xs font-bold text-emerald-400 focus:border-emerald-500 outline-hidden"
                    />
                  </div>
                </div>
              </div>

              {/* Observações */}
              <div>
                <label className="text-slate-300 text-xs font-medium block mb-1">
                  Observações / Peças Trocadas
                </label>
                <VoiceTextArea
                  placeholder="Ex: Trocadas pastilhas dianteiras e fluido de freio DOT4..."
                  value={servicoForm.Observações || ""}
                  onChange={(e) => setServicoForm({ ...servicoForm, Observações: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsServicoModalOpen(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white text-xs font-medium transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-colors shadow-xs cursor-pointer"
                >
                  Salvar Serviço
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Manutenção Agendada & Lembretes Configuráveis */}
      {isManutencaoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl p-5 sm:p-6 space-y-4 text-xs my-8 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-sm sm:text-base text-white flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-emerald-400" />
                  <span>{editingManutencao ? "Editar Lembrete de Manutenção" : "Novo Lembrete de Manutenção"}</span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  Configure lembretes por intervalo de dias, quilometragem ou modo híbrido.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsManutencaoModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Templates Bar */}
            <div className="space-y-1.5 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
              <span className="text-[10px] font-semibold text-slate-400 flex items-center gap-1.5 uppercase tracking-wider">
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>Modelos Rápidos (1-Clique)</span>
              </span>
              <div className="flex flex-wrap gap-1.5">
                {TEMPLATES_MANUTENCAO.map((tmpl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleApplyTemplate(tmpl)}
                    className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 text-[11px] font-medium transition-colors cursor-pointer"
                  >
                    {tmpl.label}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleSaveManutencaoSubmit} className="space-y-3.5">
              {/* Veículo e Descrição */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1 font-medium">Veículo</label>
                  <ComboBox
                    value={manutencaoForm.Veículo}
                    onChange={(val) => {
                      const selModelo = val;
                      const selVeic = veiculos.find(
                        (v) =>
                          v.Modelo === selModelo ||
                          v.Placa === selModelo
                      );
                      setManutencaoForm((prev) => ({
                        ...prev,
                        Veículo: selModelo,
                        KM_Ultima_Realizacao: selVeic?.Km_Atual || prev.KM_Ultima_Realizacao,
                        KM_Alvo: prev.Frequência_KM ? (selVeic?.Km_Atual || 0) + prev.Frequência_KM : prev.KM_Alvo,
                      }));
                    }}
                    options={veiculos.map((v) => ({
                      value: v.Modelo,
                      label: v.Modelo,
                      hint: [
                        v.Placa ? `(${v.Placa})` : "",
                        v.Km_Atual ? `• ${Number(v.Km_Atual).toLocaleString()} KM` : "",
                      ].filter(Boolean).join(" "),
                    }))}
                    placeholder="Selecione o veículo..."
                    showVoice={true}
                    uppercase={false}
                    inputClassName="focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-slate-400 font-medium block mb-1">Descrição da Manutenção</label>
                  <ComboBox
                    required
                    placeholder="Ex: Calibrar Pneus, Troca de Óleo..."
                    value={manutencaoForm.Descrição}
                    onChange={(val) => setManutencaoForm({ ...manutencaoForm, Descrição: val })}
                    options={servicosDisponiveis}
                    showVoice
                  />
                </div>
              </div>

              {/* Modo de Recorrência */}
              <div className="space-y-1.5">
                <label className="text-slate-400 block font-medium">Tipo de Recorrência</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {[
                    { id: "Dias", label: "⏱️ Intervalo Dias", desc: "Ex: A cada 7 dias" },
                    { id: "KM", label: "🚗 Por KM", desc: "Ex: A cada 10.000 KM" },
                    { id: "Ambos", label: "⚡ Modo Híbrido", desc: "Tempo ou KM (1º)" },
                    { id: "Data", label: "📅 Data Fixa", desc: "Agendamento único" },
                  ].map((tab) => {
                    const isSelected = (manutencaoForm.Tipo_Agendamento || "Dias") === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() =>
                          setManutencaoForm((prev) => ({
                            ...prev,
                            Tipo_Agendamento: tab.id as any,
                          }))
                        }
                        className={`p-2 rounded-xl text-left border transition-all cursor-pointer ${
                          isSelected
                            ? "bg-emerald-500/10 border-emerald-500/50 text-white shadow-xs"
                            : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                        }`}
                      >
                        <div className={`font-semibold text-[11px] ${isSelected ? "text-emerald-400" : ""}`}>
                          {tab.label}
                        </div>
                        <div className="text-[9px] text-slate-500 truncate">{tab.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Seções Condicionais de Acordo com o Tipo */}
              {/* 1. INTERVALO DE DIAS (se Dias ou Ambos) */}
              {(manutencaoForm.Tipo_Agendamento === "Dias" || manutencaoForm.Tipo_Agendamento === "Ambos") && (
                <div className="p-3 bg-slate-950/70 border border-slate-800/90 rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-300 text-[11px] flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Configuração por Tempo (Dias)</span>
                    </span>
                    {manutencaoForm.Intervalo_Dias ? (
                      <span className="text-[10px] text-emerald-400 font-mono font-medium">
                        Repetir a cada {manutencaoForm.Intervalo_Dias} dias
                      </span>
                    ) : null}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className="text-slate-400 block mb-1 text-[11px]">Intervalo em Dias</label>
                      <input
                        type="number"
                        min="1"
                        placeholder="Ex: 7"
                        value={manutencaoForm.Intervalo_Dias || ""}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          const lastDate = manutencaoForm.Data_Ultima_Realizacao
                            ? new Date(manutencaoForm.Data_Ultima_Realizacao)
                            : new Date();
                          const nextDate = val > 0
                            ? new Date(lastDate.getTime() + val * 24 * 3600 * 1000).toISOString().split("T")[0]
                            : manutencaoForm.Data_Alvo;
                          setManutencaoForm((prev) => ({
                            ...prev,
                            Intervalo_Dias: val,
                            Data_Alvo: nextDate,
                          }));
                        }}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-white font-mono"
                      />
                    </div>

                    <div>
                      <label className="text-slate-400 block mb-1 text-[11px]">Data da Última Realização</label>
                      <input
                        type="date"
                        value={manutencaoForm.Data_Ultima_Realizacao || ""}
                        onChange={(e) => {
                          const newLastDateStr = e.target.value;
                          const interval = manutencaoForm.Intervalo_Dias || 0;
                          const nextDate = interval > 0 && newLastDateStr
                            ? new Date(new Date(newLastDateStr).getTime() + interval * 24 * 3600 * 1000).toISOString().split("T")[0]
                            : manutencaoForm.Data_Alvo;
                          setManutencaoForm((prev) => ({
                            ...prev,
                            Data_Ultima_Realizacao: newLastDateStr,
                            Data_Alvo: nextDate,
                          }));
                        }}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-white"
                      />
                    </div>

                    <div>
                      <label className="text-slate-400 block mb-1 text-[11px]">Próxima Data Prevista</label>
                      <input
                        type="date"
                        value={manutencaoForm.Data_Alvo || ""}
                        onChange={(e) => setManutencaoForm({ ...manutencaoForm, Data_Alvo: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-white"
                      />
                    </div>
                  </div>

                  {/* Presets Rápidos de Dias */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    <span className="text-[10px] text-slate-500 mr-1">Atalhos:</span>
                    {[
                      { label: "7 dias (Semanal)", val: 7 },
                      { label: "15 dias", val: 15 },
                      { label: "30 dias (Mensal)", val: 30 },
                      { label: "90 dias (3m)", val: 90 },
                      { label: "180 dias (6m)", val: 180 },
                      { label: "365 dias (1 ano)", val: 365 },
                    ].map((btn) => (
                      <button
                        key={btn.val}
                        type="button"
                        onClick={() => {
                          const lastDate = manutencaoForm.Data_Ultima_Realizacao
                            ? new Date(manutencaoForm.Data_Ultima_Realizacao)
                            : new Date();
                          const nextDate = new Date(lastDate.getTime() + btn.val * 24 * 3600 * 1000).toISOString().split("T")[0];
                          setManutencaoForm((prev) => ({
                            ...prev,
                            Intervalo_Dias: btn.val,
                            Data_Alvo: nextDate,
                          }));
                        }}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-medium border transition-colors cursor-pointer ${
                          manutencaoForm.Intervalo_Dias === btn.val
                            ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                            : "bg-slate-900 text-slate-400 border-slate-800 hover:text-white"
                        }`}
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 2. FREQUÊNCIA POR QUILOMETRAGEM (se KM ou Ambos) */}
              {(manutencaoForm.Tipo_Agendamento === "KM" || manutencaoForm.Tipo_Agendamento === "Ambos") && (
                <div className="p-3 bg-slate-950/70 border border-slate-800/90 rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-300 text-[11px] flex items-center gap-1.5">
                      <Gauge className="w-3.5 h-3.5 text-amber-400" />
                      <span>Configuração por Quilometragem (KM)</span>
                    </span>
                    {manutencaoForm.Frequência_KM ? (
                      <span className="text-[10px] text-amber-400 font-mono font-medium">
                        Repetir a cada {Number(manutencaoForm.Frequência_KM).toLocaleString()} KM
                      </span>
                    ) : null}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className="text-slate-400 block mb-1 text-[11px]">Frequência em KM</label>
                      <input
                        type="number"
                        step="500"
                        placeholder="Ex: 10000"
                        value={manutencaoForm.Frequência_KM || ""}
                        onChange={(e) => {
                          const freq = Number(e.target.value);
                          const lastKm = Number(manutencaoForm.KM_Ultima_Realizacao || 0);
                          setManutencaoForm((prev) => ({
                            ...prev,
                            Frequência_KM: freq,
                            KM_Alvo: freq > 0 ? lastKm + freq : prev.KM_Alvo,
                          }));
                        }}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-white font-mono"
                      />
                    </div>

                    <div>
                      <label className="text-slate-400 block mb-1 text-[11px]">KM na Última Realização</label>
                      <input
                        type="number"
                        placeholder="KM anterior"
                        value={manutencaoForm.KM_Ultima_Realizacao || ""}
                        onChange={(e) => {
                          const lastKm = Number(e.target.value);
                          const freq = Number(manutencaoForm.Frequência_KM || 0);
                          setManutencaoForm((prev) => ({
                            ...prev,
                            KM_Ultima_Realizacao: lastKm,
                            KM_Alvo: freq > 0 ? lastKm + freq : prev.KM_Alvo,
                          }));
                        }}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-white font-mono"
                      />
                    </div>

                    <div>
                      <label className="text-slate-400 block mb-1 text-[11px]">KM Alvo Previsto</label>
                      <input
                        type="number"
                        placeholder="KM do alerta"
                        value={manutencaoForm.KM_Alvo || ""}
                        onChange={(e) => setManutencaoForm({ ...manutencaoForm, KM_Alvo: Number(e.target.value) })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-white font-mono"
                      />
                    </div>
                  </div>

                  {/* Presets Rápidos de KM */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    <span className="text-[10px] text-slate-500 mr-1">Atalhos:</span>
                    {[
                      { label: "5.000 KM", val: 5000 },
                      { label: "10.000 KM", val: 10000 },
                      { label: "15.000 KM", val: 15000 },
                      { label: "20.000 KM", val: 20000 },
                      { label: "40.000 KM", val: 40000 },
                    ].map((btn) => (
                      <button
                        key={btn.val}
                        type="button"
                        onClick={() => {
                          const lastKm = Number(manutencaoForm.KM_Ultima_Realizacao || 0);
                          setManutencaoForm((prev) => ({
                            ...prev,
                            Frequência_KM: btn.val,
                            KM_Alvo: lastKm + btn.val,
                          }));
                        }}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-medium border transition-colors cursor-pointer ${
                          manutencaoForm.Frequência_KM === btn.val
                            ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                            : "bg-slate-900 text-slate-400 border-slate-800 hover:text-white"
                        }`}
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 3. DATA FIXA PONTUAL (se Data) */}
              {manutencaoForm.Tipo_Agendamento === "Data" && (
                <div className="p-3 bg-slate-950/70 border border-slate-800/90 rounded-xl space-y-2.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-slate-400 block mb-1 text-[11px]">Data Alvo Específica</label>
                      <input
                        type="date"
                        required
                        value={manutencaoForm.Data_Alvo || ""}
                        onChange={(e) => setManutencaoForm({ ...manutencaoForm, Data_Alvo: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-white"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-1 text-[11px]">KM Alvo (Opcional)</label>
                      <input
                        type="number"
                        value={manutencaoForm.KM_Alvo || ""}
                        onChange={(e) => setManutencaoForm({ ...manutencaoForm, KM_Alvo: Number(e.target.value) })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-white font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Alarme, Horário, Prioridade e Oficina */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div>
                  <label className="text-slate-400 block mb-1 font-medium">Horário do Alerta</label>
                  <input
                    type="time"
                    value={manutencaoForm.Horario_Alerta || "08:00"}
                    onChange={(e) => setManutencaoForm({ ...manutencaoForm, Horario_Alerta: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1 font-medium">Prioridade</label>
                  <select
                    value={manutencaoForm.Prioridade || "Média"}
                    onChange={(e) => setManutencaoForm({ ...manutencaoForm, Prioridade: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white"
                  >
                    <option value="Baixa">Baixa</option>
                    <option value="Média">Média</option>
                    <option value="Alta">Alta</option>
                    <option value="Urgente">Urgente</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1 font-medium">Oficina Indicada</label>
                  <ComboBox
                    placeholder="Oficina preferencial"
                    value={manutencaoForm.Oficina_Nome}
                    onChange={(val) => setManutencaoForm({ ...manutencaoForm, Oficina_Nome: val })}
                    options={oficinasDisponiveis}
                    showVoice
                  />
                </div>
              </div>

              {/* Alarme Sonoro Toggle */}
              <div className="flex items-center justify-between p-2.5 bg-slate-950/60 border border-slate-800 rounded-xl">
                <div className="flex items-center gap-2.5">
                  <div className={`p-1.5 rounded-lg ${manutencaoForm.Som_Alarme ? "bg-emerald-500/10 text-emerald-400" : "bg-slate-800 text-slate-500"}`}>
                    {manutencaoForm.Som_Alarme ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                  </div>
                  <div>
                    <span className="font-semibold text-slate-200 text-[11px] block">Alarme Sonoro</span>
                    <span className="text-[10px] text-slate-400">Tocar sinal sonoro ao disparar notificação</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setManutencaoForm((prev) => ({ ...prev, Som_Alarme: !prev.Som_Alarme }))}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                    manutencaoForm.Som_Alarme
                      ? "bg-emerald-600/20 text-emerald-300 border-emerald-500/30"
                      : "bg-slate-800 text-slate-400 border-slate-700 hover:text-white"
                  }`}
                >
                  {manutencaoForm.Som_Alarme ? "ATIVADO" : "DESATIVADO"}
                </button>
              </div>

              {/* Observações */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-400 font-medium">Observações / Instruções</label>
                </div>
                <VoiceTextArea
                  placeholder="Ex: Calibrar dianteiros 32 psi e traseiros 30 psi. Óleo sintético 5W30..."
                  value={manutencaoForm.Observações || ""}
                  onChange={(e) => setManutencaoForm({ ...manutencaoForm, Observações: e.target.value })}
                  rows={2}
                />
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsManutencaoModalOpen(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white text-xs font-medium cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl transition-colors shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Salvar Lembrete</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal Infração */}
      {isInfracaoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs text-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 space-y-4 shadow-2xl text-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-base text-white">
                {editingInfracao ? "Editar Infração de Trânsito" : "Registrar Infração de Trânsito"}
              </h3>
              <button onClick={() => setIsInfracaoModalOpen(false)}>
                <X className="w-5 h-5 text-slate-400 hover:text-white cursor-pointer" />
              </button>
            </div>

            <form onSubmit={handleSaveInfracaoSubmit} className="space-y-3">
              {/* 1. Veículo + Placa */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-slate-400 block mb-1">Veículo</label>
                  <ComboBox
                    value={infracaoForm.Veículo}
                    onChange={(val) => {
                      const vMatch = veiculos.find((v) => v.Modelo === val || v.Placa === val);
                      setInfracaoForm({
                        ...infracaoForm,
                        Veículo: val,
                        Placa: vMatch?.Placa || infracaoForm.Placa,
                      });
                    }}
                    options={veiculos.map((v) => ({
                      value: v.Modelo,
                      label: v.Modelo,
                      hint: v.Placa ? `(${v.Placa})` : undefined,
                    }))}
                    placeholder="Selecione o veículo..."
                    showVoice={true}
                    uppercase={false}
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Placa</label>
                  <VoiceInput
                    type="text"
                    placeholder="ABC-1234"
                    value={infracaoForm.Placa || ""}
                    onChange={(e) => setInfracaoForm({ ...infracaoForm, Placa: e.target.value.toUpperCase() })}
                    className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white uppercase font-mono"
                    uppercase
                  />
                </div>
              </div>

              {/* 2. Número do RENAINF */}
              <div>
                <label className="text-slate-400 block mb-1">Número do RENAINF</label>
                <VoiceInput
                  type="text"
                  placeholder="Ex: 00000000000"
                  value={infracaoForm.Numero_Renainf || ""}
                  onChange={(e) => setInfracaoForm({ ...infracaoForm, Numero_Renainf: e.target.value.toUpperCase() })}
                  className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white uppercase"
                  uppercase
                />
              </div>

              {/* 3. Auto de Infração + Código da Infração */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Auto de Infração</label>
                  <VoiceInput
                    type="text"
                    placeholder="Ex: AIT-000000000"
                    value={infracaoForm.Auto_Infracao || ""}
                    onChange={(e) => setInfracaoForm({ ...infracaoForm, Auto_Infracao: e.target.value.toUpperCase() })}
                    className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white uppercase"
                    uppercase
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Código da Infração</label>
                  <VoiceInput
                    type="text"
                    placeholder="Ex: 745-5-0"
                    value={infracaoForm.Codigo_Infracao || ""}
                    onChange={(e) => setInfracaoForm({ ...infracaoForm, Codigo_Infracao: e.target.value.toUpperCase() })}
                    className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white uppercase"
                    uppercase
                  />
                </div>
              </div>

              {/* 4. Órgão Autuador + Órgão Competente */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Órgão Autuador</label>
                  <VoiceInput
                    type="text"
                    placeholder="Ex: DETRAN-SP, PRF"
                    value={infracaoForm.Orgao_Autuador || ""}
                    onChange={(e) => setInfracaoForm({ ...infracaoForm, Orgao_Autuador: e.target.value.toUpperCase() })}
                    className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white uppercase"
                    uppercase
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Órgão Competente</label>
                  <VoiceInput
                    type="text"
                    placeholder="Ex: JARI, CET"
                    value={infracaoForm.Orgao_Competente || ""}
                    onChange={(e) => setInfracaoForm({ ...infracaoForm, Orgao_Competente: e.target.value.toUpperCase() })}
                    className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white uppercase"
                    uppercase
                  />
                </div>
              </div>

              {/* 5. Localização */}
              <div>
                <label className="text-slate-400 block mb-1">Localização</label>
                <VoiceInput
                  type="text"
                  placeholder="Ex: Av. Paulista, 1000 - SP"
                  value={infracaoForm.Localização || ""}
                  onChange={(e) => setInfracaoForm({ ...infracaoForm, Localização: e.target.value })}
                  className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                />
              </div>

              {/* 6. Latitude + Longitude */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Latitude (opcional)</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="-23.5505"
                    value={infracaoForm.Latitude ?? ""}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setInfracaoForm({ ...infracaoForm, Latitude: e.target.value === "" ? undefined : Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Longitude (opcional)</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="-46.6333"
                    value={infracaoForm.Longitude ?? ""}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setInfracaoForm({ ...infracaoForm, Longitude: e.target.value === "" ? undefined : Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                  />
                </div>
              </div>

              {/* 7. Data e Hora do Cometimento */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Data do Cometimento</label>
                  <input
                    type="date"
                    required
                    value={infracaoForm.Data || ""}
                    onChange={(e) => setInfracaoForm({ ...infracaoForm, Data: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Hora do Cometimento</label>
                  <input
                    type="time"
                    value={infracaoForm.Hora_Infracao || ""}
                    onChange={(e) => setInfracaoForm({ ...infracaoForm, Hora_Infracao: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                  />
                </div>
              </div>

              {/* 8. Data da Notificação da Autuação + Data Término para Apresentação da Defesa */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Data da Notificação da Autuação</label>
                  <input
                    type="date"
                    value={infracaoForm.Data_Notificacao_Autuacao || ""}
                    onChange={(e) => setInfracaoForm({ ...infracaoForm, Data_Notificacao_Autuacao: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Data Término para Apresentação da Defesa</label>
                  <input
                    type="date"
                    value={infracaoForm.Data_Termino_Defesa || ""}
                    onChange={(e) => setInfracaoForm({ ...infracaoForm, Data_Termino_Defesa: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                  />
                </div>
              </div>

              {/* 9. Data Limite Identificação Condutor + Data Notificação Penalidade */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Data Limite para Identificação do Condutor</label>
                  <input
                    type="date"
                    value={infracaoForm.Data_Limite_Identificacao_Condutor || ""}
                    onChange={(e) => setInfracaoForm({ ...infracaoForm, Data_Limite_Identificacao_Condutor: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Data da Notificação da Penalidade</label>
                  <input
                    type="date"
                    value={infracaoForm.Data_Notificacao_Penalidade || ""}
                    onChange={(e) => setInfracaoForm({ ...infracaoForm, Data_Notificacao_Penalidade: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                  />
                </div>
              </div>

              {/* 10. Data Término Recurso + Data Vencimento Desconto */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Data Término para Apresentação de Recurso</label>
                  <input
                    type="date"
                    value={infracaoForm.Data_Termino_Recurso || ""}
                    onChange={(e) => setInfracaoForm({ ...infracaoForm, Data_Termino_Recurso: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Data do Vencimento do Desconto</label>
                  <input
                    type="date"
                    value={infracaoForm.Data_Vencimento_Desconto || ""}
                    onChange={(e) => setInfracaoForm({ ...infracaoForm, Data_Vencimento_Desconto: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                  />
                </div>
              </div>

              {/* 11. Protocolo */}
              <div>
                <label className="text-slate-400 block mb-1">Protocolo</label>
                <VoiceInput
                  type="text"
                  placeholder="Ex: PROT-2026-098"
                  value={infracaoForm.Protocolo || ""}
                  onChange={(e) => setInfracaoForm({ ...infracaoForm, Protocolo: e.target.value.toUpperCase() })}
                  className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white uppercase"
                  uppercase
                />
              </div>

              {/* 12. Título / Infração */}
              <div>
                <label className="text-slate-400 block mb-1">Título / Infração</label>
                <VoiceInput
                  type="text"
                  required
                  placeholder="Ex: Avanço de sinal vermelho"
                  value={infracaoForm.Título}
                  onChange={(e) => setInfracaoForm({ ...infracaoForm, Título: e.target.value.toUpperCase() })}
                  className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white uppercase"
                  uppercase
                />
              </div>

              {/* 13. Descrição */}
              <div>
                <label className="text-slate-400 block mb-1">Descrição</label>
                <VoiceTextArea
                  rows={2}
                  placeholder="Descrição da infração..."
                  value={infracaoForm.Descrição || ""}
                  onChange={(e) => setInfracaoForm({ ...infracaoForm, Descrição: e.target.value })}
                  className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white resize-none"
                />
              </div>

              {/* 14. Valor + Pontos */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Valor (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={infracaoForm.Valor}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setInfracaoForm({ ...infracaoForm, Valor: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-bold"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Pontos</label>
                  <input
                    type="number"
                    value={infracaoForm.Pontos ?? 0}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setInfracaoForm({ ...infracaoForm, Pontos: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                  />
                </div>
              </div>

              {/* 15. Status de Pagamento + Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Status de Pagamento</label>
                  <select
                    value={infracaoForm.Status_Pagamento || "PENDENTE"}
                    onChange={(e) => setInfracaoForm({ ...infracaoForm, Status_Pagamento: e.target.value as "PAGO" | "PENDENTE" })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                  >
                    <option value="PENDENTE">Pendente</option>
                    <option value="PAGO">Pago</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Status</label>
                  <select
                    value={infracaoForm.Status || "EM_ANALISE"}
                    onChange={(e) => setInfracaoForm({ ...infracaoForm, Status: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                  >
                    <option value="EM_ANALISE">Em Análise</option>
                    <option value="Pendente">Pendente</option>
                    <option value="APROVADO">Aprovado</option>
                    <option value="NEGADO">Negado</option>
                    <option value="Pago">Pago</option>
                  </select>
                </div>
              </div>

              {/* 16. Observação */}
              <div>
                <label className="text-slate-400 block mb-1">Observação</label>
                <VoiceTextArea
                  rows={2}
                  placeholder="Observações adicionais..."
                  value={infracaoForm.Observação || ""}
                  onChange={(e) => setInfracaoForm({ ...infracaoForm, Observação: e.target.value })}
                  className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white resize-none"
                />
              </div>

              {/* 17. Condutor */}
              <div>
                <label className="text-slate-400 block mb-1">Condutor</label>
                <VoiceInput
                  type="text"
                  placeholder="Nome do Condutor"
                  value={infracaoForm.Condutor || ""}
                  onChange={(e) => setInfracaoForm({ ...infracaoForm, Condutor: e.target.value.toUpperCase() })}
                  className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white uppercase"
                  uppercase
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsInfracaoModalOpen(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl cursor-pointer"
                >
                  Salvar Infração
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
