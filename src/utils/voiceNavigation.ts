const FOCUSABLE_SELECTOR =
  'input:not([disabled]):not([type="hidden"]), textarea:not([disabled]), select:not([disabled])';

const NEXT_FIELD_COMMANDS = [
  "próximo",
  "proximo",
  "próximo campo",
  "proximo campo",
  "avançar",
  "avancar",
  "avança",
  "avanca",
];

export function isNextFieldCommand(text: string): boolean {
  const normalized = text.trim().toLowerCase().replace(/[.,!?]/g, "");
  return NEXT_FIELD_COMMANDS.includes(normalized);
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
