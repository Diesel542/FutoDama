import PdfPrinter from "pdfmake";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import type { TDocumentDefinitions, Content, StyleDictionary, ContentText, ContentUnorderedList, ContentStack } from "pdfmake/interfaces";
import type { CvTemplateConfig, CvTemplateId } from "@shared/cvTemplates";
import { getTemplate } from "@shared/cvTemplates";
import type { TailoredResume, ExportCvRequest } from "./wordGenerator";

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
  console.error("CV PDF Generator font initialization error:", err);
  fonts = {
    Roboto: {
      normal: path.resolve(process.cwd(), "node_modules/roboto-font/fonts/Roboto/roboto-regular-webfont.ttf"),
      bold: path.resolve(process.cwd(), "node_modules/roboto-font/fonts/Roboto/roboto-bold-webfont.ttf"),
      italics: path.resolve(process.cwd(), "node_modules/roboto-font/fonts/Roboto/roboto-italic-webfont.ttf"),
      bolditalics: path.resolve(process.cwd(), "node_modules/roboto-font/fonts/Roboto/roboto-bolditalic-webfont.ttf"),
    },
  };
}

function getSkillsArray(skills: TailoredResume['skills']): string[] {
  if (!skills) return [];
  if (Array.isArray(skills)) return skills;
  
  const allSkills: string[] = [];
  if (skills.core) allSkills.push(...skills.core);
  if (skills.tools) allSkills.push(...skills.tools);
  if (skills.methodologies) allSkills.push(...skills.methodologies);
  if (skills.languages) allSkills.push(...skills.languages);
  return allSkills;
}

function createTemplateStyles(template: CvTemplateConfig): StyleDictionary {
  return {
    header: {
      fontSize: 24,
      bold: true,
      color: template.primaryColor,
      margin: [0, 0, 0, 4],
    },
    subheader: {
      fontSize: 14,
      color: template.accentColor,
      margin: [0, 0, 0, 8],
    },
    contactInfo: {
      fontSize: 10,
      color: '#666666',
      margin: [0, 0, 0, 16],
    },
    sectionTitle: {
      fontSize: 11,
      bold: true,
      color: template.primaryColor,
      margin: [0, 16, 0, 6],
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
      color: '#666666',
      italics: true,
      margin: [0, 0, 0, 4],
    },
    skillText: {
      fontSize: 10,
      margin: [0, 0, 0, 0],
    },
    educationTitle: {
      fontSize: 11,
      bold: true,
      margin: [0, 4, 0, 2],
    },
  };
}

