import { jsPDF } from "jspdf";
import { ReceitaMedica } from "../types";
import { formatDateBR } from "./formatters";

export interface GrupoReceitaMedica {
  chave: string;
  medico: string;
  data: string;
  dataFormatada: string;
  validade?: string;
  especialidade?: string;
  ativa: boolean;
  medicamentos: ReceitaMedica[];
}

/**
 * Safely converts any value to a trimmed string.
 */
function safeStr(val: any, fallback: string = ""): string {
  if (val === null || val === undefined) return fallback;
  if (typeof val === "string") return val.trim();
  if (typeof val === "number" || typeof val === "boolean") return String(val).trim();
  if (val instanceof Date) return formatDateBR(val);
  return String(val).trim();
}

/**
 * Safely checks whether a medication is active (supports boolean and string representations from sheets).
 */
function isItemAtivo(ativa: any): boolean {
  if (ativa === false) return false;
  if (typeof ativa === "string") {
    const s = ativa.trim().toUpperCase();
    if (s === "NÃO" || s === "NAO" || s === "FALSE" || s === "0" || s === "INATIVA" || s === "INATIVO") {
      return false;
    }
  }
  return true;
}

/**
 * Groups a list of ReceitaMedica items by Prescrição (Médico + Data da Prescrição).
 * Medications prescribed by the same doctor on the same consultation date belong to the same prescription document.
 */
export function agruparReceitasPorPrescricao(receitas: ReceitaMedica[]): GrupoReceitaMedica[] {
  if (!Array.isArray(receitas) || receitas.length === 0) return [];

  const gruposMap = new Map<string, GrupoReceitaMedica>();

  for (const r of receitas) {
    if (!r || typeof r !== "object") continue;

    const rawMedico = safeStr(r.Médico || r.Medico);
    const medicoNome = rawMedico || "Médico Não Informado";
    const rawData = safeStr(r.Data || r.Data_Emissão || r.data);
    const dataFormatada = formatDateBR(rawData) || rawData || "Data não informada";

    // Normalized key combining Doctor Name and Consultation / Prescription Date
    const chave = `${medicoNome.toUpperCase().replace(/\s+/g, " ")}___${dataFormatada.toUpperCase().replace(/\s+/g, " ")}`;

    const existing = gruposMap.get(chave);
    const itemValidade = formatDateBR(r.Data_Vencimento || r.Data_Validade || r.Validade);

    if (existing) {
      existing.medicamentos.push(r);
      if (isItemAtivo(r.Ativa)) {
        existing.ativa = true;
      }
      if (!existing.especialidade && r.Especialidade) {
        existing.especialidade = safeStr(r.Especialidade);
      }
      if (!existing.validade && itemValidade) {
        existing.validade = itemValidade;
      }
    } else {
      gruposMap.set(chave, {
        chave,
        medico: medicoNome,
        data: rawData,
        dataFormatada,
        validade: itemValidade,
        especialidade: safeStr(r.Especialidade),
        ativa: isItemAtivo(r.Ativa),
        medicamentos: [r],
      });
    }
  }

  return Array.from(gruposMap.values());
}

/**
 * Generates and downloads a complete medical prescription PDF.
 * Supports:
 *  - A single `ReceitaMedica`
 *  - An array of `ReceitaMedica` items belonging to a prescription
 *  - A `GrupoReceitaMedica` object
 */
