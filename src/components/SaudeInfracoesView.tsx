import React from "react";
import { HeartPulse, AlertOctagon, Pill, Plus } from "lucide-react";
import { ConsultaMedica, ReceitaMedica, Infracao, ZonaDeRisco } from "../types";

interface Props {
  consultas: ConsultaMedica[];
  receitas: ReceitaMedica[];
  infracoes: Infracao[];
  zonasRisco: ZonaDeRisco[];
}

export const SaudeInfracoesView: React.FC<Props> = ({
  consultas,
  receitas,
  infracoes,
  zonasRisco,
}) => {
  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight">Saúde, Trânsito & Segurança</h2>
        <p className="text-xs text-slate-400">
          Abas <code className="text-emerald-400 font-mono">6_Consultas_Médicas</code>,{" "}
          <code className="text-emerald-400 font-mono">7_Receitas_Médicas</code>,{" "}
          <code className="text-emerald-400 font-mono">8_Infracoes</code>,{" "}
          <code className="text-emerald-400 font-mono">17_Zonas_De_Risco</code>
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Consultas Médicas */}
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <HeartPulse className="w-4 h-4 text-emerald-400" />
              Consultas Médicas ({consultas.length})
            </h3>
          </div>
          {consultas.length === 0 ? (
            <p className="text-slate-500 text-xs py-4 text-center">Nenhuma consulta cadastrada.</p>
          ) : (
            <div className="space-y-2 text-xs">
              {consultas.map((c) => (
                <div key={c.Id} className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex justify-between">
                  <div>
                    <span className="font-bold text-white">{c.Especialidade}</span>
                    <p className="text-slate-400 text-[11px]">
                      Médico: {c.Medico || "N/I"} • Data: {c.Data}
                    </p>
                  </div>
                  <span className="text-emerald-400 font-bold">{c.Status}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Receitas Médicas */}
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <Pill className="w-4 h-4 text-teal-400" />
              Receitas & Prescrições ({receitas.length})
            </h3>
          </div>
          {receitas.length === 0 ? (
            <p className="text-slate-500 text-xs py-4 text-center">Nenhuma receita prescrita.</p>
          ) : (
            <div className="space-y-2 text-xs">
              {receitas.map((r) => (
                <div key={r.Id} className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex justify-between">
                  <div>
                    <span className="font-bold text-white">{r.Medicamento}</span>
                    <p className="text-slate-400 text-[11px]">Dosagem: {r.Dosagem} • Prescrito: {r.Data}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Multas / Infrações */}
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <AlertOctagon className="w-4 h-4 text-rose-400" />
              Infrações de Trânsito / Multas ({infracoes.length})
            </h3>
          </div>
          {infracoes.length === 0 ? (
            <p className="text-slate-500 text-xs py-4 text-center">Nenhuma infração registrada.</p>
          ) : (
            <div className="space-y-2 text-xs">
              {infracoes.map((inf) => (
                <div key={inf.Id} className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex justify-between">
                  <div>
                    <span className="font-bold text-white">{inf.Descricao}</span>
                    <p className="text-slate-400 text-[11px]">
                      {inf.Veiculo} • {inf.Pontos} Pontos • Data: {inf.Data}
                    </p>
                  </div>
                  <span className="text-rose-400 font-bold">R$ {inf.Valor}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Zonas de Risco */}
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <AlertOctagon className="w-4 h-4 text-amber-400" />
              Zonas de Risco Roubo/Alagamento ({zonasRisco.length})
            </h3>
          </div>
          {zonasRisco.length === 0 ? (
            <p className="text-slate-500 text-xs py-4 text-center">Nenhuma área de risco cadastrada.</p>
          ) : (
            <div className="space-y-2 text-xs">
              {zonasRisco.map((z) => (
                <div key={z.Id} className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex justify-between">
                  <div>
                    <span className="font-bold text-white">{z.Nome_Local}</span>
                    <p className="text-slate-400 text-[11px]">Tipo: {z.Tipo_Ocorrencia} • {z.Bairro_Cidade}</p>
                  </div>
                  <span className="text-amber-400 font-bold">{z.Nivel_Risco}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
