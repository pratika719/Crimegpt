// @ts-ignore
import { jsPDF } from "jspdf/dist/jspdf.es.min.js";

export class PDFBuilder {
  private doc: jsPDF;
  private pageWidth = 210;
  private pageHeight = 297;
  private margin = 15;
  private contentWidth = 180; // 210 - 2*15
  private currentY = 20;
  private currentPage = 1;
  
  // Header metadata fields
  private docTitle = "";
  private docSubtitle = "";
  private stampText = "";
  private caseNumber = "";
  private caseTitle = "";
  private generatedAt = "";

  constructor() {
    this.doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });
  }

  public initialize(
    title: string,
    subtitle: string,
    stampText: string,
    caseNo: string,
    caseTitle: string,
    createdAt: string
  ) {
    this.docTitle = title;
    this.docSubtitle = subtitle;
    this.stampText = stampText;
    this.caseNumber = caseNo;
    this.caseTitle = caseTitle;
    this.generatedAt = createdAt;

    this.startPage();
  }

  private startPage() {
    this.drawWatermark();
    this.drawHeader();
    this.drawFooter();
  }

  public addPage() {
    this.doc.addPage();
    this.currentPage++;
    this.currentY = 25;
    this.startPage();
  }

  public ensureSpace(neededHeight: number) {
    if (this.currentY + neededHeight > this.pageHeight - 20) {
      this.addPage();
    }
  }

  private drawWatermark() {
    this.doc.saveGraphicsState();
    // Using opacity for a subtle watermark background
    this.doc.setGState(this.doc.GState({ opacity: 0.04 } as any));
    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(45);
    this.doc.setTextColor(113, 113, 122); // zinc-500
    
    // Draw rotated text in the center of the page
    this.doc.text("CRIMEGPT INTEL", this.pageWidth / 2, this.pageHeight / 2, {
      align: "center",
      angle: 45,
    } as any);
    this.doc.restoreGraphicsState();
  }

  private drawHeader() {
    // 1. Top double borders
    this.doc.setDrawColor(24, 24, 27); // zinc-900
    this.doc.setLineWidth(0.6);
    this.doc.line(this.margin, 10, this.pageWidth - this.margin, 10);
    this.doc.setLineWidth(0.2);
    this.doc.line(this.margin, 11.5, this.pageWidth - this.margin, 11.5);

    // 2. State stamp / restricted label
    this.doc.setFont("courier", "bold");
    this.doc.setFontSize(7.5);
    this.doc.setTextColor(239, 68, 68); // red-500
    this.doc.text(`SECURITY: ${this.stampText.toUpperCase()}`, this.margin, 16);

    // 3. AI Generated Badge
    this.doc.saveGraphicsState();
    this.doc.setFillColor(79, 70, 229); // indigo-600
    this.doc.rect(this.pageWidth - this.margin - 24, 13.5, 24, 4, "F");
    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(6.5);
    this.doc.setTextColor(255, 255, 255);
    this.doc.text("AI INQUEST DRAFT", this.pageWidth - this.margin - 12, 16.5, { align: "center" });
    this.doc.restoreGraphicsState();
  }

  private drawFooter() {
    // Bottom boundary line
    this.doc.setDrawColor(228, 228, 231); // zinc-200
    this.doc.setLineWidth(0.2);
    this.doc.line(this.margin, this.pageHeight - 15, this.pageWidth - this.margin, this.pageHeight - 15);

    // Footer labels
    this.doc.setFont("helvetica", "normal");
    this.doc.setFontSize(7.5);
    this.doc.setTextColor(113, 113, 122); // zinc-500
    this.doc.text("CrimeGPT AI Investigation Intelligence Platform (Ver 3.5)", this.margin, this.pageHeight - 10);
    this.doc.text(`Page ${this.currentPage}`, this.pageWidth - this.margin, this.pageHeight - 10, { align: "right" });
  }

  public drawMainHeader() {
    this.ensureSpace(35);
    
    // Brand header label
    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(13);
    this.doc.setTextColor(24, 24, 27);
    this.doc.text("STATE POLICE INTEL & INQUEST DIRECTORY", this.pageWidth / 2, this.currentY, { align: "center" });
    this.currentY += 5;

    // Subtitle
    this.doc.setFont("helvetica", "normal");
    this.doc.setFontSize(8.5);
    this.doc.setTextColor(82, 82, 91); // zinc-600
    this.doc.text(this.docSubtitle, this.pageWidth / 2, this.currentY, { align: "center" });
    this.currentY += 8;

    // Top Details Box (Case details & timestamp)
    this.doc.setFillColor(244, 244, 245); // zinc-100
    this.doc.rect(this.margin, this.currentY, this.contentWidth, 15, "F");
    this.doc.setDrawColor(228, 228, 231);
    this.doc.setLineWidth(0.25);
    this.doc.rect(this.margin, this.currentY, this.contentWidth, 15, "S");

    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(8);
    this.doc.setTextColor(39, 39, 42); // zinc-800
    
    this.doc.text("CASE TITLE:", this.margin + 4, this.currentY + 5.5);
    this.doc.text("CASE NUMBER / ID:", this.margin + 4, this.currentY + 10.5);
    this.doc.text("DATE GENERATED:", this.pageWidth / 2 + 10, this.currentY + 5.5);
    this.doc.text("CLEARANCE LEVEL:", this.pageWidth / 2 + 10, this.currentY + 10.5);

    this.doc.setFont("helvetica", "normal");
    this.doc.text(this.caseTitle, this.margin + 36, this.currentY + 5.5);
    this.doc.setFont("courier", "bold");
    this.doc.text(this.caseNumber, this.margin + 36, this.currentY + 10.5);
    this.doc.setFont("helvetica", "normal");
    this.doc.text(this.generatedAt, this.pageWidth / 2 + 42, this.currentY + 5.5);
    this.doc.setFont("courier", "bold");
    this.doc.text("LEVEL III - ADMIN ONLY", this.pageWidth / 2 + 42, this.currentY + 10.5);

    this.currentY += 21;

    // Drawing Main Document Title Block
    this.doc.setFillColor(24, 24, 27); // zinc-900
    this.doc.rect(this.margin, this.currentY, this.contentWidth, 12, "F");

    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(10.5);
    this.doc.setTextColor(255, 255, 255);
    this.doc.text(this.docTitle.toUpperCase(), this.pageWidth / 2, this.currentY + 7.5, { align: "center" });

    this.currentY += 19;
  }

  public drawSectionHeader(title: string) {
    this.ensureSpace(12);
    
    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(9.5);
    this.doc.setTextColor(24, 24, 27);
    this.doc.text(title.toUpperCase(), this.margin, this.currentY);
    this.currentY += 3;

    // Draw section separator
    this.doc.setDrawColor(24, 24, 27);
    this.doc.setLineWidth(0.4);
    this.doc.line(this.margin, this.currentY, this.pageWidth - this.margin, this.currentY);
    this.currentY += 5;
  }

  public drawTextSection(text: string) {
    this.doc.setFont("helvetica", "normal");
    this.doc.setFontSize(9);
    this.doc.setTextColor(63, 63, 70); // zinc-700
    
    const splitText = this.doc.splitTextToSize(text, this.contentWidth);
    const textHeight = splitText.length * 4.5;
    
    this.ensureSpace(textHeight + 5);
    this.doc.text(splitText, this.margin, this.currentY);
    this.currentY += textHeight + 6;
  }

  public drawItalicBlock(text: string) {
    this.ensureSpace(18);

    this.doc.setFillColor(250, 250, 250); // zinc-50
    this.doc.setDrawColor(212, 212, 216); // zinc-300
    this.doc.setLineWidth(0.4);

    const splitText = this.doc.splitTextToSize(`"${text}"`, this.contentWidth - 10);
    const textHeight = splitText.length * 4.5;
    
    this.ensureSpace(textHeight + 8);

    // Left border indicator for block quotes
    this.doc.rect(this.margin, this.currentY, this.contentWidth, textHeight + 6, "F");
    this.doc.line(this.margin, this.currentY, this.margin, this.currentY + textHeight + 6);

    this.doc.setFont("helvetica", "oblique");
    this.doc.setFontSize(9);
    this.doc.setTextColor(82, 82, 91); // zinc-600
    this.doc.text(splitText, this.margin + 5, this.currentY + 5);

    this.currentY += textHeight + 11;
  }

  public drawBulletList(bullets: string[]) {
    bullets.forEach((bullet) => {
      this.doc.setFont("helvetica", "normal");
      this.doc.setFontSize(9);
      this.doc.setTextColor(63, 63, 70);

      const splitText = this.doc.splitTextToSize(`• ${bullet}`, this.contentWidth - 4);
      const textHeight = splitText.length * 4.5;

      this.ensureSpace(textHeight + 2);
      this.doc.text(splitText, this.margin + 2, this.currentY);
      this.currentY += textHeight + 2.5;
    });
    this.currentY += 4;
  }

  public drawBadgeGrid(badges: string[]) {
    this.ensureSpace(12);

    let startX = this.margin;
    let maxRowHeight = 6;

    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(8);

    badges.forEach((badge) => {
      const textWidth = this.doc.getTextWidth(badge);
      const badgeWidth = textWidth + 6; // padding

      if (startX + badgeWidth > this.pageWidth - this.margin) {
        // wrap row
        this.currentY += maxRowHeight + 2;
        startX = this.margin;
        this.ensureSpace(maxRowHeight + 2);
      }

      this.doc.setFillColor(244, 244, 245);
      this.doc.setDrawColor(228, 228, 231);
      this.doc.setLineWidth(0.15);
      this.doc.rect(startX, this.currentY, badgeWidth, maxRowHeight, "FD");

      this.doc.setTextColor(39, 39, 42);
      this.doc.text(badge, startX + 3, this.currentY + 4.2);

      startX += badgeWidth + 2.5;
    });

    this.currentY += maxRowHeight + 8;
  }

  public drawMetadataBox(obj: Record<string, any>) {
    const keys = Object.keys(obj);
    if (keys.length === 0) return;

    this.ensureSpace(keys.length * 6 + 10);

    const blockHeight = keys.length * 6.5 + 4;
    
    // Background box
    this.doc.setFillColor(248, 250, 252); // slate-50
    this.doc.setDrawColor(226, 232, 240); // slate-200
    this.doc.setLineWidth(0.2);
    this.doc.rect(this.margin, this.currentY, this.contentWidth, blockHeight, "FD");
    
    this.currentY += 4.5;

    Object.entries(obj).forEach(([key, val]) => {
      const label = key
        .replace(/([A-Z])/g, " $1")
        .replace(/^./, (str) => str.toUpperCase());
      const valueText = typeof val === "object" ? JSON.stringify(val) : String(val);

      this.doc.setFont("helvetica", "bold");
      this.doc.setFontSize(8.5);
      this.doc.setTextColor(24, 24, 27);
      this.doc.text(label, this.margin + 4, this.currentY);

      this.doc.setFont("helvetica", "normal");
      this.doc.setFontSize(8.5);
      this.doc.setTextColor(71, 85, 105); // slate-600
      this.doc.text(valueText, this.margin + 52, this.currentY);
      
      this.currentY += 6.5;
    });

    this.currentY += 5;
  }

  public drawLinedNarrative(text: string) {
    this.ensureSpace(40);

    this.doc.setFont("courier", "bold");
    this.doc.setFontSize(8.5);
    this.doc.setTextColor(39, 39, 42); // zinc-800

    const splitText = this.doc.splitTextToSize(text, this.contentWidth - 6);
    
    // Draw lines behind the text
    splitText.forEach((line: string) => {
      this.ensureSpace(7);
      
      // Draw red margin line
      this.doc.setDrawColor(239, 68, 68); // red-500
      this.doc.setLineWidth(0.1);
      this.doc.line(this.margin + 4, this.currentY + 1.5, this.margin + 4, this.currentY + 6.5);
      
      // Draw notebook horizontal line
      this.doc.setDrawColor(191, 219, 254); // blue-200
      this.doc.setLineWidth(0.15);
      this.doc.line(this.margin, this.currentY + 6.5, this.pageWidth - this.margin, this.currentY + 6.5);

      // Write text above line
      this.doc.text(line, this.margin + 8, this.currentY + 4.5);
      this.currentY += 6.5;
    });

    this.currentY += 6;
  }

  public drawObjectTable(columns: string[], labels: string[], data: any[]) {
    if (data.length === 0) return;

    this.ensureSpace(20);

    // Calculate column widths
    const totalCols = columns.length;
    const colWidth = this.contentWidth / totalCols;

    // Draw table header
    this.doc.setFillColor(39, 39, 42); // zinc-800
    this.doc.rect(this.margin, this.currentY, this.contentWidth, 7, "F");

    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(8.5);
    this.doc.setTextColor(255, 255, 255);

    labels.forEach((label, i) => {
      this.doc.text(label, this.margin + i * colWidth + 2, this.currentY + 4.8);
    });

    this.currentY += 7;

    // Draw rows
    data.forEach((row, rowIndex) => {
      // Find maximum row height needed based on wrapping columns
      let rowLines: string[][] = [];
      let maxLines = 1;

      columns.forEach((colKey, colIdx) => {
        const cellVal = row[colKey];
        const cellText = Array.isArray(cellVal) 
          ? cellVal.join(", ") 
          : typeof cellVal === "object" && cellVal !== null 
            ? JSON.stringify(cellVal) 
            : String(cellVal || "");
        
        const splitText = this.doc.splitTextToSize(cellText, colWidth - 4);
        rowLines.push(splitText);
        if (splitText.length > maxLines) {
          maxLines = splitText.length;
        }
      });

      const rowHeight = maxLines * 4.5 + 2.5;
      this.ensureSpace(rowHeight);

      // Draw cell backgrounds (zebra striping)
      if (rowIndex % 2 === 1) {
        this.doc.setFillColor(250, 250, 250); // zinc-50
        this.doc.rect(this.margin, this.currentY, this.contentWidth, rowHeight, "F");
      }

      // Draw text for each cell
      columns.forEach((colKey, colIdx) => {
        const cellLines = rowLines[colIdx];
        this.doc.setFont("helvetica", "normal");
        this.doc.setFontSize(8);
        this.doc.setTextColor(63, 63, 70);

        cellLines.forEach((lineText, lineIdx) => {
          this.doc.text(lineText, this.margin + colIdx * colWidth + 2, this.currentY + 4 + lineIdx * 4.5);
        });

        // Vertical column separator line
        this.doc.setDrawColor(228, 228, 231);
        this.doc.setLineWidth(0.1);
        if (colIdx > 0) {
          this.doc.line(this.margin + colIdx * colWidth, this.currentY, this.margin + colIdx * colWidth, this.currentY + rowHeight);
        }
      });

      // Bottom row line
      this.doc.setDrawColor(212, 212, 216);
      this.doc.setLineWidth(0.2);
      this.doc.line(this.margin, this.currentY + rowHeight, this.pageWidth - this.margin, this.currentY + rowHeight);

      this.currentY += rowHeight;
    });

    this.currentY += 6;
  }

  public drawSignatureBlock() {
    this.ensureSpace(35);
    this.currentY += 10;

    const sigLineX = this.pageWidth - this.margin - 65;

    // Draw dashed line for signature
    this.doc.setDrawColor(113, 113, 122);
    this.doc.setLineWidth(0.25);
    this.doc.line(sigLineX, this.currentY, this.pageWidth - this.margin, this.currentY);
    
    this.currentY += 4.5;
    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(8.5);
    this.doc.setTextColor(24, 24, 27);
    this.doc.text("INVESTIGATING OFFICER / SHO", this.pageWidth - this.margin - 32.5, this.currentY, { align: "center" });

    this.currentY += 4;
    this.doc.setFont("helvetica", "normal");
    this.doc.setFontSize(7.5);
    this.doc.setTextColor(113, 113, 122);
    this.doc.text("STATE POLICE FORCE DIGITAL AUDIT KEY", this.pageWidth - this.margin - 32.5, this.currentY, { align: "center" });
  }

  public save(filename: string) {
    this.doc.save(filename);
  }
}
