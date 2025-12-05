export type CvTemplateId = 'classic' | 'modern' | 'minimal';

export type FontFamily = 'system' | 'serif' | 'sans';

export interface CvTemplateConfig {
  id: CvTemplateId;
  name: string;
  primaryColor: string;
  accentColor: string;
  fontFamily: FontFamily;
  showSectionDividers: boolean;
  layout: 'single-column' | 'sidebar';
  logoUrl?: string;
}

export const CV_TEMPLATES: Record<CvTemplateId, CvTemplateConfig> = {
  classic: {
    id: 'classic',
    name: 'Classic',
    primaryColor: '#1a365d',
    accentColor: '#2c5282',
    fontFamily: 'serif',
    showSectionDividers: true,
    layout: 'single-column',
  },
  modern: {
    id: 'modern',
    name: 'Modern',
    primaryColor: '#0f766e',
    accentColor: '#14b8a6',
    fontFamily: 'sans',
    showSectionDividers: false,
    layout: 'single-column',
  },
  minimal: {
    id: 'minimal',
    name: 'Minimal',
    primaryColor: '#18181b',
    accentColor: '#71717a',
    fontFamily: 'system',
    showSectionDividers: false,
    layout: 'single-column',
  },
};

export function getTemplate(id: CvTemplateId): CvTemplateConfig {
  return CV_TEMPLATES[id] || CV_TEMPLATES.classic;
}

export function getTemplateWithLogo(id: CvTemplateId, logoUrl?: string): CvTemplateConfig {
  const template = getTemplate(id);
  return logoUrl ? { ...template, logoUrl } : template;
}

export const TEMPLATE_OPTIONS = Object.values(CV_TEMPLATES).map(t => ({
  id: t.id,
  name: t.name,
}));
