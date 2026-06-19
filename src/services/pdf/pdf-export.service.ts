import { DocumentType, DocumentTemplateRegistry } from "./pdf-template-registry";
import { PDFTemplateRenderer } from "./pdf-template-renderer";
import { PDFBuilder } from "./pdf-builder";

export class PDFExportService {
  /**
   * Orchestrates the document template extraction, rendering, and download execution.
   */
  public static export(
    title: string,
    type: any,
    content: any,
    version: number,
    createdAt: string,
    caseNumber: string,
    caseTitle: string
  ) {
    console.log(`📄 [PDFExportService] Initiating template rendering for ${type}...`);
    
    // 1. Fetch template config from registry
    const templateConfig = DocumentTemplateRegistry.getTemplate(type);

    // 2. Initialize low-level PDFBuilder
    const builder = new PDFBuilder();
    builder.initialize(
      title || templateConfig.title,
      templateConfig.subTitle,
      templateConfig.stampText,
      caseNumber || "PENDING",
      caseTitle || "Case File",
      createdAt
    );

    // 3. Render contents onto PDFBuilder
    const renderer = new PDFTemplateRenderer();
    renderer.render(builder, templateConfig, content);

    // 4. Trigger download
    const safeCaseNo = caseNumber || "pending";
    const cleanCaseNo = safeCaseNo.toLowerCase().replace(/[^a-z0-9]+/g, "_");
    const filename = `${type.toLowerCase()}_v${version}_ref_${cleanCaseNo}.pdf`;
    
    builder.save(filename);
    console.log(`📄 [PDFExportService] PDF exported successfully as ${filename}`);
  }
}
