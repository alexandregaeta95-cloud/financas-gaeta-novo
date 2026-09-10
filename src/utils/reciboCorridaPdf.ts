import { jsPDF } from "jspdf";

export interface DadosReciboCorrida {
  motorista: string;
  veiculo: string;
  placa?: string;
  origem: string;
  paradas?: string[];
  destino: string;
  data: string;
  hora: string;
  distanciaKm: number;
  duracaoMinutos: number;
  tempoEsperaMinutos?: number;
  valorTotal: number;
  observacoes?: string;
}

export function exportReciboCorridaPDF(dados: DadosReciboCorrida): boolean {
  try {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 18;
    const contentWidth = pageWidth - margin * 2;

    // Top decorative bar
    doc.setFillColor(16, 185, 129);
    doc.rect(0, 0, pageWidth, 5, "F");

    // Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(15, 23, 42);
    doc.text("RECIBO DE CORRIDA", margin, 18);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(100, 116, 139);
    doc.text("Comprovante de Transporte Particular", margin, 24);

    doc.setFontSize(8.5);
    doc.text(`Emitido em: ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`, pageWidth - margin, 18, { align: "right" });

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(margin, 28, pageWidth - margin, 28);

    let y = 36;

    // --- METADATA PANEL (Motorista, Veículo, Data/Hora) ---
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, y, contentWidth, 26, 3, 3, "FD");

    const col1 = margin + 6;
    const col2 = margin + 64;
    const col3 = margin + 128;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text("MOTORISTA", col1, y + 6.5);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(dados.motorista || "Não informado", col1, y + 13);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text("VEÍCULO", col2, y + 6.5);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(dados.veiculo || "Não informado", col2, y + 13);
    if (dados.placa) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(dados.placa, col2, y + 19);
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text("DATA / HORA", col3, y + 6.5);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(dados.data, col3, y + 13);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(dados.hora, col3, y + 19);

    y += 34;

    // --- TRAJETO SECTION ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text("TRAJETO", margin, y);
    y += 5;

    const pontosTrajeto = [
      { label: "ORIGEM", texto: dados.origem, cor: [16, 185, 129] as [number, number, number] },
      ...(dados.paradas || []).map((p, i) => ({ label: `PARADA ${i + 1}`, texto: p, cor: [245, 158, 11] as [number, number, number] })),
      { label: "DESTINO FINAL", texto: dados.destino, cor: [244, 63, 94] as [number, number, number] },
    ];

    pontosTrajeto.forEach((ponto) => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      const splitTexto = doc.splitTextToSize(ponto.texto, contentWidth - 30);
      const boxHeight = Math.max(12, splitTexto.length * 4.5 + 6);

      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(margin, y, contentWidth, boxHeight, 2, 2, "FD");
      doc.setFillColor(ponto.cor[0], ponto.cor[1], ponto.cor[2]);
      doc.circle(margin + 6, y + boxHeight / 2, 2, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(ponto.cor[0], ponto.cor[1], ponto.cor[2]);
      doc.text(ponto.label, margin + 12, y + 5.5);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(51, 65, 85);
      doc.text(splitTexto, margin + 12, y + 10.5);

      y += boxHeight + 3;
    });

    y += 4;

    // --- SUMMARY PANEL (Distância, Tempo, Valor) ---
    doc.setFillColor(15, 23, 42);
    doc.roundedRect(margin, y, contentWidth, 34, 3, 3, "F");

    const sc1 = margin + 8;
    const sc2 = margin + 68;
    const sc3 = margin + 128;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text("DISTÂNCIA", sc1, y + 9);
    doc.setFontSize(13);
    doc.setTextColor(255, 255, 255);
    doc.text(`${dados.distanciaKm} km`, sc1, y + 17);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text("TEMPO TOTAL", sc2, y + 9);
    doc.setFontSize(13);
    doc.setTextColor(255, 255, 255);
    const tempoTotalTxt = dados.tempoEsperaMinutos
      ? `${dados.duracaoMinutos + dados.tempoEsperaMinutos} min`
      : `${dados.duracaoMinutos} min`;
    doc.text(tempoTotalTxt, sc2, y + 17);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text("VALOR TOTAL", sc3, y + 9);
    doc.setFontSize(16);
    doc.setTextColor(52, 211, 153);
    doc.text(`R$ ${dados.valorTotal.toFixed(2).replace(".", ",")}`, sc3, y + 19);

    if (dados.observacoes) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      const obsSplit = doc.splitTextToSize(dados.observacoes, contentWidth - 16);
      doc.text(obsSplit, sc1, y + 27);
    }

    y += 42;

    // --- FOOTER ---
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      "Documento gerado para fins de comprovação de corrida particular.",
      pageWidth / 2,
      pageHeight - 8,
      { align: "center" }
    );
    doc.setFillColor(16, 185, 129);
    doc.rect(0, pageHeight - 3, pageWidth, 3, "F");

    const cleanDate = dados.data.replace(/[^0-9]/g, "-") || "corrida";
    const fileName = `Recibo_Corrida_${cleanDate}.pdf`;

    try {
      doc.save(fileName);
      return true;
    } catch (saveErr) {
      if (typeof window !== "undefined" && typeof document !== "undefined") {
        const blob = doc.output("blob");
        const blobUrl = URL.createObjectURL(blob);
        const tempLink = document.createElement("a");
        tempLink.href = blobUrl;
        tempLink.download = fileName;
        tempLink.style.display = "none";
        document.body.appendChild(tempLink);
        tempLink.click();
        setTimeout(() => {
          document.body.removeChild(tempLink);
          URL.revokeObjectURL(blobUrl);
        }, 3000);
        return true;
      }
      return true;
    }
  } catch (error: any) {
    console.error("Erro ao gerar Recibo de Corrida:", error);
    alert(`Não foi possível gerar o recibo: ${error?.message || "Erro desconhecido"}`);
    return false;
  }
}
