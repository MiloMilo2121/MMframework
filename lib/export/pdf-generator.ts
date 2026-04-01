/**
 * PDF generator using html2canvas + jsPDF.
 * Renders the report container to a canvas then splits into A4 pages.
 */
export async function generatePdf(
  container: HTMLElement,
  clientName: string
): Promise<void> {
  // Dynamic imports to avoid SSR issues
  const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
    import('jspdf'),
    import('html2canvas'),
  ]);

  const canvas = await html2canvas(container, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#FFFFFF',
    logging: false,
  });

  // A4 dimensions in mm
  const A4_W = 210;
  const A4_H = 297;
  const MARGIN = 15; // mm

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const imgData = canvas.toDataURL('image/jpeg', 0.95);
  const imgWidth = A4_W - MARGIN * 2;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  const pagesCount = Math.ceil(imgHeight / (A4_H - MARGIN * 2));

  for (let page = 0; page < pagesCount; page++) {
    if (page > 0) pdf.addPage();

    const srcY = page * (A4_H - MARGIN * 2);

    pdf.addImage(
      imgData,
      'JPEG',
      MARGIN,
      MARGIN - srcY,
      imgWidth,
      imgHeight
    );

    // Header line
    pdf.setDrawColor(170, 216, 216); // --accent-primary
    pdf.setLineWidth(0.3);
    pdf.line(MARGIN, 8, A4_W - MARGIN, 8);

    // Header text
    pdf.setFontSize(7);
    pdf.setTextColor(90, 120, 120);
    pdf.text(clientName, MARGIN, 6);
    pdf.text(`${page + 1} / ${pagesCount}`, A4_W - MARGIN, 6, { align: 'right' });

    // Footer
    pdf.line(MARGIN, A4_H - 8, A4_W - MARGIN, A4_H - 8);
    pdf.setFontSize(6);
    pdf.text(
      'Confidenziale — Analisi di Mercato elaborata da Axend — Non distribuire',
      A4_W / 2,
      A4_H - 5,
      { align: 'center' }
    );

    // Watermark
    pdf.setFontSize(60);
    pdf.setTextColor(200, 220, 220);
    pdf.setGState(pdf.GState({ opacity: 0.03 }));
    pdf.text('AXEND', A4_W / 2, A4_H / 2, { align: 'center', angle: 45 });
    pdf.setGState(pdf.GState({ opacity: 1 }));
    pdf.setTextColor(0, 0, 0);
  }

  pdf.save(`AnalisiMercato_${clientName.replace(/\s+/g, '_')}_Axend.pdf`);
}
