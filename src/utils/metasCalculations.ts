import { MetaCategoria, Lancamento } from "../types";
import { parseCurrency } from "./formatters";

/**
 * Normalizes text removing accents, diacritics, extra spaces, and uppercase.
 */
export function normalizeCategory(cat?: string | null): string {
  if (!cat) return "";
  return String(cat)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[_\-\s]+/g, " ")
    .trim()
    .toUpperCase();
}

/**
 * Checks if a meta category matches a lancamento category, ignoring accents/case
 * and handling common synonymous categories (such as Combustível / Abastecimento).
 */
export function categoriesMatch(
  metaCat?: string | null,
  lancamentoCat?: string | null,
  lancamentoTipo?: string | null
): boolean {
  const mNorm = normalizeCategory(metaCat);
  const lNorm = normalizeCategory(lancamentoCat);
  const tNorm = normalizeCategory(lancamentoTipo);

  if (!mNorm) return false;

  // Direct normalized match (e.g. "MERCADO" === "MERCADO", "SAUDE" === "SAUDE")
  if (mNorm === lNorm) return true;

  // Fuel / Abastecimento cross-matching
  const isFuelMeta = mNorm === "COMBUSTIVEL" || mNorm === "ABASTECIMENTO" || mNorm === "GASOLINA";
  const isFuelLancamento =
    lNorm === "COMBUSTIVEL" ||
    lNorm === "ABASTECIMENTO" ||
    lNorm === "GASOLINA" ||
    tNorm === "ABASTECIMENTO";

  if (isFuelMeta && isFuelLancamento) {
    return true;
  }

  // Supermercado / Mercado
  if (
    (mNorm === "MERCADO" && lNorm === "SUPERMERCADO") ||
    (mNorm === "SUPERMERCADO" && lNorm === "MERCADO")
  ) {
    return true;
  }

  return false;
}

/**
 * Month names map for PT-BR / EN
 */
export const MONTH_NAMES_MAP: Record<string, number> = {
  jan: 1, janeiro: 1, january: 1,
  fev: 2, fevereiro: 2, february: 2,
  mar: 3, marco: 3, março: 3, march: 3,
  abr: 4, abril: 4, april: 4,
  mai: 5, maio: 5, may: 5,
  jun: 6, junho: 6, june: 6,
  jul: 7, julho: 7, july: 7,
  ago: 8, agosto: 8, august: 8,
  set: 9, setembro: 9, september: 9,
  out: 10, outubro: 10, october: 10,
  nov: 11, novembro: 11, november: 11,
  dez: 12, dezembro: 12, december: 12,
};

/**
 * Extracts normalized year and month from diverse date formats:
 * - Google Sheets serial numbers (e.g., 46253 -> year: 2026, month: 8)
 * - YYYY-MM-DD or YYYY-MM (e.g., "2026-08-19", "2026-08", "2026-07")
 * - DD/MM/YYYY or DD/MM/YY (e.g., "19/08/2026", "19/08/26")
 * - MM/YYYY or MM/YY (e.g., "08/2026", "07/2026", "07/26")
 * - Text months: "Julho/2026", "Jul/2026", "07"
 * - ISO with timestamp using UTC components to avoid timezone offsets
 */
