import {
  AppNotification,
  CompromissoAgenda,
  ConsultaMedica,
  ReceitaMedica,
  Infracao,
  Veiculo,
  ManutencaoAgendada,
  ServicoOficina,
  Lancamento,
  CartaoCredito,
  ItemMercado,
  LembreteSaudeConfig,
  RegistroSaude,
} from "../types";
import { formatCurrency } from "../utils/formatters";

// Helper: Calculate diff in days between today and target date YYYY-MM-DD
export function getDiffInDaysFromToday(dateStr: string): number | null {
  if (!dateStr || typeof dateStr !== "string") return null;
  const parts = dateStr.trim().split("-");
  if (parts.length !== 3) return null;

  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);

  if (isNaN(year) || isNaN(month) || isNaN(day)) return null;

  const target = new Date(year, month, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);

  const diffTime = target.getTime() - today.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

// Check if browser notification is supported
export function isBrowserNotificationSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

// Get current permission status
export function getNotificationPermissionStatus(): NotificationPermission | "unsupported" {
  if (!isBrowserNotificationSupported()) return "unsupported";
  return Notification.permission;
}

// Request permission
export async function requestBrowserNotificationPermission(): Promise<boolean> {
  if (!isBrowserNotificationSupported()) return false;
  try {
    const result = await Notification.requestPermission();
    return result === "granted";
  } catch {
    return false;
  }
}

