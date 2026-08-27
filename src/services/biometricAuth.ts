/**
 * Finanças Gaeta — Biometric Authentication Service (WebAuthn / Passkeys)
 * 
 * Implements platform-level biometric verification (Fingerprint, Touch ID, Face ID, Windows Hello)
 * with emergency recovery PIN support.
 * 
 * Rules:
 * 1. Locks only on initial session opening or when browser/tab is reopened (using sessionStorage).
 * 2. Does NOT re-lock during background activity, tab switching, or window minimization.
 * 3. Does NOT pause or interfere with background timers, reminder evaluations, or notifications.
 */

const STORAGE_KEY_ENABLED = "fg_biometric_enabled";
const STORAGE_KEY_CRED_ID = "fg_biometric_cred_id";
const STORAGE_KEY_PIN_HASH = "fg_biometric_pin_hash";
const SESSION_KEY_AUTH = "fg_session_authenticated";

/**
 * Hash a PIN or password using SHA-256
 */
export async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin.trim());
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Convert buffer to base64url string
 */
function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Convert base64url string to ArrayBuffer
 */
function base64ToBuffer(base64: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const base64Standard = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64Standard);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray.buffer;
}

/**
 * Check if WebAuthn is supported by the browser
 */
export function isWebAuthnSupported(): boolean {
  return typeof window !== "undefined" && Boolean(window.PublicKeyCredential);
}

/**
 * Check if platform authenticator (TouchID, FaceID, Windows Hello, Android Biometrics) is available
 */
