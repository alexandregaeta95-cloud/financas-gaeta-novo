const FOCUSABLE_SELECTOR =
  'input:not([disabled]):not([type="hidden"]), textarea:not([disabled]), select:not([disabled])';

export function isNextFieldCommand(text: string): boolean {
  const normalized = text
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove acentos
    .replace(/[.,!?]/g, "")
    .trim();
  const commands = [
    "proximo",
    "proximo campo",
    "avancar",
    "avanca",
    "vai",
    "vai para o proximo",
  ];
  return commands.includes(normalized);
}

const TRAILING_COMMAND_WORDS = ["proximo", "avancar", "avanca"];

export function extractNextFieldCommand(rawText: string): { cleanText: string; hasCommand: boolean } {
  const trimmed = rawText.trim();
  if (isNextFieldCommand(trimmed)) {
    return { cleanText: "", hasCommand: true };
  }
  const words = trimmed.split(/\s+/);
  if (words.length > 1) {
    const lastWordNormalized = words[words.length - 1]
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[.,!?]/g, "");
    if (TRAILING_COMMAND_WORDS.includes(lastWordNormalized)) {
      return { cleanText: words.slice(0, -1).join(" ").trim(), hasCommand: true };
    }
  }
  return { cleanText: trimmed, hasCommand: false };
}

export function focusNextField(current: HTMLElement | null): void {
  if (!current) return;
  const container = current.closest("form") || document.body;
  const focusables = Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
  ).filter((el) => el.offsetParent !== null);

  const idx = focusables.indexOf(current);
  if (idx === -1) return;

  const next = focusables[idx + 1];
  if (next) {
    next.focus();
    if (next instanceof HTMLInputElement || next instanceof HTMLTextAreaElement) {
      next.select();
    }
  }
}