// Dispatch native browser notification with deduplication
export function dispatchBrowserNotification(notif: AppNotification): void {
  if (!isBrowserNotificationSupported() || Notification.permission !== "granted") {
    return;
  }

  const todayStr = new Date().toISOString().split("T")[0];
  const storageKey = `gaeta_notif_sent_${notif.id}_${todayStr}`;

  // If already sent today to OS notification, skip to avoid spamming
  if (localStorage.getItem(storageKey)) {
    return;
  }

  try {
    const icon = "/favicon.ico";
    const notification = new Notification(notif.title, {
      body: notif.message,
      icon,
      tag: notif.id,
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    localStorage.setItem(storageKey, "1");
  } catch (err) {
    console.warn("Erro ao disparar notificação do navegador:", err);
  }
}

// Check days since last calibration
export function getDaysSinceLastTireCalibration(): number {
  const lastDate = localStorage.getItem("gaeta_last_tire_calibration_date");
  if (!lastDate) {
    // If never registered, return 8 days to trigger reminder
    return 8;
  }
  const diff = getDiffInDaysFromToday(lastDate);
  return diff !== null ? Math.abs(diff) : 8;
}

export function registerTireCalibrationNow(): void {
  const todayStr = new Date().toISOString().split("T")[0];
  localStorage.setItem("gaeta_last_tire_calibration_date", todayStr);
}

// Core Engine Evaluator
export function evaluateAllNotifications({
  agenda = [],
  consultas = [],
  receitas = [],
  infracoes = [],
  veiculos = [],
  manutencoes = [],
  servicos = [],
  lancamentos = [],
  cartoes = [],
  itensMercado = [],
  lembretesSaude = [],
  registrosSaude = [],
}: {
  agenda?: CompromissoAgenda[];
  consultas?: ConsultaMedica[];
  receitas?: ReceitaMedica[];
  infracoes?: Infracao[];
  veiculos?: Veiculo[];
  manutencoes?: ManutencaoAgendada[];
  servicos?: ServicoOficina[];
  lancamentos?: Lancamento[];
  cartoes?: CartaoCredito[];
  itensMercado?: ItemMercado[];
  lembretesSaude?: LembreteSaudeConfig[];
  registrosSaude?: RegistroSaude[];
}): AppNotification[] {
  const list: AppNotification[] = [];
  const now = Date.now();

  // 1. AGENDA & COMPROMISSOS
  agenda.forEach((item) => {
    const isDone = item.Concluído === true || String(item.Concluído).toUpperCase() === "SIM";
    if (isDone || !item.Data) return;

    const diff = getDiffInDaysFromToday(item.Data);
    if (diff === null) return;

    const antecedence = Number(item.Dias_De_Antecedência) || 1;
    const hora = item.Hora ? ` às ${item.Hora}` : "";

    if (diff === 0) {
      list.push({
        id: `agenda_${item.Id}_hoje`,
        type: "agenda",
        title: "📅 Compromisso Hoje!",
        message: `${item.Titulo}${hora}${item.Descrição ? ` - ${item.Descrição}` : ""}`,
        targetView: "agenda",
        severity: "urgent",
        timestamp: now,
      });
    } else if (diff > 0 && diff <= antecedence) {
      list.push({
        id: `agenda_${item.Id}_ant_${diff}`,
        type: "agenda",
        title: `📅 Lembrete de Compromisso (${diff === 1 ? "Amanhã" : `em ${diff} dias`})`,
        message: `${item.Titulo}${hora} no dia ${item.Data}`,
        targetView: "agenda",
        severity: "warning",
        timestamp: now,
      });
    } else if (diff < 0) {
      list.push({
        id: `agenda_${item.Id}_atrasado`,
        type: "agenda",
        title: "⚠️ Compromisso em Atraso",
        message: `${item.Titulo} previsto para ${item.Data} ainda não foi marcado como concluído.`,
        targetView: "agenda",
        severity: "warning",
        timestamp: now,
      });
    }
  });

  // 2. SAÚDE & INFRAÇÕES
  // A. Consultas Médicas
  consultas.forEach((c) => {
    if (c.Status !== "Agendada" || !c.Data) return;
    const diff = getDiffInDaysFromToday(c.Data);
    if (diff === null) return;

    const medicoStr = c.Médico || c.Medico ? ` com Dr(a). ${c.Médico || c.Medico}` : "";
    const horaStr = c.Horas ? ` às ${c.Horas}` : "";

    if (diff === 0) {
      list.push({
        id: `consulta_${c.Id}_hoje`,
        type: "saude",
        title: "🩺 Consulta Médica Hoje!",
        message: `${c.Especialidade}${medicoStr}${horaStr}${c.Local ? ` em ${c.Local}` : ""}`,
        targetView: "saude",
        severity: "urgent",
        timestamp: now,
      });
    } else if (diff > 0 && diff <= 3) {
      list.push({
        id: `consulta_${c.Id}_prox`,
        type: "saude",
        title: `🩺 Consulta Médica (${diff === 1 ? "Amanhã" : `em ${diff} dias`})`,
        message: `${c.Especialidade}${medicoStr}${horaStr} no dia ${c.Data}`,
        targetView: "saude",
        severity: "warning",
        timestamp: now,
      });
    }
  });

  // B. Receitas Médicas
  receitas.forEach((r) => {
    const dataValidade = r.Data_Validade || r.Data_Vencimento;
    if (!dataValidade) return;
    const diff = getDiffInDaysFromToday(dataValidade);
    if (diff === null) return;

    if (diff >= 0 && diff <= 7) {
      list.push({
        id: `receita_${r.Id}_vencendo`,
        type: "saude",
        title: `💊 Receita Vencendo (${diff === 0 ? "Hoje" : `em ${diff} dias`})`,
        message: `A receita de ${r.Medicamento} vence em ${dataValidade}. Providencie a renovação médica.`,
        targetView: "saude",
        severity: diff === 0 ? "urgent" : "warning",
        timestamp: now,
      });
    } else if (diff < 0) {
      list.push({
        id: `receita_${r.Id}_vencida`,
        type: "saude",
        title: "⚠️ Receita Médica Vencida",
        message: `A receita de ${r.Medicamento} venceu em ${dataValidade}.`,
        targetView: "saude",
        severity: "warning",
        timestamp: now,
      });
    }
  });

  // C. Infrações Pendentes
  infracoes.forEach((inf) => {
    const isPendente =
      inf.Status === "Pendente" ||
      inf.Status === "EM_ANALISE" ||
      String(inf.Status).toUpperCase() === "PENDENTE";
    if (!isPendente) return;

    list.push({
      id: `infracao_${inf.Id}_pendente`,
      type: "saude",
      title: "🚨 Infração de Trânsito Pendente",
      message: `${inf.Veículo || "Veículo"}: ${inf.Descrição} - R$ ${formatCurrency(inf.Valor || 0)} (${inf.Pontos || 0} pts)`,
      targetView: "saude",
      severity: "warning",
      timestamp: now,
    });
  });

  // D. Lembretes Diários de Saúde (Pressão Arterial e Glicemia - Aba 22)
  const nowDate = new Date();
  const currentHour = nowDate.getHours();
  const currentMin = nowDate.getMinutes();
  const currentTotalMins = currentHour * 60 + currentMin;
  const todayStr = nowDate.toISOString().substring(0, 10);

  lembretesSaude.forEach((cfg) => {
    const isAtivo =
      cfg.ativo === true ||
      cfg.Ativo === true ||
      cfg.ativo === "SIM" ||
      cfg.Ativo === "SIM";
    if (!isAtivo) return;

    const id = String(cfg.id || cfg.Id || "");
    const tipo = String(cfg.tipo || cfg.Tipo || "");
    const isPressao =
      id.includes("PRESSAO") ||
      tipo.toLowerCase().includes("pressao") ||
      tipo.toLowerCase().includes("arterial");
    const tipoKey = isPressao ? "PRESSAO" : "GLICEMIA";
    const tipoLabel = isPressao ? "Pressão Arterial" : "Glicemia";
    const icon = isPressao ? "🩺" : "🩸";

    const rawHorarios = [
      cfg.horario1 || cfg.Horario_1 || "",
      cfg.horario2 || cfg.Horario_2 || "",
      cfg.horario3 || cfg.Horario_3 || "",
    ].filter(Boolean);

    rawHorarios.forEach((timeStr, idx) => {
      const parts = timeStr.split(":");
      if (parts.length < 2) return;
      const h = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      if (isNaN(h) || isNaN(m)) return;

      const targetTotalMins = h * 60 + m;
      const diffMins = currentTotalMins - targetTotalMins;

      // Dispara se estiver na janela atual (do minuto exato até 45 minutos depois)
      if (diffMins >= 0 && diffMins <= 45) {
        // Verifica se já registrou uma medição correspondente hoje
        const jaRegistrouHoje = registrosSaude.some((reg) => {
          const regTipo = String(reg.Tipo_Registro || "").toUpperCase();
          const matchTipo =
            tipoKey === "PRESSAO"
              ? regTipo === "PRESSAO" || regTipo === "PRESSÃO"
              : regTipo === "GLICEMIA";
          if (!matchTipo) return false;
          return (
            reg.Data_Hora &&
            (reg.Data_Hora.startsWith(todayStr) ||
              reg.Data_Hora.substring(0, 10) === todayStr)
          );
        });

        if (!jaRegistrouHoje) {
          list.push({
            id: `lembrete_saude_${id}_slot_${idx}_${todayStr}`,
            type: "saude",
            title: `${icon} Hora de Medir ${tipoLabel}`,
            message: `Lembrete agendado (${timeStr}). Faça a medição e mantenha seu acompanhamento em dia!`,
            targetView: "saude",
            severity: diffMins <= 15 ? "urgent" : "warning",
            timestamp: now,
          });
        }
      }
    });
  });

  // 3. VEÍCULOS & OFICINA
  // A. Manutenções Agendadas
  manutencoes.forEach((m) => {
    const isPendente =
      m.Status === "PENDENTE" ||
      m.Status === "Pendente" ||
      String(m.Status).toUpperCase() === "PENDENTE";
    if (!isPendente) return;

    // Por data alvo
    if (m.Data_Alvo) {
      const diff = getDiffInDaysFromToday(m.Data_Alvo);
      if (diff !== null) {
        if (diff === 0) {
          list.push({
            id: `manutencao_${m.Id}_hoje`,
            type: "veiculos",
            title: "🔧 Manutenção Veicular Hoje!",
            message: `${m.Descrição} (${m.Veículo}) agendada para hoje.`,
            targetView: "veiculos",
            severity: "urgent",
            timestamp: now,
          });
        } else if (diff > 0 && diff <= 3) {
          list.push({
            id: `manutencao_${m.Id}_prox`,
            type: "veiculos",
            title: `🔧 Manutenção Próxima (${diff === 1 ? "Amanhã" : `em ${diff} dias`})`,
            message: `${m.Descrição} (${m.Veículo}) em ${m.Data_Alvo}.`,
            targetView: "veiculos",
            severity: "warning",
            timestamp: now,
          });
        } else if (diff < 0) {
          list.push({
            id: `manutencao_${m.Id}_atrasada`,
            type: "veiculos",
            title: "⚠️ Manutenção Veicular Atrasada",
            message: `${m.Descrição} (${m.Veículo}) estava prevista para ${m.Data_Alvo}.`,
            targetView: "veiculos",
            severity: "urgent",
            timestamp: now,
          });
        }
      }
    }

    // Por KM Alvo
    if (m.KM_Alvo && m.KM_Alvo > 0) {
      const veiculoMatch = veiculos.find(
        (v) =>
          v.Placa?.trim().toUpperCase() === m.Veículo?.trim().toUpperCase() ||
          v.Modelo?.trim().toUpperCase() === m.Veículo?.trim().toUpperCase() ||
          v.Id === m.Veículo
      );
      if (veiculoMatch && veiculoMatch.Km_Atual >= m.KM_Alvo - 300) {
        list.push({
          id: `manutencao_km_${m.Id}`,
          type: "veiculos",
          title: "🚗 Quilometragem de Manutenção Atingida!",
          message: `${m.Descrição} (${m.Veículo}): KM Alvo ${m.KM_Alvo} km atingido (KM Atual: ${veiculoMatch.Km_Atual} km).`,
          targetView: "veiculos",
          severity: "urgent",
          timestamp: now,
        });
      }
    }
  });

  // B. Lembrete de Calibragem de Pneus (7 dias)
  const daysSinceCalibration = getDaysSinceLastTireCalibration();
  if (daysSinceCalibration >= 7 && veiculos.length > 0) {
    const mainVehicle = veiculos[0];
    const veiculoNome = mainVehicle.Modelo
      ? `${mainVehicle.Marca || ""} ${mainVehicle.Modelo}`
      : "seus veículos";

    list.push({
      id: "veiculos_calibragem_pneus_7dias",
      type: "veiculos",
      title: "🚗 Lembrete: Calibragem de Pneus",
      message: `Não se esqueça de calibrar os pneus do ${veiculoNome}! Já fazem ${daysSinceCalibration} dias desde a última checagem.`,
      targetView: "veiculos",
      severity: "warning",
      timestamp: now,
    });
  }

  // 4. LANÇAMENTOS FINANCEIROS (CONTAS A PAGAR & CARTÕES)
  lancamentos.forEach((l) => {
    const isDespesa =
      l.Tipo?.toUpperCase() === "DESPESA" ||
      l.Tipo?.toUpperCase() === "ABASTECIMENTO";
    const isPendente =
      l.Status?.toLowerCase() === "pendente" ||
      String(l.Status).toUpperCase() === "PENDENTE";

    if (!isDespesa || !isPendente || !l.Data) return;

    const diff = getDiffInDaysFromToday(l.Data);
    if (diff === null) return;

    const valorFmt = formatCurrency(l.Valor || 0);

    if (diff === 0) {
      list.push({
        id: `lancamento_${l.Id}_vence_hoje`,
        type: "financas",
        title: "💳 Conta Vencendo Hoje!",
        message: `${l.Descricao}: R$ ${valorFmt} (${l.Categoria || "Despesa"})`,
        targetView: "lancamentos",
        severity: "urgent",
        timestamp: now,
      });
    } else if (diff === 1) {
      list.push({
        id: `lancamento_${l.Id}_vence_amanha`,
        type: "financas",
        title: "💳 Conta Vence Amanhã",
        message: `${l.Descricao}: R$ ${valorFmt} vence amanhã (${l.Data}).`,
        targetView: "lancamentos",
        severity: "warning",
        timestamp: now,
      });
    } else if (diff < 0) {
      list.push({
        id: `lancamento_${l.Id}_atrasado`,
        type: "financas",
        title: "🚨 Conta em Atraso!",
        message: `${l.Descricao}: R$ ${valorFmt} venceu em ${l.Data} (${Math.abs(diff)} dias atrás).`,
        targetView: "painel_contas",
        severity: "urgent",
        timestamp: now,
      });
    }
  });

  // Cartões de Crédito (Vencimento próximo no mês)
  const todayDay = new Date().getDate();
  cartoes.forEach((card) => {
    const isAtivo = card.Ativo === true || String(card.Ativo).toUpperCase() === "SIM";
    if (!isAtivo) return;

    const diaVenc = card.Dia_Vencimento || card.Vencimento;
    if (diaVenc) {
      const diffDay = diaVenc - todayDay;
      if (diffDay === 0) {
        list.push({
          id: `cartao_${card.Id}_vence_hoje`,
          type: "financas",
          title: "💳 Fatura do Cartão Vence Hoje!",
          message: `A fatura do cartão ${card.Nome} vence hoje (dia ${diaVenc}).`,
          targetView: "contas",
          severity: "urgent",
          timestamp: now,
        });
      } else if (diffDay > 0 && diffDay <= 2) {
        list.push({
          id: `cartao_${card.Id}_vence_prox`,
          type: "financas",
          title: `💳 Fatura do Cartão (${diffDay === 1 ? "Amanhã" : `em ${diffDay} dias`})`,
          message: `Fatura do cartão ${card.Nome} com vencimento no dia ${diaVenc}.`,
          targetView: "contas",
          severity: "warning",
          timestamp: now,
        });
      }
    }
  });

  // 5. LISTA DE MERCADO
  // A. Lembretes por item
  const itensComLembrete = itensMercado.filter((i) => {
    const isBought = i.Comprado === true || String(i.Comprado).toUpperCase() === "SIM";
    return !isBought && i.Data_Lembrete;
  });

  itensComLembrete.forEach((item) => {
    if (!item.Data_Lembrete) return;
    const diff = getDiffInDaysFromToday(item.Data_Lembrete);
    if (diff === null) return;

    const horaStr = item.Hora_Lembrete ? ` às ${item.Hora_Lembrete}` : "";

    if (diff === 0) {
      list.push({
        id: `mercado_item_${item.Id}_hoje`,
        type: "mercado",
        title: "🛒 Lembrete de Mercado Hoje!",
        message: `Ir comprar: ${item.Item}${horaStr} (${item.Quantidade} ${item.Unidade || "UN"})`,
        targetView: "lista_mercado",
        severity: "urgent",
        timestamp: now,
      });
    } else if (diff === 1) {
      list.push({
        id: `mercado_item_${item.Id}_amanha`,
        type: "mercado",
        title: "🛒 Lembrete de Mercado Amanhã",
        message: `Comprar ${item.Item}${horaStr} no dia ${item.Data_Lembrete}`,
        targetView: "lista_mercado",
        severity: "warning",
        timestamp: now,
      });
    } else if (diff < 0) {
      list.push({
        id: `mercado_item_${item.Id}_atrasado`,
        type: "mercado",
        title: "🛒 Lembrete de Mercado em Atraso",
        message: `Compra de ${item.Item} estava prevista para ${item.Data_Lembrete}.`,
        targetView: "lista_mercado",
        severity: "warning",
        timestamp: now,
      });
    }
  });

  // B. Lembrete geral de compras se configurado
  const generalMercadoReminder = localStorage.getItem("gaeta_mercado_general_date");
  if (generalMercadoReminder) {
    const diff = getDiffInDaysFromToday(generalMercadoReminder);
    const unboughtCount = itensMercado.filter(
      (i) => !(i.Comprado === true || String(i.Comprado).toUpperCase() === "SIM")
    ).length;

    if (diff !== null && diff <= 0 && unboughtCount > 0) {
      const horaGen = localStorage.getItem("gaeta_mercado_general_time") || "10:00";
      list.push({
        id: "mercado_general_reminder_active",
        type: "mercado",
        title: "🛒 Hora de ir ao Mercado!",
        message: `Lembrete agendado (${horaGen}). Você possui ${unboughtCount} item(ns) pendente(s) na lista.`,
        targetView: "lista_mercado",
        severity: "urgent",
        timestamp: now,
      });
    }
  }

  return list;
}
