import React, { useState, useRef } from "react";
import {
  Camera,
  Upload,
  Sparkles,
  Zap,
  X,
  Check,
  Trash2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Plus,
  ShoppingBag,
} from "lucide-react";
import { createWorker } from "tesseract.js";
import { ItemMercado } from "../types";

export interface ItemExtraido {
  id: string;
  item: string;
  quantidade: number;
  unidade: string;
  categoria: string;
  observacao?: string;
  selecionado: boolean;
}

interface LerListaFotoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmItens: (itens: ItemMercado[]) => Promise<void>;
  generateNewId: (prefix: string) => string;
}

const CATEGORIAS_MERCADO = [
  "HORTIFRUTI",
  "AÇOUGUE",
  "PADARIA",
  "LATICÍNIOS & FRIOS",
  "MERCEARIA",
  "BEBIDAS",
  "LIMPEZA",
  "HIGIENE & BELEZA",
  "PET",
  "CONGELADOS",
  "MERCADO",
  "OUTROS",
];

const UNIDADES_DISPONIVEIS = ["UN", "KG", "G", "L", "ML", "PCT", "CX", "DZ"];

// Dicionário de classificação rápida para o OCR do Tesseract (Client-side)
const CATEGORY_KEYWORDS: { [cat: string]: string[] } = {
  "HORTIFRUTI": ["BANANA", "MACA", "MAÇÃ", "LARANJA", "LIMAO", "LIMÃO", "TOMATE", "CEBOLA", "ALHO", "BATATA", "CENOURA", "ALFACE", "COUVE", "ABACAXI", "MELANCIA", "MAMAO", "MAMÃO", "UVAS", "UVA", "LEGUME", "FRUTA", "VERDURA", "CHUCHU", "ABOBRINHA"],
  "AÇOUGUE": ["CARNE", "FRANGO", "PEIXE", "BOVINO", "ALCATRA", "PATINHO", "PICANHA", "COSTELA", "LINGUICA", "LINGUIÇA", "BACON", "FILE", "FILÉ", "COXA", "SOBRECOXA", "PEITO DE FRANGO", "MOIDA", "MOÍDA", "SALSICHA", "LOMBO", "BIFE"],
  "PADARIA": ["PAO", "PÃO", "BOLO", "TORRADA", "BISCOITO", "BOLACHA", "BAGUETE", "CROISSANT", "BROA", "SONHO"],
  "LATICÍNIOS & FRIOS": ["LEITE", "QUEIJO", "IOGURTE", "MANTEIGA", "REQUEIJAO", "REQUEIJÃO", "PRESUNTO", "MUSSALERA", "MUSSARELA", "CREME DE LEITE", "LEITE CONDENSADO", "RICOTA"],
  "MERCEARIA": ["ARROZ", "FEIJAO", "FEIJÃO", "MACARRAO", "MACARRÃO", "OLEO", "ÓLEO", "AZEITE", "ACUCAR", "AÇÚCAR", "SAL", "CAFE", "CAFÉ", "FARINHA", "MOLHO", "EXTRATO", "ENLATADO", "MILHO", "ERVILHA", "ATUN", "ATUM", "SARDINHA", "TEMPERO", "FERMENTO", "VINAGRE", "MAIONESE", "KETCHUP", "MOSTARDA"],
  "BEBIDAS": ["AGUA", "ÁGUA", "SUCO", "REFRIGERANTE", "CERVEJA", "VINHO", "CHA", "CHÁ", "VODKA", "GIN", "ENERGETICO", "ENERGÉTICO", "COCA", "GUARANA", "GUARANÁ"],
  "LIMPEZA": ["DETERGENTE", "SABAO", "SABÃO", "DESINFETANTE", "AMACIANTE", "ALVEJANTE", "CLORO", "AGUA SANITARIA", "ÁGUA SANITÁRIA", "ESPONJA", "PALHA DE ACO", "PALHA DE AÇO", "PAPEL TOALHA", "RODO", "VASSOURA", "SACO DE LIXO", "MULTIUSO", "LAVALOUCAS", "LAVA LOUÇAS"],
  "HIGIENE & BELEZA": ["SHAMPOO", "CONDICIONADOR", "SABONETE", "PASTA DE DENTE", "CREME DENTAL", "DESODORANTE", "PAPEL HIGIENICO", "PAPEL HIGIÊNICO", "ESCOVA DE DENTE", "FIO DENTAL", "HIDRATANTE", "LAMINA", "LÂMINA", "ABSORVENTE"],
  "PET": ["RACAO", "RAÇÃO", "PETISCO", "AREIA DE GATO", "SACHE", "SACHÊ", "TAPETE HIGIENICO", "TAPETE HIGIÊNICO"],
  "CONGELADOS": ["PIZZA", "SORVETE", "HAMBURGER", "HAMBÚRGUER", "NUGGETS", "LASANHA", "BATATA CONGELADA", "GELO", "POLPA"],
};

