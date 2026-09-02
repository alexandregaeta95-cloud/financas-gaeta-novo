import React, { useState, useEffect } from "react";
import {
  X,
  Utensils,
  Flame,
  Zap,
  Wheat,
  Droplets,
  Calendar,
  Save,
  Trash2,
  Plus,
  FileText,
} from "lucide-react";
import { AlimentoAnaliseResult, AlimentoItem } from "../types";
import { VoiceInput } from "./VoiceInput";
import { VoiceTextArea } from "./VoiceTextArea";

interface Props {
  isOpen: boolean;
  alimento: AlimentoAnaliseResult | null;
  onClose: () => void;
  onSave: (alimento: AlimentoAnaliseResult) => void;
}

export const EditarAlimentoModal: React.FC<Props> = ({
  isOpen,
  alimento,
  onClose,
  onSave,
}) => {
  const [nomePrato, setNomePrato] = useState("");
  const [data, setData] = useState("");
  const [calorias, setCalorias] = useState<number>(0);
  const [proteinas, setProteinas] = useState<number>(0);
  const [carboidratos, setCarboidratos] = useState<number>(0);
  const [gorduras, setGorduras] = useState<number>(0);
  const [descricao, setDescricao] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [itens, setItens] = useState<AlimentoItem[]>([]);

  useEffect(() => {
    if (alimento) {
      setNomePrato(alimento.nomePrato || "");
      setData(alimento.data || new Date().toISOString().split("T")[0]);
      setCalorias(alimento.caloriasEstimadas || 0);
      setProteinas(alimento.proteinasEstimadas || 0);
      setCarboidratos(alimento.carboidratosEstimados || 0);
      setGorduras(alimento.gordurasEstimadas || 0);
      setDescricao(alimento.descricao || "");
      setObservacoes(alimento.observacoes || "");
      setItens(alimento.itensIdentificados ? [...alimento.itensIdentificados] : []);
    }
  }, [alimento]);

  if (!isOpen || !alimento) return null;

  const handleAddItem = () => {
    setItens([...itens, { item: "", porcaoAproximada: "", calorias: 0, proteinas: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    setItens(itens.filter((_, i) => i !== index));
  };

  const handleItemChange = (
    index: number,
    field: keyof AlimentoItem,
    value: string | number
  ) => {
    const updated = [...itens];
    updated[index] = {
      ...updated[index],
      [field]: value,
    };
    setItens(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedAlimento: AlimentoAnaliseResult = {
      ...alimento,
      nomePrato: nomePrato.trim() || "Refeição",
      data,
      caloriasEstimadas: Number(calorias) || 0,
      proteinasEstimadas: Number(proteinas) || 0,
      carboidratosEstimados: Number(carboidratos) || 0,
      gordurasEstimadas: Number(gorduras) || 0,
      descricao,
      observacoes,
      itensIdentificados: itens.filter((it) => it.item.trim().length > 0),
    };
    onSave(updatedAlimento);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-900 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Utensils className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Editar Refeição Analisada</h3>
              <p className="text-xs text-slate-400">Ajuste os valores, macronutrientes ou anotações</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Nome do Prato & Data */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Nome do Prato / Refeição *
              </label>
              <VoiceInput
                type="text"
                required
                value={nomePrato}
                onChange={(e) => setNomePrato(e.target.value.toUpperCase())}
                placeholder="Ex: Frango com Batata Doce"
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Data do Registro *</label>
              <input
                type="date"
                required
                value={data}
                onChange={(e) => setData(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Macronutrientes 4-Grid */}
          <div className="space-y-1.5 pt-1">
            <label className="text-xs font-semibold text-slate-300">
              Macronutrientes Principais
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {/* Calorias */}
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                <span className="text-[11px] text-amber-400 font-medium flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5" /> Calorias (kcal)
                </span>
                <input
                  type="number"
                  min="0"
                  value={calorias}
                  onChange={(e) => setCalorias(Number(e.target.value))}
                  className="w-full bg-transparent border-b border-amber-500/30 text-base font-bold text-amber-300 focus:outline-none focus:border-amber-400 py-0.5"
                />
              </div>

              {/* Proteínas */}
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5" /> Proteínas (g)
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={proteinas}
                  onChange={(e) => setProteinas(Number(e.target.value))}
                  className="w-full bg-transparent border-b border-emerald-500/30 text-base font-bold text-emerald-300 focus:outline-none focus:border-emerald-400 py-0.5"
                />
              </div>

              {/* Carbos */}
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                <span className="text-[11px] text-sky-400 font-medium flex items-center gap-1">
                  <Wheat className="w-3.5 h-3.5" /> Carbos (g)
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={carboidratos}
                  onChange={(e) => setCarboidratos(Number(e.target.value))}
                  className="w-full bg-transparent border-b border-sky-500/30 text-base font-bold text-sky-300 focus:outline-none focus:border-sky-400 py-0.5"
                />
              </div>

              {/* Gorduras */}
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                <span className="text-[11px] text-purple-400 font-medium flex items-center gap-1">
                  <Droplets className="w-3.5 h-3.5" /> Gorduras (g)
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={gorduras}
                  onChange={(e) => setGorduras(Number(e.target.value))}
                  className="w-full bg-transparent border-b border-purple-500/30 text-base font-bold text-purple-300 focus:outline-none focus:border-purple-400 py-0.5"
                />
              </div>
            </div>
          </div>

          {/* Descrição & Observações */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">
              Descrição / Ingredientes Gerais
            </label>
            <VoiceTextArea
              rows={2}
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Ex: Peito de frango grelhado com arroz integral e legumes no vapor..."
              className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">
              Observações Pessoais
            </label>
            <VoiceInput
              type="text"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value.toUpperCase())}
              placeholder="Ex: Almoço pós-treino, sem tempero industrializado..."
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Items breakdown list */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Utensils className="w-3.5 h-3.5 text-emerald-400" />
                Itens Específicos Identificados ({itens.length})
              </label>
              <button
                type="button"
                onClick={handleAddItem}
                className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Adicionar Item
              </button>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto">
              {itens.map((it, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 p-2 bg-slate-950 border border-slate-800 rounded-xl text-xs"
                >
                  <VoiceInput
                    type="text"
                    placeholder="Nome do item (ex: Arroz)"
                    value={it.item}
                    onChange={(e) => handleItemChange(idx, "item", e.target.value.toUpperCase())}
                    className="bg-transparent border-0 text-white text-xs focus:outline-none"
                    containerClassName="flex-1"
                    uppercase
                  />
                  <input
                    type="text"
                    placeholder="Porção (ex: 150g)"
                    value={it.porcaoAproximada || ""}
                    onChange={(e) => handleItemChange(idx, "porcaoAproximada", e.target.value)}
                    className="w-24 bg-transparent border-b border-slate-800 text-slate-300 text-[11px] focus:outline-none"
                  />
                  <input
                    type="number"
                    placeholder="kcal"
                    value={it.calorias || ""}
                    onChange={(e) => handleItemChange(idx, "calorias", Number(e.target.value))}
                    className="w-16 bg-transparent border-b border-slate-800 text-amber-300 text-[11px] focus:outline-none text-right"
                  />
                  <span className="text-[10px] text-slate-500">kcal</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(idx)}
                    className="p-1 text-slate-500 hover:text-rose-400 transition-colors ml-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Footer Save / Cancel */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-emerald-950/40 flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              Salvar Alterações
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
