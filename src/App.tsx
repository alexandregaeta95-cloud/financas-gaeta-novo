/**
 * Finanças Gaeta — Main Application Container
 * Adheres strictly to the Foundation Document & Prompt 3 specifications.
 */

import React, { useEffect, useState, useCallback } from "react";
import { Navigation, ModuleView } from "./components/Navigation";
import { SyncStatusBanner } from "./components/SyncStatusBanner";
import { AppsScriptSetupModal } from "./components/AppsScriptSetupModal";
import { Dashboard } from "./components/Dashboard";
import { LancamentosView } from "./components/LancamentosView";
import { AbastecimentosView } from "./components/AbastecimentosView";
import { VeiculosOficinaView } from "./components/VeiculosOficinaView";
import { ContasCartoesView } from "./components/ContasCartoesView";
import { SaudeInfracoesView } from "./components/SaudeInfracoesView";
import { MetasCategoriasView } from "./components/MetasCategoriasView";
import { AgendaCompromissosView } from "./components/AgendaCompromissosView";
import { ZonasDeRiscoView } from "./components/ZonasDeRiscoView";
import { ListaMercadoView } from "./components/ListaMercadoView";
import { IndicacoesPostosView } from "./components/IndicacoesPostosView";
import { PainelContasView } from "./components/PainelContasView";
import { NotificationCenterModal } from "./components/NotificationCenterModal";
import { NotificationToast } from "./components/NotificationToast";
import { BiometricLockScreen } from "./components/BiometricLockScreen";
import { SegurancaModal } from "./components/SegurancaModal";
import { isBiometricEnabled, isSessionAuthenticated } from "./services/biometricAuth";

import {
  Lancamento,
  Abastecimento,
  Veiculo,
  ContaBancaria,
  CartaoCredito,
  ServicoOficina,
  ManutencaoAgendada,
  ConsultaMedica,
  ReceitaMedica,
  Infracao,
  ZonaDeRisco,
  ItemMercado,
  CompromissoAgenda,
  MetaCategoria,
  CategoriaCustomizada,
  PerfilUsuario,
  SyncState,
  AppNotification,
  RegistroSaude,
  AlimentoAnaliseResult,
  LembreteSaudeConfig,
  ExercicioRegistro,
  ConsumoCafe,
  ConsumoAgua,
  ConfigAgua,
  SHEET_NAMES,
} from "./types";

import {
  fetchSheetData,
  saveSheetRecords,
  getCachedSheetData,
  getSavedAppsScriptUrl,
  testAppsScriptConnection,
  sanitizeRecordToUppercase,
} from "./services/api";

import { calculateAccountCurrentBalance } from "./utils/formatters";
import { evaluateAllNotifications, dispatchBrowserNotification } from "./services/notificationEngine";

