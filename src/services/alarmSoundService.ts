/**
 * Finanças Gaeta — Serviço Centralizado de Alarme Sonoro
 * Padrão de som baseado no alarme duplo (880Hz -> 1046.5Hz -> 1174.66Hz) das Zonas de Risco.
 * Suporta repetição contínua em loop até que o usuário clique para parar.
 */

export interface AlarmState {
  isPlaying: boolean;
  alarmId: string | null;
  title: string | null;
  type: string | null;
}

let audioCtx: AudioContext | null = null;
let currentAlarmInterval: any = null;
let currentAlarmState: AlarmState = {
  isPlaying: false,
  alarmId: null,
  title: null,
  type: null,
};

const listeners = new Set<(state: AlarmState) => void>();

function notifyListeners() {
  listeners.forEach((listener) => {
    try {
      listener({ ...currentAlarmState });
    } catch (e) {
      console.warn("Erro no listener de alarme:", e);
    }
  });
}

function getAudioContext(): AudioContext | null {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;

    if (!audioCtx || audioCtx.state === "closed") {
      audioCtx = new AudioCtx();
    }
    if (audioCtx.state === "suspended") {
      audioCtx.resume();
    }
    return audioCtx;
  } catch (err) {
    console.warn("Não foi possível inicializar AudioContext:", err);
    return null;
  }
}

/**
 * Executa um ciclo do som de beep de alerta (idêntico ao padrão das Zonas de Risco)
 */
export function playAlertBeepSound(volume: number = 0.4): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Pulso 1: 880Hz -> 1046.5Hz (Duração ~300ms)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sawtooth";
    osc1.frequency.setValueAtTime(880, now);
    osc1.frequency.setValueAtTime(1046.5, now + 0.12);
    gain1.gain.setValueAtTime(volume * 0.9, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.3);

    // Pulso 2: 880Hz -> 1174.66Hz (Duração ~350ms, inicia 250ms após o primeiro)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sawtooth";
    osc2.frequency.setValueAtTime(880, now + 0.25);
    osc2.frequency.setValueAtTime(1174.66, now + 0.38);
    gain2.gain.setValueAtTime(volume, now + 0.25);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.25);
    osc2.stop(now + 0.6);
  } catch (err) {
    console.warn("Falha ao emitir som de alerta:", err);
  }
}

/**
 * Inicia o alarme sonoro repetitivo contínuo.
 * Toca imediatamente e repete a cada intervalMs (padrão: 3500ms) até ser parado explicitamente.
 */
export function startAlarmLoop(
  alarmId: string,
  options?: {
    title?: string;
    type?: string;
    intervalMs?: number;
    volume?: number;
  }
): void {
  // Se já estiver tocando este mesmo alarme, mantém
  if (currentAlarmState.isPlaying && currentAlarmState.alarmId === alarmId) {
    return;
  }

  // Para qualquer alarme prévio
  stopAlarmLoop();

  const intervalMs = options?.intervalMs || 3500;
  const volume = options?.volume || 0.45;

  currentAlarmState = {
    isPlaying: true,
    alarmId,
    title: options?.title || "Alarme Ativo",
    type: options?.type || "saude",
  };

  notifyListeners();

  // Toca o primeiro beep imediatamente
  playAlertBeepSound(volume);

  // Inicia o loop de repetição
  currentAlarmInterval = setInterval(() => {
    playAlertBeepSound(volume);
  }, intervalMs);
}

/**
 * Para o loop de alarme sonoro ativo.
 */
export function stopAlarmLoop(alarmId?: string): void {
  if (alarmId && currentAlarmState.alarmId !== alarmId) {
    // Se foi solicitado parar um ID específico e outro está tocando, ignora
    return;
  }

  if (currentAlarmInterval) {
    clearInterval(currentAlarmInterval);
    currentAlarmInterval = null;
  }

  if (currentAlarmState.isPlaying) {
    currentAlarmState = {
      isPlaying: false,
      alarmId: null,
      title: null,
      type: null,
    };
    notifyListeners();
  }
}

/**
 * Retorna o estado atual do alarme sonoro
 */
export function getAlarmState(): AlarmState {
  return { ...currentAlarmState };
}

/**
 * Permite que componentes React se inscrevam nas mudanças de estado do alarme
 */
export function subscribeAlarmState(listener: (state: AlarmState) => void): () => void {
  listeners.add(listener);
  // Notifica o estado atual imediatamente
  listener({ ...currentAlarmState });
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Toca um som de demonstração/teste
 */
export function testAlarmSound(): void {
  playAlertBeepSound(0.5);
}
