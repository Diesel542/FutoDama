import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import JobDescriptionCard from "@/components/JobDescriptionCard";
import type { Job } from "@shared/schema";

interface JobDescriptionsPageProps {
  onViewDetails: (jobId: string) => void;
}

export default function JobDescriptionsPage({ onViewDetails }: JobDescriptionsPageProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const limit = 12;

  // Fetch jobs with pagination
  const { data, isLoading, error } = useQuery({
    queryKey: ['/api/jobs', currentPage, limit],
    queryFn: async () => {
      const response = await fetch(`/api/jobs?page=${currentPage}&limit=${limit}&status=completed`);
      if (!response.ok) {
        throw new Error('Failed to fetch job descriptions');
      }
      return response.json();
    },
  });

  const jobs = data?.jobs || [];
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
          <p className="text-lg text-muted-foreground">Loading job descriptions...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[600px]">
        <div className="text-center">
          <p className="text-lg text-destructive">Failed to load job descriptions</p>
          <p className="text-sm text-muted-foreground mt-2">
            {error instanceof Error ? error.message : 'Unknown error'}
          </p>
        </div>
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="flex items-center justify-center h-[600px]">
        <div className="text-center">
          <p className="text-lg text-muted-foreground">No job descriptions found</p>
          <p className="text-sm text-muted-foreground mt-2">
            Upload some job descriptions to get started
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with count */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">
            {pagination.total} Job Description{pagination.total !== 1 ? 's' : ''} Found
          </h2>
          <p className="text-sm text-muted-foreground">
            Browse and manage your stored job descriptions
          </p>
        </div>
      </div>

      {/* Job Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {jobs.map((job: Job) => (
          <JobDescriptionCard
            key={job.id}
            job={job}
            onViewDetails={onViewDetails}
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