export default function App() {
  const [activeView, setActiveView] = useState<ModuleView>("dashboard");

  // App Data States (Initialized from LocalStorage Cache to ensure zero lag)
  const [lancamentos, setLancamentos] = useState<Lancamento[]>(() =>
    getCachedSheetData<Lancamento>(SHEET_NAMES.LANCAMENTOS)
  );
  const [abastecimentos, setAbastecimentos] = useState<Abastecimento[]>(() =>
    getCachedSheetData<Abastecimento>(SHEET_NAMES.ABASTECIMENTOS)
  );
  const [veiculos, setVeiculos] = useState<Veiculo[]>(() => {
    const cached = getCachedSheetData<Veiculo>(SHEET_NAMES.VEICULOS);
    if (cached.length > 0) return cached;
    return [
      {
        Id: "VEIC_1",
        Marca: "Volkswagen",
        Modelo: "Polo TSI",
        Ano: 2023,
        Placa: "GAE-2026",
        Km_Atual: 24500,
        Combustível: "Flex",
        Ativo: true,
      },
    ];
  });
  const [contas, setContas] = useState<ContaBancaria[]>(() => {
    const cached = getCachedSheetData<ContaBancaria>(SHEET_NAMES.CONTAS_BANCARIAS);
    if (cached.length > 0) return cached;
    return [
      {
        Id: "CONTA_1",
        Nome: "Conta Corrente Principal",
        Tipo: "BANCO",
        Saldo_Inicial: 1500,
        Saldo_Atual: 1500,
        Ativa: true,
      },
    ];
  });
  const [cartoes, setCartoes] = useState<CartaoCredito[]>(() => {
    const cached = getCachedSheetData<CartaoCredito>(SHEET_NAMES.CARTOES_CREDITO);
    if (cached.length > 0) return cached;
    return [
      {
        Id: "CARD_1",
        Nome: "Mastercard Black",
        Limite: 15000,
        Fechamento: 10,
        Vencimento: 20,
        Ativo: true,
      },
    ];
  });
  const [servicos, setServicos] = useState<ServicoOficina[]>(() =>
    getCachedSheetData<ServicoOficina>(SHEET_NAMES.OFICINA)
  );
  const [manutencoes, setManutencoes] = useState<ManutencaoAgendada[]>(() =>
    getCachedSheetData<ManutencaoAgendada>(SHEET_NAMES.MANUTENCOES_AGENDADAS)
  );
  const [consultas, setConsultas] = useState<ConsultaMedica[]>(() =>
    getCachedSheetData<ConsultaMedica>(SHEET_NAMES.CONSULTAS_MEDICAS)
  );
  const [receitas, setReceitas] = useState<ReceitaMedica[]>(() =>
    getCachedSheetData<ReceitaMedica>(SHEET_NAMES.RECEITAS_MEDICAS)
  );
  const [infracoes, setInfracoes] = useState<Infracao[]>(() =>
    getCachedSheetData<Infracao>(SHEET_NAMES.INFRACOES)
  );
  const [zonasRisco, setZonasRisco] = useState<ZonaDeRisco[]>(() =>
    getCachedSheetData<ZonaDeRisco>(SHEET_NAMES.ZONAS_RISCO)
  );
  const [itensMercado, setItensMercado] = useState<ItemMercado[]>(() =>
    getCachedSheetData<ItemMercado>(SHEET_NAMES.LISTA_MERCADO)
  );
  const [agenda, setAgenda] = useState<CompromissoAgenda[]>(() =>
    getCachedSheetData<CompromissoAgenda>(SHEET_NAMES.AGENDA)
  );
  const [registrosSaude, setRegistrosSaude] = useState<RegistroSaude[]>(() => {
    const cached = getCachedSheetData<RegistroSaude>(SHEET_NAMES.CONTROLE_SAUDE);
    if (cached.length > 0) return cached;
    // Initial sample measurements for fresh UX
    return [
      {
        Id: "SAUDE_PESO_1",
        Tipo_Registro: "PESO",
        Data_Hora: "2026-08-10",
        Valor_Principal: 78.5,
        Observacoes: "Pesagem matinal em jejum",
      },
      {
        Id: "SAUDE_PESO_2",
        Tipo_Registro: "PESO",
        Data_Hora: "2026-08-17",
        Valor_Principal: 77.8,
        Observacoes: "Após treino aeróbico",
      },
      {
        Id: "SAUDE_PESO_3",
        Tipo_Registro: "PESO",
        Data_Hora: "2026-08-23",
        Valor_Principal: 77.2,
        Observacoes: "Meta de peso em progresso",
      },
      {
        Id: "SAUDE_PRESSAO_1",
        Tipo_Registro: "PRESSAO",
        Data_Hora: "2026-08-12 08:30",
        Valor_Principal: 120,
        Valor_Secundario: 80,
        Batimentos_Bpm: 72,
        Observacoes: "Pressão arterial ideal em repouso",
      },
      {
        Id: "SAUDE_PRESSAO_2",
        Tipo_Registro: "PRESSAO",
        Data_Hora: "2026-08-20 19:15",
        Valor_Principal: 125,
        Valor_Secundario: 82,
        Batimentos_Bpm: 76,
        Observacoes: "Aferição noturna pós expediente",
      },
      {
        Id: "SAUDE_GLICEMIA_1",
        Tipo_Registro: "GLICEMIA",
        Data_Hora: "2026-08-15 07:45",
        Valor_Principal: 92,
        Contexto: "JEJUM",
        Observacoes: "Glicemia matinal em jejum",
      },
      {
        Id: "SAUDE_GLICEMIA_2",
        Tipo_Registro: "GLICEMIA",
        Data_Hora: "2026-08-21 14:00",
        Valor_Principal: 118,
        Contexto: "POS_REFEICAO",
        Observacoes: "2 horas após o almoço",
      },
    ];
  });
  const [alimentos, setAlimentos] = useState<AlimentoAnaliseResult[]>(() =>
    getCachedSheetData<AlimentoAnaliseResult>(SHEET_NAMES.ANALISE_ALIMENTOS)
  );
  const [exercicios, setExercicios] = useState<ExercicioRegistro[]>(() => {
    const cached = getCachedSheetData<ExercicioRegistro>(SHEET_NAMES.EXERCICIOS);
    if (cached.length > 0) return cached;
    return [
      {
        id: "EXE_1",
        Id: "EXE_1",
        data: "2026-08-22",
        hora: "07:00",
        tipoExercicio: "MUSCULAÇÃO",
        duracaoMinutos: 50,
        intensidade: "INTENSO",
        caloriasQueimadas: 340,
        observacoes: "TREINO DE PEITO E TRÍCEPS",
      },
      {
        id: "EXE_2",
        Id: "EXE_2",
        data: "2026-08-23",
        hora: "08:15",
        tipoExercicio: "CORRIDA",
        duracaoMinutos: 35,
        intensidade: "MODERADO",
        caloriasQueimadas: 280,
        observacoes: "ESTEIRA 5KM RITMO CONSTANTE",
      },
      {
        id: "EXE_3",
        Id: "EXE_3",
        data: "2026-08-24",
        hora: "07:30",
        tipoExercicio: "MUSCULAÇÃO",
        duracaoMinutos: 60,
        intensidade: "INTENSO",
        caloriasQueimadas: 410,
        observacoes: "TREINO DE PERNAS E OMBROS",
      },
    ];
  });
  const [consumosCafe, setConsumosCafe] = useState<ConsumoCafe[]>(() => {
    const cached = getCachedSheetData<ConsumoCafe>(SHEET_NAMES.CONSUMO_CAFE);
    if (cached.length > 0) return cached;
    return [
      {
        id: "CAFE_1",
        Id: "CAFE_1",
        data: "2026-08-26",
        hora: "07:45",
        quantidade: 1,
        observacoes: "EXPRESSO",
      },
      {
        id: "CAFE_2",
        Id: "CAFE_2",
        data: "2026-08-26",
        hora: "13:30",
        quantidade: 1,
        observacoes: "COM LEITE",
      },
    ];
  });
  const [configAgua, setConfigAgua] = useState<ConfigAgua>(() => {
    const cached = getCachedSheetData<any>(SHEET_NAMES.CONSUMO_AGUA);
    const cfg = cached.find((item) => item.id === "CONFIG_AGUA" || item.Id === "CONFIG_AGUA");
    if (cfg) {
      return {
        id: "CONFIG_AGUA",
        Id: "CONFIG_AGUA",
        metaDiariaMl: Number(cfg.metaDiariaMl || cfg.Meta_Diaria_Ml || 2500),
        tamanhoCopoMl: Number(cfg.tamanhoCopoMl || cfg.Tamanho_Copo_Ml || 500),
      };
    }
    return {
      id: "CONFIG_AGUA",
      Id: "CONFIG_AGUA",
      metaDiariaMl: 2500,
      tamanhoCopoMl: 500,
    };
  });
  const [consumosAgua, setConsumosAgua] = useState<ConsumoAgua[]>(() => {
    const cached = getCachedSheetData<ConsumoAgua>(SHEET_NAMES.CONSUMO_AGUA);
    const filtered = cached.filter((item) => item.id !== "CONFIG_AGUA" && item.Id !== "CONFIG_AGUA");
    if (filtered.length > 0) return filtered;
    return [
      {
        id: "AGUA_1",
        Id: "AGUA_1",
        data: "2026-08-26",
        hora: "08:15",
        quantidadeMl: 500,
        observacoes: "GARRAFA TÉRMICA",
      },
      {
        id: "AGUA_2",
        Id: "AGUA_2",
        data: "2026-08-26",
        hora: "11:30",
        quantidadeMl: 500,
        observacoes: "GARRAFA TÉRMICA",
      },
    ];
  });
  const [lembretesSaude, setLembretesSaude] = useState<LembreteSaudeConfig[]>(() => {
    const cached = getCachedSheetData<LembreteSaudeConfig>(SHEET_NAMES.CONFIG_LEMBRETES_SAUDE);
    if (cached.length > 0) return cached;
    return [
      {
        Id: "LEMBRETE_PRESSAO",
        Tipo: "Pressao_Arterial",
        Ativo: "SIM",
        Horario_1: "07:30",
        Horario_2: "13:30",
        Horario_3: "19:30",
        Dias_Semana: "TODOS",
        Ultima_Atualizacao: new Date().toLocaleString("pt-BR"),
      },
      {
        Id: "LEMBRETE_GLICEMIA",
        Tipo: "Glicemia",
        Ativo: "SIM",
        Horario_1: "07:00",
        Horario_2: "14:00",
        Horario_3: "21:30",
        Dias_Semana: "TODOS",
        Ultima_Atualizacao: new Date().toLocaleString("pt-BR"),
      },
    ];
  });
  const [metas, setMetas] = useState<MetaCategoria[]>(() =>
    getCachedSheetData<MetaCategoria>(SHEET_NAMES.METAS_CATEGORIA)
  );
  const [categoriasCustom, setCategoriasCustom] = useState<CategoriaCustomizada[]>(() =>
    getCachedSheetData<CategoriaCustomizada>(SHEET_NAMES.CATEGORIAS_CUSTOMIZADAS)
  );
  const [perfil, setPerfil] = useState<PerfilUsuario | null>(null);

  // Perfil Biométrico: Altura (cm) do Usuário - Sincronizado na Planilha
  const [alturaUsuario, setAlturaUsuario] = useState<number>(() => {
    const local = localStorage.getItem("financas_gaeta_altura_usuario");
    if (local) {
      const parsed = parseInt(local, 10);
      if (!isNaN(parsed) && parsed >= 100 && parsed <= 250) return parsed;
    }
    const cachedLembretes = getCachedSheetData<LembreteSaudeConfig>(SHEET_NAMES.CONFIG_LEMBRETES_SAUDE);
    const found = cachedLembretes.find(
      (c) =>
        c.id === "CONFIG_PERFIL_ALTURA" ||
        c.Id === "CONFIG_PERFIL_ALTURA" ||
        c.tipo === "Perfil_Altura" ||
        c.Tipo === "Perfil_Altura"
    );
    if (found) {
      const val = parseInt(found.horario1 || found.Horario_1 || found.altura || "175", 10);
      if (!isNaN(val) && val >= 100 && val <= 250) return val;
    }
    return 175;
  });

  // Keep alturaUsuario in sync when lembretesSaude updates from cloud
  useEffect(() => {
    const found = lembretesSaude.find(
      (c) =>
        c.id === "CONFIG_PERFIL_ALTURA" ||
        c.Id === "CONFIG_PERFIL_ALTURA" ||
        c.tipo === "Perfil_Altura" ||
        c.Tipo === "Perfil_Altura"
    );
    if (found) {
      const val = parseInt(found.horario1 || found.Horario_1 || found.altura || "", 10);
      if (!isNaN(val) && val >= 100 && val <= 250) {
        setAlturaUsuario(val);
        localStorage.setItem("financas_gaeta_altura_usuario", String(val));
      }
    }
  }, [lembretesSaude]);

  // Sync State
  const [syncState, setSyncState] = useState<SyncState>({
    isConnected: false,
    isSyncing: false,
    lastSyncedAt: null,
    errorMessage: null,
    hasCustomUrl: Boolean(getSavedAppsScriptUrl()),
    pendingCount: 0,
  });

  // Modal States
  const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);
  const [isLancamentoModalOpen, setIsLancamentoModalOpen] = useState(false);
  const [isFuelingModeModal, setIsFuelingModeModal] = useState(false);
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);

  // Biometric Session Lock State
  const [isBiometricsActive, setIsBiometricsActive] = useState<boolean>(() => isBiometricEnabled());
  const [isSessionUnlocked, setIsSessionUnlocked] = useState<boolean>(() => isSessionAuthenticated());

  // In-App Notification System States
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);
  const [activeToast, setActiveToast] = useState<AppNotification | null>(null);

  // Notification Engine Evaluation
  const checkNotifications = useCallback(() => {
    const freshNotifs = evaluateAllNotifications({
      agenda,
      lancamentos,
      metas,
      consultas,
      infracoes,
      manutencoes,
      servicos,
      veiculos,
      itensMercado,
      lembretesSaude,
      registrosSaude,
    });

    setNotifications((prev) => {
      const readIds = new Set(prev.filter((p) => p.read).map((p) => p.id));
      const previousIds = new Set(prev.map((p) => p.id));

      const updated = freshNotifs.map((n) => ({
        ...n,
        read: readIds.has(n.id) || n.read,
      }));

      // Find any newly arrived warning or urgent priority notification to toast
      const newlyAdded = updated.filter(
        (n) => !previousIds.has(n.id) && !n.read && (n.severity === "urgent" || n.severity === "warning")
      );
      if (newlyAdded.length > 0) {
        setActiveToast(newlyAdded[0]);
        // Dispara notificação nativa do navegador/SO se permitido
        newlyAdded.forEach((n) => dispatchBrowserNotification(n));
      }

      return updated;
    });
  }, [
    agenda,
    lancamentos,
    consultas,
    infracoes,
    manutencoes,
    servicos,
    veiculos,
    itensMercado,
    lembretesSaude,
    registrosSaude,
  ]);

  // Run notification check on data changes and periodically every 60 seconds
  useEffect(() => {
    checkNotifications();
    const interval = setInterval(() => {
      checkNotifications();
    }, 60 * 1000);
    return () => clearInterval(interval);
  }, [checkNotifications]);

  const handleDismissNotification = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const handleDismissAllNotifications = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleNavigateFromNotification = (view: ModuleView) => {
    setActiveView(view);
    setIsNotificationCenterOpen(false);
    setActiveToast(null);
  };

  // Load All Sheet Data safely from Google Apps Script via Express Proxy
  const handleSyncAll = useCallback(async () => {
    setSyncState((prev) => ({ ...prev, isSyncing: true, errorMessage: null }));

    try {
      const connTest = await testAppsScriptConnection();
      if (!connTest.success) {
        setSyncState((prev) => ({
          ...prev,
          isConnected: false,
          isSyncing: false,
          errorMessage: connTest.message,
        }));
        return;
      }

      // Fetch primary sheets in parallel
      const [
        fetchedLancamentos,
        fetchedAbastecimentos,
        fetchedVeiculos,
        fetchedContas,
        fetchedCartoes,
        fetchedServicos,
        fetchedManutencoes,
      ] = await Promise.all([
        fetchSheetData<Lancamento>(SHEET_NAMES.LANCAMENTOS).catch(() => null),
        fetchSheetData<Abastecimento>(SHEET_NAMES.ABASTECIMENTOS).catch(() => null),
        fetchSheetData<Veiculo>(SHEET_NAMES.VEICULOS).catch(() => null),
        fetchSheetData<ContaBancaria>(SHEET_NAMES.CONTAS_BANCARIAS).catch(() => null),
        fetchSheetData<CartaoCredito>(SHEET_NAMES.CARTOES_CREDITO).catch(() => null),
        fetchSheetData<ServicoOficina>(SHEET_NAMES.OFICINA).catch(() => null),
        fetchSheetData<ManutencaoAgendada>(SHEET_NAMES.MANUTENCOES_AGENDADAS).catch(() => null),
      ]);

      if (fetchedLancamentos) setLancamentos(fetchedLancamentos);
      if (fetchedAbastecimentos) setAbastecimentos(fetchedAbastecimentos);
      if (fetchedVeiculos && fetchedVeiculos.length > 0) setVeiculos(fetchedVeiculos);
      if (fetchedContas && fetchedContas.length > 0) {
        const activeLancs = fetchedLancamentos || lancamentos;
        const contasWithDynamicBalance = fetchedContas.map((c) => ({
          ...c,
          Saldo_Atual: calculateAccountCurrentBalance(c, activeLancs),
        }));
        setContas(contasWithDynamicBalance);
      }
      if (fetchedCartoes) setCartoes(fetchedCartoes);
      if (fetchedServicos) setServicos(fetchedServicos);
      if (fetchedManutencoes) setManutencoes(fetchedManutencoes);

      // Fetch secondary sheets in background
      fetchSheetData<ConsultaMedica>(SHEET_NAMES.CONSULTAS_MEDICAS)
        .then((data) => data && setConsultas(data))
        .catch(() => {});
      fetchSheetData<ReceitaMedica>(SHEET_NAMES.RECEITAS_MEDICAS)
        .then((data) => data && setReceitas(data))
        .catch(() => {});
      fetchSheetData<Infracao>(SHEET_NAMES.INFRACOES)
        .then((data) => data && setInfracoes(data))
        .catch(() => {});
      fetchSheetData<ZonaDeRisco>(SHEET_NAMES.ZONAS_RISCO)
        .then((data) => data && setZonasRisco(data))
        .catch(() => {});
      fetchSheetData<ItemMercado>(SHEET_NAMES.LISTA_MERCADO)
        .then((data) => data && setItensMercado(data))
        .catch(() => {});
      fetchSheetData<CompromissoAgenda>(SHEET_NAMES.AGENDA)
        .then((data) => data && setAgenda(data))
        .catch(() => {});
      fetchSheetData<RegistroSaude>(SHEET_NAMES.CONTROLE_SAUDE)
        .then((data) => data && setRegistrosSaude(data))
        .catch(() => {});
      fetchSheetData<LembreteSaudeConfig>(SHEET_NAMES.CONFIG_LEMBRETES_SAUDE)
        .then((data) => data && data.length > 0 && setLembretesSaude(data))
        .catch(() => {});
      fetchSheetData<AlimentoAnaliseResult>(SHEET_NAMES.ANALISE_ALIMENTOS)
        .then((data) => data && setAlimentos(data))
        .catch(() => {});
      fetchSheetData<ExercicioRegistro>(SHEET_NAMES.EXERCICIOS)
        .then((data) => data && setExercicios(data))
        .catch(() => {});
      fetchSheetData<ConsumoCafe>(SHEET_NAMES.CONSUMO_CAFE)
        .then((data) => data && setConsumosCafe(data))
        .catch(() => {});
      fetchSheetData<any>(SHEET_NAMES.CONSUMO_AGUA)
        .then((data) => {
          if (data && Array.isArray(data)) {
            const cfg = data.find((item) => item.id === "CONFIG_AGUA" || item.Id === "CONFIG_AGUA");
            if (cfg) {
              setConfigAgua({
                id: "CONFIG_AGUA",
                Id: "CONFIG_AGUA",
                metaDiariaMl: Number(cfg.metaDiariaMl || cfg.Meta_Diaria_Ml || 2500),
                tamanhoCopoMl: Number(cfg.tamanhoCopoMl || cfg.Tamanho_Copo_Ml || 500),
              });
            }
            const logs = data.filter((item) => item.id !== "CONFIG_AGUA" && item.Id !== "CONFIG_AGUA");
            setConsumosAgua(logs);
          }
        })
        .catch(() => {});
      fetchSheetData<MetaCategoria>(SHEET_NAMES.METAS_CATEGORIA)
        .then((data) => data && setMetas(data))
        .catch(() => {});
      fetchSheetData<CategoriaCustomizada>(SHEET_NAMES.CATEGORIAS_CUSTOMIZADAS)
        .then((data) => data && setCategoriasCustom(data))
        .catch(() => {});

      setSyncState({
        isConnected: true,
        isSyncing: false,
        lastSyncedAt: new Date().toISOString(),
        errorMessage: null,
        hasCustomUrl: true,
        pendingCount: 0,
      });
    } catch (err: any) {
      console.error("[Sync Error]:", err);
      setSyncState((prev) => ({
        ...prev,
        isSyncing: false,
        errorMessage: err.message || "Erro durante a sincronização.",
      }));
    }
  }, []);

  useEffect(() => {
    handleSyncAll();
  }, [handleSyncAll]);

  // Handler: Save Lancamento (with automatic bank account dynamic balance recalculation)
  const handleSaveLancamento = async (itemOrItems: Lancamento | Lancamento[]) => {
    const rawItemsArray = Array.isArray(itemOrItems) ? itemOrItems : [itemOrItems];
    if (rawItemsArray.length === 0) return;

    // Apply uppercase sanitization to all saved items (both on create and edit)
    const itemsArray: Lancamento[] = rawItemsArray.map((it) => sanitizeRecordToUppercase(it));

    let nextLancamentos = [...lancamentos];
    itemsArray.forEach((item) => {
      const idx = nextLancamentos.findIndex((l) => l.Id === item.Id);
      if (idx !== -1) {
        nextLancamentos[idx] = item;
      } else {
        nextLancamentos.unshift(item);
      }
    });
    setLancamentos(nextLancamentos);

    // Recalculate and update affected accounts locally and on sheet
    const updatedContasToSave: ContaBancaria[] = contas.map((c) => {
      const novoSaldo = calculateAccountCurrentBalance(c, nextLancamentos);
      return { ...c, Saldo_Atual: novoSaldo };
    });
    setContas(updatedContasToSave);

    try {
      await saveSheetRecords(SHEET_NAMES.LANCAMENTOS, itemsArray, "UPSERT");
      if (updatedContasToSave.length > 0) {
        await saveSheetRecords(SHEET_NAMES.CONTAS_BANCARIAS, updatedContasToSave, "UPSERT");
      }
    } catch (err: any) {
      alert(`Erro ao salvar na planilha: ${err.message || err}`);
    }
  };

  // Handler: Delete Lancamento (with automatic bank account dynamic balance recalculation)
  const handleDeleteLancamento = async (idOrIds: string | string[], skipConfirm: boolean = false) => {
    const idsToDelete = Array.isArray(idOrIds) ? idOrIds : [idOrIds];
    if (idsToDelete.length === 0) return;

    if (!skipConfirm) {
      const msg = idsToDelete.length > 1
        ? `Deseja realmente excluir estes ${idsToDelete.length} lançamentos?`
        : "Deseja realmente marcar este lançamento como excluído?";
      if (!window.confirm(msg)) return;
    }

    const idSet = new Set(idsToDelete.map((id) => String(id).trim()));
    const itemsToDelete = lancamentos.filter((l) => idSet.has(String(l.Id).trim()));
    const nextLancamentos = lancamentos.filter(
      (l) => !idSet.has(String(l.Id).trim())
    );
    setLancamentos(nextLancamentos);

    const updatedContasToSave: ContaBancaria[] = contas.map((c) => {
      const novoSaldo = calculateAccountCurrentBalance(c, nextLancamentos);
      return { ...c, Saldo_Atual: novoSaldo };
    });
    setContas(updatedContasToSave);

    try {
      const payload = itemsToDelete.length > 0
        ? itemsToDelete.map((item) => ({ ...item, Status: "EXCLUÍDO" as const }))
        : idsToDelete.map((id) => ({ Id: id, Status: "EXCLUÍDO" as const }));
      await saveSheetRecords(SHEET_NAMES.LANCAMENTOS, payload, "SOFT_DELETE");
      if (updatedContasToSave.length > 0) {
        await saveSheetRecords(SHEET_NAMES.CONTAS_BANCARIAS, updatedContasToSave, "UPSERT");
      }
    } catch (err: any) {
      alert(`Erro ao excluir lançamento: ${err.message || err}`);
    }
  };

  // Generic Save
  const handleSaveGeneric = async (
    sheetName: string,
    item: any,
    setStateFn: React.Dispatch<React.SetStateAction<any[]>>
  ) => {
    const targetId = String(item.Id || item.id || item.ID || `ID_${Date.now()}`);
    const rawNormalized = {
      ...item,
      Id: targetId,
      id: targetId,
    };
    // Sanitize both creates and updates with UPPERCASE
    const normalizedItem = sanitizeRecordToUppercase(rawNormalized);

    setStateFn((prev) => {
      const idx = prev.findIndex((i) => String(i.Id || i.id).trim() === targetId.trim());
      if (idx !== -1) {
        const next = [...prev];
        next[idx] = normalizedItem;
        return next;
      }
      return [normalizedItem, ...prev];
    });

    try {
      await saveSheetRecords(sheetName, [normalizedItem], "UPSERT");
    } catch (err: any) {
      alert(`Erro ao gravar na aba ${sheetName}: ${err.message || err}`);
    }
  };

  // Generic Delete
  const handleDeleteGeneric = async (
    sheetName: string,
    id: string,
    setStateFn: React.Dispatch<React.SetStateAction<any[]>>
  ) => {
    const targetId = String(id).trim();
    setStateFn((prev) => prev.filter((i) => String(i.Id || i.id).trim() !== targetId));

    try {
      await saveSheetRecords(sheetName, [{ Id: targetId, id: targetId }], "SOFT_DELETE");
    } catch (err: any) {
      alert(`Erro ao excluir na aba ${sheetName}: ${err.message || err}`);
    }
  };

  const handleSaveLembretesConfigs = async (configs: LembreteSaudeConfig[]) => {
    setLembretesSaude(configs);
    try {
      await saveSheetRecords(SHEET_NAMES.CONFIG_LEMBRETES_SAUDE, configs, "UPSERT");
    } catch (err: any) {
      console.error("Erro ao salvar configurações de lembretes:", err);
      alert(`Erro ao salvar configurações de lembretes na planilha: ${err.message || err}`);
    }
  };

  const handleSaveAltura = async (novaAlturaCm: number) => {
    setAlturaUsuario(novaAlturaCm);
    localStorage.setItem("financas_gaeta_altura_usuario", String(novaAlturaCm));

    const configRecord: LembreteSaudeConfig = {
      Id: "CONFIG_PERFIL_ALTURA",
      Tipo: "Perfil_Altura",
      Ativo: "SIM",
      Horario_1: String(novaAlturaCm),
      Horario_2: "",
      Horario_3: "",
      Dias_Semana: "TODOS",
      Ultima_Atualizacao: new Date().toLocaleString("pt-BR"),
    };

    setLembretesSaude((prev) => {
      const idx = prev.findIndex(
        (p) =>
          p.Id === "CONFIG_PERFIL_ALTURA" ||
          p.id === "CONFIG_PERFIL_ALTURA" ||
          p.Tipo === "Perfil_Altura" ||
          p.tipo === "Perfil_Altura"
      );
      if (idx !== -1) {
        const next = [...prev];
        next[idx] = configRecord;
        return next;
      }
      return [...prev, configRecord];
    });

    try {
      await saveSheetRecords(SHEET_NAMES.CONFIG_LEMBRETES_SAUDE, [configRecord], "UPSERT");
    } catch (err: any) {
      console.error("Erro ao salvar altura na planilha:", err);
      alert(`Erro ao salvar altura na planilha: ${err.message || err}`);
    }
  };

  const handleSaveConfigAgua = async (config: ConfigAgua) => {
    setConfigAgua(config);
    try {
      const configItem = {
        Id: "CONFIG_AGUA",
        id: "CONFIG_AGUA",
        Meta_Diaria_Ml: config.metaDiariaMl,
        metaDiariaMl: config.metaDiariaMl,
        Tamanho_Copo_Ml: config.tamanhoCopoMl,
        tamanhoCopoMl: config.tamanhoCopoMl,
        Data_Criacao: config.dataCriacao || new Date().toISOString(),
        dataCriacao: config.dataCriacao || new Date().toISOString(),
        Observacoes: "CONFIG_USUARIO",
      };
      await saveSheetRecords(SHEET_NAMES.CONSUMO_AGUA, [configItem], "UPSERT");
    } catch (err: any) {
      console.error("Erro ao salvar configurações de água na planilha:", err);
      alert(`Erro ao salvar configurações de água na planilha: ${err.message || err}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased flex flex-col w-full max-w-full overflow-x-hidden">
      {/* Top Sync Status Bar */}
      <SyncStatusBanner
        syncState={syncState}
        onSyncNow={handleSyncAll}
        onOpenSetup={() => setIsSetupModalOpen(true)}
        onOpenSecurity={() => setIsSecurityModalOpen(true)}
        isBiometricsActive={isBiometricsActive}
      />

      {/* Main Navigation */}
      <Navigation
        activeView={activeView}
        onSelectView={setActiveView}
        notificationCount={notifications.filter((n) => !n.read).length}
        onOpenNotifications={() => setIsNotificationCenterOpen(true)}
        onOpenSecurity={() => setIsSecurityModalOpen(true)}
        isBiometricsActive={isBiometricsActive}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        {activeView === "dashboard" && (
          <Dashboard
            lancamentos={lancamentos}
            metas={metas}
            abastecimentos={abastecimentos}
            veiculos={veiculos}
            syncState={syncState}
            onNavigate={setActiveView}
            onOpenNewLancamentoModal={() => {
              setIsFuelingModeModal(false);
              setIsLancamentoModalOpen(true);
            }}
            onOpenNewAbastecimentoModal={() => {
              setIsFuelingModeModal(true);
              setIsLancamentoModalOpen(true);
            }}
            onOpenSetup={() => setIsSetupModalOpen(true)}
            onOpenSecurity={() => setIsSecurityModalOpen(true)}
            isBiometricsActive={isBiometricsActive}
          />
        )}

        {activeView === "lancamentos" && (
          <LancamentosView
            lancamentos={lancamentos}
            veiculos={veiculos}
            contas={contas}
            cartoes={cartoes}
            categoriasCustom={categoriasCustom}
            onSaveLancamento={handleSaveLancamento}
            onSaveCategoria={(cat) =>
              handleSaveGeneric(SHEET_NAMES.CATEGORIAS_CUSTOMIZADAS, cat, setCategoriasCustom)
            }
            onDeleteLancamento={handleDeleteLancamento}
            isModalOpen={isLancamentoModalOpen}
            onOpenModal={() => {
              setIsFuelingModeModal(false);
              setIsLancamentoModalOpen(true);
            }}
            onCloseModal={() => setIsLancamentoModalOpen(false)}
            initialFuelingMode={isFuelingModeModal}
          />
        )}

        {activeView === "painel_contas" && (
          <PainelContasView
            lancamentos={lancamentos}
            onSaveLancamento={handleSaveLancamento}
          />
        )}

        {activeView === "abastecimentos" && (
          <AbastecimentosView
            lancamentos={lancamentos}
            onOpenNewFueling={() => {
              setIsFuelingModeModal(true);
              setIsLancamentoModalOpen(true);
              setActiveView("lancamentos");
            }}
          />
        )}

        {activeView === "indicacoes_postos" && (
          <IndicacoesPostosView lancamentos={lancamentos} />
        )}

        {activeView === "veiculos" && (
          <VeiculosOficinaView
            veiculos={veiculos}
            servicos={servicos}
            manutencoes={manutencoes}
            onSaveVeiculo={(v) => handleSaveGeneric(SHEET_NAMES.VEICULOS, v, setVeiculos)}
            onSaveServico={(s) => handleSaveGeneric(SHEET_NAMES.OFICINA, s, setServicos)}
            onSaveManutencao={(m) => handleSaveGeneric(SHEET_NAMES.MANUTENCOES_AGENDADAS, m, setManutencoes)}
            onDeleteVeiculo={(id) => handleDeleteGeneric(SHEET_NAMES.VEICULOS, id, setVeiculos)}
            onDeleteServico={(id) => handleDeleteGeneric(SHEET_NAMES.OFICINA, id, setServicos)}
            onDeleteManutencao={(id) => handleDeleteGeneric(SHEET_NAMES.MANUTENCOES_AGENDADAS, id, setManutencoes)}
          />
        )}

        {activeView === "contas" && (
          <ContasCartoesView
            contas={contas}
            cartoes={cartoes}
            lancamentos={lancamentos}
            onSaveConta={(c) => handleSaveGeneric(SHEET_NAMES.CONTAS_BANCARIAS, c, setContas)}
            onSaveCartao={(card) => handleSaveGeneric(SHEET_NAMES.CARTOES_CREDITO, card, setCartoes)}
            onDeleteConta={(id) => handleDeleteGeneric(SHEET_NAMES.CONTAS_BANCARIAS, id, setContas)}
            onDeleteCartao={(id) => handleDeleteGeneric(SHEET_NAMES.CARTOES_CREDITO, id, setCartoes)}
          />
        )}

        {activeView === "metas" && (
          <MetasCategoriasView
            metas={metas}
            categoriasCustom={categoriasCustom}
            lancamentos={lancamentos}
            onSaveMeta={(meta) => handleSaveGeneric(SHEET_NAMES.METAS_CATEGORIA, meta, setMetas)}
            onSaveCategoria={(cat) => handleSaveGeneric(SHEET_NAMES.CATEGORIAS_CUSTOMIZADAS, cat, setCategoriasCustom)}
            onDeleteMeta={(id) => handleDeleteGeneric(SHEET_NAMES.METAS_CATEGORIA, id, setMetas)}
            onDeleteCategoria={(id) => handleDeleteGeneric(SHEET_NAMES.CATEGORIAS_CUSTOMIZADAS, id, setCategoriasCustom)}
          />
        )}

        {activeView === "saude" && (
          <SaudeInfracoesView
            consultas={consultas}
            receitas={receitas}
            infracoes={infracoes}
            registrosSaude={registrosSaude}
            lembretesConfigs={lembretesSaude}
            alimentos={alimentos}
            exercicios={exercicios}
            consumosCafe={consumosCafe}
            consumosAgua={consumosAgua}
            configAgua={configAgua}
            veiculos={veiculos}
            alturaUsuario={alturaUsuario}
            onSaveAltura={handleSaveAltura}
            onSaveConsulta={(c) => handleSaveGeneric(SHEET_NAMES.CONSULTAS_MEDICAS, c, setConsultas)}
            onSaveReceita={(r) => handleSaveGeneric(SHEET_NAMES.RECEITAS_MEDICAS, r, setReceitas)}
            onSaveInfracao={(inf) => handleSaveGeneric(SHEET_NAMES.INFRACOES, inf, setInfracoes)}
            onSaveRegistroSaude={(reg) => handleSaveGeneric(SHEET_NAMES.CONTROLE_SAUDE, reg, setRegistrosSaude)}
            onSaveLembretesConfigs={handleSaveLembretesConfigs}
            onSaveAlimento={(alim) => handleSaveGeneric(SHEET_NAMES.ANALISE_ALIMENTOS, alim, setAlimentos)}
            onSaveExercicio={(exe) => handleSaveGeneric(SHEET_NAMES.EXERCICIOS, exe, setExercicios)}
            onSaveCafe={(cafe) => handleSaveGeneric(SHEET_NAMES.CONSUMO_CAFE, cafe, setConsumosCafe)}
            onSaveAgua={(agua) => handleSaveGeneric(SHEET_NAMES.CONSUMO_AGUA, agua, setConsumosAgua)}
            onDeleteAgua={(id) => handleDeleteGeneric(SHEET_NAMES.CONSUMO_AGUA, id, setConsumosAgua)}
            onSaveConfigAgua={handleSaveConfigAgua}
            onDeleteConsulta={(id) => handleDeleteGeneric(SHEET_NAMES.CONSULTAS_MEDICAS, id, setConsultas)}
            onDeleteReceita={(id) => handleDeleteGeneric(SHEET_NAMES.RECEITAS_MEDICAS, id, setReceitas)}
            onDeleteInfracao={(id) => handleDeleteGeneric(SHEET_NAMES.INFRACOES, id, setInfracoes)}
            onDeleteRegistroSaude={(id) => handleDeleteGeneric(SHEET_NAMES.CONTROLE_SAUDE, id, setRegistrosSaude)}
            onDeleteAlimento={(id) => handleDeleteGeneric(SHEET_NAMES.ANALISE_ALIMENTOS, id, setAlimentos)}
            onDeleteExercicio={(id) => handleDeleteGeneric(SHEET_NAMES.EXERCICIOS, id, setExercicios)}
            onDeleteCafe={(id) => handleDeleteGeneric(SHEET_NAMES.CONSUMO_CAFE, id, setConsumosCafe)}
          />
        )}

        {activeView === "agenda" && (
          <AgendaCompromissosView
            agenda={agenda}
            onSaveCompromisso={(item) => handleSaveGeneric(SHEET_NAMES.AGENDA, item, setAgenda)}
            onDeleteCompromisso={(id) => handleDeleteGeneric(SHEET_NAMES.AGENDA, id, setAgenda)}
          />
        )}

        {activeView === "zonas_risco" && (
          <ZonasDeRiscoView
            zonas={zonasRisco}
            onSaveZona={(z) => handleSaveGeneric(SHEET_NAMES.ZONAS_RISCO, z, setZonasRisco)}
            onDeleteZona={(id) => handleDeleteGeneric(SHEET_NAMES.ZONAS_RISCO, id, setZonasRisco)}
          />
        )}

        {activeView === "lista_mercado" && (
          <ListaMercadoView
            itens={itensMercado}
            contas={contas}
            onSaveItem={(item) => handleSaveGeneric(SHEET_NAMES.LISTA_MERCADO, item, setItensMercado)}
            onDeleteItem={(id) => handleDeleteGeneric(SHEET_NAMES.LISTA_MERCADO, id, setItensMercado)}
            onSaveLancamento={handleSaveLancamento}
            onClearLista={async () => {
              const itemsToDelete = itensMercado.map((i) => ({ Id: i.Id }));
              setItensMercado([]);
              if (itemsToDelete.length > 0) {
                try {
                  await saveSheetRecords(SHEET_NAMES.LISTA_MERCADO, itemsToDelete, "SOFT_DELETE");
                } catch (e) {
                  console.error("Erro ao limpar lista de mercado na planilha:", e);
                }
              }
            }}
          />
        )}
      </main>

      {/* Setup Modal */}
      <AppsScriptSetupModal
        isOpen={isSetupModalOpen}
        onClose={() => setIsSetupModalOpen(false)}
        onConnectedSuccess={() => {
          handleSyncAll();
        }}
      />

      {/* Notification Toast Alert */}
      <NotificationToast
        notification={activeToast}
        onClose={() => setActiveToast(null)}
        onNavigate={handleNavigateFromNotification}
      />

      {/* Notification Center Modal */}
      <NotificationCenterModal
        isOpen={isNotificationCenterOpen}
        onClose={() => setIsNotificationCenterOpen(false)}
        notifications={notifications}
        onDismiss={handleDismissNotification}
        onDismissAll={handleDismissAllNotifications}
        onNavigate={handleNavigateFromNotification}
        onRefreshNotifications={checkNotifications}
      />

      {/* Security & Biometrics Modal */}
      <SegurancaModal
        isOpen={isSecurityModalOpen}
        onClose={() => setIsSecurityModalOpen(false)}
        onStatusChanged={(active) => {
          setIsBiometricsActive(active);
          setIsSessionUnlocked(isSessionAuthenticated());
        }}
      />

      {/* Initial Session Biometric Lock Screen Overlay */}
      {isBiometricsActive && !isSessionUnlocked && (
        <BiometricLockScreen
          onUnlock={() => {
            setIsSessionUnlocked(true);
          }}
        />
      )}
    </div>
  );
}
