import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  FileDown, 
  Loader2, 
  XCircle, 
  Briefcase, 
  User,
  ArrowLeft,
  FileText,
  Sparkles
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CvPreview } from "./CvPreview";
import { TEMPLATE_OPTIONS, getTemplateWithLogo, type CvTemplateId } from "@shared/cvTemplates";
import type { TailoredResumeBundle } from "./TailorPanels";

interface PreviewModePanelProps {
  bundle: TailoredResumeBundle | null;
  candidateName: string;
  jobTitle: string;
  companyName?: string;
  onBack: () => void;
  selectedTemplateId: CvTemplateId;
  onTemplateChange: (id: CvTemplateId) => void;
  logoUrl: string;
  onLogoUrlChange: (url: string) => void;
}

export function PreviewModePanel({ 
  bundle, 
  candidateName, 
  jobTitle,
  companyName,
  onBack,
  selectedTemplateId,
  onTemplateChange,
  logoUrl,
  onLogoUrlChange
}: PreviewModePanelProps) {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  
  const currentTemplate = getTemplateWithLogo(selectedTemplateId, logoUrl || undefined);

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportCv = async (format: 'pdf' | 'docx') => {
    if (!bundle) return;
    
    setIsExporting(true);
    try {
      const response = await fetch('/api/tailor/export-cv', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          resume: bundle.tailored_resume,
          templateId: selectedTemplateId,
          logoUrl: logoUrl || undefined,
          format,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Failed to generate ${format.toUpperCase()}`);
      }
      
      const blob = await response.blob();
      const safeName = candidateName.replace(/\s+/g, '-');
      const safeJob = jobTitle.replace(/\s+/g, '-');
      const ext = format === 'pdf' ? 'pdf' : 'docx';
      const filename = `${safeName}-${safeJob}-Futodama-CV.${ext}`;
      
      downloadBlob(blob, filename);
      
      toast({ 
        title: `${format.toUpperCase()} Exported!`, 
        description: `Downloaded CV as ${format.toUpperCase()}` 
      });
    } catch (err) {
      console.error(`${format} export error:`, err);
      toast({ 
        title: "Export Failed", 
        description: err instanceof Error ? err.message : `Could not generate ${format.toUpperCase()}`,
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col" data-testid="preview-mode-container">
      <header className="border-b border-border bg-card sticky top-0 z-10 flex-shrink-0">
        <div className="max-w-[1400px] mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={onBack}
                data-testid="button-exit-preview"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Tailoring
              </Button>
              <div className="border-l border-border pl-4">
                <h1 className="text-lg font-semibold text-foreground">CV Preview</h1>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    {candidateName}
                  </span>
                  <span>for</span>
                  <span className="flex items-center gap-1">
                    <Briefcase className="w-3 h-3" />
                    {jobTitle}
                    {companyName && ` at ${companyName}`}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <Label htmlFor="template-select-preview" className="text-sm text-muted-foreground whitespace-nowrap">
                  Template
                </Label>
                <Select 
                  value={selectedTemplateId} 
                  onValueChange={(value) => onTemplateChange(value as CvTemplateId)}
                >
                  <SelectTrigger id="template-select-preview" className="w-[140px] h-9" data-testid="select-template-preview">
                    <SelectValue placeholder="Select template" />
                  </SelectTrigger>
                  <SelectContent>
                    {TEMPLATE_OPTIONS.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="border-l border-border pl-4 flex items-center gap-2">
                <Input 
                  placeholder="Logo URL (optional)"
                  value={logoUrl}
                  onChange={(e) => onLogoUrlChange(e.target.value)}
                  className="h-9 w-[180px] text-sm"
                  data-testid="input-logo-url-preview"
                />
                {logoUrl && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => onLogoUrlChange('')}
                    className="h-9 px-2"
                  >
                    <XCircle className="w-4 h-4" />
                  </Button>
                )}
              </div>

              <div className="border-l border-border pl-4 flex items-center gap-2">
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => handleExportCv('pdf')}
                  disabled={isExporting || !bundle}
                  className="h-9"
                  data-testid="button-export-pdf-preview"
                >
                  {isExporting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <FileDown className="w-4 h-4 mr-2" />
                  )}
                  Export PDF
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExportCv('docx')}
                  disabled={isExporting || !bundle}
                  className="h-9"
                  data-testid="button-export-word-preview"
                >
                  {isExporting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <FileDown className="w-4 h-4 mr-2" />
                  )}
                  Export Word
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-auto">
        <div className="max-w-[1200px] mx-auto px-6 py-8">
          <div className="flex justify-center">
            {bundle ? (
              <div 
                className="bg-white rounded-lg overflow-hidden"
                style={{
                  boxShadow: '0 20px 60px rgba(0, 0, 0, 0.25), 0 8px 24px rgba(0, 0, 0, 0.15)',
                  width: '100%',
                  maxWidth: '900px',
                }}
                data-testid="cv-preview-fullwidth-card"
              >
                <CvPreview 
                  bundle={bundle} 
                  template={currentTemplate}
                  candidateName={candidateName}
                  fullWidth={true}
                />
              </div>
            ) : (
              <div 
                className="bg-card rounded-lg border border-border p-12 text-center"
                style={{ width: '100%', maxWidth: '600px' }}
                data-testid="cv-preview-empty-state"
              >
                <Sparkles className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h2 className="text-xl font-semibold text-foreground mb-2">
                  No Resume to Preview
                </h2>
                <p className="text-muted-foreground mb-6">
                  Generate a tailored resume first to see a preview here. Go back to the workspace and click "Generate Tailored Resume" to get started.
                </p>
                <Button onClick={onBack} variant="outline">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Workspace
                </Button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
