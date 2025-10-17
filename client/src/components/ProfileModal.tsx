import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Loader2 } from "lucide-react";
import { PDFViewer } from "@/components/PDFViewer";
import ResumeCard from "@/components/ResumeCard";
import type { Resume } from "@shared/schema";

interface ProfileModalProps {
  resumeId: string | null;
  open: boolean;
  onClose: () => void;
}

type ViewMode = 'split' | 'extracted';

export default function ProfileModal({ resumeId, open, onClose }: ProfileModalProps) {
  const [resumeData, setResumeData] = useState<Resume | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('extracted');
  const [error, setError] = useState<string | null>(null);

  // Fetch resume data when resumeId changes
  useEffect(() => {
    if (resumeId && open) {
      setIsLoading(true);
      setError(null);
      
      fetch(`/api/resumes/${resumeId}`)
        .then(res => {
          if (!res.ok) throw new Error('Failed to fetch resume');
          return res.json();
        })
        .then(data => {
          setResumeData(data);
          // Auto-switch to split view if document is available
          if (data.documentPath) {
            setViewMode('split');
          } else {
            setViewMode('extracted');
          }
          setIsLoading(false);
        })
        .catch(err => {
          setError(err.message);
          setIsLoading(false);
        });
    } else {
      setResumeData(null);
      setViewMode('extracted');
    }
  }, [resumeId, open]);

  // Reset when modal closes
  useEffect(() => {
    if (!open) {
      setResumeData(null);
      setError(null);
      setViewMode('extracted');
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-[95vw] w-[95vw] h-[95vh] max-h-[95vh] p-0 gap-0"
        data-testid="dialog-profile-modal"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-card">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold text-foreground">
              {resumeData?.resumeCard?.personal_info?.name || "Profile Details"}
            </h2>
            
            {/* View Mode Toggle */}
            {resumeData?.documentPath && (
              <div className="flex gap-2">
                <Button
                  variant={viewMode === 'split' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('split')}
                  data-testid="button-modal-split-view"
                >
                  Split View
                </Button>
                <Button
                  variant={viewMode === 'extracted' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('extracted')}
                  data-testid="button-modal-extracted-view"
                >
                  Extracted Only
                </Button>
              </div>
            )}
          </div>
          
          <Button 
            variant="ghost" 
            size="icon"
            onClick={onClose}
            data-testid="button-close-modal"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {isLoading && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Loader2 className="w-16 h-16 mx-auto mb-4 animate-spin text-primary" />
                <p className="text-lg text-muted-foreground">Loading profile...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-lg text-destructive">Failed to load profile</p>
                <p className="text-sm text-muted-foreground mt-2">{error}</p>
              </div>
            </div>
          )}

          {!isLoading && !error && resumeData && (
            <>
              {/* Split view layout */}
              {viewMode === 'split' && resumeData.documentPath && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
                  {/* Left: Document Viewer */}
                  <div className="border border-border rounded-lg p-4 bg-card">
                    <h3 className="text-lg font-semibold mb-4">Original Document</h3>
                    <PDFViewer url={resumeData.documentPath} />
                  </div>

                  {/* Right: Extracted Information */}
                  <div className="overflow-y-auto" style={{ maxHeight: 'calc(95vh - 120px)' }}>
                    <ResumeCard 
                      resumeCard={resumeData.resumeCard as any} 
                      documentPath={resumeData.documentPath}
                    />
                  </div>
                </div>
              )}

              {/* Extracted only view */}
              {viewMode === 'extracted' && (
                <div className="max-w-5xl mx-auto">
                  <ResumeCard 
                    resumeCard={resumeData.resumeCard as any} 
                    documentPath={resumeData.documentPath || undefined}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
