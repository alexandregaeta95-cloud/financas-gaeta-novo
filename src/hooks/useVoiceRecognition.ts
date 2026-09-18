import { useState, useEffect, useRef, useCallback } from "react";
import { Capacitor } from "@capacitor/core";
import { SpeechRecognition as NativeSpeechRecognition } from "@capgo/capacitor-speech-recognition";

interface UseVoiceRecognitionOptions {
  lang?: string;
  continuous?: boolean;
  interimResults?: boolean;
  onResult?: (transcript: string, isFinal: boolean) => void;
  onError?: (error: any) => void;
}

export function useVoiceRecognition(options: UseVoiceRecognitionOptions = {}) {
  const {
    lang = "pt-BR",
    continuous = false,
    interimResults = false,
    onResult,
    onError,
  } = options;

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);

  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef(false);
  const nativeListenersRef = useRef<any[]>([]);

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      // Native Capacitor check
      NativeSpeechRecognition.available()
        .then((res) => {
          setIsSupported(Boolean(res?.available));
        })
        .catch(() => {
          setIsSupported(false);
        });
    } else {
      // Web browser check
      const SpeechRecognition =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;

      if (!SpeechRecognition) {
        setIsSupported(false);
      }
    }
  }, []);

  const stopNativeListening = useCallback(async () => {
    try {
      await NativeSpeechRecognition.stop();
    } catch {
      // ignore
    }
    // Remove listeners
    for (const handle of nativeListenersRef.current) {
      try {
        await handle.remove();
      } catch {
        // ignore
      }
    }
    nativeListenersRef.current = [];
    isListeningRef.current = false;
    setIsListening(false);
  }, []);

  const startNativeListening = useCallback(async () => {
    try {
      setError(null);

      // Check / request permissions
      const perm = await NativeSpeechRecognition.checkPermissions();
      if (perm.speechRecognition !== "granted") {
        const requested = await NativeSpeechRecognition.requestPermissions();
        if (requested.speechRecognition !== "granted") {
          console.warn("Permissão de microfone nativo não concedida:", requested);
          setError("Permissão de microfone negada. Autorize nas configurações do app.");
          return;
        }
      }

      // Cleanup old listeners
      for (const handle of nativeListenersRef.current) {
        try {
          await handle.remove();
        } catch {
          // ignore
        }
      }
      nativeListenersRef.current = [];

      // Add partial results listener for real-time transcription
      const partialHandle = await NativeSpeechRecognition.addListener(
        "partialResults",
        (data: { matches?: string[]; accumulatedText?: string; accumulated?: string }) => {
          const matchText = (data.matches && data.matches.length > 0 ? data.matches[0] : "") || data.accumulatedText || data.accumulated || "";
          if (matchText) {
            setTranscript(matchText);
            if (onResult) {
              onResult(matchText.trim(), false);
            }
          }
        }
      );
      nativeListenersRef.current.push(partialHandle);

      // Add listening state listener
      const stateHandle = await NativeSpeechRecognition.addListener(
        "listeningState",
        (data: { status?: "started" | "stopped"; state?: string }) => {
          if (data.status === "stopped" || data.state === "stopped") {
            isListeningRef.current = false;
            setIsListening(false);
          }
        }
      );
      nativeListenersRef.current.push(stateHandle);

      // Add error listener
      const errorHandle = await (NativeSpeechRecognition as any).addListener(
        "error",
        (err: { message?: string; error?: any }) => {
          console.warn("Native speech error listener:", err);
          setError(err?.message || "Erro no reconhecimento de voz.");
          if (onError) onError(err);
        }
      );
      nativeListenersRef.current.push(errorHandle);

      isListeningRef.current = true;
      setIsListening(true);

      const result = await NativeSpeechRecognition.start({
        language: lang,
        maxResults: 1,
        partialResults: interimResults,
        popup: false,
      });

      // Handle final returned matches
      if (result?.matches && result.matches.length > 0) {
        const text = result.matches[0];
        setTranscript(text);
        if (onResult) {
          onResult(text.trim(), true);
        }
      }

      isListeningRef.current = false;
      setIsListening(false);
    } catch (e: any) {
      console.error("Erro ao iniciar reconhecimento de voz nativo:", e);
      setError(`Erro no microfone nativo: ${e?.message || e}`);
      isListeningRef.current = false;
      setIsListening(false);
      if (onError) onError(e);
    }
  }, [lang, interimResults, onResult, onError]);

  const stopWebListening = useCallback(() => {
    if (recognitionRef.current && isListeningRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // ignore
      }
    }
    isListeningRef.current = false;
    setIsListening(false);
  }, []);

  const startWebListening = useCallback(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSupported(false);
      setError("Reconhecimento de voz não suportado neste navegador.");
      return;
    }

    // Stop any existing instance
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {
        // ignore
      }
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = lang;
      recognition.continuous = continuous;
      recognition.interimResults = interimResults;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        isListeningRef.current = true;
        setIsListening(true);
        setError(null);
      };

      recognition.onresult = (event: any) => {
        let finalTranscript = "";
        let currentInterim = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const res = event.results[i];
          if (res.isFinal) {
            finalTranscript += res[0].transcript;
          } else {
            currentInterim += res[0].transcript;
          }
        }

        const recognizedText = finalTranscript || currentInterim;
        if (recognizedText) {
          setTranscript(recognizedText);
          if (onResult) {
            onResult(recognizedText.trim(), Boolean(finalTranscript));
          }
        }
      };

      recognition.onerror = (event: any) => {
        console.warn("Speech recognition error:", event.error);
        if (event.error === "no-speech") {
          // Silent timeout, not a critical error
        } else if (event.error === "not-allowed" || event.error === "service-not-allowed") {
          setError("Permissão de microfone negada. Verifique as configurações do navegador.");
        } else {
          setError(`Erro no microfone: ${event.error}`);
        }
        if (onError) onError(event);
      };

      recognition.onend = () => {
        isListeningRef.current = false;
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e: any) {
      console.error("Erro ao iniciar reconhecimento de voz:", e);
      setError("Não foi possível acessar o microfone.");
      isListeningRef.current = false;
      setIsListening(false);
    }
  }, [lang, continuous, interimResults, onResult, onError]);

  const stopListening = useCallback(() => {
    if (Capacitor.isNativePlatform()) {
      stopNativeListening();
    } else {
      stopWebListening();
    }
  }, [stopNativeListening, stopWebListening]);

  const startListening = useCallback(() => {
    if (Capacitor.isNativePlatform()) {
      startNativeListening();
    } else {
      startWebListening();
    }
  }, [startNativeListening, startWebListening]);

  const toggleListening = useCallback(() => {
    if (isListeningRef.current) {
      stopListening();
    } else {
      startListening();
    }
  }, [startListening, stopListening]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (Capacitor.isNativePlatform()) {
        try {
          NativeSpeechRecognition.stop().catch(() => {});
        } catch {
          // ignore
        }
        for (const handle of nativeListenersRef.current) {
          try {
            handle.remove().catch(() => {});
          } catch {
            // ignore
          }
        }
        nativeListenersRef.current = [];
      } else {
        if (recognitionRef.current) {
          try {
            recognitionRef.current.abort();
          } catch (e) {
            // ignore
          }
        }
      }
    };
  }, []);

  return {
    isListening,
    transcript,
    error,
    isSupported,
    startListening,
    stopListening,
    toggleListening,
  };
}