function inferCategoryFromText(text: string): string {
  const upper = text.toUpperCase();
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((kw) => upper.includes(kw))) {
      return cat;
    }
  }
  return "MERCADO";
}

function parseRawLineToItem(rawLine: string, index: number): ItemExtraido | null {
  // Limpar marcadores comuns de listas manuscritas ou impressas (-, *, •, [ ], 1., 1 -, etc.)
  let cleaned = rawLine
    .replace(/^[\s\-\*•\+\[\]\(\)\d\.\,\;\:\>\#\~]+(?=\s|[a-zA-ZÀ-ÿ])/, "")
    .trim();

  if (!cleaned || cleaned.length < 2) return null;

  // Filtrar palavras óbvias que não são itens (título da folha)
  const upperClean = cleaned.toUpperCase();
  if (
    upperClean === "LISTA" ||
    upperClean === "LISTA DE COMPRAS" ||
    upperClean === "MERCADO" ||
    upperClean === "COMPRAS" ||
    upperClean === "SUPERMERCADO"
  ) {
    return null;
  }

  let quantidade = 1;
  let unidade = "UN";

  // Tenta extrair quantidade e unidade no início (ex: "2 KG DE ARROZ", "3L LEITE", "2X FARINHA", "1/2 KG CARNE", "2 PCT CAFE")
  const matchInicio = cleaned.match(/^(\d+(?:[\.,]\d+)?|\d+\/\d+)\s*(KG|G|L|ML|PCT|CX|DZ|UN|X)?\s*(?:DE\s+)?(.+)$/i);

  if (matchInicio) {
    let rawQtd = matchInicio[1];
    if (rawQtd.includes("/")) {
      const [num, den] = rawQtd.split("/");
      quantidade = Number(num) / Number(den) || 1;
    } else {
      quantidade = Number(rawQtd.replace(",", ".")) || 1;
    }

    const rawUn = (matchInicio[2] || "").toUpperCase();
    if (rawUn && UNIDADES_DISPONIVEIS.includes(rawUn)) {
      unidade = rawUn;
    } else if (rawUn === "X") {
      unidade = "UN";
    }

    cleaned = matchInicio[3].trim();
  } else {
    // Tenta extrair no final (ex: "ARROZ 5KG", "LEITE 2L", "FEIJAO 2 PCT", "OVOS 1 DZ")
    const matchFim = cleaned.match(/^(.+?)\s+(\d+(?:[\.,]\d+)?|\d+\/\d+)\s*(KG|G|L|ML|PCT|CX|DZ|UN)?$/i);
    if (matchFim) {
      cleaned = matchFim[1].trim();
      let rawQtd = matchFim[2];
      if (rawQtd.includes("/")) {
        const [num, den] = rawQtd.split("/");
        quantidade = Number(num) / Number(den) || 1;
      } else {
        quantidade = Number(rawQtd.replace(",", ".")) || 1;
      }

      const rawUn = (matchFim[3] || "").toUpperCase();
      if (rawUn && UNIDADES_DISPONIVEIS.includes(rawUn)) {
        unidade = rawUn;
      }
    }
  }

  const finalItemName = cleaned.toUpperCase().trim();
  if (!finalItemName || finalItemName.length < 2) return null;

  return {
    id: `tess_${Date.now()}_${index}`,
    item: finalItemName,
    quantidade: quantidade > 0 ? quantidade : 1,
    unidade: unidade,
    categoria: inferCategoryFromText(finalItemName),
    selecionado: true,
  };
}

export const LerListaFotoModal: React.FC<LerListaFotoModalProps> = ({
  isOpen,
  onClose,
  onConfirmItens,
  generateNewId,
}) => {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>("image/jpeg");
  
  // Modos de leitura: "gemini" (IA) ou "tesseract" (Rápido / Grátis local)
  const [ocrMode, setOcrMode] = useState<"gemini" | "tesseract">("gemini");
  
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [progressStatus, setProgressStatus] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [resumoLeitura, setResumoLeitura] = useState<string | null>(null);
  const [itensExtraidos, setItensExtraidos] = useState<ItemExtraido[]>([]);
  const [isSalvando, setIsSalvando] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleReset = () => {
    setImagePreview(null);
    setItensExtraidos([]);
    setResumoLeitura(null);
    setError(null);
    setIsLoading(false);
    setProgressStatus("");
    setIsSalvando(false);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const processFile = (file: File) => {
    setError(null);
    if (!file.type.startsWith("image/")) {
      setError("Por favor, selecione um arquivo de imagem válido (JPG, PNG, WEBP, etc).");
      return;
    }

    setMimeType(file.type || "image/jpeg");
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setImagePreview(result);
      setItensExtraidos([]);
      setResumoLeitura(null);
    };
    reader.onerror = () => {
      setError("Não foi possível ler o arquivo selecionado.");
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  // Motor 1: Gemini Vision AI (Server-side)
  const runGeminiVision = async () => {
    if (!imagePreview) return;
    setProgressStatus("Enviando foto e analisando com Gemini IA...");

    const response = await fetch("/api/read-shopping-list", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        imageBase64: imagePreview,
        mimeType: mimeType,
      }),
    });

    const json = await response.json();

    if (!response.ok || json.status === "error") {
      throw new Error(json.message || "Falha ao processar a foto da lista de compras com IA.");
    }

    const data = json.data;
    if (!data || !Array.isArray(data.itens) || data.itens.length === 0) {
      throw new Error("Nenhum item de compra foi reconhecido com clareza nesta foto. Tente tirar outra foto mais nítida ou aproximada.");
    }

    const itensFormatados: ItemExtraido[] = data.itens.map((it: any, index: number) => {
      const rawNome = (it.item || "ITEM").toString().trim().toUpperCase();
      const rawUnidade = (it.unidade || "UN").toString().trim().toUpperCase();
      const normalizedUnidade = UNIDADES_DISPONIVEIS.includes(rawUnidade) ? rawUnidade : "UN";
      const normalizedCategoria = CATEGORIAS_MERCADO.includes(it.categoria) ? it.categoria : "MERCADO";
      const rawQtd = Number(it.quantidade);
      const normalizedQtd = !isNaN(rawQtd) && rawQtd > 0 ? rawQtd : 1;

      return {
        id: `gemini_${Date.now()}_${index}`,
        item: rawNome,
        quantidade: normalizedQtd,
        unidade: normalizedUnidade,
        categoria: normalizedCategoria,
        observacao: it.observacao || "",
        selecionado: true,
      };
    });

    setItensExtraidos(itensFormatados);
    setResumoLeitura(data.resumoLeitura || `Identificados ${itensFormatados.length} itens pela Visão Gemini.`);
  };

  // Motor 2: Tesseract.js (Client-side, 100% no navegador, Grátis)
  const runTesseractOCR = async () => {
    if (!imagePreview) return;
    setProgressStatus("Inicializando motor OCR no navegador...");

    const worker = await createWorker("por+eng", 1, {
      logger: (m) => {
        if (m.status === "recognizing text") {
          const pct = Math.round((m.progress || 0) * 100);
          setProgressStatus(`Reconhecendo texto no navegador... ${pct}%`);
        } else if (m.status === "loading tesseract core" || m.status === "loading language traineddata") {
          setProgressStatus("Carregando modelo de leitura em português...");
        }
      },
    });

    try {
      setProgressStatus("Lendo texto da foto...");
      const { data } = await worker.recognize(imagePreview);
      await worker.terminate();

      const rawText = data?.text || "";
      const lines = rawText.split("\n").map((l) => l.trim()).filter(Boolean);

      const itemsParsed: ItemExtraido[] = [];
      lines.forEach((line, idx) => {
        const item = parseRawLineToItem(line, idx);
        if (item) {
          itemsParsed.push(item);
        }
      });

      if (itemsParsed.length === 0) {
        throw new Error(
          "O OCR rápido não identificou texto nítido nesta imagem. Se for uma lista manuscrita ou com letra cursiva, use o modo 'Leitura com IA (Gemini)' ou tire uma foto mais focada e com boa iluminação."
        );
      }

      setItensExtraidos(itemsParsed);
      setResumoLeitura(`Identificados ${itemsParsed.length} itens via OCR Rápido (Tesseract).`);
    } catch (tessErr: any) {
      await worker.terminate().catch(() => {});
      throw tessErr;
    }
  };

  const handleAnalyzePhoto = async () => {
    if (!imagePreview) return;
    setIsLoading(true);
    setError(null);

    try {
      if (ocrMode === "gemini") {
        await runGeminiVision();
      } else {
        await runTesseractOCR();
      }
    } catch (err: any) {
      console.error("[Erro na leitura de lista por foto]:", err);
      setError(err.message || "Ocorreu um erro ao processar a imagem.");
    } finally {
      setIsLoading(false);
      setProgressStatus("");
    }
  };

  const handleToggleSelectAll = (checked: boolean) => {
    setItensExtraidos((prev) =>
      prev.map((it) => ({ ...it, selecionado: checked }))
    );
  };

  const handleToggleItem = (id: string) => {
    setItensExtraidos((prev) =>
      prev.map((it) => (it.id === id ? { ...it, selecionado: !it.selecionado } : it))
    );
  };

  const handleUpdateItemField = (id: string, field: keyof ItemExtraido, value: any) => {
    setItensExtraidos((prev) =>
      prev.map((it) => {
        if (it.id !== id) return it;
        if (field === "item") {
          return { ...it, item: String(value).toUpperCase() };
        }
        return { ...it, [field]: value };
      })
    );
  };

  const handleRemoveItem = (id: string) => {
    setItensExtraidos((prev) => prev.filter((it) => it.id !== id));
  };

  const handleAddNewItemManually = () => {
    const novo: ItemExtraido = {
      id: `manual_${Date.now()}`,
      item: "NOVO ITEM",
      quantidade: 1,
      unidade: "UN",
      categoria: "MERCADO",
      selecionado: true,
    };
    setItensExtraidos((prev) => [...prev, novo]);
  };

  const handleSalvarItensFinal = async () => {
    const selecionados = itensExtraidos.filter((it) => it.selecionado && it.item.trim() !== "");
    if (selecionados.length === 0) {
      setError("Selecione pelo menos 1 item para adicionar à Lista de Mercado.");
      return;
    }

    setIsSalvando(true);
    setError(null);

    try {
      const dataAtual = new Date().toISOString().split("T")[0];
      const itensProntos: ItemMercado[] = selecionados.map((it) => ({
        Id: generateNewId("MERC"),
        Item: it.item.trim().toUpperCase(),
        Categoria: it.categoria || "MERCADO",
        Quantidade: Number(it.quantidade) || 1,
        Unidade: it.unidade || "UN",
        Valor_Unitário: 0,
        Valor_Total: 0,
        Valor_Estimado: 0,
        Preco_Estimado: 0,
        Data_Pedido: dataAtual,
        Data_Compra: "",
        Data_Lembrete: "",
        Hora_Lembrete: "",
        Comprado: false,
        Observação: it.observacao || "",
      }));

      await onConfirmItens(itensProntos);
      handleClose();
    } catch (err: any) {
      console.error("[Erro ao salvar itens no Google Sheets]:", err);
      setError(`Erro ao salvar itens: ${err.message || err}`);
    } finally {
      setIsSalvando(false);
    }
  };

  const totalSelecionados = itensExtraidos.filter((it) => it.selecionado).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Ler Lista por Foto
                {ocrMode === "gemini" ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5" /> Visão Gemini IA
                  </span>
                ) : (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 flex items-center gap-1">
                    <Zap className="w-2.5 h-2.5" /> OCR Rápido Grátis
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-400">
                Tire foto de uma lista de papel ou impressa para extrair os itens
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Error Message */}
          {error && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-start gap-2.5 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1">{error}</div>
            </div>
          )}

          {/* Mode Selector (Gemini vs Tesseract) */}
          <div className="bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800">
            <div className="text-[11px] font-semibold text-slate-400 px-2 py-1 mb-1 flex items-center justify-between">
              <span>Escolha o motor de leitura:</span>
              <span className="text-[10px] text-slate-400">Pode alternar a qualquer momento</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {/* Option 1: Gemini AI */}
              <button
                type="button"
                onClick={() => {
                  setOcrMode("gemini");
                  if (itensExtraidos.length > 0) setItensExtraidos([]);
                }}
                disabled={isLoading}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  ocrMode === "gemini"
                    ? "bg-emerald-950/40 border-emerald-500/50 text-white shadow-xs"
                    : "bg-slate-900/40 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                }`}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`p-1.5 rounded-lg ${
                      ocrMode === "gemini"
                        ? "bg-emerald-500 text-slate-950"
                        : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold flex items-center gap-1.5">
                      <span>Leitura com IA (Gemini)</span>
                      <span className="text-[9px] px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 rounded font-semibold">
                        Mais Preciso
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-tight mt-0.5">
                      Melhor para escrita manual, letra cursiva e receitas
                    </p>
                  </div>
                </div>
              </button>

              {/* Option 2: Tesseract OCR (Fast / Free) */}
              <button
                type="button"
                onClick={() => {
                  setOcrMode("tesseract");
                  if (itensExtraidos.length > 0) setItensExtraidos([]);
                }}
                disabled={isLoading}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  ocrMode === "tesseract"
                    ? "bg-cyan-950/40 border-cyan-500/50 text-white shadow-xs"
                    : "bg-slate-900/40 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                }`}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`p-1.5 rounded-lg ${
                      ocrMode === "tesseract"
                        ? "bg-cyan-500 text-slate-950"
                        : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold flex items-center gap-1.5">
                      <span>Leitura Rápida (Grátis)</span>
                      <span className="text-[9px] px-1.5 py-0.2 bg-cyan-500/20 text-cyan-300 rounded font-semibold">
                        Sem Cota
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-tight mt-0.5">
                      OCR no navegador (Tesseract), ideal para texto impresso
                    </p>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Step 1: No image selected yet */}
          {!imagePreview && (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-slate-800 hover:border-emerald-500/40 rounded-2xl p-6 sm:p-8 text-center bg-slate-950/40 transition-colors">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto mb-3">
                  <ShoppingBag className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-semibold text-white mb-1">
                  Fotografe sua anotação ou lista de compras
                </h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto mb-6">
                  Extraia cada item em maiúsculo automaticamente para a sua lista de mercado.
                </p>

                {/* Hidden File Inputs */}
                <input
                  type="file"
                  ref={cameraInputRef}
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-emerald-950/40 transition-all active:scale-95 cursor-pointer"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Tirar Foto com a Câmera</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl border border-slate-700 transition-all active:scale-95 cursor-pointer"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Escolher da Galeria / Arquivo</span>
                  </button>
                </div>
              </div>

              {/* Informative Tips */}
              <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5 space-y-1.5 text-xs text-slate-400">
                <div className="font-semibold text-slate-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  Dicas para melhor leitura:
                </div>
                <ul className="list-disc list-inside space-y-0.5 text-[11px] text-slate-400 pl-1">
                  <li>Mantenha o papel bem iluminado e evite sombras fortes.</li>
                  <li>Para escrita manual ou papéis amassados, prefira a <strong>Leitura com IA (Gemini)</strong>.</li>
                  <li>Para listas impressas ou impressos digitais, a <strong>Leitura Rápida (Grátis)</strong> é instantânea e economiza cota.</li>
                </ul>
              </div>
            </div>
          )}

          {/* Step 2: Image Selected -> Analyzing or Showing Results */}
          {imagePreview && (
            <div className="space-y-4">
              {/* Preview Thumbnail and Actions */}
              <div className="flex flex-col sm:flex-row items-center gap-3.5 p-3 bg-slate-950/70 border border-slate-800 rounded-xl">
                <div className="relative w-24 h-24 sm:w-20 sm:h-20 rounded-lg overflow-hidden border border-slate-700 shrink-0 bg-slate-900">
                  <img
                    src={imagePreview}
                    alt="Lista fotografada"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 text-center sm:text-left">
                  <span className="text-xs font-semibold text-white block">
                    Foto pronta para análise
                  </span>
                  <span className="text-[11px] text-slate-400 block mt-0.5">
                    {itensExtraidos.length > 0
                      ? `${itensExtraidos.length} itens extraídos (${ocrMode === "gemini" ? "Gemini IA" : "Tesseract OCR"})`
                      : `Motor selecionado: ${ocrMode === "gemini" ? "Gemini IA" : "Tesseract OCR (Grátis)"}`}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setImagePreview(null);
                      setItensExtraidos([]);
                    }}
                    disabled={isLoading || isSalvando}
                    className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg text-xs font-medium border border-slate-700 transition-colors cursor-pointer"
                    title="Trocar Foto"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>

                  {itensExtraidos.length === 0 && (
                    <button
                      type="button"
                      onClick={handleAnalyzePhoto}
                      disabled={isLoading}
                      className={`flex items-center gap-1.5 px-3.5 py-2 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-md transition-all cursor-pointer ${
                        ocrMode === "gemini"
                          ? "bg-emerald-600 hover:bg-emerald-500"
                          : "bg-cyan-600 hover:bg-cyan-500"
                      }`}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Processando...</span>
                        </>
                      ) : ocrMode === "gemini" ? (
                        <>
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Ler com IA (Gemini)</span>
                        </>
                      ) : (
                        <>
                          <Zap className="w-3.5 h-3.5" />
                          <span>Ler Grátis (Tesseract)</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Loading State Spinner */}
              {isLoading && (
                <div className="py-8 text-center space-y-3">
                  <div
                    className={`inline-flex p-3 rounded-2xl animate-pulse ${
                      ocrMode === "gemini"
                        ? "bg-emerald-500/10 text-emerald-400"
                        : "bg-cyan-500/10 text-cyan-400"
                    }`}
                  >
                    {ocrMode === "gemini" ? (
                      <Sparkles className="w-8 h-8 animate-spin" />
                    ) : (
                      <Zap className="w-8 h-8 animate-bounce" />
                    )}
                  </div>
                  <h4 className="text-sm font-bold text-white">
                    {ocrMode === "gemini" ? "Lendo itens com a IA do Gemini..." : "Lendo texto no seu navegador (Tesseract)..."}
                  </h4>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto">
                    {progressStatus || "Processando imagem e separando itens em maiúsculo..."}
                  </p>
                </div>
              )}

              {/* Step 3: Confirmation List Table */}
              {itensExtraidos.length > 0 && !isLoading && (
                <div className="space-y-3">
                  {resumoLeitura && (
                    <div
                      className={`p-2.5 border rounded-xl text-xs flex items-center justify-between ${
                        ocrMode === "gemini"
                          ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                          : "bg-cyan-500/10 border-cyan-500/20 text-cyan-300"
                      }`}
                    >
                      <span className="font-medium">{resumoLeitura}</span>
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                          ocrMode === "gemini" ? "bg-emerald-500/20" : "bg-cyan-500/20"
                        }`}
                      >
                        {totalSelecionados} selecionados
                      </span>
                    </div>
                  )}

                  {/* Table Controls (Select All / Add Extra) */}
                  <div className="flex items-center justify-between px-1 text-xs">
                    <label className="flex items-center gap-2 text-slate-300 font-medium cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={totalSelecionados === itensExtraidos.length && itensExtraidos.length > 0}
                        onChange={(e) => handleToggleSelectAll(e.target.checked)}
                        className="rounded border-slate-700 text-emerald-600 focus:ring-emerald-500 bg-slate-950 w-4 h-4 cursor-pointer"
                      />
                      <span>Selecionar Todos</span>
                    </label>

                    <button
                      type="button"
                      onClick={handleAddNewItemManually}
                      className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-medium transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Adicionar outro item</span>
                    </button>
                  </div>

                  {/* List of Extracted Items */}
                  <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                    {itensExtraidos.map((it) => (
                      <div
                        key={it.id}
                        className={`p-3 rounded-xl border transition-all ${
                          it.selecionado
                            ? "bg-slate-950 border-emerald-500/40"
                            : "bg-slate-950/40 border-slate-800/80 opacity-60"
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                          {/* Checkbox & Item Name */}
                          <div className="flex items-center gap-2.5 flex-1">
                            <input
                              type="checkbox"
                              checked={it.selecionado}
                              onChange={() => handleToggleItem(it.id)}
                              className="rounded border-slate-700 text-emerald-600 focus:ring-emerald-500 bg-slate-900 w-4 h-4 cursor-pointer"
                            />
                            {/* Item Name Input (Always in UPPERCASE) */}
                            <input
                              type="text"
                              value={it.item}
                              onChange={(e) => handleUpdateItemField(it.id, "item", e.target.value)}
                              placeholder="NOME DO ITEM"
                              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white font-bold focus:outline-none focus:border-emerald-500 uppercase tracking-wide"
                            />
                          </div>

                          {/* Quantity & Unit & Category */}
                          <div className="flex items-center gap-1.5 shrink-0 justify-between sm:justify-end">
                            {/* Quantity */}
                            <div className="w-16">
                              <input
                                type="number"
                                min="0.1"
                                step="any"
                                value={it.quantidade}
                                onChange={(e) =>
                                  handleUpdateItemField(it.id, "quantidade", e.target.value)
                                }
                                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-white text-center focus:outline-none focus:border-emerald-500"
                                title="Quantidade"
                              />
                            </div>

                            {/* Unit */}
                            <select
                              value={it.unidade}
                              onChange={(e) => handleUpdateItemField(it.id, "unidade", e.target.value)}
                              className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
                              title="Unidade"
                            >
                              {UNIDADES_DISPONIVEIS.map((u) => (
                                <option key={u} value={u}>
                                  {u}
                                </option>
                              ))}
                            </select>

                            {/* Category */}
                            <select
                              value={it.categoria}
                              onChange={(e) => handleUpdateItemField(it.id, "categoria", e.target.value)}
                              className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-[11px] text-slate-300 focus:outline-none focus:border-emerald-500 max-w-[120px] truncate"
                              title="Categoria"
                            >
                              {CATEGORIAS_MERCADO.map((c) => (
                                <option key={c} value={c}>
                                  {c}
                                </option>
                              ))}
                            </select>

                            {/* Remove button */}
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(it.id)}
                              className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                              title="Excluir item da lista"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-900/60 flex flex-col-reverse sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleClose}
            disabled={isSalvando}
            className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors text-center cursor-pointer"
          >
            Cancelar
          </button>

          {itensExtraidos.length > 0 && (
            <button
              type="button"
              onClick={handleSalvarItensFinal}
              disabled={isSalvando || totalSelecionados === 0}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-950/40 transition-all active:scale-95 cursor-pointer"
            >
              {isSalvando ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Adicionando {totalSelecionados} Itens...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Adicionar {totalSelecionados} Itens à Lista de Mercado</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
