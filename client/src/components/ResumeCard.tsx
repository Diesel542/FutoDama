import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Briefcase, FolderOpen, Award, Star, MapPin, Mail, Phone, Globe, Linkedin, Github, Calendar, Building, ExternalLink, AlertCircle } from "lucide-react";
import { ResumeCard as ResumeCardType } from "@shared/schema";

interface ResumeCardProps {
  resumeCard: ResumeCardType;
}

export default function ResumeCard({ resumeCard }: ResumeCardProps) {
  return (
    <Tabs defaultValue="overview" className="w-full">
      <TabsList className="grid w-full grid-cols-5 mb-4">
        <TabsTrigger value="overview" className="flex items-center gap-1" data-testid="tab-overview">
          <User className="w-4 h-4" />
          <span className="hidden sm:inline">Overview</span>
        </TabsTrigger>
        <TabsTrigger value="experience" className="flex items-center gap-1" data-testid="tab-experience">
          <Briefcase className="w-4 h-4" />
          <span className="hidden sm:inline">Experience</span>
        </TabsTrigger>
        <TabsTrigger value="portfolio" className="flex items-center gap-1" data-testid="tab-portfolio">
          <FolderOpen className="w-4 h-4" />
          <span className="hidden sm:inline">Portfolio</span>
        </TabsTrigger>
        <TabsTrigger value="skills" className="flex items-center gap-1" data-testid="tab-skills">
          <Award className="w-4 h-4" />
          <span className="hidden sm:inline">Skills</span>
        </TabsTrigger>
        <TabsTrigger value="reviews" className="flex items-center gap-1" data-testid="tab-reviews">
          <Star className="w-4 h-4" />
          <span className="hidden sm:inline">Reviews</span>
        </TabsTrigger>
      </TabsList>

      {/* Overview Tab */}
      <TabsContent value="overview" className="space-y-4">
        {/* Personal Info Card */}
        <Card className="p-6">
          <div className="flex items-start gap-4">
            {resumeCard.personal_info.photo_url ? (
              <img 
                src={resumeCard.personal_info.photo_url} 
                alt={resumeCard.personal_info.name}
                className="w-20 h-20 rounded-full object-cover"
                data-testid="img-profile"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-10 h-10 text-primary" />
              </div>
            )}
            <div className="flex-1">
              <h2 className="text-2xl font-bold" data-testid="text-name">{resumeCard.personal_info.name}</h2>
              <p className="text-lg text-muted-foreground" data-testid="text-title">{resumeCard.personal_info.title}</p>
              {resumeCard.personal_info.years_experience !== undefined && (
                <Badge variant="secondary" className="mt-2">
                  {resumeCard.personal_info.years_experience} years experience
                </Badge>
              )}
              {resumeCard.personal_info.rating !== undefined && (
                <div className="flex items-center gap-1 mt-2">
                  <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                  <span className="font-semibold" data-testid="text-rating">{resumeCard.personal_info.rating.toFixed(1)}</span>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
            {resumeCard.personal_info.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <a href={`mailto:${resumeCard.personal_info.email}`} className="hover:underline" data-testid="link-email">
                  {resumeCard.personal_info.email}
                </a>
              </div>
            )}
            {resumeCard.personal_info.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <span data-testid="text-phone">{resumeCard.personal_info.phone}</span>
              </div>
            )}
            {resumeCard.personal_info.location && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span data-testid="text-location">{resumeCard.personal_info.location}</span>
              </div>
            )}
            {resumeCard.personal_info.website && (
              <div className="flex items-center gap-2 text-sm">
                <Globe className="w-4 h-4 text-muted-foreground" />
                <a href={resumeCard.personal_info.website} target="_blank" rel="noopener noreferrer" className="hover:underline" data-testid="link-website">
                  Website
                </a>
              </div>
            )}
            {resumeCard.personal_info.linkedin && (
              <div className="flex items-center gap-2 text-sm">
                <Linkedin className="w-4 h-4 text-muted-foreground" />
                <a href={resumeCard.personal_info.linkedin} target="_blank" rel="noopener noreferrer" className="hover:underline" data-testid="link-linkedin">
                  LinkedIn
                </a>
              </div>
            )}
            {resumeCard.personal_info.github && (
              <div className="flex items-center gap-2 text-sm">
                <Github className="w-4 h-4 text-muted-foreground" />
                <a href={resumeCard.personal_info.github} target="_blank" rel="noopener noreferrer" className="hover:underline" data-testid="link-github">
                  GitHub
                </a>
              </div>
            )}
          </div>
        </Card>

        {/* Professional Summary */}
        {resumeCard.professional_summary && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-3">Professional Summary</h3>
            <p className="text-muted-foreground leading-relaxed" data-testid="text-summary">
              {resumeCard.professional_summary}
            </p>
          </Card>
        )}

        {/* Availability */}
        {resumeCard.availability && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-3">Availability</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {resumeCard.availability.status && (
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <p className="font-medium" data-testid="text-availability-status">{resumeCard.availability.status}</p>
                </div>
              )}
              {resumeCard.availability.commitment && (
                <div>
                  <p className="text-sm text-muted-foreground">Commitment</p>
                  <p className="font-medium" data-testid="text-availability-commitment">{resumeCard.availability.commitment}</p>
                </div>
              )}
              {resumeCard.availability.timezone && (
                <div>
                  <p className="text-sm text-muted-foreground">Timezone</p>
                  <p className="font-medium" data-testid="text-availability-timezone">{resumeCard.availability.timezone}</p>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Rate */}
        {resumeCard.rate && resumeCard.rate.amount && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-3">Rate</h3>
            <p className="text-2xl font-bold" data-testid="text-rate">
              {resumeCard.rate.currency} {resumeCard.rate.amount}
              {resumeCard.rate.unit && <span className="text-sm font-normal text-muted-foreground"> / {resumeCard.rate.unit}</span>}
            </p>
          </Card>
        )}
      </TabsContent>

      {/* Experience Tab */}
      <TabsContent value="experience" className="space-y-4">
        {/* Work Experience */}
        {resumeCard.work_experience && resumeCard.work_experience.length > 0 && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Work Experience</h3>
            <div className="space-y-6">
              {resumeCard.work_experience.map((job, index) => (
                <div key={index} className="border-l-2 border-primary pl-4" data-testid={`card-work-${index}`}>
                  <h4 className="font-semibold text-lg" data-testid={`text-job-title-${index}`}>{job.title}</h4>
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <Building className="w-4 h-4" />
                    <span data-testid={`text-company-${index}`}>{job.company}</span>
                    {job.location && (
                      <>
                        <span>•</span>
                        <span data-testid={`text-job-location-${index}`}>{job.location}</span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                    <Calendar className="w-4 h-4" />
                    <span data-testid={`text-job-dates-${index}`}>
                      {job.start_date} - {job.current ? 'Present' : job.end_date}
                    </span>
                  </div>
                  {job.description && (
                    <p className="text-sm mb-3" data-testid={`text-job-description-${index}`}>{job.description}</p>
                  )}
                  {job.achievements && job.achievements.length > 0 && (
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      {job.achievements.map((achievement, i) => (
                        <li key={i} data-testid={`text-achievement-${index}-${i}`}>{achievement}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Education */}
        {resumeCard.education && resumeCard.education.length > 0 && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Education</h3>
            <div className="space-y-4">
              {resumeCard.education.map((edu, index) => (
                <div key={index} data-testid={`card-education-${index}`}>
                  <h4 className="font-semibold" data-testid={`text-degree-${index}`}>{edu.degree}</h4>
                  <p className="text-muted-foreground" data-testid={`text-institution-${index}`}>{edu.institution}</p>
                  {edu.location && (
                    <p className="text-sm text-muted-foreground" data-testid={`text-edu-location-${index}`}>{edu.location}</p>
                  )}
                  <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                    {edu.graduation_date && (
                      <span data-testid={`text-graduation-${index}`}>{edu.graduation_date}</span>
                    )}
                    {edu.gpa && (
                      <span data-testid={`text-gpa-${index}`}>GPA: {edu.gpa}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </TabsContent>

      {/* Portfolio Tab */}
      <TabsContent value="portfolio" className="space-y-4">
        {resumeCard.portfolio && resumeCard.portfolio.length > 0 ? (
          resumeCard.portfolio.map((project, index) => (
            <Card key={index} className="p-6" data-testid={`card-project-${index}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-2" data-testid={`text-project-title-${index}`}>{project.title}</h3>
                  {project.description && (
                    <p className="text-muted-foreground mb-3" data-testid={`text-project-description-${index}`}>
                      {project.description}
                    </p>
                  )}
                  {project.technologies && project.technologies.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {project.technologies.map((tech, i) => (
                        <Badge key={i} variant="secondary" data-testid={`badge-tech-${index}-${i}`}>
                          {tech}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                {project.url && (
                  <a 
                    href={project.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="ml-4"
                    data-testid={`link-project-${index}`}
                  >
                    <ExternalLink className="w-5 h-5 text-primary hover:text-primary/80" />
                  </a>
                )}
              </div>
            </Card>
          ))
        ) : (
          <Card className="p-12 text-center">
            <FolderOpen className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No portfolio projects found</p>
          </Card>
        )}
      </TabsContent>

      {/* Skills Tab */}
      <TabsContent value="skills" className="space-y-4">
        {/* Technical Skills */}
        {resumeCard.technical_skills && resumeCard.technical_skills.length > 0 && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Technical Skills</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {resumeCard.technical_skills.map((skill, index) => (
                <div key={index} data-testid={`skill-${index}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium" data-testid={`text-skill-name-${index}`}>{skill.skill}</span>
                    {skill.proficiency !== undefined && (
                      <span className="text-sm text-muted-foreground" data-testid={`text-skill-proficiency-${index}`}>
                        {skill.proficiency}%
                      </span>
                    )}
                  </div>
                  {skill.proficiency !== undefined && (
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{ width: `${skill.proficiency}%` }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Soft Skills */}
        {resumeCard.soft_skills && resumeCard.soft_skills.length > 0 && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Soft Skills</h3>
            <div className="flex flex-wrap gap-2">
              {resumeCard.soft_skills.map((skill, index) => (
                <Badge key={index} variant="secondary" data-testid={`badge-soft-skill-${index}`}>
                  {skill}
                </Badge>
              ))}
            </div>
          </Card>
        )}

        {/* Certifications */}
        {resumeCard.certifications && resumeCard.certifications.length > 0 && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Certifications</h3>
            <div className="space-y-3">
              {resumeCard.certifications.map((cert, index) => (
                <div key={index} className="flex items-start gap-3" data-testid={`cert-${index}`}>
                  <Award className="w-5 h-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium" data-testid={`text-cert-name-${index}`}>{cert.name}</p>
                    {cert.issuer && (
                      <p className="text-sm text-muted-foreground" data-testid={`text-cert-issuer-${index}`}>{cert.issuer}</p>
                    )}
                    {cert.date && (
                      <p className="text-sm text-muted-foreground" data-testid={`text-cert-date-${index}`}>{cert.date}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Languages */}
        {resumeCard.languages && resumeCard.languages.length > 0 && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Languages</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {resumeCard.languages.map((lang, index) => (
                <div key={index} data-testid={`language-${index}`}>
                  <p className="font-medium" data-testid={`text-language-name-${index}`}>{lang.language}</p>
                  <p className="text-sm text-muted-foreground" data-testid={`text-language-proficiency-${index}`}>
                    {lang.proficiency}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        )}
      </TabsContent>

      {/* Reviews Tab */}
      <TabsContent value="reviews" className="space-y-4">
        {resumeCard.reviews && resumeCard.reviews.length > 0 ? (
          resumeCard.reviews.map((review, index) => (
            <Card key={index} className="p-6" data-testid={`card-review-${index}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${
                        i < review.rating ? 'fill-yellow-500 text-yellow-500' : 'text-gray-300'
                      }`}
                    />
                  ))}
                  <span className="ml-2 font-semibold" data-testid={`text-review-rating-${index}`}>
                    {review.rating}/5
                  </span>
                </div>
                {review.project && (
                  <Badge variant="outline" data-testid={`badge-review-project-${index}`}>
                    {review.project}
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground mb-4" data-testid={`text-review-comment-${index}`}>
                "{review.comment}"
              </p>
              {(review.reviewer_name || review.reviewer_title || review.reviewer_company) && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="w-4 h-4" />
                  <span data-testid={`text-reviewer-${index}`}>
                    {review.reviewer_name}
                    {review.reviewer_title && `, ${review.reviewer_title}`}
                    {review.reviewer_company && ` at ${review.reviewer_company}`}
                  </span>
                </div>
              )}
            </Card>
          ))
        ) : (
          <Card className="p-12 text-center">
            <Star className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No reviews found</p>
          </Card>
        )}
      </TabsContent>

      {/* Missing Fields Warning */}
      {resumeCard.missing_fields && resumeCard.missing_fields.length > 0 && (
        <Card className="p-4 border-yellow-500/50 bg-yellow-500/10 mt-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-500 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-yellow-500 mb-2">Missing or Low Confidence Fields</h4>
              <ul className="space-y-1 text-sm">
                {resumeCard.missing_fields.map((field, index) => (
                  <li key={index} className="flex items-start gap-2" data-testid={`missing-field-${index}`}>
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      field.severity === 'error' ? 'bg-red-500 text-white' :
                      field.severity === 'warn' ? 'bg-yellow-500 text-white' :
                      'bg-blue-500 text-white'
                    }`}>
                      {field.severity}
                    </span>
                    <span>
                      <strong>{field.path}:</strong> {field.message}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      )}
    </Tabs>
  );
}
