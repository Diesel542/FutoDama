import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface JobCardSkeletonProps {
  message?: string;
  subMessage?: string;
}

export default function JobCardSkeleton({ 
  message = "Analyzing job description...", 
  subMessage = "Futodama is extracting requirements, competencies, and context. This may take up to 30 seconds."
}: JobCardSkeletonProps) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6" data-testid="job-card-skeleton">
      {/* Main Content Column */}
      <div className="xl:col-span-2 space-y-6">
        {/* Job Overview Header - with message */}
        <Card data-testid="card-skeleton-overview">
          <CardContent className="p-6">
            <div className="flex flex-col items-center justify-center py-8">
              <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin mb-4" />
              <h2 className="text-lg font-semibold text-foreground mb-2" data-testid="text-processing-message">
                {message}
              </h2>
              <p className="text-sm text-muted-foreground text-center max-w-md" data-testid="text-processing-submessage">
                {subMessage}
              </p>
            </div>
            
            <div className="border-t border-border pt-4 mt-4">
              <Skeleton className="h-4 w-24 mb-3" />
              <div className="space-y-2">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-5/6" />
                <Skeleton className="h-3 w-4/6" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Requirements Section Skeleton */}
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-5 w-32 mb-4" />
            
            <div className="mb-6">
              <Skeleton className="h-4 w-40 mb-3" />
              <Skeleton className="h-3 w-full" />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Skeleton className="h-4 w-32 mb-3" />
                <div className="flex flex-wrap gap-2">
                  <Skeleton className="h-6 w-20 rounded-full" />
                  <Skeleton className="h-6 w-24 rounded-full" />
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
              </div>
              <div>
                <Skeleton className="h-4 w-28 mb-3" />
                <div className="flex flex-wrap gap-2">
                  <Skeleton className="h-6 w-18 rounded-full" />
                  <Skeleton className="h-6 w-22 rounded-full" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Competencies Section Skeleton */}
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-5 w-44 mb-4" />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Skeleton className="h-4 w-40 mb-2" />
                  <div className="flex flex-wrap gap-2">
                    <Skeleton className="h-6 w-20 rounded-full" />
                    <Skeleton className="h-6 w-16 rounded-full" />
                  </div>
                </div>
                <div>
                  <Skeleton className="h-4 w-36 mb-2" />
                  <div className="flex flex-wrap gap-2">
                    <Skeleton className="h-6 w-24 rounded-full" />
                    <Skeleton className="h-6 w-18 rounded-full" />
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <Skeleton className="h-4 w-32 mb-2" />
                  <div className="flex flex-wrap gap-2">
                    <Skeleton className="h-6 w-22 rounded-full" />
                    <Skeleton className="h-6 w-20 rounded-full" />
                  </div>
                </div>
                <div>
                  <Skeleton className="h-4 w-44 mb-2" />
                  <div className="flex flex-wrap gap-2">
                    <Skeleton className="h-6 w-16 rounded-full" />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sidebar Column Skeleton */}
      <div className="space-y-6">
        {/* Contact Information Skeleton */}
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-5 w-40 mb-4" />
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <Skeleton className="w-10 h-10 rounded-full" />
                <div>
                  <Skeleton className="h-4 w-32 mb-1" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
              <div className="space-y-2 pl-13">
                <Skeleton className="h-3 w-44" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Project Details Skeleton */}
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-5 w-32 mb-4" />
            <div className="space-y-4">
              <div>
                <Skeleton className="h-3 w-20 mb-1" />
                <Skeleton className="h-4 w-28" />
              </div>
              <div>
                <Skeleton className="h-3 w-16 mb-1" />
                <Skeleton className="h-4 w-24" />
              </div>
              <div>
                <Skeleton className="h-3 w-20 mb-1" />
                <Skeleton className="h-4 w-20" />
              </div>
              <div>
                <Skeleton className="h-3 w-24 mb-1" />
                <Skeleton className="h-4 w-28" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Language Requirements Skeleton */}
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-5 w-44 mb-4" />
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
