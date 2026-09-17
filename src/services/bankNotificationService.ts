/**
 * Serviço de Integração com o Plugin Nativo de Notificações Bancárias (Capacitor)
 */

import { registerPlugin, Capacitor } from "@capacitor/core";
import { RawNotificationPayload, ParsedPixTransaction, parseBankNotification, deduplicatePixTransactions } from "../utils/bankNotificationParser";

export interface BankNotificationPlugin {
  checkPermission(): Promise<{ granted: boolean }>;
  requestPermission(): Promise<void>;
  getPendingNotifications(): Promise<{ notifications: RawNotificationPayload[] }>;
  clearNotification(options: { id: string }): Promise<{ success: boolean }>;
  clearAllNotifications(): Promise<{ success: boolean }>;
  addListener(
    eventName: "onBankNotification",
    listenerFunc: (notification: RawNotificationPayload) => void
  ): Promise<{ remove: () => void }>;
}

// Registra o plugin caso esteja rodando nativamente no Android
export const BankNotification = registerPlugin<BankNotificationPlugin>("BankNotification");

export class BankNotificationService {
  private static isNative(): boolean {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
  }

  /**
   * Verifica se a plataforma suporta a leitura de notificações
   */
  public static isSupported(): boolean {
    return this.isNative();
  }

  /**
   * Verifica se o usuário já concedeu a permissão especial de Acesso a Notificações
   */
  public static async checkPermission(): Promise<{ granted: boolean; isNative: boolean }> {
    if (!this.isNative()) {
      return { granted: false, isNative: false };
    }
    try {
      const res = await BankNotification.checkPermission();
      return { granted: !!res.granted, isNative: true };
    } catch (err) {
      console.warn("BankNotification.checkPermission não disponível:", err);
      return { granted: false, isNative: true };
    }
  }

  /**
   * Abre a tela nativa de Configurações do Android ("Acesso a notificações")
   */
  public static async requestPermission(): Promise<void> {
    if (!this.isNative()) {
      alert("A captura automática de notificações só funciona no aplicativo instalado no Android (APK).");
      return;
    }
    try {
      await BankNotification.requestPermission();
    } catch (err) {
      console.error("Erro ao solicitar permissão de notificações:", err);
    }
  }

  /**
   * Busca notificações que chegaram enquanto o app estava fechado ou em segundo plano
   */
  public static async fetchPendingPix(): Promise<ParsedPixTransaction[]> {
    if (!this.isNative()) {
      return [];
    }
    try {
      const res = await BankNotification.getPendingNotifications();
      const rawList = res?.notifications || [];
      const parsedList: ParsedPixTransaction[] = [];

      for (const item of rawList) {
        const parsed = parseBankNotification(item);
        if (parsed) {
          parsedList.push(parsed);
        }
      }

      return deduplicatePixTransactions(parsedList);
    } catch (err) {
      console.warn("Erro ao buscar notificações pendentes:", err);
      return [];
    }
  }

  /**
   * Remove uma notificação processada da fila nativa
   */
  public static async markAsProcessed(rawId: string): Promise<void> {
    if (!this.isNative()) return;
    try {
      await BankNotification.clearNotification({ id: rawId });
    } catch (err) {
      console.warn(`Erro ao limpar notificação ${rawId}:`, err);
    }
  }

  /**
   * Limpa todas as notificações da fila nativa
   */
  public static async clearAll(): Promise<void> {
    if (!this.isNative()) return;
    try {
      await BankNotification.clearAllNotifications();
    } catch (err) {
      console.warn("Erro ao limpar todas as notificações:", err);
    }
  }

  /**
   * Ouve notificações em tempo real quando o app estiver aberto
   */
  public static async subscribe(
    onPixDetected: (pix: ParsedPixTransaction) => void
  ): Promise<(() => void) | null> {
    if (!this.isNative()) return null;

    try {
      const handle = await BankNotification.addListener("onBankNotification", (raw) => {
        const parsed = parseBankNotification(raw);
        if (parsed) {
          onPixDetected(parsed);
        }
      });
      return () => handle.remove();
    } catch (err) {
      console.warn("Falha ao registrar listener de notificações:", err);
      return null;
    }
  }
}
