import PdfPrinter from "pdfmake";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import type { TDocumentDefinitions, Content, StyleDictionary, ContentText, ContentUnorderedList, ContentStack } from "pdfmake/interfaces";
import type { TailoredResumeBundle } from "./tailorResume";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getFontPaths() {
  const possiblePaths = [
    path.resolve(process.cwd(), "node_modules/roboto-font/fonts/Roboto"),
    path.resolve(__dirname, "../../node_modules/roboto-font/fonts/Roboto"),
    path.resolve("/home/runner/workspace/node_modules/roboto-font/fonts/Roboto"),
  ];
  
  for (const fontsDir of possiblePaths) {
    const regularFont = path.join(fontsDir, "roboto-regular-webfont.ttf");
    if (fs.existsSync(regularFont)) {
      return {
        Roboto: {
          normal: path.join(fontsDir, "roboto-regular-webfont.ttf"),
          bold: path.join(fontsDir, "roboto-bold-webfont.ttf"),
          italics: path.join(fontsDir, "roboto-italic-webfont.ttf"),
          bolditalics: path.join(fontsDir, "roboto-bolditalic-webfont.ttf"),
        },
      };
    }
  }
  
  throw new Error("Font files not found. Please ensure roboto-font package is installed.");
}

let fonts: ReturnType<typeof getFontPaths>;
try {
  fonts = getFontPaths();
} catch (err) {
  console.error("PDF Generator font initialization error:", err);
  fonts = {
    Roboto: {
      normal: path.resolve(process.cwd(), "node_modules/roboto-font/fonts/Roboto/roboto-regular-webfont.ttf"),
      bold: path.resolve(process.cwd(), "node_modules/roboto-font/fonts/Roboto/roboto-bold-webfont.ttf"),
      italics: path.resolve(process.cwd(), "node_modules/roboto-font/fonts/Roboto/roboto-italic-webfont.ttf"),
      bolditalics: path.resolve(process.cwd(), "node_modules/roboto-font/fonts/Roboto/roboto-bolditalic-webfont.ttf"),
    },
  };
}

const styles: StyleDictionary = {
  header: {
    fontSize: 18,
    bold: true,
    margin: [0, 0, 0, 8],
  },
  subheader: {
    fontSize: 12,
    color: "#666666",
    margin: [0, 0, 0, 12],
  },
  sectionTitle: {
    fontSize: 12,
    bold: true,
    margin: [0, 16, 0, 6],
    color: "#333333",
  },
  normal: {
    fontSize: 10,
    margin: [0, 2, 0, 2],
    lineHeight: 1.3,
  },
  bullet: {
    fontSize: 10,
    margin: [0, 1, 0, 1],
    lineHeight: 1.25,
  },
  experienceTitle: {
    fontSize: 11,
    bold: true,
    margin: [0, 8, 0, 2],
  },
  experienceDates: {
    fontSize: 9,
    color: "#666666",
    margin: [0, 0, 0, 4],
  },
  skillBadge: {
    fontSize: 9,
    margin: [0, 0, 4, 0],
  },
  coverLetterBody: {
    fontSize: 11,
    lineHeight: 1.5,
    margin: [0, 4, 0, 4],
  },
  atsSection: {
    fontSize: 10,
    margin: [0, 2, 0, 2],
  },
  atsKeyword: {
    fontSize: 9,
    color: "#007700",
  },
  atsMissing: {
    fontSize: 9,
    color: "#cc0000",
  },
  atsWarning: {
    fontSize: 9,
    color: "#cc6600",
  },
};

export type ExportType = "resume" | "cover" | "ats";

export interface ExportPdfInput {
  type: ExportType;
  candidateName: string;
  jobTitle: string;
  bundle: TailoredResumeBundle;
}

function addSectionWithWidowProtection(content: Content[], title: string, firstContent: Content): void {
  content.push({
    stack: [
      { text: title, style: "sectionTitle" },
      firstContent,
    ],
    unbreakable: true,
  } as ContentStack);
}

