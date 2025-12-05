import {
  Document,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  Packer,
  Header,
  ImageRun,
} from "docx";
import type { CvTemplateConfig, CvTemplateId } from "@shared/cvTemplates";
import { getTemplate } from "@shared/cvTemplates";
import { splitSummaryIntoParagraphs } from "../utils/textFormatting";

export interface TailoredResume {
  meta?: {
    name?: string;
    title?: string;
    target_title?: string;
    target_company?: string;
    language?: string;
    style?: string;
    location?: string;
    email?: string;
    phone?: string;
  };
  summary?: string;
  skills?: string[] | {
    core?: string[];
    tools?: string[];
    methodologies?: string[];
    languages?: string[];
  };
  experience?: Array<{
    company?: string;
    employer?: string;
    title?: string;
    dates?: string;
    start_date?: string;
    end_date?: string;
    is_current?: boolean;
    location?: string;
    bullets?: string[];
    description?: string[];
  }>;
  education?: Array<{
    institution?: string;
    degree?: string;
    year?: string;
    details?: string;
  }>;
  certifications?: string[];
  extras?: string[];
}

export interface ExportCvRequest {
  resume: TailoredResume;
  templateId: CvTemplateId;
  logoUrl?: string;
  format: 'pdf' | 'docx';
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

function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? hex.replace('#', '') : '000000';
}

export async function generateWordDocument(request: ExportCvRequest): Promise<Buffer> {
  const { resume, templateId, logoUrl } = request;
  const template = getTemplate(templateId);
  
  const primaryColorHex = hexToRgb(template.primaryColor);
  const accentColorHex = hexToRgb(template.accentColor);
  
  const sections: Paragraph[] = [];

  const displayName = resume.meta?.name || 'Candidate';
  const displayTitle = resume.meta?.title || resume.meta?.target_title || '';
  const displayLocation = resume.meta?.location || '';
  const displayEmail = resume.meta?.email || '';
  const displayPhone = resume.meta?.phone || '';
  
  sections.push(
    new Paragraph({
      children: [
        new TextRun({
          text: displayName,
          bold: true,
          size: 48,
          color: primaryColorHex,
        }),
      ],
      alignment: AlignmentType.LEFT,
      spacing: { after: 100 },
    })
  );

  if (displayTitle) {
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: displayTitle,
            size: 28,
            color: accentColorHex,
          }),
        ],
        spacing: { after: 100 },
      })
    );
  }

  const contactParts: string[] = [];
  if (displayLocation) contactParts.push(displayLocation);
  if (displayEmail) contactParts.push(displayEmail);
  if (displayPhone) contactParts.push(displayPhone);
  
  if (contactParts.length > 0) {
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: contactParts.join(' | '),
            size: 20,
            color: '666666',
          }),
        ],
        spacing: { after: 300 },
      })
    );
  }

  if (resume.summary) {
    sections.push(createSectionHeading('PROFESSIONAL SUMMARY', primaryColorHex, template.showSectionDividers));
    const summaryParagraphs = splitSummaryIntoParagraphs(resume.summary);
    summaryParagraphs.forEach((para, idx) => {
      sections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: para,
              size: 22,
            }),
          ],
          spacing: { after: idx < summaryParagraphs.length - 1 ? 120 : 200 },
        })
      );
    });
  }

  const skills = getSkillsArray(resume.skills);
  if (skills.length > 0) {
    sections.push(createSectionHeading('KEY SKILLS', primaryColorHex, template.showSectionDividers));
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: skills.join(' • '),
            size: 22,
          }),
        ],
        spacing: { after: 200 },
      })
    );
  }

  if (resume.experience && resume.experience.length > 0) {
    sections.push(createSectionHeading('EXPERIENCE', primaryColorHex, template.showSectionDividers));
    
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
      
      sections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: title,
              bold: true,
              size: 24,
            }),
            new TextRun({
              text: company ? ` at ${company}` : '',
              size: 24,
            }),
          ],
          spacing: { before: 150, after: 50 },
        })
      );
      
      if (dateRange || location) {
        sections.push(
          new Paragraph({
            children: [
              new TextRun({
                text: [dateRange, location].filter(Boolean).join(' | '),
                size: 20,
                color: '666666',
                italics: true,
              }),
            ],
            spacing: { after: 100 },
          })
        );
      }

      const bullets = exp.description || exp.bullets || [];
      for (const bullet of bullets) {
        sections.push(
          new Paragraph({
            children: [
              new TextRun({
                text: bullet,
                size: 22,
              }),
            ],
            bullet: { level: 0 },
            spacing: { after: 50 },
          })
        );
      }
    }
  }

  if (resume.education && resume.education.length > 0) {
    sections.push(createSectionHeading('EDUCATION', primaryColorHex, template.showSectionDividers));
    
    for (const edu of resume.education) {
      sections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: edu.degree || '',
              bold: true,
              size: 24,
            }),
            new TextRun({
              text: edu.institution ? ` - ${edu.institution}` : '',
              size: 24,
            }),
            edu.year ? new TextRun({
              text: ` (${edu.year})`,
              size: 20,
              color: '666666',
            }) : new TextRun({ text: '' }),
          ],
          spacing: { after: 50 },
        })
      );
      
      if (edu.details) {
        sections.push(
          new Paragraph({
            children: [
              new TextRun({
                text: edu.details,
                size: 22,
                color: '666666',
              }),
            ],
            spacing: { after: 100 },
          })
        );
      }
    }
  }

  if (resume.certifications && resume.certifications.length > 0) {
    sections.push(createSectionHeading('CERTIFICATIONS', primaryColorHex, template.showSectionDividers));
    
    for (const cert of resume.certifications) {
      sections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: cert,
              size: 22,
            }),
          ],
          bullet: { level: 0 },
          spacing: { after: 50 },
        })
      );
    }
  }

  if (resume.extras && resume.extras.length > 0) {
    sections.push(createSectionHeading('ADDITIONAL INFORMATION', primaryColorHex, template.showSectionDividers));
    
    for (const extra of resume.extras) {
      sections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: extra,
              size: 22,
            }),
          ],
          bullet: { level: 0 },
          spacing: { after: 50 },
        })
      );
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 720,
              right: 720,
              bottom: 720,
              left: 720,
            },
          },
        },
        children: sections,
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  return Buffer.from(buffer);
}

function createSectionHeading(text: string, colorHex: string, showDivider: boolean): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({
        text: text,
        bold: true,
        size: 24,
        color: colorHex,
        allCaps: true,
      }),
    ],
    spacing: { before: 300, after: 100 },
    border: showDivider ? {
      bottom: {
        color: colorHex,
        size: 6,
        style: BorderStyle.SINGLE,
        space: 1,
      },
    } : undefined,
  });
}
