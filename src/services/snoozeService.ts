/**
 * Finanças Gaeta — Serviço Centralizado de Soneca (Snooze) de Alarmes e Notificações
 * Permite adiar alarmes para 5 min, 15 min ou 30 min.
 * Se o usuário não interagir (nem parar, nem adiar), o alarme segue tocando continuamente.
 */

import { stopAlarmLoop } from "./alarmSoundService";

const STORAGE_KEY = "gaeta_notification_snoozes";

export interface SnoozeEntry {
  id: string;
  snoozedUntil: number; // timestamp ms
  durationMinutes: number;
  snoozedAt: number; // timestamp ms
}

type SnoozeListener = () => void;
const listeners = new Set<SnoozeListener>();

function notifyListeners(): void {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (err) {
      console.warn("Erro no listener de soneca:", err);
    }
  });
}

function getStoredSnoozes(): Record<string, SnoozeEntry> {
  if (typeof window === "undefined" || !window.localStorage) return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (e) {
    console.warn("Erro ao ler dados de soneca do localStorage:", e);
    return {};
  }
}

function setStoredSnoozes(snoozes: Record<string, SnoozeEntry>): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snoozes));
  } catch (e) {
    console.warn("Erro ao salvar dados de soneca no localStorage:", e);
  }
}

/**
 * Adia uma notificação/alarme por uma quantidade de minutos (ex: 5, 15, 30).
 * Para o som do alarme imediatamente e agenda o despertar.
 */
export function snoozeNotification(
  notificationId: string,
  durationMinutes: number
): void {
  // 1. Para o som do alarme imediatamente
  stopAlarmLoop(notificationId);

  // 2. Salva o registro de soneca
  const snoozes = getStoredSnoozes();
  const now = Date.now();
  const snoozedUntil = now + durationMinutes * 60 * 1000;

  snoozes[notificationId] = {
    id: notificationId,
    durationMinutes,
    snoozedAt: now,
    snoozedUntil,
  };

  setStoredSnoozes(snoozes);
  notifyListeners();
}

/**
 * Verifica se a notificação está em estado de soneca ativo.
 * Se o tempo de soneca já tiver expirado, limpa o registro e retorna false (para voltar a tocar).
 */
export function isNotificationSnoozed(notificationId: string): boolean {
  const snoozes = getStoredSnoozes();
  const entry = snoozes[notificationId];
  if (!entry) return false;

  const now = Date.now();
  if (now < entry.snoozedUntil) {
    return true;
  }

  // Já expirou o tempo de soneca! Remove para que volte a tocar imediatamente
  delete snoozes[notificationId];
  setStoredSnoozes(snoozes);
  notifyListeners();
  return false;
}

/**
 * Cancela a soneca de uma notificação antes do tempo (faz acordar imediatamente).
 */
export function cancelSnooze(notificationId: string): void {
  const snoozes = getStoredSnoozes();
  if (snoozes[notificationId]) {
    delete snoozes[notificationId];
    setStoredSnoozes(snoozes);
    notifyListeners();
  }
}

/**
 * Retorna as informações detalhadas da soneca ativa para uma notificação.
 */
export function getSnoozeInfo(notificationId: string): {
  snoozedUntil: number;
  remainingMinutes: number;
  durationMinutes: number;
  snoozedUntilFormatted: string;
} | null {
  const snoozes = getStoredSnoozes();
  const entry = snoozes[notificationId];
  if (!entry) return null;

  const now = Date.now();
  if (now >= entry.snoozedUntil) {
    delete snoozes[notificationId];
    setStoredSnoozes(snoozes);
    return null;
  }

  const remainingMs = entry.snoozedUntil - now;
  const remainingMinutes = Math.max(1, Math.ceil(remainingMs / 60000));
  const untilDate = new Date(entry.snoozedUntil);
  const snoozedUntilFormatted = untilDate.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return {
    snoozedUntil: entry.snoozedUntil,
    remainingMinutes,
    durationMinutes: entry.durationMinutes,
    snoozedUntilFormatted,
  };
}

/**
 * Retorna todos os IDs atualmente em soneca.
 */
export function getAllActiveSnoozeIds(): string[] {
  const snoozes = getStoredSnoozes();
  const now = Date.now();
  const activeIds: string[] = [];
  let hasExpired = false;

  Object.values(snoozes).forEach((entry) => {
    if (now < entry.snoozedUntil) {
      activeIds.push(entry.id);
    } else {
      delete snoozes[entry.id];
      hasExpired = true;
    }
  });

  if (hasExpired) {
    setStoredSnoozes(snoozes);
    notifyListeners();
  }

  return activeIds;
}

/**
 * Inscrição para atualizações de estado de soneca
 */
export function subscribeSnooze(listener: SnoozeListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
