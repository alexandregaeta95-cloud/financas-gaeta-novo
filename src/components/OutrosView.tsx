import React, { useState } from "react";
import {
  Target,
  Tag,
  ShoppingBag,
  CalendarDays,
  User,
  BarChart3,
  CheckSquare,
  Plus
} from "lucide-react";
import {
  MetaCategoria,
  CategoriaCustomizada,
  ItemMercado,
  CompromissoAgenda,
  PerfilUsuario
} from "../types";
import { generateNewId } from "../services/api";
import { formatCurrency, parseCurrency } from "../utils/formatters";

interface Props {
  metas: MetaCategoria[];
  categoriasCustom: CategoriaCustomizada[];
  itensMercado: ItemMercado[];
  agenda: CompromissoAgenda[];
  perfil: PerfilUsuario | null;
  onSaveItemMercado: (item: ItemMercado) => Promise<void>;
  onSaveCompromisso: (item: CompromissoAgenda) => Promise<void>;
}

export const OutrosView: React.FC<Props> = ({
  metas,
  categoriasCustom,
  itensMercado,
  agenda,
  perfil,
  onSaveItemMercado,
  onSaveCompromisso,
}) => {
  const [newItemMercadoText, setNewItemMercadoText] = useState("");
  const [newAgendaText, setNewAgendaText] = useState("");

  const handleAddItemMercado = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemMercadoText.trim()) return;
    const item: ItemMercado = {
      Id: generateNewId("MERC"),
      Item: newItemMercadoText.trim(),
      Quantidade: 1,
      Comprado: false,
    };
    await onSaveItemMercado(item);
    setNewItemMercadoText("");
  };

  const handleAddAgenda = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAgendaText.trim()) return;
    const item: CompromissoAgenda = {
      Id: generateNewId("AGENDA"),
      Data: new Date().toISOString().split("T")[0],
      Titulo: newAgendaText.trim(),
      Concluído: false,
    };
    await onSaveCompromisso(item);
    setNewAgendaText("");
  };

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight">Planejamento & Demais Módulos</h2>
        <p className="text-xs text-slate-400">
          Abas <code className="text-emerald-400 font-mono">10_Metas_De_Categoria</code>,{" "}
          <code className="text-emerald-400 font-mono">11_Categorias_Customizadas</code>,{" "}
          <code className="text-emerald-400 font-mono">16_Lista_De_Mercado</code>,{" "}
          <code className="text-emerald-400 font-mono">19_Agenda_E_Compromissos</code>
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Lista de Mercado */}
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
          <h3 className="font-bold text-sm text-white flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-emerald-400" />
            Lista de Compras de Mercado (16_Lista_De_Mercado)
          </h3>

          <form onSubmit={handleAddItemMercado} className="flex gap-2">
            <input
              type="text"
              placeholder="Adicionar item à lista..."
              value={newItemMercadoText}
              onChange={(e) => setNewItemMercadoText(e.target.value)}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
            />
            <button
              type="submit"
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold"
            >
              <Plus className="w-4 h-4" />
            </button>
          </form>

          <div className="space-y-2 text-xs">
            {itensMercado.length === 0 ? (
              <p className="text-slate-500 text-center py-3">Sua lista de compras está vazia.</p>
            ) : (
              itensMercado.map((item) => (
                <div
                  key={item.Id}
                  className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between"
                >
                  <span className={`font-medium ${item.Comprado ? "line-through text-slate-500" : "text-white"}`}>
                    {item.Item}
                  </span>
                  <button
                    onClick={() => onSaveItemMercado({ ...item, Comprado: !item.Comprado })}
                    className={`px-2 py-1 rounded text-[10px] font-bold ${
                      item.Comprado ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    {item.Comprado ? "Comprado" : "Pendente"}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Agenda & Compromissos */}
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
          <h3 className="font-bold text-sm text-white flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-teal-400" />
            Agenda & Compromissos (19_Agenda_E_Compromissos)
          </h3>

          <form onSubmit={handleAddAgenda} className="flex gap-2">
            <input
              type="text"
              placeholder="Novo compromisso..."
              value={newAgendaText}
              onChange={(e) => setNewAgendaText(e.target.value)}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
            />
            <button
              type="submit"
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold"
            >
              <Plus className="w-4 h-4" />
            </button>
          </form>

          <div className="space-y-2 text-xs">
            {agenda.length === 0 ? (
              <p className="text-slate-500 text-center py-3">Nenhum compromisso agendado.</p>
            ) : (
              agenda.map((ag) => (
                <div
                  key={ag.Id}
                  className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between"
                >
                  <div>
                    <span className="font-medium text-white">{ag.Titulo}</span>
                    <p className="text-[10px] text-slate-500">{ag.Data}</p>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px]">
                    {ag.Prioridade}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Metas de Categoria */}
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
          <h3 className="font-bold text-sm text-white flex items-center gap-2">
            <Target className="w-4 h-4 text-amber-400" />
            Metas de Categoria (10_Metas_De_Categoria)
          </h3>
          <div className="space-y-2 text-xs">
            {metas.length === 0 ? (
              <p className="text-slate-500 py-3 text-center">Nenhuma meta configurada na planilha.</p>
            ) : (
              metas.map((m) => (
                <div key={m.Id} className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex justify-between">
                  <span className="font-bold text-white">{m.Categoria}</span>
                  <span className="text-amber-400 font-bold">R$ {formatCurrency(m.Valor_Meta)} / mês</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Perfil */}
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
          <h3 className="font-bold text-sm text-white flex items-center gap-2">
            <User className="w-4 h-4 text-emerald-400" />
            Perfil do Usuário (13_Perfil)
          </h3>
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs space-y-1">
            <p className="text-slate-300 font-bold">{perfil?.Nome || "Usuário Principal"}</p>
            <p className="text-slate-500">Email: {perfil?.Email || "AlexandreGaeta95@gmail.com"}</p>
            <p className="text-slate-500">Moeda: {perfil?.Moeda || "BRL (R$)"}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
