/**
 * Finanças Gaeta — Core Types & Interfaces
 * Matches the 19 Google Sheets tabs structure and data sync specifications.
 */

// 1. Lançamentos (Despesas, Receitas, Abastecimento)
export interface Lancamento {
  Id: string;
  Data: string; // YYYY-MM-DD
  Tipo:
    | "DESPESA"
    | "RECEITA"
    | "ABASTECIMENTO"
    | "TRANSFERÊNCIA"
    | "Despesa"
    | "Receita"
    | "Abastecimento"
    | "Transferência"
    | string;
  Categoria: string;
  Subcategoria?: string;
  Descricao: string;
  Valor: number;
  Valor_Pago?: number;
  Conta?: string;
  Cartao?: string;
  Forma_Pagamento?: string;
  Status:
    | "PAGO"
    | "PENDENTE"
    | "CANCELADO"
    | "EXCLUÍDO"
    | "Pago"
    | "Pendente"
    | "Cancelado"
    | "Excluído"
    | string;
  Observacoes?: string;
  Veiculo?: string; // Optional reference to vehicle if fuel/maintenance expense
  Km_Atual?: number; // Distance in KM (numerical, NOT date formatted)
  Litros?: number;
  Preco_Litro?: number;
  Posto?: string;
  Motorista?: string;
  Completou_O_Tanque?: boolean | string;
  Km_Percorrido?: number;
  Media_KmL?: number;
  Descricao_Do_Veiculo?: string;
  Nome_Posto?: string;
  Localizacao_Do_Posto?: string;
  Comprovante_Url?: string;
  Tipo_Combustivel?: string; // Álcool, Álcool Aditivado, Gasolina Comum, Gasolina Aditivada
  Recorrencia_Id?: string;
  Parcela_Info?: string;
}

// 4. Abastecimentos (Mirror read-only view)
export interface Abastecimento {
  Id: string;
  Data: string;
  Veiculo: string;
  Descricao_Do_Veiculo?: string;
  Motorista?: string;
  Km_Atual: number;
  Km_Percorrido?: number;
  Litros: number;
  Preco_Litro: number;
  Valor_Total: number;
  Posto?: string;
  Nome_Posto?: string;
  Localizacao_Do_Posto?: string;
  Completou_O_Tanque?: boolean | string;
  Comprovante_Url?: string;
  Media_KmL?: number;
  Observacoes?: string;
  Tipo_Combustivel?: string;
}

// 5. Contas Bancárias
export interface ContaBancaria {
  Id: string;
  Nome: string;
  Saldo_Inicial: number;
  Saldo_Atual?: number;
  Cor?: string;
  Ícone?: string;
  Tipo: string; // BANCO / PESSOAL / Corrente / Poupança
  Agência?: string;
  Conta?: string;
  Limite?: number;
  Ativa: boolean;
}

// 6. Consultas Médicas
export interface ConsultaMedica {
  Id: string;
  Especialidade: string;
  Médico?: string;
  Data: string;
  Horas?: string;
  Local?: string;
  Lembrete_Ativo?: "SIM" | "NÃO";
  Status: "Agendada" | "Realizada" | "Cancelada";
  Observação?: string;
  // Aliases
  Medico?: string;
  Observacoes?: string;
}

// 7. Receitas Médicas
export interface ReceitaMedica {
  Id: string;
  Medicamento: string;
  Dosagem?: string;
  Frequência?: string;
  Médico?: string;
  Data_Emissão?: string;
  Data_Validade?: string;
  Data_Vencimento?: string;
  Instruções?: string;
  Especialidade?: string;
  Observação?: string;
  Arquivo_Anexo?: string;
  Ativa?: boolean;
}

// 8. Infrações (Multas)
export interface Infracao {
  Id: string;
  Protocolo?: string;
  Título?: string;
  Veículo: string;
  Placa?: string;
  Data: string;
  Descrição: string;
  Valor: number;
  Pontos?: number;
  Status: "EM_ANALISE" | "APROVADO" | "NEGADO" | "Pago" | "Pendente";
  Localização?: string;
  Observação?: string;
}

// 9. Veículos
export interface Veiculo {
  Id: string;
  Descrição?: string;
  Motorista?: string;
  Placa: string;
  Renavam?: string;
  Chassi?: string;
  Marca: string;
  Modelo: string;
  Ano: number;
  Ano_Fabricação?: number;
  Combustível: string;
  Km_Atual: number;
  Ativo: boolean;
}

