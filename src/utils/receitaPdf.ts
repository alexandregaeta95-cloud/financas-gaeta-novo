import { jsPDF } from "jspdf";
import { ReceitaMedica } from "../types";
import { formatDateBR } from "./formatters";

/**
 * Generates and downloads an individual medical prescription (Receita Médica) PDF.
 * Designed with a clean, high-contrast, professional medical prescription layout.
 */
export function exportReceitaPDF(receita: ReceitaMedica): void {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const margin = 20;
  const contentWidth = pageWidth - margin * 2; // 170mm

  // Helpers
  const medicamento = (receita.Medicamento || "Medicamento não informado").trim();
  const dosagem = (receita.Dosagem || receita.Posologia || "Não informada").trim();
  const frequencia = (receita.Frequência || receita.Frequencia || "").trim();
  const medico = (receita.Médico || receita.Medico || "Não informado").trim();
  const especialidade = (receita.Especialidade || "Clínica Geral").trim();
  const dataPrescricao = formatDateBR(receita.Data || receita.Data_Emissão || receita.data) || "Não informada";
  const validade = formatDateBR(receita.Data_Vencimento || receita.Data_Validade || receita.Validade) || "Não informada";
  const instrucoes = (receita.Instruções || receita.Instrucoes || "").trim();
  const observacoes = (receita.Observação || receita.Observacao || receita.Observacoes || "").trim();
  const isAtiva = receita.Ativa !== false;
  const receitaId = (receita.Id || "").trim();

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

  // --- HEADER ---
  // Top decorative bar
  doc.setFillColor(16, 185, 129); // Emerald 500
  doc.rect(0, 0, pageWidth, 6, "F");

  let y = 20;

  // Header Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(15, 23, 42); // Slate 900
  doc.text("RECEITA MÉDICA", margin, y);

  // Subtitle
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139); // Slate 500
  doc.text("Prescrição & Acompanhamento de Medicamentos", margin, y + 6);

  // Emission Info (Right Aligned)
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`Emissão do documento: ${dataEmissaoDoc} às ${horaEmissaoDoc}`, pageWidth - margin, y + 2, { align: "right" });
  if (receitaId) {
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184); // Slate 400
    doc.text(`ID: ${receitaId}`, pageWidth - margin, y + 7, { align: "right" });
  }

  y += 14;

  // Divider line
  doc.setDrawColor(226, 232, 240); // Slate 200
  doc.setLineWidth(0.6);
  doc.line(margin, y, pageWidth - margin, y);

  y += 8;

  // --- METADATA PANEL (Data, Validade, Status) ---
  doc.setFillColor(248, 250, 252); // Slate 50
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.roundedRect(margin, y, contentWidth, 22, 3, 3, "FD");

  const col1 = margin + 6;
  const col2 = margin + 58;
  const col3 = margin + 115;

  // Col 1: Data Prescrição
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text("DATA DA PRESCRIÇÃO", col1, y + 7);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(dataPrescricao, col1, y + 15);

  // Col 2: Validade
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text("VALIDADE / VENCIMENTO", col2, y + 7);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(validade !== "Não informada" ? 225 : 15, validade !== "Não informada" ? 29 : 23, validade !== "Não informada" ? 72 : 42); // Rose or slate
  doc.text(validade, col2, y + 15);

  // Col 3: Status
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text("STATUS DA RECEITA", col3, y + 7);
  if (isAtiva) {
    doc.setFillColor(209, 250, 229); // Emerald 100
    doc.roundedRect(col3, y + 9.5, 38, 7, 2, 2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(5, 150, 105); // Emerald 600
    doc.text("ATIVA / EM USO", col3 + 19, y + 14.5, { align: "center" });
  } else {
    doc.setFillColor(241, 245, 249); // Slate 100
    doc.roundedRect(col3, y + 9.5, 28, 7, 2, 2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139); // Slate 500
    doc.text("INATIVA", col3 + 14, y + 14.5, { align: "center" });
  }

  y += 30;

  // --- MEDICAMENTO & POSOLOGIA BOX ---
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(16, 185, 129); // Emerald 500
  doc.setLineWidth(1);
  doc.roundedRect(margin, y, contentWidth, 38, 3, 3, "S");

  // Accent bar on left
  doc.setFillColor(16, 185, 129);
  doc.roundedRect(margin, y, 4, 38, 2, 2, "F");

  // Medicamento Name
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(16, 185, 129);
  doc.text("MEDICAMENTO PRESCRITO", margin + 10, y + 8);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  const medLines = doc.splitTextToSize(medicamento, contentWidth - 16);
  doc.text(medLines, margin + 10, y + 16);

  // Dosagem & Frequência
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105); // Slate 600
  doc.text("DOSAGEM / POSOLOGIA:", margin + 10, y + 26);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  const dosagemFull = frequencia ? `${dosagem} (${frequencia})` : dosagem;
  doc.text(dosagemFull, margin + 55, y + 26);

  y += 46;

  // --- INSTRUÇÕES DE USO ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text("Instruções de Uso & Recomendações", margin, y);
  y += 4;

  const instrucoesText = instrucoes || observacoes || "Utilizar conforme orientação médica e posologia descrita na embalagem.";
  const splitInstrucoes = doc.splitTextToSize(instrucoesText, contentWidth - 12);
  const boxHeight = Math.max(26, splitInstrucoes.length * 6 + 12);

  doc.setFillColor(248, 250, 252); // Slate 50
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.roundedRect(margin, y, contentWidth, boxHeight, 3, 3, "FD");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  doc.setTextColor(51, 65, 85); // Slate 700
  doc.text(splitInstrucoes, margin + 6, y + 8);

  y += boxHeight + 8;

  // --- INFORMAÇÕES DO MÉDICO ---
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.roundedRect(margin, y, contentWidth, 24, 3, 3, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text("MÉDICO PRESCRITOR", margin + 6, y + 7);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(medico, margin + 6, y + 14);

  if (especialidade) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`Especialidade: ${especialidade}`, margin + 6, y + 19);
  }

  y += 34;

  // --- SIGNATURE / STAMP SECTION ---
  const signY = Math.max(y + 10, 230);

  doc.setDrawColor(148, 163, 184); // Slate 400
  doc.setLineWidth(0.5);
  doc.line(pageWidth / 2 - 45, signY, pageWidth / 2 + 45, signY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(medico !== "Não informado" ? medico : "Assinatura / Carimbo do Médico", pageWidth / 2, signY + 5, { align: "center" });

  // --- FOOTER ---
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  const footerText = "Documento emitido para controle pessoal de saúde e apresentação em consultas ou farmácias.";
  doc.text(footerText, pageWidth / 2, 285, { align: "center" });

  // Bottom decorative bar
  doc.setFillColor(16, 185, 129);
  doc.rect(0, 292, pageWidth, 5, "F");

  // Save the PDF directly
  const safeMedName = medicamento
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .slice(0, 25);
  const safeDate = (receita.Data || receita.Data_Emissão || "receita").replace(/[^0-9]/g, "-");
  const fileName = `Receita_${safeMedName || "Medica"}_${safeDate}.pdf`;

  doc.save(fileName);
}