function buildCvContent(resume: TailoredResume, template: CvTemplateConfig): Content[] {
  const content: Content[] = [];

  const displayName = (resume.meta as any)?.name || 'Candidate';
  const displayTitle = (resume.meta as any)?.title || resume.meta?.target_title || '';
  const displayLocation = (resume.meta as any)?.location || '';
  const displayEmail = (resume.meta as any)?.email || '';
  const displayPhone = (resume.meta as any)?.phone || '';

  content.push({
    text: displayName,
    style: 'header',
  } as ContentText);

  if (displayTitle) {
    content.push({
      text: displayTitle,
      style: 'subheader',
    } as ContentText);
  }

  const contactParts: string[] = [];
  if (displayLocation) contactParts.push(displayLocation);
  if (displayEmail) contactParts.push(displayEmail);
  if (displayPhone) contactParts.push(displayPhone);
  
  if (contactParts.length > 0) {
    content.push({
      text: contactParts.join(' | '),
      style: 'contactInfo',
    } as ContentText);
  }

  if (resume.summary) {
    content.push({
      stack: [
        { text: 'PROFESSIONAL SUMMARY', style: 'sectionTitle' },
        ...(template.showSectionDividers ? [{
          canvas: [{
            type: 'line',
            x1: 0,
            y1: 0,
            x2: 515,
            y2: 0,
            lineWidth: 0.5,
            lineColor: template.accentColor,
          }],
          margin: [0, 0, 0, 6],
        }] : []),
        { text: resume.summary, style: 'normal' },
      ],
      unbreakable: true,
    } as ContentStack);
  }

  const skills = getSkillsArray(resume.skills);
  if (skills.length > 0) {
    content.push({
      stack: [
        { text: 'KEY SKILLS', style: 'sectionTitle' },
        ...(template.showSectionDividers ? [{
          canvas: [{
            type: 'line',
            x1: 0,
            y1: 0,
            x2: 515,
            y2: 0,
            lineWidth: 0.5,
            lineColor: template.accentColor,
          }],
          margin: [0, 0, 0, 6],
        }] : []),
        { text: skills.join(' • '), style: 'skillText' },
      ],
      unbreakable: true,
    } as ContentStack);
  }

  if (resume.experience && resume.experience.length > 0) {
    content.push({ text: 'EXPERIENCE', style: 'sectionTitle' } as ContentText);
    
    if (template.showSectionDividers) {
      content.push({
        canvas: [{
          type: 'line',
          x1: 0,
          y1: 0,
          x2: 515,
          y2: 0,
          lineWidth: 0.5,
          lineColor: template.accentColor,
        }],
        margin: [0, 0, 0, 6],
      });
    }

    for (const exp of resume.experience) {
      const title = exp.title || '';
      const company = exp.employer || exp.company || '';
      const location = exp.location || '';
      
      let dateRange = '';
      if (exp.dates) {
        dateRange = exp.dates;
      } else if (exp.start_date) {
        dateRange = exp.is_current 
          ? `${exp.start_date} - Present`
          : `${exp.start_date}${exp.end_date ? ` - ${exp.end_date}` : ''}`;
      }

      const titleLine = company ? `${title} at ${company}` : title;

      content.push({
        stack: [
          { text: titleLine, style: 'experienceTitle' },
          { text: [dateRange, location].filter(Boolean).join(' | '), style: 'experienceDates' },
        ],
        unbreakable: true,
      } as ContentStack);

      const bullets = exp.description || exp.bullets || [];
      if (bullets.length > 0) {
        content.push({
          ul: bullets.map((bullet) => ({
            text: bullet,
            style: 'bullet',
          })),
          margin: [10, 0, 0, 8],
        } as ContentUnorderedList);
      }
    }
  }

  if (resume.education && resume.education.length > 0) {
    content.push({ text: 'EDUCATION', style: 'sectionTitle' } as ContentText);
    
    if (template.showSectionDividers) {
      content.push({
        canvas: [{
          type: 'line',
          x1: 0,
          y1: 0,
          x2: 515,
          y2: 0,
          lineWidth: 0.5,
          lineColor: template.accentColor,
        }],
        margin: [0, 0, 0, 6],
      });
    }

    for (const edu of resume.education) {
      const degreeLine = edu.institution 
        ? `${edu.degree} - ${edu.institution}`
        : edu.degree || '';
      
      content.push({
        columns: [
          { text: degreeLine, style: 'educationTitle', width: '*' },
          edu.year ? { text: edu.year, style: 'experienceDates', width: 'auto', alignment: 'right' } : { text: '' },
        ],
      });
      
      if (edu.details) {
        content.push({
          text: edu.details,
          style: 'normal',
          margin: [0, 0, 0, 4],
        } as ContentText);
      }
    }
  }

  if (resume.certifications && resume.certifications.length > 0) {
    content.push({ text: 'CERTIFICATIONS', style: 'sectionTitle' } as ContentText);
    
    if (template.showSectionDividers) {
      content.push({
        canvas: [{
          type: 'line',
          x1: 0,
          y1: 0,
          x2: 515,
          y2: 0,
          lineWidth: 0.5,
          lineColor: template.accentColor,
        }],
        margin: [0, 0, 0, 6],
      });
    }

    content.push({
      ul: resume.certifications.map((cert) => ({
        text: cert,
        style: 'bullet',
      })),
      margin: [10, 0, 0, 4],
    } as ContentUnorderedList);
  }

  if (resume.extras && resume.extras.length > 0) {
    content.push({ text: 'ADDITIONAL INFORMATION', style: 'sectionTitle' } as ContentText);
    
    if (template.showSectionDividers) {
      content.push({
        canvas: [{
          type: 'line',
          x1: 0,
          y1: 0,
          x2: 515,
          y2: 0,
          lineWidth: 0.5,
          lineColor: template.accentColor,
        }],
        margin: [0, 0, 0, 6],
      });
    }

    content.push({
      ul: resume.extras.map((extra) => ({
        text: extra,
        style: 'bullet',
      })),
      margin: [10, 0, 0, 4],
    } as ContentUnorderedList);
  }

  return content;
}

export async function generateCvPdf(request: ExportCvRequest): Promise<Buffer> {
  const { resume, templateId } = request;
  const template = getTemplate(templateId);
  
  const styles = createTemplateStyles(template);
  const content = buildCvContent(resume, template);

  const docDefinition: TDocumentDefinitions = {
    content,
    styles,
    defaultStyle: {
      font: 'Roboto',
    },
    pageMargins: [40, 40, 40, 40],
  };

  const printer = new PdfPrinter(fonts);
  const pdfDoc = printer.createPdfKitDocument(docDefinition);

  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Uint8Array[] = [];
    pdfDoc.on('data', (chunk: Uint8Array) => chunks.push(chunk));
    pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
    pdfDoc.on('error', (err: Error) => reject(err));
    pdfDoc.end();
  });
}
