import React, { useState } from "react";
import { CalendarDays, List, Plus, Edit2, Trash2, X, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { CompromissoAgenda } from "../types";
import { generateNewId } from "../services/api";
import { formatarHora } from "../utils/formatters";
import { VoiceInput } from "./VoiceInput";
import { VoiceTextArea } from "./VoiceTextArea";

interface Props {
  agenda: CompromissoAgenda[];
  onSaveCompromisso: (item: CompromissoAgenda) => Promise<void>;
  onDeleteCompromisso: (id: string) => Promise<void>;
}

export const AgendaCompromissosView: React.FC<Props> = ({
  agenda,
  onSaveCompromisso,
  onDeleteCompromisso,
}) => {
  const [viewMode, setViewMode] = useState<"lista" | "calendario">("lista");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CompromissoAgenda | null>(null);

  // Delete Confirmation State
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    id: string;
    title: string;
    subtitle?: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const defaultCategorias = [
    "TRABALHO",
    "PESSOAL",
    "FINANÇAS",
    "SAÚDE",
    "ESTUDOS",
    "FAMÍLIA",
    "VEÍCULO",
    "GERAL",
    "OUTROS",
  ];

  const categoriasSugeridas = Array.from(
    new Set([
      ...defaultCategorias,
      ...agenda
        .map((a) => String(a.Categoria || "").trim().toUpperCase())
        .filter((c) => c.length > 0),
    ])
  );

  const [form, setForm] = useState<Partial<CompromissoAgenda>>({
    Titulo: "Reunião de Alinhamento",
    Data: new Date().toISOString().split("T")[0],
    Hora: "10:00",
    Descrição: "Alinhamento mensal de metas e despesas",
    Cor_De_Identificação: "#10b981",
    "Efeito_Alerta_(Piscando)": "NÃO",
    Lembrete_Ativo: "SIM",
    Dias_De_Antecedência: 1,
    Concluído: false,
    Categoria: "TRABALHO",
  });

  const handleOpenModal = (item?: CompromissoAgenda) => {
    if (item) {
      setEditingItem(item);
      setForm({
        ...item,
        Categoria: item.Categoria != null ? String(item.Categoria) : "GERAL",
      });
    } else {
      setEditingItem(null);
      setForm({
        Titulo: "",
        Data: new Date().toISOString().split("T")[0],
        Hora: "09:00",
        Descrição: "",
        Cor_De_Identificação: "#10b981",
        "Efeito_Alerta_(Piscando)": "NÃO",
        Lembrete_Ativo: "SIM",
        Dias_De_Antecedência: 1,
        Concluído: false,
        Categoria: "GERAL",
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const item: CompromissoAgenda = {
      Id: editingItem?.Id || generateNewId("AGENDA"),
      Titulo: form.Titulo || "Compromisso",
      Data: form.Data || new Date().toISOString().split("T")[0],
      Hora: form.Hora || "",
      Descrição: form.Descrição || "",
      Cor_De_Identificação: form.Cor_De_Identificação || "#10b981",
      "Efeito_Alerta_(Piscando)": form["Efeito_Alerta_(Piscando)"] || "NÃO",
      Lembrete_Ativo: form.Lembrete_Ativo || "SIM",
      Dias_De_Antecedência: Number(form.Dias_De_Antecedência) || 1,
      Concluído: form.Concluído === true || form.Concluído === "SIM",
      Categoria: form.Categoria != null ? String(form.Categoria).trim() : "GERAL",
    };
    await onSaveCompromisso(item);
    setIsModalOpen(false);
  };

  // Toggle Concluído
  const handleToggleConcluido = async (item: CompromissoAgenda) => {
    const isDone = item.Concluído === true || item.Concluído === "SIM";
    await onSaveCompromisso({
      ...item,
      Concluído: !isDone,
    });
  };

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-emerald-400" />
            Agenda & Compromissos
          </h2>
          <p className="text-xs text-slate-400">
            Aba <code className="text-emerald-400 font-mono">19_Agenda_E_Compromissos</code>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setViewMode("lista")}
              className={`p-1.5 rounded-lg text-xs font-semibold ${
                viewMode === "lista" ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("calendario")}
              className={`p-1.5 rounded-lg text-xs font-semibold ${
                viewMode === "calendario" ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              <CalendarDays className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-xl transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Compromisso</span>
          </button>
        </div>
      </div>

      {/* LIST VIEW */}
      {viewMode === "lista" && (
        <div className="space-y-3">
          {agenda.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs bg-slate-900 border border-slate-800 rounded-2xl">
              Nenhum compromisso agendado.
            </div>
          ) : (
            agenda.map((item, idx) => {
              const isDone = item.Concluído === true || item.Concluído === "SIM";
              const isBlinking = item["Efeito_Alerta_(Piscando)"] === "SIM";

              return (
                <div
                  key={`${item.Id || 'agenda'}-${idx}`}
                  className={`p-4 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between gap-3 text-xs transition-colors hover:border-slate-700 ${
                    isDone ? "opacity-60" : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleToggleConcluido(item)}
                      className={`p-1.5 rounded-lg transition-colors ${
                        isDone ? "bg-emerald-500/10 text-emerald-400" : "bg-slate-800 text-slate-400 hover:text-white"
                      }`}
                    >
                      <CheckCircle2 className="w-5 h-5" />
                    </button>

                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: item.Cor_De_Identificação || "#10b981" }}
                        />
                        <h4 className={`font-bold text-sm ${isDone ? "line-through text-slate-400" : "text-white"}`}>
                          {item.Titulo}
                        </h4>
                        {isBlinking && !isDone && (
                          <span className="px-1.5 py-0.2 bg-rose-500/20 text-rose-400 border border-rose-500/40 text-[10px] font-bold rounded animate-pulse">
                            ALERTA
                          </span>
                        )}
                      </div>
                      <p className="text-slate-400">
                        {item.Data} {formatarHora(item.Hora) && `às ${formatarHora(item.Hora)}`} • Categoria: {item.Categoria || "Geral"}
                      </p>
                      {item.Descrição && <p className="text-slate-500 italic">{item.Descrição}</p>}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenModal(item)}
                      className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                      title="Editar Compromisso"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() =>
                        setDeleteConfirm({
                          isOpen: true,
                          id: item.Id,
                          title: item.Titulo,
                          subtitle: `Data: ${item.Data}${item.Hora ? ` às ${formatarHora(item.Hora)}` : ""} • Categoria: ${item.Categoria || "Geral"}`,
                        })
                      }
                      className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                      title="Excluir Compromisso"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* CALENDAR MONTH VIEW */}
      {viewMode === "calendario" && (
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
          <h3 className="font-bold text-white text-sm">Visualização de Compromissos do Mês</h3>
          <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold text-slate-400 border-b border-slate-800 pb-2">
            <span>Dom</span>
            <span>Seg</span>
            <span>Ter</span>
            <span>Qua</span>
            <span>Qui</span>
            <span>Sex</span>
            <span>Sáb</span>
          </div>

          <div className="grid grid-cols-7 gap-2 text-xs">
            {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => {
              const dayStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const dayItems = agenda.filter((a) => a.Data === dayStr);

              return (
                <div
                  key={day}
                  className="min-h-[70px] p-1.5 bg-slate-950 border border-slate-800/80 rounded-xl flex flex-col justify-between"
                >
                  <span className="font-mono text-[10px] text-slate-400 font-bold">{day}</span>
                  <div className="space-y-1 overflow-hidden">
                    {dayItems.map((it, idx) => (
                      <div
                        key={`${it.Id || 'cal'}-${idx}`}
                        className="px-1 py-0.5 rounded text-[9px] font-semibold text-white truncate cursor-pointer hover:opacity-80"
                        style={{ backgroundColor: it.Cor_De_Identificação || "#059669" }}
                        title={`${it.Titulo} (Clique para editar/excluir)`}
                        onClick={() => handleOpenModal(it)}
                      >
                        {it.Titulo}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && deleteConfirm.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 text-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2.5 bg-rose-500/10 rounded-xl">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white">
                  Confirmar Exclusão
                </h3>
                <p className="text-xs text-slate-400">
                  Excluir Compromisso da Agenda
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl space-y-1 text-xs">
              <p className="font-semibold text-white truncate">
                {deleteConfirm.title}
              </p>
              {deleteConfirm.subtitle && (
                <p className="text-slate-400 text-[11px]">
                  {deleteConfirm.subtitle}
                </p>
              )}
            </div>

            <p className="text-xs text-slate-300">
              Tem certeza que deseja excluir este compromisso? Esta ação marcará o registro como excluído na planilha.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                disabled={isDeleting}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!deleteConfirm) return;
                  setIsDeleting(true);
                  try {
                    await onDeleteCompromisso(deleteConfirm.id);
                    setDeleteConfirm(null);
                  } catch (err) {
                    console.error("Erro ao excluir compromisso:", err);
                  } finally {
                    setIsDeleting(false);
                  }
                }}
                disabled={isDeleting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 shadow-lg shadow-rose-950/40"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isDeleting ? "Excluindo..." : "Confirmar Exclusão"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs text-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-base text-white">
                {editingItem ? "Editar Compromisso" : "Novo Compromisso"}
              </h3>
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
                  placeholder="Ex: Reunião de Alinhamento"
                  value={form.Titulo}
                  onChange={(e) => setForm({ ...form, Titulo: e.target.value.toUpperCase() })}
                  className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white uppercase"
                  uppercase
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Categoria</label>
                <VoiceInput
                  type="text"
                  list="categorias-agenda"
                  placeholder="Ex: TRABALHO, PESSOAL, SAÚDE, FINANÇAS..."
                  value={form.Categoria || ""}
                  onChange={(e) => setForm({ ...form, Categoria: e.target.value.toUpperCase() })}
                  className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white uppercase"
                  uppercase
                />
                <datalist id="categorias-agenda">
                  {categoriasSugeridas.map((cat) => (
                    <option key={cat} value={cat} />
                  ))}
                </datalist>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Data</label>
                  <input
                    type="date"
                    required
                    value={form.Data}
                    onChange={(e) => setForm({ ...form, Data: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Hora</label>
                  <input
                    type="time"
                    value={form.Hora}
                    onChange={(e) => setForm({ ...form, Hora: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Efeito Alerta Piscando</label>
                  <select
                    value={form["Efeito_Alerta_(Piscando)"]}
                    onChange={(e) => setForm({ ...form, "Efeito_Alerta_(Piscando)": e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                  >
                    <option value="NÃO">NÃO</option>
                    <option value="SIM">SIM</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Cor</label>
                  <input
                    type="color"
                    value={form.Cor_De_Identificação}
                    onChange={(e) => setForm({ ...form, Cor_De_Identificação: e.target.value })}
                    className="w-full h-10 bg-slate-950 border border-slate-800 rounded-xl p-1 cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Descrição</label>
                <VoiceTextArea
                  rows={2}
                  value={form.Descrição}
                  onChange={(e) => setForm({ ...form, Descrição: e.target.value.toUpperCase() })}
                  className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white resize-none uppercase"
                  uppercase
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
