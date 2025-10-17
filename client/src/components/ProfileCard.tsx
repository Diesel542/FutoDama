import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock, DollarSign, Mail, Phone } from "lucide-react";
import type { Resume } from "@shared/schema";

interface ProfileCardProps {
  resume: Resume;
  onViewProfile: (resumeId: string) => void;
}

export default function ProfileCard({ resume, onViewProfile }: ProfileCardProps) {
  const resumeCard = resume.resumeCard as any;
  
  // Extract key information
  const name = resumeCard?.personal_info?.name || "Unknown";
  const title = resumeCard?.personal_info?.title || "No title";
  const location = resumeCard?.personal_info?.location || "Location not specified";
  const summary = resumeCard?.professional_summary || "";
  const availability = resumeCard?.availability?.status || resumeCard?.availability?.commitment || "Available now";
  
  // Format rate
  const rate = resumeCard?.rate;
  const rateDisplay = rate?.amount 
    ? `${rate.amount} ${rate.currency || 'USD'}/${rate.unit || 'hr'}`
    : "Rate not specified";
  
  // Get all skills (combine technical and soft skills)
  const technicalSkills = resumeCard?.technical_skills?.map((s: any) => 
    typeof s === 'string' ? s : s.skill
  ) || [];
  const softSkills = resumeCard?.soft_skills || [];
  const allSkills = resumeCard?.all_skills || [...technicalSkills, ...softSkills];
  
  // Display max 5 skills on card
  const displaySkills = allSkills.slice(0, 5);
  const remainingSkills = allSkills.length - displaySkills.length;
  
  // Truncate summary to ~150 characters
  const truncatedSummary = summary.length > 150 
    ? summary.substring(0, 150) + "..." 
    : summary;
  
  // Placeholder match percentage (random for now)
  const matchPercent = Math.floor(Math.random() * 30) + 55; // 55-85%

  return (
    <Card 
      className="h-full flex flex-col hover:shadow-lg transition-shadow duration-200"
      data-testid={`card-profile-${resume.id}`}
    >
      <CardContent className="p-6 flex flex-col flex-1">
        {/* Header: Name, Title, Match */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="font-semibold text-lg text-foreground" data-testid={`text-name-${resume.id}`}>
              {name}
            </h3>
            <p className="text-sm text-muted-foreground" data-testid={`text-title-${resume.id}`}>
              {title}
            </p>
          </div>
          <div className="ml-2">
            <Badge variant="secondary" className="text-xs">
              {matchPercent}% match
            </Badge>
          </div>
        </div>

        {/* Job Match Score Bar - placeholder */}
        <div className="mb-4">
          <div className="text-xs text-muted-foreground mb-1">Job Match Score</div>
          <div className="w-full bg-secondary rounded-full h-2">
            <div 
              className="bg-primary rounded-full h-2 transition-all duration-300"
              style={{ width: `${matchPercent}%` }}
            />
          </div>
        </div>

        {/* Summary */}
        {truncatedSummary && (
          <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
            {truncatedSummary}
          </p>
        )}

        {/* Key Info */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center text-sm text-muted-foreground">
            <MapPin className="w-4 h-4 mr-2 flex-shrink-0" />
            <span className="truncate">{location}</span>
          </div>
          <div className="flex items-center text-sm text-muted-foreground">
            <Clock className="w-4 h-4 mr-2 flex-shrink-0" />
            <span className="truncate">{availability}</span>
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

        {/* Actions */}
        <div className="mt-auto pt-4 flex gap-2">
          <Button 
            className="flex-1"
            onClick={() => onViewProfile(resume.id)}
            data-testid={`button-view-profile-${resume.id}`}
          >
            View Full Profile
          </Button>
          <Button 
            variant="outline" 
            size="icon"
            data-testid={`button-contact-${resume.id}`}
          >
            <Mail className="w-4 h-4" />
          </Button>
          <Button 
            variant="outline" 
            size="icon"
            data-testid={`button-phone-${resume.id}`}
          >
            <Phone className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
