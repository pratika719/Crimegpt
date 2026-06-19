import { PDFBuilder } from "./pdf-builder";
import { DocumentTemplateConfig } from "./pdf-template-registry";

export class PDFTemplateRenderer {
  /**
   * Renders a structured document content onto the PDFBuilder layout primitives dynamically.
   */
  public render(builder: PDFBuilder, config: DocumentTemplateConfig, content: any) {
    // 1. Draw the top branding page headers
    builder.drawMainHeader();

    // 2. Loop and render each template element dynamically
    config.elements.forEach((el) => {
      const value = content[el.key];
      if (value === undefined || value === null) return;

      switch (el.type) {
        case "METADATA_BOX":
          if (typeof value === "object") {
            builder.drawSectionHeader(el.title);
            builder.drawMetadataBox(value);
          }
          break;
        case "TEXT_SECTION":
          if (typeof value === "string") {
            builder.drawSectionHeader(el.title);
            builder.drawTextSection(value);
          } else if (typeof value === "object") {
            builder.drawSectionHeader(el.title);
            builder.drawTextSection(JSON.stringify(value));
          }
          break;
        case "LINED_NARRATIVE":
          if (typeof value === "string") {
            builder.drawSectionHeader(el.title);
            builder.drawLinedNarrative(value);
          }
          break;
        case "BADGE_GRID":
          if (Array.isArray(value)) {
            builder.drawSectionHeader(el.title);
            builder.drawBadgeGrid(value);
          }
          break;
        case "BULLET_LIST":
          if (Array.isArray(value)) {
            builder.drawSectionHeader(el.title);
            builder.drawBulletList(value);
          }
          break;
        case "ITALIC_BLOCK":
          if (typeof value === "string") {
            builder.drawSectionHeader(el.title);
            builder.drawItalicBlock(value);
          }
          break;
        case "OBJECT_TABLE":
          if (Array.isArray(value)) {
            builder.drawSectionHeader(el.title);
            builder.drawObjectTable(
              el.columns || [], 
              el.columnLabels || [], 
              value
            );
          }
          break;
        default:
          console.warn(`[PDFTemplateRenderer] Unknown element type: ${el.type}`);
      }
    });

    // 3. Draw final investigator signature blocks
    builder.drawSignatureBlock();
  }
}
