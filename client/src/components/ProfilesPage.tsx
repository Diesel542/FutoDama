import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import ProfileCard from "@/components/ProfileCard";
import { apiRequest } from "@/lib/queryClient";
import type { Resume, Job } from "@shared/schema";

interface ProfilesPageProps {
  onViewProfile: (resumeId: string) => void;
}

interface MatchResult {
  resumeId: string;
  candidateName: string;
  overlapScore: number;
  matchedSkills: string[];
  missingSkills: string[];
  mustHaveMatches: number;
  mustHaveRequired: number;
  niceToHaveMatches: number;
  niceToHaveTotal: number;
}

export default function ProfilesPage({ onViewProfile }: ProfilesPageProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [matchResults, setMatchResults] = useState<Map<string, MatchResult>>(new Map());
  const [matchSessionId, setMatchSessionId] = useState<string | null>(null);
  const limit = 12;

  // Fetch available jobs for the dropdown
  const { data: jobsData } = useQuery({
    queryKey: ['/api/jobs'],
    queryFn: async () => {
      const response = await fetch('/api/jobs?status=completed');
      if (!response.ok) throw new Error('Failed to fetch jobs');
      return response.json();
    },
  });

  const jobs: Job[] = jobsData?.jobs || [];

  // Mutation to run Step 1 matching
  const matchMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const response = await apiRequest('POST', `/api/jobs/${jobId}/match/step1`);
      return response.json();
    },
    onSuccess: (data) => {
      // Store session ID for Step 2
      if (data.sessionId) {
        setMatchSessionId(data.sessionId);
      }
      // Convert matches array to a map by resumeId
      const newMatchResults = new Map<string, MatchResult>();
      if (data.matches) {
        data.matches.forEach((match: any) => {
          newMatchResults.set(match.resumeId, match);
        });
      }
      setMatchResults(newMatchResults);
    },
  });

  // Trigger matching when job is selected
  useEffect(() => {
    if (selectedJobId) {
      matchMutation.mutate(selectedJobId);
    } else {
      setMatchResults(new Map());
    }
  }, [selectedJobId]);

  // Get the selected job title for display
  const selectedJob = jobs.find(j => j.id === selectedJobId);
  const selectedJobTitle = selectedJob?.jobCard 
    ? (selectedJob.jobCard as any)?.basics?.title || 'Selected Job'
    : 'No job selected';

  // Fetch resumes with pagination
  const { data, isLoading, error } = useQuery({
    queryKey: ['/api/resumes', currentPage, limit],
    queryFn: async () => {
      const response = await fetch(`/api/resumes?page=${currentPage}&limit=${limit}&status=completed`);
      if (!response.ok) {
        throw new Error('Failed to fetch profiles');
      }
      return response.json();
    },
  });

  const resumes = data?.resumes || [];
  const pagination = data?.pagination || { page: 1, limit: 12, total: 0, totalPages: 0 };

  // Pagination handlers
  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < pagination.totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePageClick = (page: number) => {
    setCurrentPage(page);
  };

  // Generate page numbers to display (max 7 pages)
  const getPageNumbers = () => {
    const { totalPages } = pagination;
    const pages: (number | string)[] = [];
    
    if (totalPages <= 7) {
      // Show all pages if 7 or fewer
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);
      
      if (currentPage > 3) {
        pages.push('...');
      }
      
      // Show pages around current page
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      
      if (currentPage < totalPages - 2) {
        pages.push('...');
      }
      
      // Always show last page
      pages.push(totalPages);
    }
    
    return pages;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[600px]">
        <div className="text-center">
          <Loader2 className="w-16 h-16 mx-auto mb-4 animate-spin text-primary" />
          <p className="text-lg text-muted-foreground">Loading profiles...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[600px]">
        <div className="text-center">
          <p className="text-lg text-destructive">Failed to load profiles</p>
          <p className="text-sm text-muted-foreground mt-2">
            {error instanceof Error ? error.message : 'Unknown error'}
          </p>
        </div>
      </div>
    );
  }

  if (resumes.length === 0) {
    return (
      <div className="flex items-center justify-center h-[600px]">
        <div className="text-center">
          <p className="text-lg text-muted-foreground">No profiles found</p>
          <p className="text-sm text-muted-foreground mt-2">
            Upload some resumes to get started
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with count and job selector */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">
            {pagination.total} Consultant{pagination.total !== 1 ? 's' : ''} Found
          </h2>
          {selectedJobId && (
            <p className="text-sm text-muted-foreground">
              Comparing against: {selectedJobTitle}
              {matchMutation.isPending && (
                <Loader2 className="inline-block w-3 h-3 ml-2 animate-spin" />
              )}
            </p>
          )}
          {!selectedJobId && (
            <p className="text-sm text-muted-foreground">
              Select a job to see match scores
            </p>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <Select value={selectedJobId} onValueChange={setSelectedJobId}>
            <SelectTrigger className="w-[300px]" data-testid="select-job">
              <SelectValue placeholder="Select a job to match against..." />
            </SelectTrigger>
            <SelectContent>
              {jobs.length === 0 ? (
                <SelectItem value="no-jobs" disabled>No jobs available</SelectItem>
              ) : (
                jobs.map((job) => {
                  const jobCard = job.jobCard as any;
                  const title = jobCard?.basics?.title || 'Untitled Job';
                  const company = jobCard?.basics?.company || '';
                  return (
                    <SelectItem key={job.id} value={job.id} data-testid={`option-job-${job.id}`}>
                      {title}{company ? ` - ${company}` : ''}
                    </SelectItem>
                  );
                })
              )}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Profile Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {resumes.map((resume: Resume) => (
          <ProfileCard
            key={resume.id}
            resume={resume}
            onViewProfile={onViewProfile}
            matchResult={matchResults.get(resume.id)}
            hasJobSelected={!!selectedJobId}
            selectedJobId={selectedJobId}
            sessionId={matchSessionId}
          />
        ))}
      </div>

      {/* Pagination Controls */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrevPage}
            disabled={currentPage === 1}
            data-testid="button-prev-page"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Previous
          </Button>

          <div className="flex gap-1">
            {getPageNumbers().map((page, index) => (
              typeof page === 'number' ? (
                <Button
                  key={index}
                  variant={currentPage === page ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handlePageClick(page)}
                  className="min-w-[40px]"
                  data-testid={`button-page-${page}`}
                >
                  {page}
                </Button>
              ) : (
                <span key={index} className="px-2 py-1 text-muted-foreground">
                  {page}
                </span>
              )
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleNextPage}
            disabled={currentPage === pagination.totalPages}
            data-testid="button-next-page"
          >
            Next
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}