export function extractYearMonth(dateVal?: any): { year: number; month: number } | null {
  if (dateVal === null || dateVal === undefined || dateVal === "") return null;

  // If already a Date instance
  if (dateVal instanceof Date && !isNaN(dateVal.getTime())) {
    return { year: dateVal.getUTCFullYear(), month: dateVal.getUTCMonth() + 1 };
  }

  // If numeric serial number from Excel / Google Sheets
  const num = typeof dateVal === "number" ? dateVal : Number(String(dateVal).trim());
  if (!isNaN(num) && num >= 10000 && num <= 90000) {
    // Google Sheets epoch is 1899-12-30
    const utcDays = num - 25569;
    const utcValue = utcDays * 86400 * 1000;
    const d = new Date(utcValue);
    if (!isNaN(d.getTime())) {
      return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 };
    }
  }

  const str = String(dateVal).trim();
  if (!str) return null;

  // Format YYYY-MM or YYYY-MM-DD (e.g. "2026-08", "2026-07", "2026-07-01", "2026-07-01T00:00:00")
  const isoMatch = str.match(/^(\d{4})[-/.](\d{1,2})/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10);
    if (year > 1900 && month >= 1 && month <= 12) {
      return { year, month };
    }
  }

  // Format DD/MM/YYYY or DD-MM-YYYY or DD/MM/YY (standard Brazilian date)
  const brFullMatch = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/);
  if (brFullMatch) {
    const month = parseInt(brFullMatch[2], 10);
    let year = parseInt(brFullMatch[3], 10);
    if (year < 100) {
      year = year < 70 ? 2000 + year : 1900 + year;
    }
    if (year > 1900 && month >= 1 && month <= 12) {
      return { year, month };
    }
  }

  // Format MM/YYYY or MM-YYYY or MM/YY
  const myMatch = str.match(/^(\d{1,2})[-/.](\d{2,4})$/);
  if (myMatch) {
    const month = parseInt(myMatch[1], 10);
    let year = parseInt(myMatch[2], 10);
    if (year < 100) {
      year = year < 70 ? 2000 + year : 1900 + year;
    }
    if (year > 1900 && month >= 1 && month <= 12) {
      return { year, month };
    }
  }

  // Text month format: "Julho/2026", "Jul-2026", "Julho 2026"
  const textMonthMatch = str.toLowerCase().match(/^([a-zçãé]+)[-/\s]+(\d{2,4})$/);
  if (textMonthMatch) {
    const monthName = textMonthMatch[1].normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    let year = parseInt(textMonthMatch[2], 10);
    if (year < 100) {
      year = year < 70 ? 2000 + year : 1900 + year;
    }
    const month = MONTH_NAMES_MAP[monthName] || MONTH_NAMES_MAP[monthName.slice(0, 3)];
    if (month && year > 1900) {
      return { year, month };
    }
  }

  // Standalone month: "07" or "7" (assumes current year)
  const singleMonthMatch = str.match(/^0?([1-9]|1[0-2])$/);
  if (singleMonthMatch) {
    const month = parseInt(singleMonthMatch[1], 10);
    return { year: new Date().getUTCFullYear(), month };
  }

  // Fallback: Date.parse with UTC getters
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 };
  }

  return null;
}

/**
 * Calculates actual spending (or earnings) for a category and target month/year
 * with the exact same filters and rules as the main Metas view.
 */
export function calculateSpentForCategoryAndMonth(
  category: string,
  targetYear: number,
  targetMonth: number,
  lancamentos: Lancamento[]
): number {
  const metaCatNorm = normalizeCategory(category);
  const isIncomeMeta =
    metaCatNorm === "RECEITA" ||
    metaCatNorm === "RENDIMENTO" ||
    metaCatNorm === "SALARIO" ||
    metaCatNorm === "ENTRADA";

  return lancamentos
    .filter((l) => {
      const t = String(l.Tipo || "").trim().toUpperCase();
      if (isIncomeMeta) {
        return t === "RECEITA";
      }
      return t === "DESPESA" || t === "ABASTECIMENTO";
    })
    .filter((l) => {
      const s = String(l.Status || "").trim().toUpperCase();
      return s !== "EXCLUÍDO" && s !== "EXCLUIDO" && s !== "DELETED" && s !== "CANCELADO";
    })
    .filter((l) => categoriesMatch(category, l.Categoria, l.Tipo))
    .filter((l) => {
      const lYM = extractYearMonth(l.Data);
      if (!lYM) return false;
      return lYM.year === targetYear && lYM.month === targetMonth;
    })
    .reduce((acc, curr) => acc + parseCurrency(curr.Valor), 0);
}

/**
 * Soma TODOS os lançamentos pagos de uma categoria, sem filtro de mês/ano.
 * Usado para Metas de Quitação (financiamentos), onde o valor total já pago importa,
 * não só o gasto de um mês específico.
 */
export function calculateTotalPaidForCategory(
  category: string,
  lancamentos: Lancamento[]
): number {
  return lancamentos
    .filter((l) => {
      const t = String(l.Tipo || "").trim().toUpperCase();
      return t === "DESPESA" || t === "ABASTECIMENTO";
    })
    .filter((l) => {
      const s = String(l.Status || "").trim().toUpperCase();
      return s === "PAGO" || s === "PAID" || s === "QUITADO" || s === "LIQUIDADO";
    })
    .filter((l) => categoriesMatch(category, l.Categoria, l.Tipo))
    .reduce((acc, curr) => acc + parseCurrency(curr.Valor_Pago || curr.Valor), 0);
}

/**
 * Calculates actual spent amount for a specific MetaCategoria instance.
 */
export function getSpentForMeta(
  meta: MetaCategoria,
  lancamentos: Lancamento[],
  overrideYM?: { year: number; month: number }
): number {
  if (String(meta.Tipo_Meta || "").trim().toUpperCase() === "QUITACAO") {
    return calculateTotalPaidForCategory(meta.Categoria, lancamentos);
  }

  const now = new Date();
  const targetYM =
    overrideYM ||
    extractYearMonth(meta.Mes_Ano) || {
      year: now.getFullYear(),
      month: now.getMonth() + 1,
    };

  return calculateSpentForCategoryAndMonth(
    meta.Categoria,
    targetYM.year,
    targetYM.month,
    lancamentos
  );
}
