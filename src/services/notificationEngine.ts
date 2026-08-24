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

// Helper: Get local date string YYYY-MM-DD (e.g. Brasilia timezone UTC-3)
export function getLocalTodayDateStr(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Helper: Parse date and time from any health record format
export function parseRegistroDataHora(
  dataHoraStr?: string
): { dateStr: string; totalMinutes: number | null } | null {
  if (!dataHoraStr || typeof dataHoraStr !== "string") return null;
  const str = dataHoraStr.trim();

  // Pattern 1: YYYY-MM-DD or YYYY-MM-DDTHH:mm(:ss) or YYYY-MM-DD HH:mm(:ss)
  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{1,2}):(\d{2}))?/);
  if (isoMatch) {
    const y = isoMatch[1];
    const m = isoMatch[2];
    const d = isoMatch[3];
    const hh = isoMatch[4] !== undefined ? parseInt(isoMatch[4], 10) : null;
    const mm = isoMatch[5] !== undefined ? parseInt(isoMatch[5], 10) : null;
    return {
      dateStr: `${y}-${m}-${d}`,
      totalMinutes: hh !== null && mm !== null && !isNaN(hh) && !isNaN(mm) ? hh * 60 + mm : null,
    };
  }

  // Pattern 2: DD/MM/YYYY or DD/MM/YYYY HH:mm(:ss) or DD/MM/YYYYTHH:mm
  const brMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[T\s](\d{1,2}):(\d{2}))?/);
  if (brMatch) {
    const d = brMatch[1].padStart(2, "0");
    const m = brMatch[2].padStart(2, "0");
    const y = brMatch[3];
    const hh = brMatch[4] !== undefined ? parseInt(brMatch[4], 10) : null;
    const mm = brMatch[5] !== undefined ? parseInt(brMatch[5], 10) : null;
    return {
      dateStr: `${y}-${m}-${d}`,
      totalMinutes: hh !== null && mm !== null && !isNaN(hh) && !isNaN(mm) ? hh * 60 + mm : null,
    };
  }

  return null;
}

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

  const todayStr = getLocalTodayDateStr();
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
  const todayLocalStr = getLocalTodayDateStr(nowDate);
  const currentDayOfWeek = nowDate.getDay(); // 0 = Domingo, 1 = Segunda, ...

  // DEBUG LOG TEMPORÁRIO
  console.groupCollapsed(
    `[Lembretes Saúde] Checagem às ${String(currentHour).padStart(2, "0")}:${String(currentMin).padStart(2, "0")} (${todayLocalStr})`
  );
  console.log("Lembretes carregados (lembretesSaude):", lembretesSaude);
  console.log("Total de registros de saúde:", registrosSaude.length);

  const dayOfWeekNames: Record<number, string[]> = {
    0: ["DOM", "DOMINGO"],
    1: ["SEG", "SEGUNDA"],
    2: ["TER", "TERCA", "TERÇA"],
    3: ["QUA", "QUARTA"],
    4: ["QUI", "QUINTA"],
    5: ["SEX", "SEXTA"],
    6: ["SAB", "SABADO", "SÁBADO"],
  };

  lembretesSaude.forEach((cfg: any) => {
    // 1. Extração robusta de Ativo/Status (suporta "SIM", "sim", "TRUE", true, 1, "Ativo", etc.)
    const rawAtivo =
      cfg.ativo ??
      cfg.Ativo ??
      cfg.ATIVO ??
      cfg.status ??
      cfg.Status ??
      cfg["Ativo?"] ??
      cfg["Ativo"] ??
      true;

    const isAtivo =
      rawAtivo === true ||
      rawAtivo === 1 ||
      String(rawAtivo).trim().toUpperCase() === "SIM" ||
      String(rawAtivo).trim().toUpperCase() === "TRUE" ||
      String(rawAtivo).trim().toUpperCase() === "ATIVO";

    if (!isAtivo) {
      console.log(`[Lembretes Saúde] Item ignorado (inativo):`, cfg);
      return;
    }

    // 2. Identificação do Tipo (Pressão vs Glicemia) e ignora configuração de perfil biométrico
    const id = String(cfg.id || cfg.Id || cfg.ID || "");
    const tipo = String(cfg.tipo || cfg.Tipo || cfg.TIPO || cfg.Tipo_Registro || "");

    if (
      id === "CONFIG_PERFIL_ALTURA" ||
      tipo.toLowerCase().includes("altura") ||
      tipo.toLowerCase().includes("perfil")
    ) {
      return;
    }

    const isPressao =
      id.toUpperCase().includes("PRESSAO") ||
      tipo.toLowerCase().includes("pressao") ||
      tipo.toLowerCase().includes("pressão") ||
      tipo.toLowerCase().includes("arterial");
    const tipoKey = isPressao ? "PRESSAO" : "GLICEMIA";
    const tipoLabel = isPressao ? "Pressão Arterial" : "Glicemia";
    const icon = isPressao ? "🩺" : "🩸";

    // 3. Validação dos Dias da Semana
    const rawDiasSemana = String(
      cfg.diasSemana ||
        cfg.Dias_Semana ||
        cfg["Dias da Semana"] ||
        cfg["Dias Semana"] ||
        cfg.dias ||
        "TODOS"
    )
      .trim()
      .toUpperCase();

    if (rawDiasSemana && rawDiasSemana !== "TODOS") {
      const todayTokens = dayOfWeekNames[currentDayOfWeek] || [];
      const matchesDay = todayTokens.some((tok) => rawDiasSemana.includes(tok));
      if (!matchesDay) {
        console.log(`[Lembretes Saúde] ${tipoLabel} ignorado hoje: dia da semana ${rawDiasSemana} não corresponde a hoje.`);
        return;
      }
    }

    // 4. Extração robusta de todos os horários configurados (suporta todas as variações de nomes de colunas)
    const rawHorariosSet = new Set<string>();
    const explicitCandidates = [
      cfg.horario1,
      cfg.Horario_1,
      cfg["Horário 1"],
      cfg["Horario 1"],
      cfg.horario_1,
      cfg["Horário_1"],
      cfg.horario2,
      cfg.Horario_2,
      cfg["Horário 2"],
      cfg["Horario 2"],
      cfg.horario_2,
      cfg["Horário_2"],
      cfg.horario3,
      cfg.Horario_3,
      cfg["Horário 3"],
      cfg["Horario 3"],
      cfg.horario_3,
      cfg["Horário_3"],
      cfg.horario4,
      cfg.Horario_4,
      cfg.horario5,
      cfg.Horario_5,
    ];

    explicitCandidates.forEach((val) => {
      if (typeof val === "string" && val.trim()) {
        rawHorariosSet.add(val.trim());
      }
    });

    // Fallback dinâmico: busca em qualquer chave do objeto que contenha "horario" ou "horário"
    if (rawHorariosSet.size === 0) {
      Object.keys(cfg).forEach((key) => {
        if (/hor[aá]rio/i.test(key)) {
          const val = String(cfg[key] || "").trim();
          if (/^\d{1,2}:\d{2}$/.test(val)) {
            rawHorariosSet.add(val);
          }
        }
      });
    }

    const rawHorarios = Array.from(rawHorariosSet);

    if (rawHorarios.length === 0) {
      console.warn(`[Lembretes Saúde] Nenhum horário encontrado para a configuração:`, cfg);
    }

    // 5. Avaliação independente por horário/slot
    rawHorarios.forEach((timeStr, idx) => {
      const parts = timeStr.split(":");
      if (parts.length < 2) return;
      const h = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      if (isNaN(h) || isNaN(m)) return;

      const targetTotalMins = h * 60 + m;
      const diffMins = currentTotalMins - targetTotalMins;
      const isDentroJanela = diffMins >= 0 && diffMins <= 45;

      console.log(
        `[Lembretes Saúde] ${tipoLabel} -> Slot: ${timeStr} | Atual: ${String(currentHour).padStart(2, "0")}:${String(currentMin).padStart(2, "0")} | Dif: ${diffMins} min | Dentro da janela (0-45m)? ${isDentroJanela ? "✅ SIM" : "❌ NÃO"}`
      );

      // Janela ativa do lembrete: a partir do minuto exato até 45 minutos depois
      if (isDentroJanela) {
        // Verifica se já existe uma medição realizada ESPECIFICAMENTE para este horário/slot
        const jaRegistrouNesteSlot = registrosSaude.some((reg) => {
          const anyReg = reg as any;
          const regTipo = String(reg.Tipo_Registro || anyReg.tipo || "").toUpperCase();
          const matchTipo =
            tipoKey === "PRESSAO"
              ? regTipo.includes("PRESS") || regTipo === "PRESSAO" || regTipo === "PRESSÃO"
              : regTipo.includes("GLIC") || regTipo === "GLICEMIA";

          if (!matchTipo) return false;

          const parsed = parseRegistroDataHora(reg.Data_Hora || anyReg.data_hora);
          if (!parsed) return false;

          // Deve ser do dia de hoje (no fuso local)
          if (parsed.dateStr !== todayLocalStr) return false;

          // Se tiver horário na medição, verifica proximidade com o slot
          if (parsed.totalMinutes !== null) {
            const minAllowed = targetTotalMins - 90; // Até 1h30 antes do horário
            const maxAllowed = targetTotalMins + 45; // Até o encerramento da janela do lembrete
            const matchSlot = parsed.totalMinutes >= minAllowed && parsed.totalMinutes <= maxAllowed;
            if (matchSlot) {
              console.log(
                `[Lembretes Saúde] Medição recente encontrada para o slot ${timeStr}:`,
                reg
              );
            }
            return matchSlot;
          }

          return false;
        });

        if (!jaRegistrouNesteSlot) {
          console.log(`[Lembretes Saúde] 🔔 DISPARANDO NOTIFICAÇÃO para ${tipoLabel} (${timeStr})!`);
          const slotClean = timeStr.replace(":", "");
          list.push({
            id: `lembrete_saude_${tipoKey.toLowerCase()}_${slotClean}_${todayLocalStr}`,
            type: "saude",
            title: `${icon} Hora de Medir ${tipoLabel}`,
            message: `Lembrete agendado (${timeStr}). Faça a medição e mantenha seu acompanhamento em dia!`,
            targetView: "saude",
            severity: diffMins <= 15 ? "urgent" : "warning",
            timestamp: now,
          });
        } else {
          console.log(
            `[Lembretes Saúde] Notificação para ${tipoLabel} (${timeStr}) dispensada pois já foi medida recentemente.`
          );
        }
      }
    });
  });
  console.groupEnd();

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
