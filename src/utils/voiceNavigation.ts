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
