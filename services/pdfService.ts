
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { OFFER_LEGAL_TEXT } from '../constants';

export const generateQuotePDF = (data: any): void => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Header Premium Black & Gold
  doc.setFillColor(5, 5, 5); 
  doc.rect(0, 0, pageWidth, 55, 'F');
  
  doc.setDrawColor(212, 175, 55);
  doc.setLineWidth(1.5);
  doc.line(0, 55, pageWidth, 55);

  // Rimuove emoji che causano problemi di rendering nel PDF
  const stripEmojis = (text: string) => {
    return text.replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD00-\uDDFF])/g, '');
  };

  // Logo Text
  doc.setTextColor(212, 175, 55);
  doc.setFontSize(32);
  doc.setFont('helvetica', 'bold');
  doc.text('ALFA SECURITY', 20, 25);
  
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(180, 180, 180);
  doc.text('Preventivo generato Professional Booking System Alfa', 20, 35);
  doc.text('Tel 0461-421049 - Via Roma 35, Trento', 20, 40);
  
  // Info Documento
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.text(`ID DOCUMENTO: ${data.id}`, pageWidth - 20, 25, { align: 'right' });
  doc.text(`DATA: ${new Date().toLocaleDateString('it-IT')}`, pageWidth - 20, 32, { align: 'right' });
  doc.text(`SCADENZA: 15 GIORNI`, pageWidth - 20, 39, { align: 'right' });

  let cursorY = 70;

  // SEZIONE CLIENTE
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('DETTAGLI CLIENTE', 20, cursorY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Nome: ${stripEmojis(data.client.firstName)} ${stripEmojis(data.client.lastName)}`, 20, cursorY + 7);
  if (data.client.companyName) doc.text(`Azienda: ${stripEmojis(data.client.companyName)}`, 20, cursorY + 12);
  doc.text(`Email: ${stripEmojis(data.client.email)}`, 20, cursorY + 17);
  doc.text(`Tel: ${stripEmojis(data.client.phone)}`, 20, cursorY + 22);
  cursorY += 35;

  // DETTAGLI SERVIZIO
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('CONFIGURAZIONE SERVIZIO', 20, cursorY);
  cursorY += 5;

  autoTable(doc, {
    startY: cursorY,
    body: [
      ['Evento', stripEmojis(data.service.eventName || 'Richiesta Standard')],
      ['Data Intervento', data.service.date.split('-').reverse().join('/')],
      ['Luogo', stripEmojis(data.service.location || 'Da definire')],
      ['Orario', `${data.service.startTime} - ${data.service.endTime} (${data.calculations.hours.toFixed(1)} ore)`],
      ['Personale Security', `${data.service.securityOperators} unità`],
      ['Personale Safety', data.service.fireOperators > 0 ? `${data.service.fireOperators} unità` : 'N/A'],
      ['Divisa', data.service.uniformType === 'Security' ? 'Divisa Ufficiale' : 'Abito Elegante'],
      ['Note', stripEmojis(data.service.notes || '-')]
    ],
    theme: 'striped',
    styles: { fontSize: 8, cellPadding: 3 },
    margin: { left: 20, right: 20 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 } }
  });

  cursorY = (doc as any).lastAutoTable.finalY + 15;

  // PROSPETTO ECONOMICO
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('PROSPETTO ECONOMICO', 20, cursorY);
  cursorY += 5;

  const economicBody: any[][] = [
    ['Imponibile Security', `€ ${data.calculations.securitySubtotal.toFixed(2)}`],
  ];

  if (data.service.fireOperators > 0) {
    economicBody.push(['Imponibile Safety (Antincendio)', `€ ${data.calculations.fireSubtotal.toFixed(2)}`]);
  }
  if (data.service.hasSupervisor) {
    economicBody.push(['Supplemento Capo Squadra', `€ ${data.calculations.supervisorFee.toFixed(2)}`]);
  }
  if (data.calculations.transportFee > 0) {
    economicBody.push(['Spese Logistica/Trasferta', `€ ${data.calculations.transportFee.toFixed(2)}`]);
  }

  economicBody.push([{ content: 'TOTALE IMPONIBILE', styles: { fontStyle: 'bold' } }, { content: `€ ${data.calculations.totalExclVat.toFixed(2)}`, styles: { fontStyle: 'bold' } }]);
  economicBody.push(['IVA (22%)', `€ ${data.calculations.vatAmount.toFixed(2)}`]);
  
  if (data.calculations.discountPercent > 0) {
    economicBody.push([{ content: `SCONTO APPLICATO (${data.calculations.discountPercent}%)`, styles: { textColor: [16, 185, 129], fontStyle: 'bold' } }, { content: `- € ${data.calculations.discountAmount.toFixed(2)}`, styles: { textColor: [16, 185, 129], fontStyle: 'bold' } }]);
  }

  economicBody.push([{ content: 'TOTALE FINALE IVATO', styles: { fontStyle: 'bold', fontSize: 11, fillColor: [212, 175, 55], textColor: [0, 0, 0] } }, { content: `€ ${data.total.toFixed(2)}`, styles: { fontStyle: 'bold', fontSize: 11, fillColor: [212, 175, 55], textColor: [0, 0, 0] } }]);

  autoTable(doc, {
    startY: cursorY,
    body: economicBody,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 4 },
    margin: { left: 20, right: 20 },
    columnStyles: { 1: { halign: 'right' } }
  });

  // NUOVA PAGINA PER TERMINI E CONDIZIONI (Corpo Email)
  doc.addPage();
  doc.setFillColor(5, 5, 5);
  doc.rect(0, 0, pageWidth, 20, 'F');
  doc.setTextColor(212, 175, 55);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('TERMINI E CONDIZIONI DI SERVIZIO', 20, 13);
  
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  
  const termsText = stripEmojis(OFFER_LEGAL_TEXT);
  const splitTerms = doc.splitTextToSize(termsText, pageWidth - 40);
  doc.text(splitTerms, 20, 30);

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const footerY = doc.internal.pageSize.getHeight() - 10;
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text(`Alfa Security Office Portal - Pagina ${i} di ${pageCount}`, pageWidth / 2, footerY, { align: 'center' });
  }

  doc.save(`ALFA_SECURITY_PREVENTIVO_${data.id}.pdf`);
};
