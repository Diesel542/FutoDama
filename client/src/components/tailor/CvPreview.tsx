import type { CvTemplateConfig } from "@shared/cvTemplates";
import type { TailoredResumeBundle } from "./TailorPanels";
import { useMemo } from "react";

interface CvPreviewProps {
  bundle: TailoredResumeBundle;
  template: CvTemplateConfig;
  candidateName?: string;
}

export function CvPreview({ bundle, template, candidateName }: CvPreviewProps) {
  const resume = bundle.tailored_resume;
  
  const fontFamilyClass = useMemo(() => {
    switch (template.fontFamily) {
      case 'serif':
        return 'font-serif';
      case 'sans':
        return 'font-sans';
      default:
        return 'font-sans';
    }
  }, [template.fontFamily]);

  const skills = useMemo(() => {
    const allSkills: string[] = [];
    if (!resume.skills) return allSkills;
    
    if (Array.isArray(resume.skills)) {
      return resume.skills;
    }
    
    const skillsObj = resume.skills;
    if (skillsObj.core) allSkills.push(...skillsObj.core);
    if (skillsObj.tools) allSkills.push(...skillsObj.tools);
    if (skillsObj.methodologies) allSkills.push(...skillsObj.methodologies);
    if (skillsObj.languages) allSkills.push(...skillsObj.languages);
    return allSkills;
  }, [resume.skills]);

  const displayName = (resume.meta as any)?.name || candidateName || 'Candidate';
  const displayTitle = (resume.meta as any)?.title || resume.meta?.target_title || '';
  const displayLocation = (resume.meta as any)?.location || '';
  const displayEmail = (resume.meta as any)?.email || '';
  const displayPhone = (resume.meta as any)?.phone || '';

  return (
    <div className="flex justify-center py-8 bg-muted/50 min-h-full" data-testid="cv-preview-container">
      <div 
        className={`bg-white shadow-xl rounded-lg w-full max-w-[850px] min-h-[1100px] p-12 ${fontFamilyClass}`}
        style={{ 
          aspectRatio: '8.5/11',
        }}
        data-testid="cv-preview-card"
      >
        <div className="relative">
          {template.logoUrl && (
            <div className="absolute top-0 right-0" data-testid="cv-logo">
              <img 
                src={template.logoUrl} 
                alt="Company Logo" 
                className="max-h-12 max-w-[120px] object-contain"
              />
            </div>
          )}
          
          <div className="mb-8">
            <h1 
              className="text-3xl font-bold mb-1"
              style={{ color: template.primaryColor }}
              data-testid="cv-name"
            >
              {displayName}
            </h1>
            {displayTitle && (
              <p 
                className="text-lg mb-2"
                style={{ color: template.accentColor }}
                data-testid="cv-title"
              >
                {displayTitle}
              </p>
            )}
            <div className="flex flex-wrap gap-4 text-sm text-gray-600">
              {displayLocation && (
                <span data-testid="cv-location">{displayLocation}</span>
              )}
              {displayEmail && (
                <span data-testid="cv-email">{displayEmail}</span>
              )}
              {displayPhone && (
                <span data-testid="cv-phone">{displayPhone}</span>
              )}
            </div>
          </div>
        </div>

        {resume.summary && (
          <section className="mb-6">
            <h2 
              className="text-sm font-bold uppercase tracking-wide mb-2"
              style={{ color: template.primaryColor }}
            >
              Professional Summary
            </h2>
            {template.showSectionDividers && (
              <div 
                className="h-0.5 mb-3"
                style={{ backgroundColor: template.accentColor, opacity: 0.3 }}
              />
            )}
            <p className="text-sm text-gray-700 leading-relaxed" data-testid="cv-summary">
              {resume.summary}
            </p>
          </section>
        )}

        {skills.length > 0 && (
          <section className="mb-6">
            <h2 
              className="text-sm font-bold uppercase tracking-wide mb-2"
              style={{ color: template.primaryColor }}
            >
              Key Skills
            </h2>
            {template.showSectionDividers && (
              <div 
                className="h-0.5 mb-3"
                style={{ backgroundColor: template.accentColor, opacity: 0.3 }}
              />
            )}
            <div className="flex flex-wrap gap-2" data-testid="cv-skills">
              {skills.map((skill, idx) => (
                <span 
                  key={idx}
                  className="text-xs px-2 py-1 rounded"
                  style={{ 
                    backgroundColor: `${template.accentColor}15`,
                    color: template.primaryColor,
                    border: `1px solid ${template.accentColor}30`
                  }}
                >
                  {skill}
                </span>
              ))}
            </div>
          </section>
        )}

        {resume.experience && resume.experience.length > 0 && (
          <section className="mb-6">
            <h2 
              className="text-sm font-bold uppercase tracking-wide mb-2"
              style={{ color: template.primaryColor }}
            >
              Experience
            </h2>
            {template.showSectionDividers && (
              <div 
                className="h-0.5 mb-3"
                style={{ backgroundColor: template.accentColor, opacity: 0.3 }}
              />
            )}
            <div className="space-y-4" data-testid="cv-experience">
              {resume.experience.map((exp, idx) => {
                const companyName = exp.employer || (exp as any).company;
                return (
                <div key={idx} className="text-sm">
                  <div className="flex justify-between items-start mb-1">
                    <div>
                      <span className="font-semibold text-gray-800">
                        {exp.title}
                      </span>
                      {companyName && (
                        <span className="text-gray-600">
                          {' '}at {companyName}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-500 whitespace-nowrap ml-4">
                      {exp.start_date || (exp as any).dates}
                      {exp.end_date && ` - ${exp.end_date}`}
                      {exp.is_current && ' - Present'}
                    </span>
                  </div>
                  {exp.location && (
                    <p className="text-xs text-gray-500 mb-1">{exp.location}</p>
                  )}
                  {exp.description && exp.description.length > 0 && (
                    <ul className="list-disc list-inside space-y-0.5 text-gray-700 ml-2">
                      {(exp.description || (exp as any).bullets || []).map((bullet: string, bulletIdx: number) => (
                        <li key={bulletIdx} className="text-xs leading-relaxed">
                          {bullet}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )})}
            </div>
          </section>
        )}

        {resume.education && resume.education.length > 0 && (
          <section className="mb-6">
            <h2 
              className="text-sm font-bold uppercase tracking-wide mb-2"
              style={{ color: template.primaryColor }}
            >
              Education
            </h2>
            {template.showSectionDividers && (
              <div 
                className="h-0.5 mb-3"
                style={{ backgroundColor: template.accentColor, opacity: 0.3 }}
              />
            )}
            <div className="space-y-2" data-testid="cv-education">
              {resume.education.map((edu, idx) => (
                <div key={idx} className="text-sm">
                  <div className="flex justify-between">
                    <div>
                      <span className="font-semibold text-gray-800">{edu.degree}</span>
                      <span className="text-gray-600"> - {edu.institution}</span>
                    </div>
                    {edu.year && (
                      <span className="text-xs text-gray-500">{edu.year}</span>
                    )}
                  </div>
                  {edu.details && (
                    <p className="text-xs text-gray-600 mt-0.5">{edu.details}</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {resume.certifications && resume.certifications.length > 0 && (
          <section className="mb-6">
            <h2 
              className="text-sm font-bold uppercase tracking-wide mb-2"
              style={{ color: template.primaryColor }}
            >
              Certifications
            </h2>
            {template.showSectionDividers && (
              <div 
                className="h-0.5 mb-3"
                style={{ backgroundColor: template.accentColor, opacity: 0.3 }}
              />
            )}
            <ul className="text-sm text-gray-700" data-testid="cv-certifications">
              {resume.certifications.map((cert, idx) => (
                <li key={idx} className="text-xs">{cert}</li>
              ))}
            </ul>
          </section>
        )}

        {resume.extras && resume.extras.length > 0 && (
          <section>
            <h2 
              className="text-sm font-bold uppercase tracking-wide mb-2"
              style={{ color: template.primaryColor }}
            >
              Additional Information
            </h2>
            {template.showSectionDividers && (
              <div 
                className="h-0.5 mb-3"
                style={{ backgroundColor: template.accentColor, opacity: 0.3 }}
              />
            )}
            <ul className="text-sm text-gray-700" data-testid="cv-extras">
              {resume.extras.map((extra, idx) => (
                <li key={idx} className="text-xs">{extra}</li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
