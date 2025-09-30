import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Phone, Mail } from "lucide-react";
import MissingInfoAlert from "@/components/MissingInfoAlert";

interface JobCardProps {
  jobCard: any;
}

export default function JobCard({ jobCard }: JobCardProps) {
  const renderSkills = (skills: string[] | undefined) => {
    if (!skills || skills.length === 0) return <span className="text-muted-foreground text-sm">Not specified</span>;
    
    return (
      <div className="flex flex-wrap gap-2">
        {skills.map((skill, index) => (
          <span key={index} className="pill px-2 py-1 rounded-full text-xs">
            {skill}
          </span>
        ))}
      </div>
    );
  };

  const basics = jobCard.basics || {};
  const requirements = jobCard.requirements || {};
  const competencies = jobCard.competencies || {};
  const procurement = jobCard.procurement || {};
  const contact = jobCard.contact || {};
  const projectDetails = jobCard.project_details || {};

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6" data-testid="job-card-display">
      {/* Main Content Column */}
      <div className="xl:col-span-2 space-y-6">
        {/* Job Overview Header */}
        <Card data-testid="card-job-overview">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold text-foreground mb-2" data-testid="text-job-title">
                  {basics.title || 'Job Title Not Specified'}
                </h1>
                <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                  <span data-testid="text-company">{basics.company || '—'}</span>
                  <span>•</span>
                  <span data-testid="text-location">{basics.location || '—'}</span>
                  <span>•</span>
                  <span data-testid="text-work-mode">{basics.work_mode || '—'}</span>
                </div>
              </div>
              {basics.seniority && (
                <div className="text-right">
                  <Badge variant="secondary" data-testid="badge-seniority">{basics.seniority}</Badge>
                </div>
              )}
            </div>
            
            <div className="border-t border-border pt-4">
              <h3 className="text-sm font-medium text-foreground mb-2">Job Overview</h3>
              <p className="text-sm text-muted-foreground leading-relaxed" data-testid="text-overview">
                {jobCard.overview || 'Job overview not provided in the original description.'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Requirements Section - v2.1 with separated skills */}
        <Card data-testid="card-requirements">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Requirements</h3>
            
            {/* Experience Required - v2.1 supports rich text, v1 has years_experience */}
            <div className="mb-6">
              <h4 className="text-sm font-medium text-foreground mb-3">Experience Required</h4>
              {requirements.experience_required ? (
                <p className="text-sm text-muted-foreground leading-relaxed" data-testid="text-experience-required">
                  {requirements.experience_required}
                </p>
              ) : requirements.years_experience ? (
                <span className="text-sm" data-testid="text-years-experience">
                  {requirements.years_experience}
                </span>
              ) : (
                <span className="text-sm text-muted-foreground">Not specified</span>
              )}
            </div>
            
            {/* v2.1: Separated Technical & Soft Skills */}
            {(requirements.technical_skills || requirements.soft_skills) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h4 className="text-sm font-medium text-foreground mb-3">Technical Skills</h4>
                  <div data-testid="skills-technical">
                    {renderSkills(requirements.technical_skills)}
                  </div>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-foreground mb-3">Soft Skills</h4>
                  <div data-testid="skills-soft">
                    {renderSkills(requirements.soft_skills)}
                  </div>
                </div>
              </div>
            )}
            
            {/* v1: Legacy Must Have Skills (backward compatibility) */}
            {requirements.must_have && !requirements.technical_skills && (
              <div className="mb-6">
                <h4 className="text-sm font-medium text-foreground mb-3">Must Have Skills</h4>
                <div data-testid="skills-must-have">
                  {renderSkills(requirements.must_have)}
                </div>
              </div>
            )}
            
            {/* Nice to Have - common to both versions */}
            {requirements.nice_to_have && requirements.nice_to_have.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-foreground mb-3">Nice to Have</h4>
                <div data-testid="skills-nice-to-have">
                  {renderSkills(requirements.nice_to_have)}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Required Competencies */}
        <Card data-testid="card-competencies">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Required Competencies</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-foreground mb-2">Frontend Development</h4>
                  <div data-testid="competencies-frontend">
                    {renderSkills(competencies.frontend)}
                  </div>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-foreground mb-2">Backend Development</h4>
                  <div data-testid="competencies-backend">
                    {renderSkills(competencies.backend)}
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-foreground mb-2">Cloud Architecture</h4>
                  <div data-testid="competencies-cloud">
                    {renderSkills(competencies.cloud_architecture)}
                  </div>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-foreground mb-2">Database & Optimization</h4>
                  <div data-testid="competencies-database">
                    {renderSkills(competencies.database)}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Work Culture & Environment */}
        <Card data-testid="card-work-culture">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Work Culture & Environment</h3>
            <p className="text-sm text-muted-foreground leading-relaxed" data-testid="text-work-culture">
              {jobCard.work_culture || 'Work culture information not provided in the original description.'}
            </p>
          </CardContent>
        </Card>

        {/* Procurement Requirements */}
        <Card data-testid="card-procurement">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Procurement Requirements</h3>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Contract Type</p>
                <p className="text-sm font-medium" data-testid="text-contract-type">
                  {procurement.contract_type || '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">NDA Required</p>
                <p className="text-sm font-medium" data-testid="text-nda-required">
                  {procurement.nda_required !== undefined ? (procurement.nda_required ? 'Yes' : 'No') : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Security Clearance</p>
                <p className="text-sm font-medium" data-testid="text-security-clearance">
                  {procurement.security_clearance || '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">VAT Registration</p>
                <p className="text-sm font-medium" data-testid="text-vat-registration">
                  {procurement.vat_registration || '—'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sidebar Column */}
      <div className="space-y-6">
        {/* Contact Information */}
        <Card data-testid="card-contact">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Contact Information</h3>
            
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                  <User className="text-primary w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground" data-testid="text-contact-name">
                    {contact.name || 'Contact Name Not Provided'}
                  </p>
                  <p className="text-xs text-muted-foreground" data-testid="text-contact-role">
                    {contact.role || 'Role not specified'}
                  </p>
                </div>
              </div>
              
              <div className="space-y-2 pl-13">
                <p className="text-xs text-muted-foreground flex items-center">
                  <Mail className="w-3 h-3 mr-2" />
                  <span data-testid="text-contact-email">{contact.email || 'Email not provided'}</span>
                </p>
                <p className="text-xs text-muted-foreground flex items-center">
                  <Phone className="w-3 h-3 mr-2" />
                  <span data-testid="text-contact-phone">{contact.phone || 'Phone not provided'}</span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Project Details */}
        <Card data-testid="card-project-details">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Project Details</h3>
            
            <div className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Start Date</p>
                <p className="text-sm font-medium" data-testid="text-start-date">
                  {projectDetails.start_date || '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Duration</p>
                <p className="text-sm font-medium" data-testid="text-duration">
                  {projectDetails.duration || '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Workload</p>
                <p className="text-sm font-medium" data-testid="text-workload">
                  {projectDetails.workload || '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Work Setup</p>
                <p className="text-sm font-medium" data-testid="text-work-setup">
                  {projectDetails.work_setup || '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Salary Range</p>
                <p className="text-sm font-medium" data-testid="text-rate-band">
                  {projectDetails.rate_band || '—'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Language Requirements */}
        <Card data-testid="card-language-requirements">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Language Requirements</h3>
            <div data-testid="skills-language-requirements">
              {renderSkills(jobCard.language_requirements)}
            </div>
          </CardContent>
        </Card>

        {/* Decision Process */}
        <Card data-testid="card-decision-process">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Decision Process</h3>
            <p className="text-sm text-muted-foreground" data-testid="text-decision-process">
              {jobCard.decision_process || 'Decision process not specified in the original description.'}
            </p>
          </CardContent>
        </Card>

        {/* Key Stakeholders */}
        <Card data-testid="card-stakeholders">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Key Stakeholders</h3>
            
            <div className="space-y-3" data-testid="list-stakeholders">
              {jobCard.stakeholders && jobCard.stakeholders.length > 0 ? (
                jobCard.stakeholders.map((stakeholder: string, index: number) => (
                  <div key={index} className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
                      <User className="text-primary w-3 h-3" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{stakeholder}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No stakeholders specified</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Missing Information Alert */}
        <MissingInfoAlert missingFields={jobCard.missing_fields || []} />
      </div>
    </div>
  );
}