function buildResumeContent(bundle: TailoredResumeBundle, candidateName: string): Content[] {
  const content: Content[] = [];
  const resume = bundle.tailored_resume;

  if (!resume) {
    content.push({ text: "No resume content available.", style: "normal" } as ContentText);
    return content;
  }

  content.push({
    text: resume.meta?.target_title 
      ? `${candidateName} — ${resume.meta.target_title}`
      : candidateName,
    style: "header",
  } as ContentText);

  if (resume.meta?.target_company) {
    content.push({
      text: `Target: ${resume.meta.target_company}`,
      style: "subheader",
    } as ContentText);
  }

  if (resume.summary) {
    addSectionWithWidowProtection(content, "PROFESSIONAL SUMMARY", { text: resume.summary, style: "normal" } as ContentText);
  }

  const allSkills: string[] = [];
  if (resume.skills) {
    if (resume.skills.core) allSkills.push(...resume.skills.core);
    if (resume.skills.tools) allSkills.push(...resume.skills.tools);
    if (resume.skills.methodologies) allSkills.push(...resume.skills.methodologies);
    if (resume.skills.languages) allSkills.push(...resume.skills.languages);
  }

  if (allSkills.length > 0) {
    addSectionWithWidowProtection(content, "SKILLS", { text: allSkills.join(" • "), style: "normal" } as ContentText);
  }

  if (resume.experience && resume.experience.length > 0) {
    const firstExp = resume.experience[0];
    const firstTitleLine = `${firstExp.title || ""} — ${firstExp.employer || ""}`;
    const firstLocation = firstExp.location ? ` | ${firstExp.location}` : "";
    const firstDateRange = firstExp.is_current 
      ? `${firstExp.start_date || ""} – Present${firstLocation}`
      : `${firstExp.start_date || ""} – ${firstExp.end_date || ""}${firstLocation}`;
    
    content.push({
      stack: [
        { text: "EXPERIENCE", style: "sectionTitle" },
        { text: firstTitleLine, style: "experienceTitle" },
        { text: firstDateRange, style: "experienceDates" },
      ],
      unbreakable: true,
    } as ContentStack);

    if (firstExp.description && firstExp.description.length > 0) {
      content.push({
        ul: firstExp.description.map((bullet) => ({
          text: bullet,
          style: "bullet",
        })),
        margin: [10, 0, 0, 8],
      } as ContentUnorderedList);
    }

    for (let i = 1; i < resume.experience.length; i++) {
      const exp = resume.experience[i];
      const titleLine = `${exp.title || ""} — ${exp.employer || ""}`;
      const location = exp.location ? ` | ${exp.location}` : "";
      const dateRange = exp.is_current 
        ? `${exp.start_date || ""} – Present${location}`
        : `${exp.start_date || ""} – ${exp.end_date || ""}${location}`;

      content.push({
        stack: [
          { text: titleLine, style: "experienceTitle" },
          { text: dateRange, style: "experienceDates" },
        ],
        unbreakable: true,
      } as ContentStack);

      if (exp.description && exp.description.length > 0) {
        content.push({
          ul: exp.description.map((bullet) => ({
            text: bullet,
            style: "bullet",
          })),
          margin: [10, 0, 0, 8],
        } as ContentUnorderedList);
      }
    }
  }

  if (resume.education && resume.education.length > 0) {
    const firstEdu = resume.education[0];
    const firstEduLine = firstEdu.year 
      ? `${firstEdu.degree || ""} — ${firstEdu.institution || ""} (${firstEdu.year})`
      : `${firstEdu.degree || ""} — ${firstEdu.institution || ""}`;
    
    content.push({
      stack: [
        { text: "EDUCATION", style: "sectionTitle" },
        { text: firstEduLine, style: "normal" },
        ...(firstEdu.details ? [{ text: firstEdu.details, style: "bullet", margin: [10, 0, 0, 4] }] : []),
      ],
      unbreakable: true,
    } as ContentStack);

    for (let i = 1; i < resume.education.length; i++) {
      const edu = resume.education[i];
      const eduLine = edu.year 
        ? `${edu.degree || ""} — ${edu.institution || ""} (${edu.year})`
        : `${edu.degree || ""} — ${edu.institution || ""}`;
      
      content.push({ text: eduLine, style: "normal" } as ContentText);
      
      if (edu.details) {
        content.push({ text: edu.details, style: "bullet", margin: [10, 0, 0, 4] } as ContentText);
      }
    }
  }

  if (resume.certifications && resume.certifications.length > 0) {
    addSectionWithWidowProtection(content, "CERTIFICATIONS", {
      ul: resume.certifications.map((cert) => ({
        text: cert,
        style: "bullet",
      })),
      margin: [10, 0, 0, 0],
    } as ContentUnorderedList);
  }

  if (resume.extras && resume.extras.length > 0) {
    addSectionWithWidowProtection(content, "ADDITIONAL", {
      ul: resume.extras.map((extra) => ({
        text: extra,
        style: "bullet",
      })),
      margin: [10, 0, 0, 0],
    } as ContentUnorderedList);
  }

  return content;
}

function buildCoverLetterContent(bundle: TailoredResumeBundle, candidateName: string, jobTitle: string): Content[] {
  const content: Content[] = [];
  const coverLetter = bundle.cover_letter;

  if (!coverLetter) {
    content.push({ text: "No cover letter generated.", style: "normal" } as ContentText);
    return content;
  }

  content.push({
    text: `Cover Letter — ${candidateName}`,
    style: "header",
  } as ContentText);

  content.push({
    text: `For: ${jobTitle}`,
    style: "subheader",
  } as ContentText);

  const paragraphs = coverLetter.content.split("\n\n").filter((p) => p.trim());
  for (const para of paragraphs) {
    content.push({
      text: para.trim(),
      style: "coverLetterBody",
    } as ContentText);
  }

  if (coverLetter.meta) {
    content.push({
      text: `\n\nMeta: ${coverLetter.meta.word_count} words | Tone: ${coverLetter.meta.tone} | Voice: ${coverLetter.meta.voice}`,
      style: "experienceDates",
      margin: [0, 20, 0, 0],
    } as ContentText);
  }

  return content;
}

