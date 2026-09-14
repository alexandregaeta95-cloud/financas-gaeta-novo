import React from "react";

export const CORES_TEXTO: Record<string, string> = {
  vermelho: "#f87171",
  azul: "#60a5fa",
  verde: "#4ade80",
  amarelo: "#facc15",
};

export function renderTextoComCores(texto?: string): React.ReactNode[] {
  if (!texto) return [texto || ""];
  const regex = /\[\[(vermelho|azul|verde|amarelo)\]\](.*?)\[\[\/\1\]\]/gi;
  const partes: React.ReactNode[] = [];
  let ultimoIndex = 0;
  let match;
  let key = 0;
  while ((match = regex.exec(texto)) !== null) {
    if (match.index > ultimoIndex) {
      partes.push(texto.slice(ultimoIndex, match.index));
    }
    const corKey = match[1].toLowerCase();
    partes.push(
      <span key={key++} style={{ color: CORES_TEXTO[corKey] }}>
        {match[2]}
      </span>
    );
    ultimoIndex = match.index + match[0].length;
  }
  if (ultimoIndex < texto.length) {
    partes.push(texto.slice(ultimoIndex));
  }
  return partes;
}

export function aplicarCorNoTexto(
  textareaRef: React.RefObject<HTMLTextAreaElement | null> | React.MutableRefObject<HTMLTextAreaElement | null> | { current: HTMLTextAreaElement | null },
  textoAtual: string,
  cor: string,
  onChange: (novoTexto: string) => void
) {
  const el = textareaRef.current;
  if (!el) return;
  const start = el.selectionStart;
  const end = el.selectionEnd;
  if (start === end) {
    alert("Selecione um trecho do texto primeiro.");
    return;
  }
  const selecionado = textoAtual.slice(start, end);
  const novoTexto = textoAtual.slice(0, start) + `[[${cor}]]${selecionado}[[/${cor}]]` + textoAtual.slice(end);
  onChange(novoTexto);
}

export const ColorTextToolbar: React.FC<{ onAplicarCor: (cor: string) => void }> = ({ onAplicarCor }) => (
  <div className="flex items-center gap-1.5 mb-1">
    <span className="text-slate-500 text-[10px]">Selecione o texto e clique numa cor:</span>
    {Object.entries(CORES_TEXTO).map(([nome, hex]) => (
      <button
        key={nome}
        type="button"
        onClick={() => onAplicarCor(nome)}
        className="w-5 h-5 rounded-full border border-slate-600 cursor-pointer hover:scale-110 transition-transform"
        style={{ backgroundColor: hex }}
        title={nome}
      />
    ))}
  </div>
);
