import React, { useState, useEffect } from "react";

export interface NotificationAppearanceConfig {
  darkness: number; // 0 to 100 (0 = Slate 900, 50 = Slate 950, 100 = Preto Puro OLED #000000)
  opacity: number; // 40 to 100 (percentual de opacidade do fundo)
  blur: number; // 0 to 24 px (desfoque de fundo)
  borderContrast: number; // 0 to 100 (destaque das bordas)
}

const STORAGE_KEY = "financas_gaeta_notif_appearance_v1";

export const DEFAULT_NOTIFICATION_APPEARANCE: NotificationAppearanceConfig = {
  darkness: 85, // Tom bem escuro por padrão
  opacity: 98, // Quase 100% opaco
  blur: 12,
  borderContrast: 80,
};

const listeners = new Set<(cfg: NotificationAppearanceConfig) => void>();

export function getNotificationAppearance(): NotificationAppearanceConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_NOTIFICATION_APPEARANCE;
    const parsed = JSON.parse(raw);
    return {
      darkness: typeof parsed.darkness === "number" ? Math.max(0, Math.min(100, parsed.darkness)) : DEFAULT_NOTIFICATION_APPEARANCE.darkness,
      opacity: typeof parsed.opacity === "number" ? Math.max(30, Math.min(100, parsed.opacity)) : DEFAULT_NOTIFICATION_APPEARANCE.opacity,
      blur: typeof parsed.blur === "number" ? Math.max(0, Math.min(24, parsed.blur)) : DEFAULT_NOTIFICATION_APPEARANCE.blur,
      borderContrast: typeof parsed.borderContrast === "number" ? Math.max(0, Math.min(100, parsed.borderContrast)) : DEFAULT_NOTIFICATION_APPEARANCE.borderContrast,
    };
  } catch (e) {
    return DEFAULT_NOTIFICATION_APPEARANCE;
  }
}

export function saveNotificationAppearance(config: NotificationAppearanceConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    listeners.forEach((fn) => fn(config));
  } catch (e) {
    console.error("Erro ao salvar configuração de aparência das notificações:", e);
  }
}

export function subscribeNotificationAppearance(cb: (cfg: NotificationAppearanceConfig) => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

/**
 * Calcula a cor de fundo e propriedades CSS com base no tom (darkness) e opacidade (opacity).
 */
export function computeNotificationBackgroundStyle(
  config: NotificationAppearanceConfig = DEFAULT_NOTIFICATION_APPEARANCE
): React.CSSProperties {
  const { darkness, opacity, blur } = config;
  const op = Math.max(0.3, Math.min(1, opacity / 100));

  // Interpolação suave de cores:
  // 0%  -> Slate 900: rgb(15, 23, 42)
  // 50% -> Slate 950: rgb(2, 6, 23)
  // 100% -> Pitch Black OLED: rgb(0, 0, 0)
  let r = 0;
  let g = 0;
  let b = 0;

  if (darkness <= 50) {
    const factor = darkness / 50; // 0 to 1
    r = Math.round(15 - (15 - 2) * factor);
    g = Math.round(23 - (23 - 6) * factor);
    b = Math.round(42 - (42 - 23) * factor);
  } else {
    const factor = (darkness - 50) / 50; // 0 to 1
    r = Math.round(2 * (1 - factor));
    g = Math.round(6 * (1 - factor));
    b = Math.round(23 * (1 - factor));
  }

  const bgRgba = `rgba(${r}, ${g}, ${b}, ${op})`;
  const shadowOpacity = Math.min(0.9, 0.4 + (darkness / 100) * 0.5);

  return {
    backgroundColor: bgRgba,
    backdropFilter: blur > 0 ? `blur(${blur}px)` : undefined,
    WebkitBackdropFilter: blur > 0 ? `blur(${blur}px)` : undefined,
    boxShadow: `0 20px 30px -10px rgba(0, 0, 0, ${shadowOpacity}), 0 8px 16px -6px rgba(0, 0, 0, ${shadowOpacity})`,
  };
}

/**
 * Hook do React para gerenciar e reagir em tempo real aos ajustes de aparência das notificações.
 */
export function useNotificationAppearance() {
  const [config, setConfig] = useState<NotificationAppearanceConfig>(getNotificationAppearance);

  useEffect(() => {
    const unsub = subscribeNotificationAppearance((newCfg) => {
      setConfig(newCfg);
    });
    return unsub;
  }, []);

  const update = (partial: Partial<NotificationAppearanceConfig>) => {
    const updated = { ...config, ...partial };
    setConfig(updated);
    saveNotificationAppearance(updated);
  };

  const reset = () => {
    setConfig(DEFAULT_NOTIFICATION_APPEARANCE);
    saveNotificationAppearance(DEFAULT_NOTIFICATION_APPEARANCE);
  };

  const backgroundStyle = computeNotificationBackgroundStyle(config);

  return {
    config,
    updateConfig: update,
    resetConfig: reset,
    backgroundStyle,
  };
}