export function exportReceitaPDF(
  input: ReceitaMedica | ReceitaMedica[] | GrupoReceitaMedica
): boolean {
  try {
    let medicamentosList: ReceitaMedica[] = [];
    let medico = "Médico não informado";
    let dataPrescricao = "Não informada";
    let validadePrescricao = "Não informada";
    let especialidade = "Clínica Geral";
    let isAtiva = true;

    if (Array.isArray(input)) {
      medicamentosList = input.filter(Boolean);
    } else if (input && typeof input === "object" && "medicamentos" in input && Array.isArray((input as GrupoReceitaMedica).medicamentos)) {
      const grupo = input as GrupoReceitaMedica;
      medicamentosList = grupo.medicamentos.filter(Boolean);
      medico = safeStr(grupo.medico, medico);
      dataPrescricao = safeStr(grupo.dataFormatada, dataPrescricao);
      validadePrescricao = safeStr(grupo.validade, validadePrescricao);
      especialidade = safeStr(grupo.especialidade, especialidade);
      isAtiva = grupo.ativa;
    } else if (input && typeof input === "object") {
      medicamentosList = [input as ReceitaMedica];
    }

    if (medicamentosList.length === 0) {
      console.warn("Nenhum medicamento fornecido para gerar o PDF da receita.");
      return false;
    }

    const firstItem = medicamentosList[0];
    if (medico === "Médico não informado") {
      medico = safeStr(firstItem.Médico || firstItem.Medico, "Médico não informado");
    }
    if (dataPrescricao === "Não informada") {
      const rawFirstData = safeStr(firstItem.Data || firstItem.Data_Emissão || firstItem.data);
      dataPrescricao = formatDateBR(rawFirstData) || rawFirstData || "Não informada";
    }
    if (validadePrescricao === "Não informada") {
      const itemWithValidade = medicamentosList.find((m) => m.Data_Vencimento || m.Data_Validade || m.Validade);
      if (itemWithValidade) {
        const rawItemValidade = safeStr(itemWithValidade.Data_Vencimento || itemWithValidade.Data_Validade || itemWithValidade.Validade);
        validadePrescricao = formatDateBR(rawItemValidade) || rawItemValidade || "Não informada";
      }
    }
    if (especialidade === "Clínica Geral" && firstItem.Especialidade) {
      especialidade = safeStr(firstItem.Especialidade, "Clínica Geral");
    }
    isAtiva = medicamentosList.some((m) => isItemAtivo(m.Ativa));

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
    const pageHeight = doc.internal.pageSize.getHeight(); // 297mm
    const margin = 18;
    const contentWidth = pageWidth - margin * 2; // 174mm

    const now = new Date();
    const dataEmissaoDoc = now.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    const horaEmissaoDoc = now.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });

    // Helper: draw page frame & header
    const drawPageHeader = (isFirstPage: boolean) => {
      // Top decorative bar
      doc.setFillColor(16, 185, 129); // Emerald 500
      doc.rect(0, 0, pageWidth, 5, "F");

      if (isFirstPage) {
        // Main Title
        doc.setFont("helvetica", "bold");
        doc.setFontSize(20);
        doc.setTextColor(15, 23, 42); // Slate 900
        doc.text("RECEITA MÉDICA", margin, 18);

        // Subtitle
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9.5);
        doc.setTextColor(100, 116, 139); // Slate 500
        doc.text("Prescrição Farmacológica & Acompanhamento de Tratamento", margin, 24);

        // Emission Info (Right Aligned)
        doc.setFontSize(8.5);
        doc.setTextColor(100, 116, 139);
        doc.text(`Emissão: ${dataEmissaoDoc} às ${horaEmissaoDoc}`, pageWidth - margin, 18, { align: "right" });
        doc.setFont("helvetica", "bold");
        doc.setTextColor(16, 185, 129);
        doc.text(
          `${medicamentosList.length} medicamento${medicamentosList.length > 1 ? "s" : ""} prescrito${medicamentosList.length > 1 ? "s" : ""}`,
          pageWidth - margin,
          24,
          { align: "right" }
        );

        // Divider
        doc.setDrawColor(226, 232, 240); // Slate 200
        doc.setLineWidth(0.5);
        doc.line(margin, 28, pageWidth - margin, 28);
      } else {
        // Subsequent page header
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139);
        doc.text(`RECEITA MÉDICA • ${medico.toUpperCase()}`, margin, 14);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.text(`Data da Prescrição: ${dataPrescricao}`, pageWidth - margin, 14, { align: "right" });
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.4);
        doc.line(margin, 17, pageWidth - margin, 17);
      }
    };

    // Draw first page header
    drawPageHeader(true);

    let y = 34;

    // --- METADATA PANEL (Médico, Data da Consulta, Validade, Status) ---
    doc.setFillColor(248, 250, 252); // Slate 50
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.4);
    doc.roundedRect(margin, y, contentWidth, 26, 3, 3, "FD");

    const col1 = margin + 6;
    const col2 = margin + 64;
    const col3 = margin + 118;

    // Col 1: Médico & Especialidade
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text("MÉDICO PRESCRITOR", col1, y + 6.5);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    const splitMedico = doc.splitTextToSize(medico, 54);
    doc.text(splitMedico, col1, y + 13);
    if (especialidade) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(especialidade, col1, y + 21);
    }

    // Col 2: Data da Prescrição & Validade
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text("DATA DA PRESCRIÇÃO", col2, y + 6.5);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(dataPrescricao, col2, y + 13);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text("VALIDADE DA RECEITA", col2, y + 19);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    if (validadePrescricao !== "Não informada") {
      doc.setTextColor(225, 29, 72); // Rose 600
    } else {
      doc.setTextColor(100, 116, 139);
    }
    doc.text(validadePrescricao, col2, y + 24);

    // Col 3: Status
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text("STATUS DO TRATAMENTO", col3, y + 6.5);
    if (isAtiva) {
      doc.setFillColor(209, 250, 229); // Emerald 100
      doc.roundedRect(col3, y + 10, 48, 8, 2, 2, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(5, 150, 105); // Emerald 600
      doc.text("ATIVA / EM TRATAMENTO", col3 + 24, y + 15.5, { align: "center" });
    } else {
      doc.setFillColor(241, 245, 249); // Slate 100
      doc.roundedRect(col3, y + 10, 36, 8, 2, 2, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text("CONCLUÍDA / INATIVA", col3 + 18, y + 15.5, { align: "center" });
    }

    y += 33;

    // --- SECTION TITLE: MEDICAMENTOS PRESCRITOS ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text("MEDICAMENTOS PRESCRITOS", margin, y);
    y += 4;

    // --- MEDICATIONS LIST ---
    medicamentosList.forEach((med, idx) => {
      const rawNome = safeStr(med.Medicamento, "Medicamento");
      const medNome = rawNome.toUpperCase();
      const dosagem = safeStr(med.Dosagem || med.Posologia);
      const frequencia = safeStr(med.Frequência || med.Frequencia);
      const instrucoes = safeStr(med.Instruções || med.Instrucoes);
      const obs = safeStr(med.Observação || med.Observacao || med.Observacoes);
      const rawMedValidade = safeStr(med.Data_Vencimento || med.Data_Validade || med.Validade);
      const medValidade = formatDateBR(rawMedValidade) || rawMedValidade;

      const posologiaTexto = [dosagem, frequencia].filter(Boolean).join(" • ") || "Posologia conforme orientação médica";
      const orientacoesTexto = [instrucoes, obs].filter(Boolean).join(" | ");

      // Calculate needed height for this item box
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      const splitOrientacoes = orientacoesTexto ? doc.splitTextToSize(orientacoesTexto, contentWidth - 16) : [];
      const orientacoesHeight = splitOrientacoes.length > 0 ? splitOrientacoes.length * 4.5 + 4 : 0;
      const itemBoxHeight = 18 + orientacoesHeight + (medValidade && medValidade !== validadePrescricao ? 5 : 0);

      // Check for page overflow
      if (y + itemBoxHeight > pageHeight - 45) {
        doc.addPage();
        drawPageHeader(false);
        y = 24;
      }

      // Box container
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(203, 213, 225); // Slate 300
      doc.setLineWidth(0.4);
      doc.roundedRect(margin, y, contentWidth, itemBoxHeight, 2.5, 2.5, "FD");

      // Left Accent Strip
      doc.setFillColor(16, 185, 129); // Emerald 500
      doc.roundedRect(margin, y, 3.5, itemBoxHeight, 1.5, 1.5, "F");

      // Item number + Medicamento Name
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text(`${idx + 1}. ${medNome}`, margin + 8, y + 6.5);

      // Posologia line
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(16, 185, 129);
      doc.text("POSOLOGIA:", margin + 8, y + 12.5);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(51, 65, 85);
      doc.text(posologiaTexto, margin + 30, y + 12.5);

      let currentInnerY = y + 17;

      // Orientações / Instruções
      if (splitOrientacoes.length > 0) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text("INSTRUÇÕES:", margin + 8, currentInnerY);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(71, 85, 105);
        doc.text(splitOrientacoes, margin + 30, currentInnerY);
        currentInnerY += splitOrientacoes.length * 4.5;
      }

      // Item specific validity if different
      if (medValidade && medValidade !== validadePrescricao) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(225, 29, 72);
        doc.text(`* Validade deste item: ${medValidade}`, margin + 8, currentInnerY + 2);
      }

      y += itemBoxHeight + 4;
    });

    // --- SIGNATURE & CARIMBO SECTION ---
    if (y + 35 > pageHeight - 20) {
      doc.addPage();
      drawPageHeader(false);
      y = 30;
    } else {
      y = Math.max(y + 8, pageHeight - 50);
    }

    // Signature Line
    doc.setDrawColor(148, 163, 184); // Slate 400
    doc.setLineWidth(0.5);
    doc.line(pageWidth / 2 - 50, y, pageWidth / 2 + 50, y);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text(medico !== "Médico não informado" ? medico : "Assinatura / Carimbo do Médico", pageWidth / 2, y + 4.5, { align: "center" });

    if (especialidade && especialidade !== "Clínica Geral") {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(especialidade, pageWidth / 2, y + 8.5, { align: "center" });
    }

    // --- FOOTER NOTE & DECORATIVE STRIPE ---
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      "Documento emitido para controle pessoal de saúde e apresentação em farmácias ou consultas médicas.",
      pageWidth / 2,
      pageHeight - 8,
      { align: "center" }
    );

    doc.setFillColor(16, 185, 129);
    doc.rect(0, pageHeight - 3, pageWidth, 3, "F");

    // --- FILE NAME & ROBUST DOWNLOAD ---
    const cleanDoctor = safeStr(medico, "Prescricao")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .slice(0, 25);
    const cleanDate = safeStr(dataPrescricao, "consulta").replace(/[^0-9]/g, "-") || "receita";
    const fileName = `Receita_${cleanDoctor || "Prescricao"}_${cleanDate}.pdf`;

    // Download: jsPDF save with direct Blob fallback
    try {
      doc.save(fileName);
      return true;
    } catch (saveErr) {
      console.warn("doc.save() fallback to manual Blob URL:", saveErr);
      if (typeof window !== "undefined" && typeof document !== "undefined") {
        const blob = doc.output("blob");
        const blobUrl = URL.createObjectURL(blob);
        const tempLink = document.createElement("a");
        tempLink.href = blobUrl;
        tempLink.download = fileName;
        tempLink.target = "_blank";
        tempLink.rel = "noopener noreferrer";
        tempLink.style.display = "none";
        document.body.appendChild(tempLink);
        tempLink.click();

        setTimeout(() => {
          try {
            document.body.removeChild(tempLink);
            URL.revokeObjectURL(blobUrl);
          } catch {
            // Ignore cleanup error
          }
        }, 3000);
        return true;
      }
      return true;
    }
  } catch (error: any) {
    console.error("[Finanças Gaeta] Erro ao gerar PDF da Receita Médica:", error);
    if (typeof window !== "undefined") {
      alert(`Não foi possível gerar o PDF da receita: ${error?.message || "Erro desconhecido"}`);
    }
    return false;
  }
}
