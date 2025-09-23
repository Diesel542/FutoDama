import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileCode, Download, Edit, Upload } from "lucide-react";
import { getAllCodexes, exportCodex } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface CodexModalProps {
  open: boolean;
  onClose: () => void;
}

export default function CodexModal({ open, onClose }: CodexModalProps) {
  const { toast } = useToast();
  
  const { data: codexes, isLoading } = useQuery({
    queryKey: ['/api/codex'],
    queryFn: getAllCodexes,
    enabled: open,
  });

  const handleExport = async (codexId: string) => {
    try {
      await exportCodex(codexId);
      toast({
        title: "Codex exported",
        description: `${codexId}.json has been downloaded successfully.`,
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: error instanceof Error ? error.message : "Failed to export codex",
        variant: "destructive"
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden" data-testid="modal-codex-management">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-foreground">
            AI Agent Codex Management
          </DialogTitle>
        </DialogHeader>
        
        <div className="overflow-y-auto">
          <div className="space-y-6">
            {/* Active Codex */}
            <div>
              <h3 className="text-lg font-medium text-foreground mb-4">Current Codex Configuration</h3>
              
              {isLoading ? (
                <div className="bg-accent/10 border border-accent/20 rounded-lg p-4">
                  <div className="animate-pulse">
                    <div className="h-4 bg-muted rounded w-1/3 mb-2"></div>
                    <div className="h-3 bg-muted rounded w-2/3"></div>
                  </div>
                </div>
              ) : codexes && codexes.length > 0 ? (
                <div className="bg-accent/10 border border-accent/20 rounded-lg p-4" data-testid="current-codex">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-medium" data-testid="text-codex-name">
                      {codexes[0].name || codexes[0].id}
                    </span>
                    <Badge variant="secondary" data-testid="badge-active">Active</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3" data-testid="text-codex-description">
                    {codexes[0].description || 'No description available'}
                  </p>
                  <div className="flex space-x-2">
                    <Button variant="secondary" size="sm" data-testid="button-edit-codex">
                      <Edit className="w-3 h-3 mr-1" />
                      Edit
                    </Button>
                    <Button 
                      size="sm"
                      onClick={() => handleExport(codexes[0].id)}
                      data-testid="button-export-codex"
                    >
                      <Download className="w-3 h-3 mr-1" />
                      Export
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="bg-accent/10 border border-accent/20 rounded-lg p-4">
                  <p className="text-sm text-muted-foreground">No codex configuration found</p>
                </div>
              )}
            </div>
            
            {/* Import New Codex */}
            <div>
              <h3 className="text-lg font-medium text-foreground mb-4">Import New Codex</h3>
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center" data-testid="import-zone">
                <FileCode className="w-8 h-8 text-muted-foreground mb-3 mx-auto" />
                <p className="text-sm text-muted-foreground mb-2">
                  Upload a JSON codex file to configure AI agent behavior
                </p>
                <Button variant="outline" size="sm" data-testid="button-choose-codex">
                  <Upload className="w-4 h-4 mr-2" />
                  Choose Codex File
                </Button>
              </div>
            </div>
            
            {/* Codex Library */}
            <div>
              <h3 className="text-lg font-medium text-foreground mb-4">Codex Library</h3>
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <div key={i} className="animate-pulse flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                      <div className="space-y-2">
                        <div className="h-4 bg-muted rounded w-32"></div>
                        <div className="h-3 bg-muted rounded w-48"></div>
                      </div>
                      <div className="h-8 bg-muted rounded w-16"></div>
                    </div>
                  ))}
                </div>
              ) : codexes && codexes.length > 0 ? (
                <div className="space-y-3" data-testid="codex-library">
                  {codexes.map((codex: any, index: number) => (
                    <div key={codex.id} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg" data-testid={`codex-item-${index}`}>
                      <div>
                        <p className="font-medium text-sm" data-testid={`codex-name-${index}`}>
                          {codex.name || codex.id}
                        </p>
                        <p className="text-xs text-muted-foreground" data-testid={`codex-description-${index}`}>
                          {codex.description || 'No description available'}
                        </p>
                        <p className="text-xs text-muted-foreground" data-testid={`codex-version-${index}`}>
                          Version: {codex.version}
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        {index !== 0 && (
                          <Button variant="secondary" size="sm" data-testid={`button-load-${index}`}>
                            Load
                          </Button>
                        )}
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleExport(codex.id)}
                          data-testid={`button-export-${index}`}
                        >
                          <Download className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileCode className="w-12 h-12 text-muted-foreground mb-3 mx-auto" />
                  <p className="text-sm text-muted-foreground">No codexes available</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
