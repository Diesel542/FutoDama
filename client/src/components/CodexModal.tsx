import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { FileCode, Download, Edit, Upload, Plus, Check, X } from "lucide-react";
import { getAllCodexes, exportCodex } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import PromptBuilder from "./PromptBuilder";

interface CodexModalProps {
  open: boolean;
  onClose: () => void;
  selectedCodexId?: string;
}

export default function CodexModal({ open, onClose, selectedCodexId }: CodexModalProps) {
  const { toast } = useToast();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [editingCodex, setEditingCodex] = useState<any>(null);
  const [newCodex, setNewCodex] = useState({
    id: '',
    name: '',
    description: '',
    version: '1.0.0'
  });
  
  const { data: codexes, isLoading, refetch } = useQuery({
    queryKey: ['/api/codex'],
    queryFn: getAllCodexes,
    enabled: open,
  });

  // Create new codex mutation
  const createCodexMutation = useMutation({
    mutationFn: async (codexData: any) => {
      const response = await fetch('/api/codex', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(codexData)
      });
      if (!response.ok) throw new Error('Failed to create codex');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/codex'] });
      setShowCreateForm(false);
      setNewCodex({ id: '', name: '', description: '', version: '1.0.0' });
      toast({
        title: "AI Agent Created",
        description: "New AI agent has been created successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Creation failed",
        description: error instanceof Error ? error.message : "Failed to create AI agent",
        variant: "destructive"
      });
    }
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

  const handleCreateCodex = () => {
    if (!newCodex.id || !newCodex.name) {
      toast({
        title: "Missing information",
        description: "Please provide both ID and name for the AI agent.",
        variant: "destructive"
      });
      return;
    }

    // Create a basic codex structure
    const codexData = {
      id: newCodex.id,
      version: newCodex.version,
      name: newCodex.name,
      description: newCodex.description,
      schema: {
        // Basic job card schema
        type: "object",
        properties: {
          basics: { type: "object" },
          requirements: { type: "object" },
          contact: { type: "object" }
        }
      },
      prompts: {
        system: "You are a job description extractor. Extract relevant information from job descriptions into structured JSON format. Always return a valid JSON object.",
        user: "Extract the job information from the following text into the specified JSON schema format. Return the extracted data as a JSON object."
      },
      missingRules: []
    };

    createCodexMutation.mutate(codexData);
  };

  const handleEditCodex = (codex: any) => {
    setEditingCodex(codex);
    setShowEditor(true);
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
            {/* Create New AI Agent Form */}
            {showCreateForm && (
              <div className="bg-accent/10 border border-accent/20 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-foreground">Create New AI Agent</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowCreateForm(false)}
                    data-testid="button-cancel-create"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="codex-id">Agent ID</Label>
                    <Input
                      id="codex-id"
                      placeholder="e.g., tech-job-extractor"
                      value={newCodex.id}
                      onChange={(e) => setNewCodex(prev => ({ ...prev, id: e.target.value }))}
                      data-testid="input-codex-id"
                    />
                  </div>
                  <div>
                    <Label htmlFor="codex-name">Agent Name</Label>
                    <Input
                      id="codex-name"
                      placeholder="e.g., Technology Job Extractor"
                      value={newCodex.name}
                      onChange={(e) => setNewCodex(prev => ({ ...prev, name: e.target.value }))}
                      data-testid="input-codex-name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="codex-description">Description</Label>
                    <Textarea
                      id="codex-description"
                      placeholder="Describe what this AI agent specializes in..."
                      value={newCodex.description}
                      onChange={(e) => setNewCodex(prev => ({ ...prev, description: e.target.value }))}
                      data-testid="input-codex-description"
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowCreateForm(false)}
                      data-testid="button-cancel-create-form"
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleCreateCodex}
                      disabled={createCodexMutation.isPending}
                      data-testid="button-create-codex"
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      {createCodexMutation.isPending ? 'Creating...' : 'Create Agent'}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Active Codex */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-foreground">AI Agent Library</h3>
                {!showCreateForm && (
                  <Button
                    size="sm"
                    onClick={() => setShowCreateForm(true)}
                    data-testid="button-add-new-agent"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create New Agent
                  </Button>
                )}
              </div>
              
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse flex items-center justify-between p-4 bg-muted/20 rounded-lg">
                      <div className="space-y-2">
                        <div className="h-4 bg-muted rounded w-32"></div>
                        <div className="h-3 bg-muted rounded w-48"></div>
                        <div className="h-3 bg-muted rounded w-24"></div>
                      </div>
                      <div className="h-8 bg-muted rounded w-16"></div>
                    </div>
                  ))}
                </div>
              ) : codexes && codexes.length > 0 ? (
                <div className="space-y-3" data-testid="codex-library">
                  {codexes.map((codex: any, index: number) => (
                    <div key={codex.id} className="flex flex-col p-4 bg-card border border-border rounded-lg hover:bg-accent/50 transition-colors" data-testid={`codex-item-${index}`}>
                      <div>
                        <div className="flex items-center space-x-2 mb-2">
                          <h4 className="font-medium text-sm" data-testid={`codex-name-${index}`}>
                            {codex.name || codex.id}
                          </h4>
                          {codex.id === selectedCodexId && <Badge variant="default" className="text-xs">Current</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground mb-1" data-testid={`codex-description-${index}`}>
                          {codex.description || 'No description available'}
                        </p>
                        <p className="text-xs text-muted-foreground" data-testid={`codex-version-${index}`}>
                          Version: {codex.version} • ID: {codex.id}
                        </p>
                      </div>
                      <div className="flex justify-end space-x-2 mt-3">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleExport(codex.id)}
                          data-testid={`button-export-${index}`}
                        >
                          <Download className="w-3 h-3 mr-1" />
                          Export
                        </Button>
                        <Button 
                          variant="secondary" 
                          size="sm" 
                          onClick={() => handleEditCodex(codex)}
                          data-testid={`button-edit-${index}`}
                        >
                          <Edit className="w-3 h-3 mr-1" />
                          Edit
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileCode className="w-12 h-12 text-muted-foreground mb-3 mx-auto" />
                  <p className="text-sm text-muted-foreground">No AI agents available</p>
                  <p className="text-xs text-muted-foreground mt-1">Create your first AI agent to get started</p>
                </div>
              )}

              {/* Import Section */}
              <div className="mt-6 border-t border-border pt-6">
                <h4 className="text-sm font-medium text-foreground mb-3">Import AI Agent</h4>
                <div className="border-2 border-dashed border-border rounded-lg p-4 text-center" data-testid="import-zone">
                  <Upload className="w-6 h-6 text-muted-foreground mb-2 mx-auto" />
                  <p className="text-xs text-muted-foreground mb-2">
                    Upload a JSON codex file to import an existing AI agent
                  </p>
                  <Button variant="outline" size="sm" data-testid="button-choose-codex">
                    <Upload className="w-3 h-3 mr-1" />
                    Choose File
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
      
      {/* PromptBuilder Modal */}
      {showEditor && editingCodex && (
        <PromptBuilder
          open={showEditor}
          onClose={() => {
            setShowEditor(false);
            setEditingCodex(null);
          }}
          codex={editingCodex}
        />
      )}
    </Dialog>
  );
}
