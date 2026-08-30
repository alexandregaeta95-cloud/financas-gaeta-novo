import { useState, useEffect, useCallback } from "react";
import {
  AlarmState,
  getAlarmState,
  subscribeAlarmState,
  startAlarmLoop,
  stopAlarmLoop,
  playAlertBeepSound,
  testAlarmSound,
} from "../services/alarmSoundService";

export function useAlarmSound() {
  const [alarmState, setAlarmState] = useState<AlarmState>(getAlarmState());

  useEffect(() => {
    const unsubscribe = subscribeAlarmState((state) => {
      setAlarmState(state);
    });
    return unsubscribe;
  }, []);

  const triggerAlarm = useCallback(
    (
      alarmId: string,
      options?: {
        title?: string;
        type?: string;
        intervalMs?: number;
        volume?: number;
      }
    ) => {
      startAlarmLoop(alarmId, options);
    },
    []
  );

  const stopAlarm = useCallback((alarmId?: string) => {
    stopAlarmLoop(alarmId);
  }, []);

  const playSingleBeep = useCallback((volume?: number) => {
    playAlertBeepSound(volume);
  }, []);

  const testBeep = useCallback(() => {
    testAlarmSound();
  }, []);

  return {
    isPlaying: alarmState.isPlaying,
    activeAlarmId: alarmState.alarmId,
    alarmTitle: alarmState.title,
    alarmType: alarmState.type,
    triggerAlarm,
    stopAlarm,
    playSingleBeep,
    testBeep,
  };
}
