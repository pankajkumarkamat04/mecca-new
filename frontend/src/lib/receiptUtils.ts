import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

// Helper function to convert images to base64
const convertImagesToBase64 = async (element: HTMLElement): Promise<void> => {
  const images = element.querySelectorAll('img');
  const promises = Array.from(images).map(async (img) => {
    try {
      // If image is already base64, skip
      if (img.src.startsWith('data:')) return;
      
      // Create a canvas to convert image to base64
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      
      // Draw image to canvas
      ctx.drawImage(img, 0, 0);
      
      // Convert to base64
      const base64 = canvas.toDataURL('image/png');
      img.src = base64;
    } catch (error) {
      console.warn('Failed to convert image to base64:', error);
    }
  });
  
  await Promise.all(promises);
};

export const generatePDF = async (elementId: string, filename: string = 'invoice.pdf') => {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error('Element not found');
  }

  // Temporarily hide action buttons if they are part of the element to be downloaded
  const actionButtons = element.querySelector('.receipt-actions');
  if (actionButtons) {
    (actionButtons as HTMLElement).style.display = 'none';
  }

  try {
    // Convert all images to base64 before generating PDF
    await convertImagesToBase64(element);
    
    const canvas = await html2canvas(element, {
      scale: 1.5, // Reduced scale for smaller file size
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      width: element.scrollWidth,
      height: element.scrollHeight,
      logging: false, // Disable logging for better performance
      removeContainer: true
    });

    // Use JPEG with lower quality for smaller file size
    const imgData = canvas.toDataURL('image/jpeg', 0.8); // 80% quality
    const pdf = new jsPDF('p', 'mm', 'a4');
    
    const imgWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;

    let position = 0;

    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    pdf.save(filename);
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  } finally {
    // Restore action buttons visibility
    if (actionButtons) {
      (actionButtons as HTMLElement).style.display = '';
    }
  }
};

export const printElement = async (elementId: string) => {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error('Element not found');
  }

  // Temporarily hide action buttons if they are part of the element to be printed
  const actionButtons = element.querySelector('.receipt-actions');
  if (actionButtons) {
    (actionButtons as HTMLElement).style.display = 'none';
  }

  // Convert all images to base64 before printing
  await convertImagesToBase64(element);

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    throw new Error('Unable to open print window');
  }

  // Get all CSS styles from the current document
  const styles = Array.from(document.styleSheets)
    .map(styleSheet => {
      try {
        return Array.from(styleSheet.cssRules)
          .map(rule => rule.cssText)
          .join('\n');
      } catch (e) {
        return '';
      }
    })
    .join('\n');

  const printContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Print Invoice</title>
        <style>
          ${styles}
          body { 
            margin: 0; 
            padding: 20px; 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: white;
          }
          @media print {
            body { margin: 0; padding: 0; }
            @page { 
              size: auto; 
              margin: 0.5in;
            }
            .no-print { display: none !important; }
            .receipt-actions { display: none !important; }
          }
        </style>
      </head>
      <body>
        ${element.outerHTML}
      </body>
    </html>
  `;

  printWindow.document.write(printContent);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
  printWindow.close();

  // Restore action buttons visibility
  if (actionButtons) {
    (actionButtons as HTMLElement).style.display = '';
  }
};

export const downloadReceipt = async (elementId: string, type: 'short' | 'full') => {
  const filename = type === 'short' ? 'receipt.pdf' : 'invoice.pdf';
  await generatePDF(elementId, filename);
};

export const printReceipt = async (elementId: string) => {
  await printElement(elementId);
};
