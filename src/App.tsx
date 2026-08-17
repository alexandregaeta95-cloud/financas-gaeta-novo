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
  SHEET_NAMES,
} from "./types";

import {
  fetchSheetData,
  saveSheetRecords,
  getCachedSheetData,
  getSavedAppsScriptUrl,
  testAppsScriptConnection,
} from "./services/api";

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
  const [metas, setMetas] = useState<MetaCategoria[]>(() =>
    getCachedSheetData<MetaCategoria>(SHEET_NAMES.METAS_CATEGORIA)
  );
  const [categoriasCustom, setCategoriasCustom] = useState<CategoriaCustomizada[]>(() =>
    getCachedSheetData<CategoriaCustomizada>(SHEET_NAMES.CATEGORIAS_CUSTOMIZADAS)
  );
  const [perfil, setPerfil] = useState<PerfilUsuario | null>(null);

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
      if (fetchedContas && fetchedContas.length > 0) setContas(fetchedContas);
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

  // Handler: Save Lancamento
  const handleSaveLancamento = async (item: Lancamento) => {
    setLancamentos((prev) => {
      const idx = prev.findIndex((l) => l.Id === item.Id);
      if (idx !== -1) {
        const next = [...prev];
        next[idx] = item;
        return next;
      }
      return [item, ...prev];
    });

    try {
      await saveSheetRecords(SHEET_NAMES.LANCAMENTOS, [item], "UPSERT");
      handleSyncAll();
    } catch (err: any) {
      alert(`Erro ao salvar na planilha: ${err.message || err}`);
    }
  };

  // Handler: Delete Lancamento
  const handleDeleteLancamento = async (id: string) => {
    if (!window.confirm("Deseja realmente marcar este lançamento como excluído?")) return;

    setLancamentos((prev) => prev.filter((l) => l.Id !== id));

    try {
      await saveSheetRecords(SHEET_NAMES.LANCAMENTOS, [{ Id: id }], "SOFT_DELETE");
      handleSyncAll();
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
    setStateFn((prev) => {
      const idx = prev.findIndex((i) => i.Id === item.Id);
      if (idx !== -1) {
        const next = [...prev];
        next[idx] = item;
        return next;
      }
      return [item, ...prev];
    });

    try {
      await saveSheetRecords(sheetName, [item], "UPSERT");
    } catch (err: any) {
      alert(`Erro ao gravar na aba ${sheetName}: ${err.message || err}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased flex flex-col">
      {/* Top Sync Status Bar */}
      <SyncStatusBanner
        syncState={syncState}
        onSyncNow={handleSyncAll}
        onOpenSetup={() => setIsSetupModalOpen(true)}
      />

      {/* Main Navigation */}
      <Navigation activeView={activeView} onSelectView={setActiveView} />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {activeView === "dashboard" && (
          <Dashboard
            lancamentos={lancamentos}
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
          />
        )}

        {activeView === "lancamentos" && (
          <LancamentosView
            lancamentos={lancamentos}
            veiculos={veiculos}
            contas={contas}
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
            abastecimentos={abastecimentos}
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
          />
        )}

        {activeView === "contas" && (
          <ContasCartoesView
            contas={contas}
            cartoes={cartoes}
            lancamentos={lancamentos}
            onSaveConta={(c) => handleSaveGeneric(SHEET_NAMES.CONTAS_BANCARIAS, c, setContas)}
            onSaveCartao={(card) => handleSaveGeneric(SHEET_NAMES.CARTOES_CREDITO, card, setCartoes)}
          />
        )}

        {activeView === "metas" && (
          <MetasCategoriasView
            metas={metas}
            categoriasCustom={categoriasCustom}
            lancamentos={lancamentos}
            onSaveMeta={(meta) => handleSaveGeneric(SHEET_NAMES.METAS_CATEGORIA, meta, setMetas)}
            onSaveCategoria={(cat) => handleSaveGeneric(SHEET_NAMES.CATEGORIAS_CUSTOMIZADAS, cat, setCategoriasCustom)}
          />
        )}

        {activeView === "saude" && (
          <SaudeInfracoesView
            consultas={consultas}
            receitas={receitas}
            infracoes={infracoes}
            veiculos={veiculos}
            onSaveConsulta={(c) => handleSaveGeneric(SHEET_NAMES.CONSULTAS_MEDICAS, c, setConsultas)}
            onSaveReceita={(r) => handleSaveGeneric(SHEET_NAMES.RECEITAS_MEDICAS, r, setReceitas)}
            onSaveInfracao={(inf) => handleSaveGeneric(SHEET_NAMES.INFRACOES, inf, setInfracoes)}
          />
        )}

        {activeView === "agenda" && (
          <AgendaCompromissosView
            agenda={agenda}
            onSaveCompromisso={(item) => handleSaveGeneric(SHEET_NAMES.AGENDA, item, setAgenda)}
          />
        )}

        {activeView === "zonas_risco" && (
          <ZonasDeRiscoView
            zonas={zonasRisco}
            onSaveZona={(z) => handleSaveGeneric(SHEET_NAMES.ZONAS_RISCO, z, setZonasRisco)}
          />
        )}

        {activeView === "lista_mercado" && (
          <ListaMercadoView
            itens={itensMercado}
            contas={contas}
            onSaveItem={(item) => handleSaveGeneric(SHEET_NAMES.LISTA_MERCADO, item, setItensMercado)}
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
    </div>
  );
}
