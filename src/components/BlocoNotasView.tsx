import React, { useState } from "react";
import { StickyNote, Plus, X, Bell, BellOff, Check, Trash2, Edit3 } from "lucide-react";
import { VoiceInput } from "./VoiceInput";
import { VoiceTextArea } from "./VoiceTextArea";
import { AnotacaoBloco } from "../types";
import { generateNewId } from "../services/api";

interface Props {
  anotacoes: AnotacaoBloco[];
  onSaveAnotacao: (a: AnotacaoBloco) => Promise<void>;
  onDeleteAnotacao: (id: string) => Promise<void>;
}

export const BlocoNotasView: React.FC<Props> = ({ anotacoes, onSaveAnotacao, onDeleteAnotacao }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AnotacaoBloco | null>(null);
  const [form, setForm] = useState<Partial<AnotacaoBloco>>({});
  const [comAlarme, setComAlarme] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const handleOpen = (item?: AnotacaoBloco) => {
    if (item) {
      setEditingItem(item);
      setForm({ ...item });
      setComAlarme(item.Alarme_Ativo === "SIM");
    } else {
      setEditingItem(null);
      const now = new Date();
      setForm({
        Titulo: "",
        Texto: "",
        Data_Alarme: now.toISOString().split("T")[0],
        Hora_Alarme: `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`,
      });
      setComAlarme(false);
    }
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const now = new Date();
    const item: AnotacaoBloco = {
      Id: editingItem?.Id || generateNewId("NOTA"),
      Titulo: form.Titulo || "Sem título",
      Texto: form.Texto || "",
      Data_Criacao: editingItem?.Data_Criacao || now.toISOString().split("T")[0],
      Hora_Criacao: editingItem?.Hora_Criacao || `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`,
      Data_Alarme: comAlarme ? form.Data_Alarme || "" : "",
      Hora_Alarme: comAlarme ? form.Hora_Alarme || "" : "",
      Alarme_Ativo: comAlarme ? "SIM" : "NÃO",
      Concluido: editingItem?.Concluido || "NÃO",
    };
    setIsModalOpen(false);
    onSaveAnotacao(item);
  };

  const handleConcluir = (item: AnotacaoBloco) => {
    onSaveAnotacao({ ...item, Concluido: "SIM", Alarme_Ativo: "NÃO" });
  };

  const ativas = anotacoes.filter((a) => a.Concluido !== "SIM").sort((a, b) => (b.Data_Criacao || "").localeCompare(a.Data_Criacao || ""));

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <StickyNote className="w-5 h-5 text-amber-400" />
            Bloco de Notas
          </h2>
          <p className="text-xs text-slate-400">Anotações rápidas do dia a dia, com alarme opcional.</p>
        </div>
        <button
          onClick={() => handleOpen()}
          className="flex items-center gap-1.5 px-3 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Nova</span>
        </button>
      </div>

      <div className="space-y-3">
        {ativas.length === 0 && (
          <div className="text-center py-10 text-slate-500 text-sm">Nenhuma anotação ainda.</div>
        )}
        {ativas.map((item) => (
          <div key={item.Id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-bold text-white text-sm">{item.Titulo}</h3>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => handleConcluir(item)} className="p-1.5 text-emerald-400 hover:bg-emerald-500/10 rounded-lg" title="Concluir">
                  <Check className="w-4 h-4" />
                </button>
                <button onClick={() => handleOpen(item)} className="p-1.5 text-slate-400 hover:bg-slate-800 rounded-lg">
                  <Edit3 className="w-4 h-4" />
                </button>
                <button onClick={() => setDeleteConfirm(item.Id)} className="p-1.5 text-rose-400 hover:bg-rose-500/10 rounded-lg">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <p className="text-slate-300 text-xs whitespace-pre-wrap">{item.Texto}</p>
            <div className="flex items-center gap-3 text-[10px] text-slate-500 pt-1 border-t border-slate-800">
              <span>{item.Data_Criacao} às {item.Hora_Criacao}</span>
              {item.Alarme_Ativo === "SIM" ? (
                <span className="flex items-center gap-1 text-amber-400">
                  <Bell className="w-3 h-3" /> Alarme: {item.Data_Alarme} às {item.Hora_Alarme}
                </span>
              ) : (
                <span className="flex items-center gap-1 text-slate-600">
                  <BellOff className="w-3 h-3" /> Sem alarme
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs text-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-base text-white">{editingItem ? "Editar Anotação" : "Nova Anotação"}</h3>
              <button onClick={() => setIsModalOpen(false)}>
                <X className="w-5 h-5 text-slate-400 hover:text-white" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="text-slate-400 block mb-1">Título</label>
                <VoiceInput
                  type="text"
                  required
                  value={form.Titulo || ""}
                  onChange={(e) => setForm({ ...form, Titulo: e.target.value.toUpperCase() })}
                  className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white uppercase"
                  uppercase
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Anotação</label>
                <VoiceTextArea
                  rows={3}
                  value={form.Texto || ""}
                  onChange={(e) => setForm({ ...form, Texto: e.target.value })}
                  className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                />
              </div>

              <label className="flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer bg-slate-950 border-slate-800">
                <input
                  type="checkbox"
                  checked={comAlarme}
                  onChange={(e) => setComAlarme(e.target.checked)}
                  className="w-4 h-4 rounded accent-amber-500"
                />
                <span className="text-white font-medium">Definir alarme pra essa anotação</span>
              </label>

              {comAlarme && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-400 block mb-1">Data</label>
                    <input
                      type="date"
                      value={form.Data_Alarme || ""}
                      onChange={(e) => setForm({ ...form, Data_Alarme: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Hora</label>
                    <input
                      type="time"
                      value={form.Hora_Alarme || ""}
                      onChange={(e) => setForm({ ...form, Hora_Alarme: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-400 hover:text-white">
                  Cancelar
                </button>
                <button type="submit" className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl">
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs text-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-5 space-y-4">
            <p className="text-white">Excluir essa anotação?</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 text-slate-400 hover:text-white">Cancelar</button>
              <button
                onClick={() => {
                  const id = deleteConfirm;
                  setDeleteConfirm(null);
                  onDeleteAnotacao(id);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-semibold"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
