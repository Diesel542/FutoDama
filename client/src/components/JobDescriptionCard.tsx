import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, MapPin, Calendar, DollarSign, Clock, Users } from "lucide-react";
import type { Job } from "@shared/schema";

interface JobDescriptionCardProps {
  job: Job;
  onViewDetails: (jobId: string) => void;
}

export default function JobDescriptionCard({ job, onViewDetails }: JobDescriptionCardProps) {
  const jobCard = job.jobCard as any;
  
  // Extract key information from job_card
  const title = jobCard?.basics?.title || "Job Title Not Specified";
  const company = jobCard?.basics?.company || "Company Not Specified";
  const location = jobCard?.basics?.location || "Location not specified";
  const workMode = jobCard?.basics?.work_mode || "Not specified";
  const seniority = jobCard?.basics?.seniority || "";
  
  // Project details
  const projectDetails = jobCard?.project_details || {};
  const duration = projectDetails?.duration || "Not specified";
  const startDate = projectDetails?.start_date || "ASAP";
  
  // Rate display
  const rateMin = projectDetails?.rate_min;
  const rateMax = projectDetails?.rate_max;
  const rateCurrency = projectDetails?.rate_currency || "DKK";
  const rateUnit = projectDetails?.rate_unit || "hour";
  
  const rateDisplay = rateMin && rateMax
    ? `${rateMin}-${rateMax} ${rateCurrency}/${rateUnit}`
    : projectDetails?.rate_band || "Rate not specified";
  
  // Get skills from various sources
  const technicalSkills = jobCard?.requirements?.technical_skills || [];
  const competencies = jobCard?.competencies || {};
  const allCompetencySkills = [
    ...(competencies?.frontend || []),
    ...(competencies?.backend || []),
    ...(competencies?.cloud_architecture || []),
    ...(competencies?.database || []),
  ];
  const allSkills = [...technicalSkills, ...allCompetencySkills];
  
  // Display max 5 skills on card
  const displaySkills = allSkills.slice(0, 5);
  const remainingSkills = allSkills.length - displaySkills.length;
  
  // Contact info
  const contact = jobCard?.contact || {};
  const contactName = contact?.name || "Unknown";
  const contactRole = contact?.role || "";
  
  // Format posted date
  const postedDate = job.createdAt 
    ? new Date(job.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : "Recently";
  
  // Placeholder applicant count (random for now)
  const applicantCount = Math.floor(Math.random() * 20) + 5; // 5-25 applicants
  
  // Priority determination (based on seniority or random)
  const priority = seniority?.toLowerCase().includes('senior') || seniority?.toLowerCase().includes('lead')
    ? "High Priority"
    : "Medium Priority";

  return (
    <Card 
      className="h-full flex flex-col hover:shadow-lg transition-shadow duration-200"
      data-testid={`card-job-${job.id}`}
    >
      <CardContent className="p-6 flex flex-col flex-1">
        {/* Header: Title and Priority */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="font-semibold text-lg text-foreground" data-testid={`text-job-title-${job.id}`}>
              {title}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
              <p className="text-sm text-muted-foreground" data-testid={`text-company-${job.id}`}>
                {company}
              </p>
            </div>
          </div>
        </div>

        {/* Priority and Applicants */}
        <div className="flex items-center gap-2 mb-4">
          <Badge 
            variant={priority === "High Priority" ? "default" : "secondary"} 
            className="text-xs"
          >
            {priority}
          </Badge>
          <div className="flex items-center text-xs text-muted-foreground">
            <Users className="w-3 h-3 mr-1" />
            {applicantCount} applicants
          </div>
        </div>

        {/* Key Info */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center text-sm text-muted-foreground">
            <MapPin className="w-4 h-4 mr-2 flex-shrink-0" />
            <span className="truncate">{location} ({workMode})</span>
          </div>
          <div className="flex items-center text-sm text-muted-foreground">
            <Clock className="w-4 h-4 mr-2 flex-shrink-0" />
            <span className="truncate">{startDate} • {duration}</span>
          </div>
          <div className="flex items-center text-sm text-muted-foreground">
            <DollarSign className="w-4 h-4 mr-2 flex-shrink-0" />
            <span className="truncate">{rateDisplay}</span>
          </div>
        </div>

        {/* Skills Tags */}
        {displaySkills.length > 0 && (
          <div className="mb-4 flex-1">
            <div className="flex flex-wrap gap-1.5">
              {displaySkills.map((skill: string, index: number) => (
                <Badge 
                  key={index} 
                  variant="outline" 
                  className="text-xs px-2 py-0.5"
                >
                  {skill}
                </Badge>
              ))}
              {remainingSkills > 0 && (
                <Badge variant="outline" className="text-xs px-2 py-0.5">
                  +{remainingSkills} more
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Contact and Posted Date */}
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-4">
          <div className="flex items-center gap-1">
            <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-xs font-medium">
              {contactName.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="font-medium text-foreground">{contactName}</div>
              {contactRole && <div className="text-xs">{contactRole}</div>}
            </div>
          </div>
          <div className="flex items-center">
            <Calendar className="w-3 h-3 mr-1" />
            Posted {postedDate}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-auto pt-4 border-t border-border">
          <Button 
            className="w-full mb-2"
            onClick={() => onViewDetails(job.id)}
            data-testid={`button-view-details-${job.id}`}
          >
            View Details
          </Button>
          <Button 
            variant="outline"
            className="w-full"
            disabled
            data-testid={`button-use-comparison-${job.id}`}
          >
            Use for Comparison
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