export async function isPlatformBiometricsAvailable(): Promise<boolean> {
  if (!isWebAuthnSupported()) return false;
  try {
    if (typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === "function") {
      return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if biometric lock is active in settings
 */
export function isBiometricEnabled(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY_ENABLED) === "true";
  } catch {
    return false;
  }
}

/**
 * Check if current session has already been unlocked
 */
export function isSessionAuthenticated(): boolean {
  try {
    // If biometrics is NOT enabled in settings, session is always open
    if (!isBiometricEnabled()) return true;
    return sessionStorage.getItem(SESSION_KEY_AUTH) === "true";
  } catch {
    return true;
  }
}

/**
 * Mark current session as authenticated
 */
export function setSessionAuthenticated(authenticated: boolean): void {
  try {
    if (authenticated) {
      sessionStorage.setItem(SESSION_KEY_AUTH, "true");
    } else {
      sessionStorage.removeItem(SESSION_KEY_AUTH);
    }
  } catch (err) {
    console.error("Erro ao registrar autenticação de sessão:", err);
  }
}

/**
 * Check if recovery PIN is registered
 */
export function hasFallbackPin(): boolean {
  try {
    return Boolean(localStorage.getItem(STORAGE_KEY_PIN_HASH));
  } catch {
    return false;
  }
}

/**
 * Register Biometrics and Fallback PIN
 */
export async function registerBiometrics(
  fallbackPin: string
): Promise<{ success: boolean; error?: string }> {
  if (!isWebAuthnSupported()) {
    return {
      success: false,
      error: "Seu navegador não possui suporte ao padrão WebAuthn de biometria.",
    };
  }

  if (!fallbackPin || fallbackPin.trim().length < 4) {
    return {
      success: false,
      error: "O PIN de emergência deve ter no mínimo 4 dígitos/caracteres.",
    };
  }

  try {
    const challenge = new Uint8Array(32);
    crypto.getRandomValues(challenge);

    const userId = new Uint8Array(16);
    crypto.getRandomValues(userId);

    const creationOptions: PublicKeyCredentialCreationOptions = {
      challenge,
      rp: {
        name: "Finanças Gaeta",
        id: window.location.hostname === "localhost" ? undefined : window.location.hostname,
      },
      user: {
        id: userId,
        name: "usuario@financasgaeta.app",
        displayName: "Finanças Gaeta",
      },
      pubKeyCredParams: [
        { alg: -7, type: "public-key" }, // ES256
        { alg: -257, type: "public-key" }, // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        userVerification: "required",
        requireResidentKey: false,
      },
      timeout: 60000,
      attestation: "none",
    };

    const credential = (await navigator.credentials.create({
      publicKey: creationOptions,
    })) as PublicKeyCredential | null;

    if (!credential) {
      return {
        success: false,
        error: "Não foi possível criar as credenciais biométricas.",
      };
    }

    const credIdBase64 = bufferToBase64(credential.rawId);
    const pinHash = await hashPin(fallbackPin);

    localStorage.setItem(STORAGE_KEY_ENABLED, "true");
    localStorage.setItem(STORAGE_KEY_CRED_ID, credIdBase64);
    localStorage.setItem(STORAGE_KEY_PIN_HASH, pinHash);
    setSessionAuthenticated(true);

    return { success: true };
  } catch (err: any) {
    console.error("Erro no cadastro de biometria WebAuthn:", err);
    if (err.name === "NotAllowedError") {
      return {
        success: false,
        error: "Cadastro biométrico cancelado pelo usuário ou tempo esgotado.",
      };
    }
    if (err.name === "InvalidStateError") {
      return {
        success: false,
        error: "Uma chave para este dispositivo já está registrada.",
      };
    }
    return {
      success: false,
      error: err.message || "Erro desconhecido ao registrar biometria.",
    };
  }
}

/**
 * Authenticate using WebAuthn Biometrics
 */
export async function authenticateWithBiometrics(): Promise<{
  success: boolean;
  error?: string;
}> {
  if (!isBiometricEnabled()) {
    setSessionAuthenticated(true);
    return { success: true };
  }

  if (!isWebAuthnSupported()) {
    return {
      success: false,
      error: "Biometria WebAuthn não suportada neste navegador. Use o PIN de recuperação.",
    };
  }

  const credIdBase64 = localStorage.getItem(STORAGE_KEY_CRED_ID);

  try {
    const challenge = new Uint8Array(32);
    crypto.getRandomValues(challenge);

    const getOptions: PublicKeyCredentialRequestOptions = {
      challenge,
      timeout: 60000,
      userVerification: "required",
      rpId: window.location.hostname === "localhost" ? undefined : window.location.hostname,
    };

    if (credIdBase64) {
      try {
        const rawCredId = base64ToBuffer(credIdBase64);
        getOptions.allowCredentials = [
          {
            id: rawCredId,
            type: "public-key",
            transports: ["internal"],
          },
        ];
      } catch (e) {
        console.warn("Credencial ID parse fallback:", e);
      }
    }

    const assertion = (await navigator.credentials.get({
      publicKey: getOptions,
    })) as PublicKeyCredential | null;

    if (assertion) {
      setSessionAuthenticated(true);
      return { success: true };
    } else {
      return {
        success: false,
        error: "Validação biométrica não confirmada.",
      };
    }
  } catch (err: any) {
    console.error("Erro na autenticação biométrica:", err);
    if (err.name === "NotAllowedError") {
      return {
        success: false,
        error: "Autenticação biométrica cancelada ou digital não reconhecida.",
      };
    }
    return {
      success: false,
      error: err.message || "Falha na leitura biométrica. Tente novamente ou use o PIN.",
    };
  }
}

/**
 * Authenticate using Fallback PIN
 */
export async function verifyFallbackPin(pin: string): Promise<boolean> {
  const storedHash = localStorage.getItem(STORAGE_KEY_PIN_HASH);
  if (!storedHash) return false;

  const inputHash = await hashPin(pin);
  if (inputHash === storedHash) {
    setSessionAuthenticated(true);
    return true;
  }
  return false;
}

/**
 * Update Fallback PIN
 */
export async function updateFallbackPin(
  currentPinOrBypass: string,
  newPin: string,
  skipCurrentCheck: boolean = false
): Promise<{ success: boolean; error?: string }> {
  if (!newPin || newPin.trim().length < 4) {
    return {
      success: false,
      error: "O novo PIN deve ter pelo menos 4 dígitos.",
    };
  }

  if (!skipCurrentCheck) {
    const isValid = await verifyFallbackPin(currentPinOrBypass);
    if (!isValid) {
      return {
        success: false,
        error: "PIN atual incorreto.",
      };
    }
  }

  const newHash = await hashPin(newPin);
  localStorage.setItem(STORAGE_KEY_PIN_HASH, newHash);
  return { success: true };
}

/**
 * Disable Biometric Authentication
 */
export async function disableBiometricAuth(
  pin?: string,
  force: boolean = false
): Promise<{ success: boolean; error?: string }> {
  if (!force && hasFallbackPin()) {
    if (!pin) {
      return {
        success: false,
        error: "Informe seu PIN para desativar a proteção biométrica.",
      };
    }
    const isValid = await verifyFallbackPin(pin);
    if (!isValid) {
      return {
        success: false,
        error: "PIN incorreto.",
      };
    }
  }

  localStorage.removeItem(STORAGE_KEY_ENABLED);
  localStorage.removeItem(STORAGE_KEY_CRED_ID);
  localStorage.removeItem(STORAGE_KEY_PIN_HASH);
  setSessionAuthenticated(true);
  return { success: true };
}

/**
 * Lock session immediately
 */
export function lockSessionNow(): void {
  setSessionAuthenticated(false);
}
