/**
 * Finanças Gaeta — Core Types & Interfaces
 * Matches the 19 Google Sheets tabs structure and data sync specifications.
 */

// 1. Lançamentos (Despesas, Receitas, Abastecimento)
export interface Lancamento {
  Id: string;
  Data: string; // YYYY-MM-DD
  Tipo: "Despesa" | "Receita" | "Abastecimento" | "Transferência";
  Categoria: string;
  Subcategoria?: string;
  Descricao: string;
  Valor: number;
  Conta?: string;
  Cartao?: string;
  Forma_Pagamento?: string;
  Status: "Pago" | "Pendente" | "Cancelado" | "Excluído";
  Observacoes?: string;
  Veiculo?: string; // Optional reference to vehicle if fuel/maintenance expense
  Km_Atual?: number; // Distance in KM (numerical, NOT date formatted)
  Litros?: number;
  Preco_Litro?: number;
  Posto?: string;
}

// 4. Abastecimentos (Mirror read-only view)
export interface Abastecimento {
  Id: string;
  Data: string;
  Veiculo: string;
  Km_Atual: number;
  Km_Percorrido?: number;
  Litros: number;
  Preco_Litro: number;
  Valor_Total: number;
  Posto?: string;
  Media_KmL?: number;
  Observacoes?: string;
}

// 5. Contas Bancárias
export interface ContaBancaria {
  Id: string;
  Nome: string;
  Banco: string;
  Tipo: "Corrente" | "Poupança" | "Investimento" | "Carteira" | "Outro";
  Saldo_Inicial: number;
  Saldo_Atual: number;
  Cor_Hex?: string;
  Ativa: boolean;
}

// 6. Consultas Médicas
export interface ConsultaMedica {
  Id: string;
  Data: string;
  Hora?: string;
  Especialidade: string;
  Medico?: string;
  Local?: string;
  Valor?: number;
  Status: "Agendada" | "Realizada" | "Cancelada";
  Observacoes?: string;
}

// 7. Receitas Médicas
export interface ReceitaMedica {
  Id: string;
  Data: string;
  Medicamento: string;
  Dosagem: string;
  Instrucoes: string;
  Medico?: string;
  Validade?: string;
  Ativa: boolean;
}

// 8. Infrações (Multas)
export interface Infracao {
  Id: string;
  Data: string;
  Hora?: string;
  Veiculo: string;
  Local?: string;
  Descricao: string;
  Pontos: number;
  Valor: number;
  Status_Pagamento: "Pendente" | "Pago" | "Em Recurso";
  Data_Vencimento?: string;
}

// 9. Veículos
export interface Veiculo {
  Id: string;
  Modelo: string;
  Marca: string;
  Ano: number;
  Placa: string;
  Cor?: string;
  Km_Atual: number;
  Combustivel: "Flex" | "Gasolina" | "Etanol" | "Diesel" | "Elétrico" | "Híbrido";
  Ativo: boolean;
}

// 10. Metas de Categoria
export interface MetaCategoria {
  Id: string;
  Categoria: string;
  Valor_Meta: number;
  Mes_Ano: string; // YYYY-MM
  Alerta_Porcentagem: number; // e.g. 80 for 80%
}

// 11. Categorias Customizadas
export interface CategoriaCustomizada {
  Id: string;
  Nome: string;
  Tipo: "Despesa" | "Receita";
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
  Veiculo: string;
  Km_No_Servico: number;
  Descricao_Servico: string;
  Oficina_Mecanica?: string;
  Valor_Pecas: number;
  Valor_Mao_Obra: number;
  Valor_Total: number;
  Garantia_Ate?: string;
  Observacoes?: string;
}

// 15. Manutenções Agendadas
export interface ManutencaoAgendada {
  Id: string;
  Veiculo: string;
  Item_Manutencao: string; // Óleo, Pneus, Pastilhas, Correia, etc.
  Km_Alvo?: number;
  Data_Alvo?: string;
  Status: "Pendente" | "Concluída" | "Atrasada";
  Custo_Estimado?: number;
  Observacoes?: string;
}

// 16. Lista de Mercado
export interface ItemMercado {
  Id: string;
  Item: string;
  Categoria?: string;
  Quantidade: number;
  Unidade?: string;
  Comprado: boolean;
  Preco_Estimado?: number;
}

// 17. Zonas de Risco
export interface ZonaDeRisco {
  Id: string;
  Nome_Local: string;
  Bairro_Cidade?: string;
  Nivel_Risco: "Baixo" | "Médio" | "Alto" | "Extremo";
  Tipo_Ocorrencia: "Furto" | "Roubo" | "Assalto" | "Alagamento" | "Outro";
  Observacoes?: string;
}

// 18. Cartões de Crédito
export interface CartaoCredito {
  Id: string;
  Nome: string;
  Bandeira: string;
  Limite_Total: number;
  Dia_Fechamento: number;
  Dia_Vencimento: number;
  Cor_Hex?: string;
  Ativo: boolean;
}

// 19. Agenda e Compromissos
export interface CompromissoAgenda {
  Id: string;
  Data: string;
  Hora?: string;
  Titulo: string;
  Descricao?: string;
  Prioridade: "Baixa" | "Média" | "Alta";
  Concluido: boolean;
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
} as const;

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
