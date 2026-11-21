import { jsPDF } from 'jspdf';
import { Transaction } from '../types';
import { formatDateID, formatRupiah } from '../utils/formatters';

export interface PdfReportPayload {
  title: string;
  subtitle: string;
  generatedBy: string;
  periodLabel: string;
  summaryLines: Array<{ label: string; value: string }>;
  headers: string[];
  rows: Array<Array<string | number>>;
  filename: string;
}

export function exportReportToPdf(payload: PdfReportPayload): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  // Brand header bar
  doc.setFillColor(232, 93, 63);
  doc.rect(0, 0, 210, 24, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('DIMSUM ME — Dimsum & Snack House', 14, 11);

  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'normal');
  doc.text('Sistem Informasi Penjualan & Evaluasi Ketepatan Penerimaan Kas', 14, 18);

  // Title & Metadata
  doc.setTextColor(21, 25, 35);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(payload.title, 14, 34);

  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(107, 114, 128);
  doc.text(payload.subtitle, 14, 40);
  doc.text(`Periode: ${payload.periodLabel}  |  Dicetak oleh: ${payload.generatedBy}`, 14, 46);

  // Summary strip
  let y = 54;
  doc.setFillColor(252, 248, 245);
  doc.setDrawColor(240, 231, 226);
  doc.roundedRect(14, y, 182, 18, 2, 2, 'FD');

  const colWidth = 182 / Math.max(1, payload.summaryLines.length);
  payload.summaryLines.forEach((item, idx) => {
    const x = 18 + idx * colWidth;
    doc.setFontSize(8);
    doc.setTextColor(107, 114, 128);
    doc.setFont('helvetica', 'normal');
    doc.text(item.label, x, y + 6);

    doc.setFontSize(10.5);
    doc.setTextColor(21, 25, 35);
    doc.setFont('helvetica', 'bold');
    doc.text(item.value, x, y + 13);
  });

  y += 26;

  // Table header
  const tableWidth = 182;
  const colCount = payload.headers.length;
  const cellW = tableWidth / colCount;

  doc.setFillColor(248, 236, 231);
  doc.rect(14, y, tableWidth, 8, 'F');
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(21, 25, 35);

  payload.headers.forEach((h, i) => {
    doc.text(String(h).slice(0, 24), 16 + i * cellW, y + 5.5);
  });

  y += 9;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);

  payload.rows.forEach((row, rowIndex) => {
    if (y > 272) {
      doc.addPage();
      y = 20;
    }
    if (rowIndex % 2 === 1) {
      doc.setFillColor(252, 250, 249);
      doc.rect(14, y - 1, tableWidth, 7, 'F');
    }
    doc.setTextColor(31, 41, 55);
    row.forEach((cell, i) => {
      doc.text(String(cell ?? '').slice(0, 26), 16 + i * cellW, y + 4);
    });
    y += 7;
  });

  doc.setFontSize(8);
  doc.setTextColor(156, 163, 175);
  doc.text('Dokumen dihasilkan otomatis oleh Sistem Administrasi Dimsum Me.', 14, 288);

  doc.save(payload.filename);
}

export function exportReceiptToPdf(tx: Transaction): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [80, 150] });
  let y = 10;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(201, 61, 34);
  doc.text('DIMSUM ME', 40, y, { align: 'center' });
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(107, 114, 128);
  doc.text('Dimsum & Snack House', 40, y, { align: 'center' });
  y += 6;

  doc.setDrawColor(220, 220, 220);
  doc.line(6, y, 74, y);
  y += 5;

  doc.setTextColor(21, 25, 35);
  doc.setFontSize(8);
  doc.text(`No. Invoice : ${tx.invoiceNo}`, 6, y);
  y += 4;
  doc.text(`Tanggal     : ${formatDateID(tx.date)} ${tx.time}`, 6, y);
  y += 4;
  doc.text(`Kasir       : ${tx.cashierName}`, 6, y);
  y += 4;
  doc.text(`Metode      : ${tx.paymentMethod}`, 6, y);
  y += 5;

  doc.line(6, y, 74, y);
  y += 5;

  tx.items.forEach((item) => {
    doc.setFont('helvetica', 'bold');
    const title =
      item.selectedVariants && item.selectedVariants.length > 0
        ? `${item.productName} (${item.selectedVariants.join(', ')})`
        : item.productName;
    doc.text(title.slice(0, 42), 6, y);
    y += 4;
    doc.setFont('helvetica', 'normal');
    doc.text(`${item.qty} x ${formatRupiah(item.unitPrice)}`, 6, y);
    doc.text(formatRupiah(item.qty * item.unitPrice), 74, y, { align: 'right' });
    y += 5;
  });

  doc.line(6, y, 74, y);
  y += 5;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text('TOTAL', 6, y);
  doc.text(formatRupiah(tx.totalAmount), 74, y, { align: 'right' });
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Status: ${tx.verificationStatus}`, 6, y);
  y += 8;
  doc.text('Terima kasih atas kunjungan Anda!', 40, y, { align: 'center' });

  doc.save(`Struk-${tx.invoiceNo}.pdf`);
}