// 10. Metas de Categoria
export interface MetaCategoria {
  Id: string;
  Categoria: string;
  Valor_Meta: number;
  Mes_Ano?: string; // YYYY-MM
  Alerta_Porcentagem?: number; // e.g. 80 for 80%
}

// 11. Categorias Customizadas
export interface CategoriaCustomizada {
  Id: string;
  Nome: string;
  Tipo: "Despesa" | "Receita" | "DESPESA" | "RECEITA";
  Icone?: string;
  Cor_Hex?: string;
}

// 12. Análises
export interface Analise {
  Id: string;
  Metrica: string;
  Valor: string;
  Data_Atualizacao: string;
  Detalhes?: string;
}

// 13. Perfil
export interface PerfilUsuario {
  Id: string;
  Nome: string;
  Email?: string;
  Chave_Pix?: string;
  Moeda: string;
  Ultima_Sincronizacao?: string;
}

// 14. Oficina (Serviços realizados)
export interface ServicoOficina {
  Id: string;
  Data: string;
  Descrição: string;
  KM: number;
  Valor_A_PG?: number;
  Valor_Pago: number;
  Oficina_Nome?: string;
  Comprovante_Url?: string;
  Observações?: string;
  VeiculoID?: string;
  Veiculo?: string;
}

// 15. Manutenções Agendadas
export interface ManutencaoAgendada {
  Id: string;
  Veículo: string;
  Descrição: string;
  Tipo_Agendamento?: "Data" | "KM" | "Ambos";
  Data_Alvo?: string;
  KM_Alvo?: number;
  Recorrente?: "SIM" | "NÃO";
  Frequência_Meses?: number;
  Frequência_KM?: number;
  Status: "PENDENTE" | "CONCLUÍDO" | "Pendente" | "Concluída";
  Prioridade?: "Baixa" | "Média" | "Alta";
  Oficina_Nome?: string;
  Observações?: string;
}

// 16. Lista de Mercado
export interface ItemMercado {
  Id: string;
  Item: string;
  Categoria?: string;
  Quantidade: number;
  Unidade?: string;
  Valor_Unitário?: number;
  Valor_Total?: number;
  Valor_Estimado?: number;
  Preco_Estimado?: number;
  Data_Pedido?: string;
  Data_Compra?: string;
  Data_Lembrete?: string; // YYYY-MM-DD
  Hora_Lembrete?: string; // HH:mm
  Lembrete_Ativo?: "SIM" | "NÃO" | boolean;
  Comprado: boolean | "SIM" | "NÃO";
  Observação?: string;
}

// 17. Zonas de Risco
export interface ZonaDeRisco {
  Id: string;
  Descrição: string;
  Nome_Local?: string;
  Bairro_Cidade?: string;
  Nivel_Risco?: string;
  Tipo_Ocorrencia?: string;
  Nível_De_Risco: "BAIXO" | "MÉDIO" | "ALTO" | "EXTREMO";
  Latitude: number;
  Longitude: number;
  "Raio_(M)": number;
  Ativo: "SIM" | "NÃO" | boolean;
  Mensagem_De_Alerta?: string;
  Data_Registro?: string;
  Observação?: string;
  Observacoes?: string;
}

// 18. Cartões de Crédito (A-Id, B-Nome, C-Bandeira, D-Limite_Total, E-Dia_Fechamento, F-Dia_Vencimento, G-Cor_Hex, H-Ativo)
export interface CartaoCredito {
  Id: string;
  Nome: string;
  Bandeira?: string;
  Limite_Total: number;
  Dia_Fechamento: number; // Dia do mês
  Dia_Vencimento: number; // Dia do mês
  Cor_Hex?: string;
  Ativo: boolean | "SIM" | "NÃO";
  // Compatibilidade e cálculos dinâmicos
  Limite?: number;
  Fechamento?: number;
  Vencimento?: number;
  Cor?: string;
  Banco_ID?: string;
  Gasto?: number;
}

// 19. Agenda e Compromissos
export interface CompromissoAgenda {
  Id: string;
  Titulo: string;
  Data: string;
  Hora?: string;
  Descrição?: string;
  Cor_De_Identificação?: string;
  "Efeito_Alerta_(Piscando)"?: "SIM" | "NÃO";
  Lembrete_Ativo?: "SIM" | "NÃO";
  Dias_De_Antecedência?: number;
  Concluído: boolean | "SIM" | "NÃO";
  Categoria?: string;
}

