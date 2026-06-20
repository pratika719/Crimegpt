import { jsPDF } from "jspdf";

/**
 * Reusable PDF Generation Service that exports generated police/court documents.
 * Employs a template layout system without hardcoded layouts per document.
 */
export function exportDocumentToPDF(
  docTitle: string, 
  docType: string, 
  content: any, 
  version: number,
  createdAt: string
) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  
  let currentY = 20;

  // Helper to draw standard header on each page
  const drawHeader = (pageNumber: number) => {
    // Top border line
    doc.setDrawColor(24, 24, 27); // zinc-900
    doc.setLineWidth(0.8);
    doc.line(margin, 10, pageWidth - margin, 10);

    // restricted stamp
    doc.setFont("courier", "bold");
    doc.setFontSize(8);
    doc.setTextColor(239, 68, 68); // red-500
    doc.text("RESTRICTED - LAW ENFORCEMENT & COURT USE ONLY", margin, 15);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(113, 113, 122); // zinc-500
    doc.text(`REF: ${docType}-v${version}`, pageWidth - margin - 35, 15, { align: "right" });
  };

  // Helper to draw standard footer on each page
  const drawFooter = (pageNumber: number) => {
    doc.setDrawColor(228, 228, 231); // zinc-200
    doc.setLineWidth(0.2);
    doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(113, 113, 122);
    doc.text("CrimeGPT AI Investigation Intelligence Platform", margin, pageHeight - 10);
    doc.text(`Page ${pageNumber}`, pageWidth - margin, pageHeight - 10, { align: "right" });
  };

  // Helper to add watermark
  const drawWatermark = () => {
    doc.saveGraphicsState();
    doc.setGState(doc.GState({ opacity: 0.05 } as any));
    doc.setFont("helvetica", "bold");
    doc.setFontSize(50);
    doc.setTextColor(113, 113, 122);
    // Draw rotated text in the center
    doc.text("CRIMEGPT", pageWidth / 2, pageHeight / 2, {
      align: "center",
      angle: 45,
    } as any);
    doc.restoreGraphicsState();
  };

  // Helper to check for space and add a page if needed
  const ensureSpace = (neededHeight: number) => {
    if (currentY + neededHeight > pageHeight - 20) {
      doc.addPage();
      currentPage++;
      drawWatermark();
      drawHeader(currentPage);
      drawFooter(currentPage);
      currentY = 25;
    }
  };

  let currentPage = 1;
  drawWatermark();
  drawHeader(currentPage);
  drawFooter(currentPage);

  // 1. Document Emblems & State Police Heading
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(24, 24, 27);
  doc.text("POLICE DEPT. INVESTIGATION DOSSIER", pageWidth / 2, currentY, { align: "center" });
  currentY += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(82, 82, 91); // zinc-600
  doc.text(`RECORD GENERATED: ${createdAt}`, pageWidth / 2, currentY, { align: "center" });
  currentY += 10;

  // Draw Banner Box
  doc.setFillColor(24, 24, 27); // zinc-900
  doc.rect(margin, currentY, contentWidth, 16, "F");
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text(docTitle.toUpperCase(), pageWidth / 2, currentY + 10, { align: "center" });
  currentY += 24;

  // 2. Recursive layout renderer for arbitrary JSON document contents
  const renderValue = (key: string, val: any) => {
    // Format the key into a readable title (e.g. accusedList -> ACCUSED LIST)
    const formattedKey = key
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (str) => str.toUpperCase())
      .toUpperCase();

    // Check if value is primitive or object
    if (typeof val === "string") {
      // Heading
      ensureSpace(12);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(24, 24, 27);
      doc.text(formattedKey, margin, currentY);
      currentY += 5;

      // Body text
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(63, 63, 70); // zinc-700
      
      const splitText = doc.splitTextToSize(val, contentWidth);
      const textHeight = splitText.length * 4.5;
      
      ensureSpace(textHeight + 5);
      doc.text(splitText, margin, currentY);
      currentY += textHeight + 6;
    } else if (Array.isArray(val)) {
      if (val.length === 0) return;

      // Heading
      ensureSpace(12);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(24, 24, 27);
      doc.text(formattedKey, margin, currentY);
      currentY += 5;

      // Render each array item
      val.forEach((item, index) => {
        if (typeof item === "string") {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(9);
          doc.setTextColor(63, 63, 70);
          
          const splitText = doc.splitTextToSize(`• ${item}`, contentWidth);
          const textHeight = splitText.length * 4.5;
          
          ensureSpace(textHeight + 2);
          doc.text(splitText, margin, currentY);
          currentY += textHeight + 2;
        } else if (typeof item === "object") {
          // Complex object inside array (e.g., accusedList, witnessStatements, applicableSections)
          ensureSpace(4);
          doc.setDrawColor(228, 228, 231);
          doc.setLineWidth(0.2);
          doc.line(margin, currentY, pageWidth - margin, currentY);
          currentY += 4;

          Object.entries(item).forEach(([subKey, subVal]) => {
            const label = subKey.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase());
            const textContent = typeof subVal === "object" ? JSON.stringify(subVal) : String(subVal);
            
            doc.setFont("helvetica", "bold");
            doc.setFontSize(8.5);
            doc.setTextColor(39, 39, 42); // zinc-800
            
            ensureSpace(5);
            doc.text(`${label}:`, margin + 2, currentY);
            
            doc.setFont("helvetica", "normal");
            doc.setFontSize(8.5);
            doc.setTextColor(63, 63, 70);

            const splitSubText = doc.splitTextToSize(textContent, contentWidth - 35);
            const subHeight = splitSubText.length * 4;
            
            ensureSpace(subHeight + 1);
            doc.text(splitSubText, margin + 30, currentY);
            currentY += Math.max(subHeight, 4) + 1.5;
          });
          currentY += 2;
        }
      });
      currentY += 4;
    } else if (typeof val === "object" && val !== null) {
      // Key-value metadata table/block (e.g., caseDetails, custodyRequested)
      ensureSpace(12);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(24, 24, 27);
      doc.text(formattedKey, margin, currentY);
      currentY += 5;

      // Draw background box for metadata
      const blockHeight = Object.keys(val).length * 6 + 4;
      ensureSpace(blockHeight);
      
      doc.setFillColor(244, 244, 245); // zinc-100
      doc.rect(margin, currentY, contentWidth, blockHeight, "F");
      currentY += 4;

      Object.entries(val).forEach(([subKey, subVal]) => {
        const label = subKey.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase());
        const textContent = typeof subVal === "object" ? JSON.stringify(subVal) : String(subVal);

        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(24, 24, 27);
        doc.text(label, margin + 4, currentY);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(63, 63, 70);
        doc.text(textContent, margin + 50, currentY);
        currentY += 6;
      });
      currentY += 4;
    }
  };

  // Render each field in the document content JSON
  Object.entries(content).forEach(([key, val]) => {
    renderValue(key, val);
  });

  // 3. Signature Blocks
  ensureSpace(40);
  currentY += 10;
  doc.setDrawColor(113, 113, 122);
  doc.setLineWidth(0.3);
  doc.line(pageWidth - margin - 60, currentY, pageWidth - margin, currentY);
  
  currentY += 5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(24, 24, 27);
  doc.text("STATION HOUSE OFFICER", pageWidth - margin - 30, currentY, { align: "center" });

  currentY += 4;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(113, 113, 122);
  doc.text("CRIMEGPT LEGAL SERVICE LOG", pageWidth - margin - 30, currentY, { align: "center" });

  // Save the PDF
  const filename = `${docTitle.toLowerCase().replace(/[^a-z0-9]+/g, "_")}.pdf`;
  doc.save(filename);
  console.log(`🎉 PDF generated & saved: ${filename}`);
}
