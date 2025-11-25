import jsPDF from 'jspdf';
import { formatDate } from './utils';

interface JobCardData {
  job: any;
  company: any;
  customer: any;
}

/**
 * Generate Job Card PDF in the format matching the provided template
 */
export const generateJobCardPDF = async (data: JobCardData) => {
  const { job, company, customer } = data;
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 10;
  let yPos = margin;

  // Helper function to add a new page if needed
  const checkPageBreak = (requiredHeight: number) => {
    if (yPos + requiredHeight > pageHeight - margin) {
      pdf.addPage();
      yPos = margin;
    }
  };

  // Helper to draw a box/rectangle
  const drawBox = (x: number, y: number, width: number, height: number, label?: string) => {
    pdf.setDrawColor(0, 0, 0);
    pdf.setLineWidth(0.1);
    pdf.rect(x, y, width, height);
    if (label) {
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'bold');
      pdf.text(label, x + 1, y + 4);
    }
  };

  // Helper to draw dotted line
  const drawDottedLine = (x: number, y: number, length: number) => {
    const dashLength = 2;
    const gapLength = 1;
    let currentX = x;
    while (currentX < x + length) {
      pdf.line(currentX, y, Math.min(currentX + dashLength, x + length), y);
      currentX += dashLength + gapLength;
    }
  };

  // ========== PAGE 1: JOB CARD ==========
  
  // Header Section
  const headerHeight = 35;
  const leftColWidth = 95;
  const rightColWidth = 95;
  const colGap = 0;

  // Company Logo Area (Left)
  pdf.setFillColor(200, 200, 200);
  pdf.rect(margin, yPos, 60, 15, 'F');
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(200, 0, 0); // Red color for MECCA
  pdf.text('MECCA', margin + 2, yPos + 8);
  pdf.setFontSize(8);
  pdf.setTextColor(0, 0, 0);
  pdf.setFont('helvetica', 'normal');
  pdf.text('AUTO & GENERAL (PVT) LTD', margin + 2, yPos + 12);
  
  // Company Address
  pdf.setFontSize(7);
  const companyAddress = company?.address 
    ? `${company.address.street || ''}, ${company.address.city || ''}, ${company.address.country || ''}`.replace(/^,\s*|,\s*$/g, '')
    : '283 Samora Machel Ave, Eastlea, Harare';
  pdf.text(companyAddress, margin + 2, yPos + 16);

  // Job Number (Right)
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Job No.', pageWidth - margin - 30, yPos + 5);
  pdf.setFontSize(14);
  pdf.setTextColor(200, 0, 0);
  pdf.text(job.jobNumber || job.jobCard?.cardNumber || 'N/A', pageWidth - margin - 30, yPos + 12);
  pdf.setTextColor(0, 0, 0);

  // Contact Information (Top Right)
  pdf.setFontSize(6);
  pdf.setFont('helvetica', 'normal');
  const salesPhone = company?.phone || '+263 242 779071';
  const email = company?.email || 'sales@meccaautogen.com';
  pdf.text(`Sales: ${salesPhone}`, pageWidth - margin - 30, yPos + 18);
  pdf.text(`Phone: ${salesPhone}`, pageWidth - margin - 30, yPos + 22);
  pdf.text(`Email: ${email}`, pageWidth - margin - 30, yPos + 26);

  yPos = margin + headerHeight;

  // Date Field
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.text('DATE:', margin, yPos);
  pdf.setFont('helvetica', 'normal');
  const jobDate = job.createdAt ? formatDate(job.createdAt) : formatDate(new Date());
  pdf.text(jobDate, margin + 12, yPos);
  yPos += 6;

  // Main Content Area - Two Columns
  const mainContentY = yPos;
  const mainContentHeight = pageHeight - mainContentY - 20;

  // Left Column
  let leftY = mainContentY;

  // Customer Details Box
  const customerBoxHeight = 35;
  drawBox(margin, leftY, leftColWidth, customerBoxHeight, 'CUSTOMER DETAILS');
  leftY += 5;
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'normal');
  
  const customerName = customer 
    ? `${customer.firstName || ''} ${customer.lastName || ''}`.trim() 
    : job.customerInfo?.name || 'N/A';
  pdf.text('NAME', margin + 2, leftY);
  drawDottedLine(margin + 15, leftY - 2, leftColWidth - 17);
  pdf.text(customerName, margin + 16, leftY);
  leftY += 5;

  const customerAddress = customer?.address?.billing?.street 
    ? `${customer.address.billing.street}, ${customer.address.billing.city || ''}`.replace(/^,\s*|,\s*$/g, '')
    : job.customerInfo?.address || '';
  pdf.text('ADDRESS', margin + 2, leftY);
  drawDottedLine(margin + 15, leftY - 2, leftColWidth - 17);
  pdf.text(customerAddress, margin + 16, leftY);
  leftY += 5;

  const contactName = customerName;
  pdf.text('CONTACT NAME', margin + 2, leftY);
  drawDottedLine(margin + 15, leftY - 2, leftColWidth - 17);
  pdf.text(contactName, margin + 16, leftY);
  leftY += 5;

  const telCell = customer?.phone || job.customerInfo?.telCell || '';
  pdf.text('TEL/CELL', margin + 2, leftY);
  drawDottedLine(margin + 15, leftY - 2, leftColWidth - 17);
  pdf.text(telCell, margin + 16, leftY);
  leftY += 5;

  const orderNumber = job.customerInfo?.orderNumber || job.jobCard?.orderNumber || '';
  pdf.text('ORDER NO.', margin + 2, leftY);
  drawDottedLine(margin + 15, leftY - 2, leftColWidth - 17);
  pdf.text(orderNumber, margin + 16, leftY);
  leftY += 5;

  leftY = mainContentY + customerBoxHeight + 2;

  // Repair Request Box
  const repairRequestHeight = 50;
  drawBox(margin, leftY, leftColWidth, repairRequestHeight, 'REPAIR REQUEST');
  leftY += 5;
  pdf.setFontSize(7);
  const repairRequest = job.repairRequest || '';
  if (repairRequest) {
    const lines = pdf.splitTextToSize(repairRequest, leftColWidth - 4);
    lines.forEach((line: string, index: number) => {
      if (index < 8) { // Limit to 8 lines
        pdf.text(line, margin + 2, leftY + (index * 5));
      }
    });
  }
  leftY += repairRequestHeight + 2;

  // Sublets Box
  const subletsHeight = 40;
  drawBox(margin, leftY, leftColWidth, subletsHeight, 'SUBLETS');
  leftY += 5;
  pdf.setFontSize(7);
  if (job.sublets && job.sublets.length > 0) {
    job.sublets.slice(0, 6).forEach((sublet: any, index: number) => {
      const desc = sublet.description || '';
      const amount = sublet.amount ? `$${sublet.amount.toFixed(2)}` : '';
      pdf.text(desc.substring(0, 40), margin + 2, leftY + (index * 5));
      pdf.text(amount, margin + leftColWidth - 20, leftY + (index * 5));
    });
  }
  leftY += subletsHeight + 2;

  // Reports Box
  const reportsHeight = 60;
  drawBox(margin, leftY, leftColWidth, reportsHeight, 'REPORTS');
  leftY += 5;
  pdf.setFontSize(7);
  const reports = job.reports || job.jobCard?.reports || '';
  if (reports) {
    const lines = pdf.splitTextToSize(reports, leftColWidth - 4);
    lines.forEach((line: string, index: number) => {
      if (index < 10) { // Limit to 10 lines
        pdf.text(line, margin + 2, leftY + (index * 5));
      }
    });
  }

  // Right Column
  let rightY = mainContentY;

  // Technician Field
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.text('TECHNICIAN(S):', margin + leftColWidth + colGap, rightY);
  pdf.setFont('helvetica', 'normal');
  const technicians = job.resources?.assignedTechnicians || [];
  const techNames = technicians.map((t: any) => t.name || `${t.user?.firstName || ''} ${t.user?.lastName || ''}`).join(', ') || 'N/A';
  pdf.text(techNames.substring(0, 40), margin + leftColWidth + colGap + 25, rightY);
  rightY += 6;

  // Vehicle Details Box
  const vehicleBoxHeight = 35;
  drawBox(margin + leftColWidth + colGap, rightY, rightColWidth, vehicleBoxHeight);
  rightY += 5;
  pdf.setFontSize(7);
  
  const vehicle = job.vehicle || {};
  pdf.text('MAKE', margin + leftColWidth + colGap + 2, rightY);
  drawDottedLine(margin + leftColWidth + colGap + 15, rightY - 2, rightColWidth - 17);
  pdf.text(vehicle.make || '', margin + leftColWidth + colGap + 16, rightY);
  rightY += 5;

  pdf.text('MODEL', margin + leftColWidth + colGap + 2, rightY);
  drawDottedLine(margin + leftColWidth + colGap + 15, rightY - 2, rightColWidth - 17);
  pdf.text(vehicle.model || '', margin + leftColWidth + colGap + 16, rightY);
  rightY += 5;

  pdf.text('ODOMETER', margin + leftColWidth + colGap + 2, rightY);
  drawDottedLine(margin + leftColWidth + colGap + 15, rightY - 2, rightColWidth - 17);
  const odometer = vehicle.odometer ? `${vehicle.odometer.toLocaleString()} km` : '';
  pdf.text(odometer, margin + leftColWidth + colGap + 16, rightY);
  rightY += 5;

  pdf.text('REG#', margin + leftColWidth + colGap + 2, rightY);
  drawDottedLine(margin + leftColWidth + colGap + 15, rightY - 2, rightColWidth - 17);
  pdf.text(vehicle.regNumber || '', margin + leftColWidth + colGap + 16, rightY);
  rightY += 5;

  pdf.text('VIN#', margin + leftColWidth + colGap + 2, rightY);
  drawDottedLine(margin + leftColWidth + colGap + 15, rightY - 2, rightColWidth - 17);
  pdf.text(vehicle.vinNumber || '', margin + leftColWidth + colGap + 16, rightY);
  rightY += 5;

  rightY = mainContentY + vehicleBoxHeight + 2;

  // Time Details Box
  const timeBoxHeight = 20;
  drawBox(margin + leftColWidth + colGap, rightY, rightColWidth, timeBoxHeight);
  rightY += 5;
  pdf.setFontSize(7);
  
  if (vehicle.timeIn) {
    const timeIn = new Date(vehicle.timeIn);
    pdf.text('TIME IN:', margin + leftColWidth + colGap + 2, rightY);
    drawDottedLine(margin + leftColWidth + colGap + 20, rightY - 2, rightColWidth - 22);
    pdf.text(timeIn.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), margin + leftColWidth + colGap + 21, rightY);
    rightY += 5;
  }

  if (vehicle.timeForCollection) {
    pdf.text('TIME INDICATED FOR COLLECTION', margin + leftColWidth + colGap + 2, rightY);
    drawDottedLine(margin + leftColWidth + colGap + 50, rightY - 2, rightColWidth - 52);
    const collectionTime = new Date(vehicle.timeForCollection);
    pdf.text(collectionTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), margin + leftColWidth + colGap + 51, rightY);
  }

  rightY = mainContentY + vehicleBoxHeight + timeBoxHeight + 4;

  // Parts Box
  const partsHeight = 80;
  drawBox(margin + leftColWidth + colGap, rightY, rightColWidth, partsHeight, 'PARTS');
  rightY += 5;
  pdf.setFontSize(7);
  
  // Parts table header
  pdf.setFont('helvetica', 'bold');
  pdf.text('Description', margin + leftColWidth + colGap + 2, rightY);
  pdf.text('Qty/Amount', margin + leftColWidth + colGap + 60, rightY);
  pdf.setFont('helvetica', 'normal');
  rightY += 3;
  pdf.line(margin + leftColWidth + colGap + 2, rightY, margin + leftColWidth + colGap + rightColWidth - 2, rightY);
  rightY += 2;

  // Parts data
  if (job.parts && job.parts.length > 0) {
    job.parts.slice(0, 12).forEach((part: any, index: number) => {
      const desc = part.name || part.description || '';
      const qty = part.quantity || part.amount || '';
      pdf.text(desc.substring(0, 35), margin + leftColWidth + colGap + 2, rightY + (index * 5));
      pdf.text(String(qty), margin + leftColWidth + colGap + 60, rightY + (index * 5));
    });
  }

  // Footer
  const footerY = pageHeight - 15;
  pdf.setFontSize(8);
  pdf.setTextColor(200, 0, 0);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Driven by Quality, Powered by Service', pageWidth / 2, footerY, { align: 'center' });

  // ========== PAGE 2: VEHICLE PRE-CHECK ==========
  pdf.addPage();
  yPos = margin;

  // Title
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text('VEHICLE PRE-CHECK', pageWidth / 2, yPos, { align: 'center' });
  yPos += 15;

  // Checklist Section
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.text('CHECKLIST', margin, yPos);
  yPos += 5;

  const checklistItems = [
    ['ALARMS', 'SCRATCHES', 'LIGHTS', 'WINDOWS', 'MATS'],
    ['CENTRAL LOCKING', 'DENTS', 'SPARE WHEEL', 'WINDSCREEN', 'WHEEL LOCK NUT'],
    ['ANTI-HIJACK', 'BROKEN PARTS', 'TOOLS & JACKS', 'HUB CAPS', 'RADIO FACE'],
    ['MIRRORS', 'TIRES', 'BRAKES', 'BATTERY', 'ENGINE']
  ];

  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'normal');
  const precheck = job.precheck || {};
  
  // Map display names to actual precheck keys (camelCase from form)
  const keyMap: Record<string, string> = {
    'ALARMS': 'alarms',
    'SCRATCHES': 'scratches',
    'LIGHTS': 'lights',
    'WINDOWS': 'windows',
    'MATS': 'mats',
    'CENTRAL LOCKING': 'centralLocking',
    'DENTS': 'dents',
    'SPARE WHEEL': 'spareWheel',
    'WINDSCREEN': 'windscreen',
    'WHEEL LOCK NUT': 'wheelLockNut',
    'ANTI-HIJACK': 'antiHijack',
    'BROKEN PARTS': 'brokenParts',
    'TOOLS & JACKS': 'toolsAndJacks',
    'HUB CAPS': 'hubCaps',
    'RADIO FACE': 'radioFace',
    'MIRRORS': 'mirrors',
    'TIRES': 'tires',
    'BRAKES': 'brakes',
    'BATTERY': 'battery',
    'ENGINE': 'engine'
  };
  
  checklistItems.forEach((row, rowIndex) => {
    row.forEach((item, colIndex) => {
      const x = margin + (colIndex * 38);
      const y = yPos + (rowIndex * 6);
      const key = keyMap[item] || item.toLowerCase().replace(/\s+/g, '');
      const checked = precheck[key] === true;
      
      // Draw checkbox
      pdf.rect(x, y - 3, 3, 3);
      if (checked) {
        pdf.setFont('helvetica', 'bold');
        pdf.text('✓', x + 0.5, y - 0.5);
        pdf.setFont('helvetica', 'normal');
      }
      pdf.text(item, x + 5, y);
    });
  });

  yPos += 30;

  // Fuel Level and Overall Condition
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.text('FUEL LEVEL', margin, yPos);
  pdf.text('OVERALL CONDITION', margin + 100, yPos);
  yPos += 5;

  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'normal');
  const fuelLevels = ['E', '1/4', '1/2', '3/4', 'F'];
  fuelLevels.forEach((level, index) => {
    const x = margin + (index * 15);
    pdf.rect(x, yPos - 3, 8, 4);
    if (precheck.fuelLevel === level) {
      pdf.setFont('helvetica', 'bold');
      pdf.text('✓', x + 2, yPos - 0.5);
      pdf.setFont('helvetica', 'normal');
    }
    pdf.text(level, x + 10, yPos);
  });

  const conditions = ['POOR', 'AVG', 'GOOD', 'EXCELLENT'];
  conditions.forEach((condition, index) => {
    const x = margin + 100 + (index * 20);
    pdf.rect(x, yPos - 3, 8, 4);
    if (precheck.overallCondition?.toUpperCase() === condition) {
      pdf.setFont('helvetica', 'bold');
      pdf.text('✓', x + 2, yPos - 0.5);
      pdf.setFont('helvetica', 'normal');
    }
    pdf.text(condition, x + 10, yPos);
  });

  yPos += 10;

  // Other Comments
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.text('OTHER COMMENTS:', margin, yPos);
  yPos += 5;

  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'normal');
  const comments = precheck.otherComments || '';
  if (comments) {
    const lines = pdf.splitTextToSize(comments, pageWidth - (2 * margin));
    lines.forEach((line: string, index: number) => {
      if (index < 15) {
        pdf.text(line, margin, yPos + (index * 5));
      }
    });
  } else {
    // Draw dotted lines for manual entry
    for (let i = 0; i < 10; i++) {
      drawDottedLine(margin, yPos + (i * 5), pageWidth - (2 * margin));
    }
  }

  yPos += 60;

  // Terms and Conditions
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'normal');
  const terms = [
    'I accept the technical advice given to me by MECCA AUTO & GENERAL relating to the service and repair of my vehicle.',
    'I confirm that all valuables / personal possessions have been removed from my vehicle and that MECCA AUTO & GENERAL will not be liable for any loss or damage of such items.',
    'I authorise MECCA AUTO & GENERAL to conduct repairs as outlined on the Job Card. Additional work cannot be carried out without an approved estimate.',
    'I have read and understood the terms and conditions.'
  ];

  terms.forEach((term, index) => {
    pdf.text(term, margin, yPos + (index * 5), { maxWidth: pageWidth - (2 * margin) });
  });

  yPos += 25;

  // Signature Line
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Customer\'s Signature:', margin, yPos);
  drawDottedLine(margin + 35, yPos - 2, pageWidth - margin - 35);

  // Save PDF
  const filename = `Job_Card_${job.jobNumber || job.jobCard?.cardNumber || job._id}.pdf`;
  pdf.save(filename);
};