// Tab Names Mapping Constant
export const SHEET_NAMES = {
  LANCAMENTOS: "1_Lancamentos",
  ABASTECIMENTOS: "4_Abastecimentos",
  CONTAS_BANCARIAS: "5_Contas_Bancarias",
  CONSULTAS_MEDICAS: "6_Consultas_Médicas",
  RECEITAS_MEDICAS: "7_Receitas_Médicas",
  INFRACOES: "8_Infracoes",
  VEICULOS: "9_Veiculos",
  METAS_CATEGORIA: "10_Metas_De_Categoria",
  CATEGORIAS_CUSTOMIZADAS: "11_Categorias_Customizadas",
  ANALISES: "12_Analises",
  PERFIL: "13_Perfil",
  OFICINA: "14_Oficina",
  MANUTENCOES_AGENDADAS: "15_Manutenções_Agendadas",
  LISTA_MERCADO: "16_Lista_De_Mercado",
  ZONAS_RISCO: "17_Zonas_De_Risco",
  CARTOES_CREDITO: "18_Cartões_De_Crédito",
  AGENDA: "19_Agenda_E_Compromissos",
  CONTROLE_SAUDE: "20_Controle_Saude",
  ANALISE_ALIMENTOS: "21_Analise_Alimentos",
  CONFIG_LEMBRETES_SAUDE: "22_Config_Lembretes_Saude",
} as const;

export interface RegistroSaude {
  Id: string;
  Tipo_Registro: "PESO" | "PRESSAO" | "GLICEMIA" | string;
  Data_Hora: string; // YYYY-MM-DD or YYYY-MM-DDTHH:mm
  Valor_Principal: number; // Peso in kg, Sistólica in mmHg, or Glicemia in mg/dL
  Valor_Secundario?: number; // Diastólica in mmHg
  Batimentos_Bpm?: number; // Batimentos Cardíacos (bpm) - opcional para Pressão Arterial
  Contexto?: "JEJUM" | "POS_REFEICAO" | string; // For Glicemia
  Observacoes?: string;
  Data_Criacao?: string;
}

export type SheetNameKey = keyof typeof SHEET_NAMES;

// System Sync State & API Response Types
export interface SyncState {
  isConnected: boolean;
  isSyncing: boolean;
  lastSyncedAt: string | null;
  errorMessage: string | null;
  hasCustomUrl: boolean;
  pendingCount: number;
}

export interface ApiResponse<T = any> {
  status: "success" | "error";
  data?: T;
  message?: string;
  sheet?: string;
  updatedCount?: number;
}

// 20. Sistema de Notificações do Aplicativo
export interface AppNotification {
  id: string;
  type: "agenda" | "saude" | "veiculos" | "financas" | "mercado";
  title: string;
  message: string;
  targetView: "agenda" | "saude" | "veiculos" | "lancamentos" | "painel_contas" | "lista_mercado" | "contas";
  severity: "info" | "warning" | "urgent";
  timestamp: number;
  read?: boolean;
  dateStr?: string;
}

// 21. Análise Nutricional de Alimentos (IA)
export interface AlimentoItem {
  item: string;
  porcaoAproximada?: string;
  calorias?: number;
  proteinas?: number;
}

export interface AlimentoAnaliseResult {
  id: string;
  data: string; // YYYY-MM-DD
  dataHora?: string;
  nomePrato: string;
  descricao?: string;
  caloriasEstimadas: number;
  proteinasEstimadas: number;
  carboidratosEstimados?: number;
  gordurasEstimadas?: number;
  itensIdentificados: AlimentoItem[];
  dicasNutricionais?: string;
  imagemPreview?: string;
  observacoes?: string;
}

// 22. Configuração de Lembretes Diários de Saúde e Perfil Biométrico
export interface LembreteSaudeConfig {
  id: string; // 'LEMBRETE_PRESSAO' | 'LEMBRETE_GLICEMIA' | 'CONFIG_PERFIL_ALTURA'
  tipo: "Pressao_Arterial" | "Glicemia" | "Perfil_Altura" | string;
  ativo: boolean | string;
  horario1?: string;
  horario2?: string;
  horario3?: string;
  diasSemana?: string;
  ultimaAtualizacao?: string;
  [key: string]: any;
}

export interface PerfilBiometricoConfig {
  alturaCm: number;
  ultimaAtualizacao?: string;
}
