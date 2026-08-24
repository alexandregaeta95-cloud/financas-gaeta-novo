export interface ImcInfo {
  imc: number;
  classificacao: string;
  categoria: "abaixo" | "normal" | "sobrepeso" | "obesidade1" | "obesidade2" | "obesidade3";
  corBadge: string;
  corTexto: string;
  faixaIdealMinKg: number;
  faixaIdealMaxKg: number;
  dica: string;
}

/**
 * Calcula o IMC e retorna classificação oficial da OMS (Tabela Padrão)
 * @param pesoKg Peso em quilogramas (ex: 78.5)
 * @param alturaCm Altura em centímetros (ex: 175)
 */
export function calcularImc(pesoKg?: number, alturaCm?: number): ImcInfo | null {
  if (!pesoKg || !alturaCm || pesoKg <= 0 || alturaCm <= 0) return null;

  const alturaM = alturaCm / 100;
  const imcRaw = pesoKg / (alturaM * alturaM);
  const imc = Math.round(imcRaw * 10) / 10;

  const faixaIdealMinKg = Math.round(18.5 * alturaM * alturaM * 10) / 10;
  const faixaIdealMaxKg = Math.round(24.9 * alturaM * alturaM * 10) / 10;

  if (imc < 18.5) {
    return {
      imc,
      classificacao: "Abaixo do Peso",
      categoria: "abaixo",
      corBadge: "bg-amber-500/20 text-amber-300 border-amber-500/30",
      corTexto: "text-amber-400",
      faixaIdealMinKg,
      faixaIdealMaxKg,
      dica: "Abaixo da faixa recomendada pela OMS (< 18.5). Consulte um nutricionista.",
    };
  } else if (imc <= 24.9) {
    return {
      imc,
      classificacao: "Peso Normal",
      categoria: "normal",
      corBadge: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
      corTexto: "text-emerald-400",
      faixaIdealMinKg,
      faixaIdealMaxKg,
      dica: "Faixa saudável e recomendada pela OMS (18.5 a 24.9).",
    };
  } else if (imc <= 29.9) {
    return {
      imc,
      classificacao: "Sobrepeso",
      categoria: "sobrepeso",
      corBadge: "bg-orange-500/20 text-orange-300 border-orange-500/30",
      corTexto: "text-orange-400",
      faixaIdealMinKg,
      faixaIdealMaxKg,
      dica: "Pré-obesidade pela OMS (25.0 a 29.9). Atividade física e controle calórico são indicados.",
    };
  } else if (imc <= 34.9) {
    return {
      imc,
      classificacao: "Obesidade Grau I",
      categoria: "obesidade1",
      corBadge: "bg-rose-500/20 text-rose-300 border-rose-500/30",
      corTexto: "text-rose-400",
      faixaIdealMinKg,
      faixaIdealMaxKg,
      dica: "Obesidade Grau I (30.0 a 34.9). Recomenda-se acompanhamento profissional.",
    };
  } else if (imc <= 39.9) {
    return {
      imc,
      classificacao: "Obesidade Grau II",
      categoria: "obesidade2",
      corBadge: "bg-red-600/25 text-red-300 border-red-600/40",
      corTexto: "text-red-400",
      faixaIdealMinKg,
      faixaIdealMaxKg,
      dica: "Obesidade Severa (35.0 a 39.9). Atenção aos riscos cardiovasculares.",
    };
  } else {
    return {
      imc,
      classificacao: "Obesidade Grau III",
      categoria: "obesidade3",
      corBadge: "bg-purple-500/25 text-purple-300 border-purple-500/40",
      corTexto: "text-purple-400",
      faixaIdealMinKg,
      faixaIdealMaxKg,
      dica: "Obesidade Mórbida (≥ 40.0). Acompanhamento médico multidisciplinar prioritário.",
    };
  }
}