function buildAtsReportContent(bundle: TailoredResumeBundle, candidateName: string, jobTitle: string): Content[] {
  const content: Content[] = [];
  const atsReport = bundle.ats_report;

  content.push({
    text: `ATS Compatibility Report — ${candidateName}`,
    style: "header",
  } as ContentText);

  content.push({
    text: `For: ${jobTitle}`,
    style: "subheader",
  } as ContentText);

  if (bundle.coverage && typeof bundle.coverage.coverage_score === "number") {
    const score = bundle.coverage.coverage_score;
    content.push({
      text: `Overall Coverage Score: ${Math.round(score * 100)}%`,
      style: "sectionTitle",
      color: score >= 0.7 ? "#007700" : score >= 0.5 ? "#cc6600" : "#cc0000",
    } as ContentText);
  }

  if (atsReport?.keyword_coverage && atsReport.keyword_coverage.length > 0) {
    content.push({ text: "KEYWORDS FOUND", style: "sectionTitle" } as ContentText);
    content.push({
      ul: atsReport.keyword_coverage.map((kw) => ({
        text: kw,
        style: "atsKeyword",
      })),
      margin: [10, 0, 0, 8],
    } as ContentUnorderedList);
  }

  if (atsReport?.missing_keywords && atsReport.missing_keywords.length > 0) {
    content.push({ text: "MISSING KEYWORDS", style: "sectionTitle" } as ContentText);
    content.push({
      ul: atsReport.missing_keywords.map((kw) => ({
        text: kw,
        style: "atsMissing",
      })),
      margin: [10, 0, 0, 8],
    } as ContentUnorderedList);
  }

  if (atsReport?.format_warnings && atsReport.format_warnings.length > 0) {
    content.push({ text: "FORMAT WARNINGS", style: "sectionTitle" } as ContentText);
    content.push({
      ul: atsReport.format_warnings.map((warning) => ({
        text: warning,
        style: "atsWarning",
      })),
      margin: [10, 0, 0, 8],
    } as ContentUnorderedList);
  }

  if (bundle.coverage && bundle.coverage.matrix && bundle.coverage.matrix.length > 0) {
    content.push({ text: "COVERAGE MATRIX", style: "sectionTitle" } as ContentText);
    
    for (const item of bundle.coverage.matrix.slice(0, 15)) {
      const confidenceColor = item.confidence >= 0.8 ? "#007700" : item.confidence >= 0.5 ? "#cc6600" : "#cc0000";
      content.push({
        stack: [
          { text: `• ${item.jd_item}`, style: "atsSection", bold: true },
          { text: `  Evidence: ${item.resume_evidence}`, style: "atsSection" },
          { text: `  Confidence: ${Math.round(item.confidence * 100)}%`, style: "atsSection", color: confidenceColor },
        ],
        margin: [0, 4, 0, 4],
      } as ContentStack);
    }
  }

  if (bundle.warnings && bundle.warnings.length > 0) {
    content.push({ text: "WARNINGS", style: "sectionTitle" } as ContentText);
    content.push({
      ul: bundle.warnings.map((w) => ({
        text: typeof w === "string" ? w : w.message,
        style: "atsWarning",
      })),
      margin: [10, 0, 0, 0],
    } as ContentUnorderedList);
  }

  return content;
}

export async function generatePdf(input: ExportPdfInput): Promise<Buffer> {
  const { type, candidateName, jobTitle, bundle } = input;

  let contentBlocks: Content[];

  switch (type) {
    case "resume":
      contentBlocks = buildResumeContent(bundle, candidateName);
      break;
    case "cover":
      contentBlocks = buildCoverLetterContent(bundle, candidateName, jobTitle);
      break;
    case "ats":
      contentBlocks = buildAtsReportContent(bundle, candidateName, jobTitle);
      break;
    default:
      contentBlocks = [{ text: "Unknown export type", style: "normal" }];
  }

  const docDefinition: TDocumentDefinitions = {
    pageSize: "A4",
    pageMargins: [40, 50, 40, 50],
    content: contentBlocks,
    styles,
    defaultStyle: {
      font: "Roboto",
      fontSize: 10,
    },
    info: {
      title: `${candidateName}_${jobTitle}_${type}`,
      author: "FUTODAMA Resume Tailor",
      subject: type === "resume" ? "Tailored Resume" : type === "cover" ? "Cover Letter" : "ATS Report",
    },
  };

  const printer = new PdfPrinter(fonts);
  const pdfDoc = printer.createPdfKitDocument(docDefinition);

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    
    pdfDoc.on("data", (chunk: Buffer) => {
      chunks.push(chunk);
    });
    
    pdfDoc.on("end", () => {
      resolve(Buffer.concat(chunks));
    });
    
    pdfDoc.on("error", (err: Error) => {
      reject(err);
    });
    
    pdfDoc.end();
  });
}

export function buildExportFilename(candidateName: string, jobTitle: string, type: ExportType): string {
  const safeName = candidateName.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_æøåÆØÅ-]/g, "");
  const safeJob = jobTitle.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_æøåÆØÅ-]/g, "");
  return `${safeName}_${safeJob}_${type}.pdf`;
}
