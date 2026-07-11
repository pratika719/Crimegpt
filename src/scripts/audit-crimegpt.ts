import fs from "node:fs";
import path from "node:path";

type FindingSeverity = "info" | "warning" | "critical";

type Finding = {
  severity: FindingSeverity;
  file: string;
  rule: string;
  message: string;
};

const ROOT_DIR = process.cwd();

const SOURCE_DIRS = ["src", "app", "prisma"];

const ignoredDirs = new Set([
  "node_modules",
  ".next",
  ".git",
  "dist",
  "build",
  "coverage",
  ".turbo",
]);

const allowedExtensions = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".prisma",
  ".md",
]);

function walk(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  const files: string[] = [];

  for (const entry of entries) {
    if (ignoredDirs.has(entry.name)) continue;

    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...walk(fullPath));
      continue;
    }

    if (!allowedExtensions.has(path.extname(entry.name))) continue;

    files.push(fullPath);
  }

  return files;
}

function readFile(filePath: string): string {
  return fs.readFileSync(filePath, "utf8");
}

function toRelative(filePath: string): string {
  return path.relative(ROOT_DIR, filePath).replaceAll("\\", "/");
}

function hasAny(content: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(content));
}

function auditFile(filePath: string): Finding[] {
  const file = toRelative(filePath);
  if (
    file.includes("src/scripts/") ||
    file.includes("scripts/") ||
    file.includes("app/api/health/route.ts") ||
    file.includes("src/app/api/health/route.ts")
  ) {
    return [];
  }

  const content = readFile(filePath);
  const findings: Finding[] = [];

  const isServerAction =
    file.includes("src/actions/") ||
    file.includes("app/actions/") ||
    content.includes('"use server"') ||
    content.includes("'use server'");

  const isService = file.includes("src/services/");
  const isRepository = file.includes("src/repositories/");
  const isReactSurface =
    file.includes("src/app/") ||
    file.includes("app/") ||
    file.includes("src/components/");

  const importsPrisma = hasAny(content, [
    /from\s+["']@\/lib\/prisma["']/,
    /from\s+["'](?!@\/generated\/prisma\/client).*prisma.*["']/,
    /new\s+PrismaClient\s*\(/,
    /\bprisma\./,
  ]);

  const importsGemini = hasAny(content, [
    /@google\/generative-ai/,
    /GoogleGenerativeAI/,
    /gemini/i,
    /generateContent/,
  ]);

  const importsLangChain = hasAny(content, [
    /langchain/i,
    /@langchain\//,
  ]);

  const importsRedis = hasAny(content, [
    /from\s+["']redis["']/,
    /ioredis/,
    /createClient\s*\(/,
  ]);

  const hasSilentCatch = /catch\s*\([^)]*\)\s*{\s*}/s.test(content);

  const catchesWithoutThrowOrReturn = /catch\s*\([^)]*\)\s*{(?![^}]*throw)(?![^}]*return)[^}]*}/s.test(
    content,
  );

  const hasConsoleLog = /\bconsole\.(log|error|warn|debug)\s*\(/.test(content);

  const hasAnyZod = /z\./.test(content) || /from\s+["']zod["']/.test(content);

  const likelyMutationAction =
    isServerAction &&
    /\b(create|update|delete|generate|upload|submit|save|remove|analyze)\w*\s*\(/i.test(
      content,
    );

  if (isReactSurface && importsPrisma) {
    findings.push({
      severity: "critical",
      file,
      rule: "NO_PRISMA_IN_UI",
      message: "React/App surface should not access Prisma directly.",
    });
  }

  if (isServerAction && importsPrisma) {
    findings.push({
      severity: "critical",
      file,
      rule: "NO_PRISMA_IN_ACTIONS",
      message: "Server Actions should call services, not Prisma directly.",
    });
  }

  if (isServerAction && importsGemini) {
    findings.push({
      severity: "critical",
      file,
      rule: "NO_AI_PROVIDER_IN_ACTIONS",
      message: "Server Actions should not call Gemini directly.",
    });
  }

  if (isServerAction && importsLangChain) {
    findings.push({
      severity: "warning",
      file,
      rule: "NO_LANGCHAIN_IN_ACTIONS",
      message: "Server Actions should not contain retrieval or chain orchestration.",
    });
  }

  if (isRepository && importsGemini) {
    findings.push({
      severity: "critical",
      file,
      rule: "NO_AI_IN_REPOSITORIES",
      message: "Repositories must not contain AI provider logic.",
    });
  }

  if (isRepository && importsRedis) {
    findings.push({
      severity: "warning",
      file,
      rule: "NO_CACHE_IN_REPOSITORIES",
      message: "Repositories should stay persistence-only. Cache belongs in services/infrastructure.",
    });
  }

  if (isService && /from\s+["']next\/headers["']/.test(content)) {
    findings.push({
      severity: "warning",
      file,
      rule: "SERVICE_IMPORTS_NEXT_HEADERS",
      message: "Service layer should avoid direct request/cookie coupling.",
    });
  }

  if (hasSilentCatch) {
    findings.push({
      severity: "critical",
      file,
      rule: "SILENT_CATCH",
      message: "Empty catch block hides production failures.",
    });
  }

  if (catchesWithoutThrowOrReturn) {
    findings.push({
      severity: "warning",
      file,
      rule: "WEAK_CATCH",
      message: "Catch block may swallow errors without returning or throwing.",
    });
  }

  if (hasConsoleLog) {
    findings.push({
      severity: "warning",
      file,
      rule: "CONSOLE_LOGGING",
      message: "Use structured logging instead of console statements.",
    });
  }

  if (likelyMutationAction && !hasAnyZod) {
    findings.push({
      severity: "critical",
      file,
      rule: "ACTION_WITHOUT_ZOD",
      message: "Mutation Server Action appears to lack Zod validation.",
    });
  }

  if (
    importsGemini &&
    !/timeout|AbortController|signal/i.test(content)
  ) {
    findings.push({
      severity: "warning",
      file,
      rule: "AI_WITHOUT_TIMEOUT",
      message: "AI call appears to lack timeout/cancellation handling.",
    });
  }

  if (
    importsGemini &&
    !/try\s*{[\s\S]*catch\s*\(/.test(content)
  ) {
    findings.push({
      severity: "warning",
      file,
      rule: "AI_WITHOUT_ERROR_BOUNDARY",
      message: "AI provider call appears to lack explicit error handling.",
    });
  }

  return findings;
}

function groupBySeverity(findings: Finding[]) {
  return findings.reduce<Record<FindingSeverity, Finding[]>>(
    (acc, finding) => {
      acc[finding.severity].push(finding);
      return acc;
    },
    {
      info: [],
      warning: [],
      critical: [],
    },
  );
}

function renderMarkdown(findings: Finding[]): string {
  const grouped = groupBySeverity(findings);

  const rows = findings
    .map(
      (finding) =>
        `| ${finding.severity} | \`${finding.file}\` | ${finding.rule} | ${finding.message} |`,
    )
    .join("\n");

  return `# CrimeGPT v2 Automated Audit

Generated at: ${new Date().toISOString()}

## Summary

| Severity | Count |
|---|---:|
| Critical | ${grouped.critical.length} |
| Warning | ${grouped.warning.length} |
| Info | ${grouped.info.length} |

## Findings

| Severity | File | Rule | Message |
|---|---|---|---|
${rows || "| info | `none` | NO_FINDINGS | No findings detected by static audit. |"}

## Notes

This audit is static and heuristic-based.

Manual review is still required for:

- authorization correctness
- case ownership checks
- prompt quality
- retrieval quality
- database indexing
- deployment readiness
`;
}

function main() {
  const sourceFiles = SOURCE_DIRS.flatMap((dir) => walk(path.join(ROOT_DIR, dir)));

  const findings = sourceFiles.flatMap(auditFile);

  const outputDir = path.join(ROOT_DIR, "docs", "audit");
  fs.mkdirSync(outputDir, { recursive: true });

  const outputPath = path.join(outputDir, "phase-0-auto-audit.md");
  fs.writeFileSync(outputPath, renderMarkdown(findings), "utf8");

  const criticalCount = findings.filter(
    (finding) => finding.severity === "critical",
  ).length;

  console.log(`Scanned files: ${sourceFiles.length}`);
  console.log(`Findings: ${findings.length}`);
  console.log(`Critical: ${criticalCount}`);
  console.log(`Report: ${toRelative(outputPath)}`);

  if (criticalCount > 0) {
    process.exitCode = 1;
  }
}

main();