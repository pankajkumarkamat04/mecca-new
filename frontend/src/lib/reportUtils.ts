import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { formatCurrency, formatDate } from './utils';

interface ReportData {
  [key: string]: any;
}

interface TableColumn {
  key: string;
  label: string;
  render?: (row: any) => string | number;
}

/**
 * Generate PDF from report data
 */
export const generateReportPDF = async (
  reportTitle: string,
  data: ReportData,
  columns?: TableColumn[],
  filename?: string
) => {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
  let yPos = margin;

  // Helper function to add a new page if needed
  const checkPageBreak = (requiredHeight: number) => {
    if (yPos + requiredHeight > pageHeight - margin) {
      pdf.addPage();
      yPos = margin;
    }
  };

  // Add title
  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  pdf.text(reportTitle, margin, yPos);
  yPos += 10;

  // Add date
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Generated: ${formatDate(new Date())}`, margin, yPos);
  yPos += 8;

  // Add summary statistics if available
  if (data.summary) {
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Summary', margin, yPos);
    yPos += 7;

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    
    Object.entries(data.summary).forEach(([key, value]) => {
      checkPageBreak(8);
      const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
      let displayValue = '';
      
      if (typeof value === 'number') {
        // Check if it's currency
        if (key.toLowerCase().includes('revenue') || key.toLowerCase().includes('amount') || key.toLowerCase().includes('value')) {
          displayValue = formatCurrency(value);
        } else if (key.toLowerCase().includes('rate') || key.toLowerCase().includes('health')) {
          displayValue = `${value}%`;
        } else {
          displayValue = value.toString();
        }
      } else {
        displayValue = String(value);
      }
      
      pdf.text(`${label}: ${displayValue}`, margin + 5, yPos);
      yPos += 6;
    });
    
    yPos += 5;
  }

  // Add table if columns are provided
  if (columns && columns.length > 0 && data.items) {
    checkPageBreak(20);
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Details', margin, yPos);
    yPos += 8;

    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    
    // Calculate column widths
    const tableWidth = pageWidth - (2 * margin);
    const colWidth = tableWidth / columns.length;
    
    // Draw table header
    let xPos = margin;
    columns.forEach(col => {
      pdf.text(col.label, xPos, yPos);
      xPos += colWidth;
    });
    yPos += 5;

    // Draw horizontal line
    pdf.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 3;

    // Draw table rows
    pdf.setFont('helvetica', 'normal');
    data.items.forEach((row: any, index: number) => {
      checkPageBreak(8);
      
      xPos = margin;
      columns.forEach(col => {
        let cellValue = '';
        if (col.render) {
          const rendered = col.render(row);
          cellValue = typeof rendered === 'string' ? rendered : String(rendered);
        } else {
          cellValue = row[col.key] ? String(row[col.key]) : '';
        }
        
        // Truncate if too long
        const maxWidth = colWidth - 2;
        if (pdf.getTextWidth(cellValue) > maxWidth) {
          cellValue = pdf.splitTextToSize(cellValue, maxWidth)[0];
        }
        
        pdf.text(cellValue, xPos, yPos);
        xPos += colWidth;
      });
      yPos += 6;
    });
  }

  // Save PDF
  pdf.save(filename || `${reportTitle.toLowerCase().replace(/\s+/g, '_')}.pdf`);
};

/**
 * Generate CSV from report data
 */
export const generateReportCSV = (
  reportTitle: string,
  data: ReportData,
  columns?: TableColumn[],
  filename?: string
) => {
  let csv = `${reportTitle}\n`;
  csv += `Generated: ${formatDate(new Date())}\n\n`;

  // Add summary if available
  if (data.summary) {
    csv += 'Summary\n';
    Object.entries(data.summary).forEach(([key, value]) => {
      const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
      let displayValue = '';
      
      if (typeof value === 'number') {
        if (key.toLowerCase().includes('revenue') || key.toLowerCase().includes('amount') || key.toLowerCase().includes('value')) {
          displayValue = formatCurrency(value);
        } else if (key.toLowerCase().includes('rate') || key.toLowerCase().includes('health')) {
          displayValue = `${value}%`;
        } else {
          displayValue = value.toString();
        }
      } else {
        displayValue = String(value);
      }
      
      csv += `${label},${displayValue}\n`;
    });
    csv += '\n';
  }

  // Add table if columns are provided
  if (columns && columns.length > 0 && data.items) {
    csv += 'Details\n';
    
    // Add header row
    csv += columns.map(col => col.label).join(',') + '\n';
    
    // Add data rows
    data.items.forEach((row: any) => {
      const rowData = columns.map(col => {
        let cellValue = '';
        if (col.render) {
          const rendered = col.render(row);
          cellValue = typeof rendered === 'string' ? rendered : String(rendered);
        } else {
          cellValue = row[col.key] ? String(row[col.key]) : '';
        }
        // Escape commas and quotes
        return `"${cellValue.replace(/"/g, '""')}"`;
      });
      csv += rowData.join(',') + '\n';
    });
  }

  // Create blob and download
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename || `${reportTitle.toLowerCase().replace(/\s+/g, '_')}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Generate Excel-compatible CSV from report data
 */
export const generateReportExcel = (
  reportTitle: string,
  data: ReportData,
  columns?: TableColumn[],
  filename?: string
) => {
  // Use CSV format which Excel can open
  generateReportCSV(reportTitle, data, columns, filename?.replace('.csv', '.xlsx') || `${reportTitle.toLowerCase().replace(/\s+/g, '_')}.xlsx`);
};

/**
 * Helper to create report data structure from analytics data
 */
export const createReportData = (
  summary: any,
  items: any[],
  columns?: TableColumn[]
): ReportData => {
  return {
    summary,
    items,
    columns
  };
};
