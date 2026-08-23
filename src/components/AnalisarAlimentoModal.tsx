import React, { useState, useEffect, useRef } from "react";
import {
  Camera,
  Upload,
  X,
  Sparkles,
  Loader2,
  Flame,
  Zap,
  Wheat,
  Droplets,
  AlertTriangle,
  History,
  Trash2,
  RotateCcw,
  CheckCircle2,
  Utensils,
  ChevronRight,
  Info,
} from "lucide-react";
import { AlimentoAnaliseResult } from "../types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSaveAlimento?: (alimento: AlimentoAnaliseResult) => void;
}

const STORAGE_KEY = "gaeta_alimentos_history";

export const AnalisarAlimentoModal: React.FC<Props> = ({ isOpen, onClose, onSaveAlimento }) => {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>("image/jpeg");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AlimentoAnaliseResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<AlimentoAnaliseResult[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Load history from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setHistory(JSON.parse(saved));
      }
    } catch (e) {
      console.error("Erro ao carregar histórico de alimentos:", e);
    }
  }, []);

  if (!isOpen) return null;

  const saveToHistory = (result: AlimentoAnaliseResult, preview?: string) => {
    try {
      const now = new Date();
      const itemWithMeta: AlimentoAnaliseResult = {
        ...result,
        id: result.id || `alim_${Date.now()}`,
        data: result.data || now.toISOString().split("T")[0],
        dataHora: result.dataHora || now.toLocaleString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
        imagemPreview: preview || result.imagemPreview || undefined,
      };

      const updated = [itemWithMeta, ...history.filter((h) => h.id !== itemWithMeta.id).slice(0, 49)];
      setHistory(updated);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

      if (onSaveAlimento) {
        onSaveAlimento(itemWithMeta);
      }
    } catch (e) {
      console.error("Erro ao salvar histórico:", e);
    }
  };

  const clearHistory = () => {
    if (window.confirm("Deseja apagar todo o histórico de análises de alimentos?")) {
      setHistory([]);
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const deleteHistoryItem = (id?: string) => {
    if (!id) return;
    const updated = history.filter((h) => h.id !== id);
    setHistory(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Por favor, selecione um arquivo de imagem válido (JPG, PNG, WEBP).");
      return;
    }

    setError(null);
    setMimeType(file.type || "image/jpeg");

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setImagePreview(base64);
      setAnalysisResult(null);
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyze = async () => {
    if (!imagePreview) {
      setError("Por favor, selecione ou tire uma foto primeiro.");
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const response = await fetch("/api/analyze-food", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageBase64: imagePreview,
          mimeType: mimeType || "image/jpeg",
        }),
      });

      const json = await response.json();

      if (!response.ok || json.status !== "success") {
        throw new Error(json.message || "Erro ao processar análise da imagem.");
      }

      const result: AlimentoAnaliseResult = json.data;
      setAnalysisResult(result);
      saveToHistory(result, imagePreview);
    } catch (err: any) {
      console.error("Erro na análise de alimento:", err);
      setError(
        err.message ||
          "Não foi possível analisar a imagem. Verifique a conexão e tente novamente."
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const resetAnalysis = () => {
    setImagePreview(null);
    setAnalysisResult(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  const selectHistoryItem = (item: AlimentoAnaliseResult) => {
    setAnalysisResult(item);
    if (item.imagemPreview) {
      setImagePreview(item.imagemPreview);
    }
    setShowHistory(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-900/90 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Análise Nutricional de Alimentos
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Gemini IA
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Fotografe seu prato para estimar calorias, proteínas e macronutrientes
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHistory(!showHistory)}
              title="Histórico de Análises"
              className={`p-2 rounded-xl border transition-all text-xs flex items-center gap-1.5 ${
                showHistory
                  ? "bg-emerald-600 text-white border-emerald-500"
                  : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white"
              }`}
            >
              <History className="w-4 h-4" />
              <span className="hidden sm:inline">Histórico ({history.length})</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1 custom-scrollbar">
          {/* History View */}
          {showHistory ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <History className="w-4 h-4 text-emerald-400" />
                  Histórico de Refeições Analisadas
                </h4>
                {history.length > 0 && (
                  <button
                    onClick={clearHistory}
                    className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Limpar tudo
                  </button>
                )}
              </div>

              {history.length === 0 ? (
                <div className="p-8 text-center bg-slate-950/60 border border-slate-800/80 rounded-2xl text-slate-400 text-xs">
                  Nenhuma refeição analisada no histórico ainda.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {history.map((item) => (
                    <div
                      key={item.id}
                      className="p-3.5 bg-slate-950/60 border border-slate-800/80 hover:border-emerald-500/40 rounded-2xl flex items-center justify-between gap-3 transition-all cursor-pointer group"
                      onClick={() => selectHistoryItem(item)}
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        {item.imagemPreview ? (
                          <img
                            src={item.imagemPreview}
                            alt={item.nomePrato}
                            className="w-12 h-12 rounded-xl object-cover border border-slate-800 shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 shrink-0">
                            <Utensils className="w-5 h-5" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <h5 className="text-xs font-bold text-white truncate group-hover:text-emerald-400 transition-colors">
                            {item.nomePrato}
                          </h5>
                          <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-400">
                            <span className="flex items-center gap-1 text-amber-400 font-medium">
                              <Flame className="w-3 h-3" />
                              {item.caloriasEstimadas || 0} kcal
                            </span>
                            <span className="flex items-center gap-1 text-emerald-400 font-medium">
                              <Zap className="w-3 h-3" />
                              {item.proteinasEstimadas || 0}g prot
                            </span>
                            <span className="text-slate-500">{item.dataHora}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteHistoryItem(item.id);
                          }}
                          className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors"
                          title="Remover do histórico"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition-colors" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Photo Input Area */}
              {!imagePreview ? (
                <div className="space-y-4">
                  <div className="p-8 border-2 border-dashed border-slate-700 hover:border-emerald-500/50 bg-slate-950/40 rounded-3xl text-center space-y-4 transition-all">
                    <div className="w-16 h-16 mx-auto rounded-3xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-inner">
                      <Camera className="w-8 h-8" />
                    </div>

                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-white">
                        Tire uma foto ou envie uma imagem da refeição
                      </h4>
                      <p className="text-xs text-slate-400 max-w-sm mx-auto">
                        Aponte a câmera para o prato ou selecione uma foto já salva na sua galeria
                      </p>
                    </div>

                    {/* Hidden Native File Inputs */}
                    <input
                      ref={cameraInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => cameraInputRef.current?.click()}
                        className="w-full sm:w-auto px-5 py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50"
                      >
                        <Camera className="w-4 h-4" />
                        Tirar Foto Agora
                      </button>

                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full sm:w-auto px-5 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold rounded-2xl transition-all flex items-center justify-center gap-2 border border-slate-700"
                      >
                        <Upload className="w-4 h-4" />
                        Escolher da Galeria
                      </button>
                    </div>
                  </div>

                  {/* Tips Box */}
                  <div className="p-4 bg-slate-950/60 border border-slate-800/80 rounded-2xl flex items-start gap-3">
                    <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div className="text-xs text-slate-400 space-y-1">
                      <p className="font-semibold text-slate-300">Dicas para melhor precisão:</p>
                      <ul className="list-disc list-inside space-y-0.5 text-slate-400">
                        <li>Fotografe o prato de cima com boa iluminação.</li>
                        <li>Deixe todos os alimentos visíveis (arroz, proteínas, salada, guarnições).</li>
                      </ul>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  {/* Image Preview Card */}
                  <div className="relative rounded-3xl overflow-hidden border border-slate-800 bg-slate-950 max-h-72 flex items-center justify-center group">
                    <img
                      src={imagePreview}
                      alt="Refeição"
                      className="w-full h-full object-contain max-h-72"
                    />

                    {isAnalyzing && (
                      <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs flex flex-col items-center justify-center gap-3">
                        <div className="w-12 h-12 rounded-full border-4 border-emerald-500/20 border-t-emerald-400 animate-spin flex items-center justify-center" />
                        <div className="text-center">
                          <p className="text-sm font-bold text-white flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" />
                            Analisando com Gemini IA...
                          </p>
                          <p className="text-xs text-slate-400">
                            Identificando alimentos, calorias e proteínas
                          </p>
                        </div>
                      </div>
                    )}

                    {!isAnalyzing && !analysisResult && (
                      <div className="absolute top-3 right-3 flex items-center gap-2">
                        <button
                          onClick={resetAnalysis}
                          className="px-3 py-1.5 bg-slate-900/80 hover:bg-slate-900 border border-slate-700 text-xs text-slate-300 hover:text-white rounded-xl backdrop-blur-md transition-all flex items-center gap-1.5"
                        >
                          <RotateCcw className="w-3.5 h-3.5" /> Trocar foto
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Trigger Analyze Button */}
                  {!analysisResult && !isAnalyzing && (
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={resetAnalysis}
                        className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-2xl transition-all"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={handleAnalyze}
                        className="flex-1 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/60"
                      >
                        <Sparkles className="w-4 h-4" />
                        Calcular Calorias & Proteínas
                      </button>
                    </div>
                  )}

                  {/* Analysis Error */}
                  {error && (
                    <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-start gap-3 text-xs text-rose-300">
                      <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold">Falha na análise</p>
                        <p>{error}</p>
                      </div>
                    </div>
                  )}

                  {/* Analysis Result Card */}
                  {analysisResult && (
                    <div className="space-y-4 animate-in fade-in duration-300">
                      {/* Dish Title & Summary */}
                      <div className="p-4 bg-slate-950/80 border border-emerald-500/30 rounded-2xl space-y-2">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <span className="text-[10px] font-bold tracking-wider uppercase text-emerald-400">
                              Prato Identificado
                            </span>
                            <h4 className="text-base font-bold text-white">
                              {analysisResult.nomePrato}
                            </h4>
                          </div>
                          <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold rounded-full flex items-center gap-1 shrink-0">
                            <CheckCircle2 className="w-3.5 h-3.5" /> IA Concluída
                          </span>
                        </div>
                        {analysisResult.descricao && (
                          <p className="text-xs text-slate-300 leading-relaxed">
                            {analysisResult.descricao}
                          </p>
                        )}
                      </div>

                      {/* Macronutrients Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        {/* Calories */}
                        <div className="p-3.5 bg-gradient-to-br from-amber-500/10 to-orange-500/5 border border-amber-500/20 rounded-2xl space-y-1">
                          <div className="flex items-center gap-1.5 text-amber-400 text-xs font-medium">
                            <Flame className="w-4 h-4" />
                            <span>Calorias</span>
                          </div>
                          <p className="text-lg font-black text-amber-300">
                            {analysisResult.caloriasEstimadas || 0}
                            <span className="text-xs font-normal text-amber-400/80 ml-1">kcal</span>
                          </p>
                        </div>

                        {/* Proteins */}
                        <div className="p-3.5 bg-gradient-to-br from-emerald-500/10 to-teal-500/5 border border-emerald-500/20 rounded-2xl space-y-1">
                          <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-medium">
                            <Zap className="w-4 h-4" />
                            <span>Proteínas</span>
                          </div>
                          <p className="text-lg font-black text-emerald-300">
                            {analysisResult.proteinasEstimadas || 0}
                            <span className="text-xs font-normal text-emerald-400/80 ml-1">g</span>
                          </p>
                        </div>

                        {/* Carbs */}
                        <div className="p-3.5 bg-gradient-to-br from-sky-500/10 to-blue-500/5 border border-sky-500/20 rounded-2xl space-y-1">
                          <div className="flex items-center gap-1.5 text-sky-400 text-xs font-medium">
                            <Wheat className="w-4 h-4" />
                            <span>Carboidratos</span>
                          </div>
                          <p className="text-lg font-black text-sky-300">
                            {analysisResult.carboidratosEstimados || 0}
                            <span className="text-xs font-normal text-sky-400/80 ml-1">g</span>
                          </p>
                        </div>

                        {/* Fats */}
                        <div className="p-3.5 bg-gradient-to-br from-purple-500/10 to-pink-500/5 border border-purple-500/20 rounded-2xl space-y-1">
                          <div className="flex items-center gap-1.5 text-purple-400 text-xs font-medium">
                            <Droplets className="w-4 h-4" />
                            <span>Gorduras</span>
                          </div>
                          <p className="text-lg font-black text-purple-300">
                            {analysisResult.gordurasEstimadas || 0}
                            <span className="text-xs font-normal text-purple-400/80 ml-1">g</span>
                          </p>
                        </div>
                      </div>

                      {/* Items Breakdown Table */}
                      {analysisResult.itensIdentificados &&
                        analysisResult.itensIdentificados.length > 0 && (
                          <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-3">
                            <h5 className="text-xs font-bold text-slate-300 flex items-center gap-2">
                              <Utensils className="w-3.5 h-3.5 text-emerald-400" />
                              Composição Estimada do Prato
                            </h5>
                            <div className="divide-y divide-slate-800/80 text-xs">
                              {analysisResult.itensIdentificados.map((item, idx) => (
                                <div
                                  key={idx}
                                  className="py-2 flex items-center justify-between gap-2"
                                >
                                  <div>
                                    <span className="font-semibold text-white">{item.item}</span>
                                    {item.porcaoAproximada && (
                                      <span className="text-slate-400 text-[11px] ml-2">
                                        (~{item.porcaoAproximada})
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-3 font-mono text-[11px] shrink-0">
                                    {item.calorias !== undefined && (
                                      <span className="text-amber-400">
                                        {item.calorias} kcal
                                      </span>
                                    )}
                                    {item.proteinas !== undefined && (
                                      <span className="text-emerald-400">
                                        {item.proteinas}g prot
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                      {/* Nutrition Tip */}
                      {analysisResult.dicasNutricionais && (
                        <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-start gap-2.5 text-xs text-emerald-300">
                          <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                          <p className="leading-relaxed">{analysisResult.dicasNutricionais}</p>
                        </div>
                      )}

                      {/* Disclaimer */}
                      <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-2xl flex items-start gap-2.5 text-[11px] text-amber-300/80">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                        <p>
                          <strong>Aviso Importante:</strong> Esta é uma estimativa visual
                          aproximada gerada por inteligência artificial. Os valores reais podem
                          variar conforme ingredientes ocultos, modo de preparo e quantidades exatas.
                          Não substitui avaliação com nutricionista.
                        </p>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-3 pt-2">
                        <button
                          type="button"
                          onClick={resetAnalysis}
                          className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-2xl transition-all flex items-center justify-center gap-2"
                        >
                          <Camera className="w-4 h-4" />
                          Analisar Outro Alimento
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
