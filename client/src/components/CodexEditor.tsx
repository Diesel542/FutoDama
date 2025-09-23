import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Save, X, AlertTriangle, CheckCircle, Eye, Code, Settings, FileText } from "lucide-react";
import JSONInput from 'react-json-editor-ajrm';
// @ts-ignore
import locale from 'react-json-editor-ajrm/locale/en';
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

interface CodexEditorProps {
  open: boolean;
  onClose: () => void;
  codex: any;
}

export default function CodexEditor({ open, onClose, codex }: CodexEditorProps) {
  const { toast } = useToast();
  
  // Form state
  const [metadata, setMetadata] = useState({
    id: '',
    name: '',
    description: '',
    version: '1.0.0'
  });
  
  // JSON editor states
  const [schema, setSchema] = useState({});
  const [prompts, setPrompts] = useState({
    system: '',
    user: ''
  });
  const [missingRules, setMissingRules] = useState([]);
  const [normalizationRules, setNormalizationRules] = useState([]);
  
  // Validation states
  const [schemaValid, setSchemaValid] = useState(true);
  const [missingRulesValid, setMissingRulesValid] = useState(true);
  const [normalizationValid, setNormalizationValid] = useState(true);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  
  // UI state
  const [activeTab, setActiveTab] = useState('metadata');
  const [previewMode, setPreviewMode] = useState(false);

  // Initialize form with codex data
  useEffect(() => {
    if (codex) {
      setMetadata({
        id: codex.id || '',
        name: codex.name || '',
        description: codex.description || '',
        version: codex.version || '1.0.0'
      });
      
      setSchema(codex.schema || {});
      setPrompts({
        system: codex.prompts?.system || '',
        user: codex.prompts?.user || ''
      });
      setMissingRules(codex.missingRules || []);
      setNormalizationRules(codex.normalizationRules || []);
    }
  }, [codex]);

  // Update mutation
  const updateCodexMutation = useMutation({
    mutationFn: async (updatedCodex: any) => {
      const response = await fetch(`/api/codex/${codex.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedCodex)
      });
      if (!response.ok) throw new Error('Failed to update codex');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/codex'] });
      toast({
        title: "AI Agent Updated",
        description: "Changes have been saved successfully.",
      });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Update failed",
        description: error instanceof Error ? error.message : "Failed to update AI agent",
        variant: "destructive"
      });
    }
  });

  // Validation function
  const validateCodex = () => {
    const errors: string[] = [];
    
    // Basic validation
    if (!metadata.id) errors.push("Agent ID is required");
    if (!metadata.name) errors.push("Agent name is required");
    if (!prompts.system) errors.push("System prompt is required");
    if (!prompts.user) errors.push("User prompt is required");
    
    // Schema validation
    if (!schema || typeof schema !== 'object' || Object.keys(schema).length === 0) {
      errors.push("Valid JSON schema is required");
    }
    
    setValidationErrors(errors);
    return errors.length === 0;
  };

  // Handle save
  const handleSave = () => {
    if (!validateCodex()) {
      toast({
        title: "Validation failed",
        description: "Please fix the validation errors before saving.",
        variant: "destructive"
      });
      return;
    }

    const updatedCodex = {
      id: metadata.id,
      version: metadata.version,
      name: metadata.name,
      description: metadata.description,
      schema,
      prompts,
      missingRules,
      normalizationRules
    };

    updateCodexMutation.mutate(updatedCodex);
  };

  // Generate preview
  const generatePreview = () => {
    return {
      metadata,
      schema,
      prompts,
      missingRules,
      normalizationRules
    };
  };

  const isValid = validationErrors.length === 0 && schemaValid && missingRulesValid && normalizationValid;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden" data-testid="modal-codex-editor">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold text-foreground">
              Advanced Codex Editor
            </DialogTitle>
            <div className="flex items-center space-x-2">
              <Badge variant={isValid ? "default" : "destructive"}>
                {isValid ? (
                  <>
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Valid
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Invalid
                  </>
                )}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPreviewMode(!previewMode)}
                data-testid="button-toggle-preview"
              >
                <Eye className="w-4 h-4 mr-1" />
                {previewMode ? 'Edit' : 'Preview'}
              </Button>
            </div>
          </div>
          {codex && (
            <p className="text-sm text-muted-foreground">
              Editing: {codex.name} ({codex.id})
            </p>
          )}
        </DialogHeader>

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                {validationErrors.map((error, index) => (
                  <div key={index}>• {error}</div>
                ))}
              </div>
            </AlertDescription>
          </Alert>
        )}

        <div className="flex-1 overflow-hidden">
          {previewMode ? (
            <ScrollArea className="h-[60vh]">
              <div className="p-4 bg-muted/20 rounded-lg">
                <h3 className="font-medium mb-3">Codex Preview</h3>
                <JSONInput
                  placeholder={generatePreview()}
                  locale={locale}
                  height="500px"
                  width="100%"
                  viewOnly={true}
                  theme="dark_vscode_tribute"
                />
              </div>
            </ScrollArea>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="metadata" className="text-xs">
                  <Settings className="w-3 h-3 mr-1" />
                  Metadata
                </TabsTrigger>
                <TabsTrigger value="schema" className="text-xs">
                  <Code className="w-3 h-3 mr-1" />
                  Schema
                </TabsTrigger>
                <TabsTrigger value="prompts" className="text-xs">
                  <FileText className="w-3 h-3 mr-1" />
                  Prompts
                </TabsTrigger>
                <TabsTrigger value="missing-rules" className="text-xs">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Missing Rules
                </TabsTrigger>
                <TabsTrigger value="normalization" className="text-xs">
                  <Settings className="w-3 h-3 mr-1" />
                  Normalization
                </TabsTrigger>
              </TabsList>

              <ScrollArea className="h-[55vh] mt-4">
                <TabsContent value="metadata" className="space-y-4 p-1">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="edit-id">Agent ID</Label>
                      <Input
                        id="edit-id"
                        value={metadata.id}
                        onChange={(e) => setMetadata(prev => ({ ...prev, id: e.target.value }))}
                        data-testid="input-edit-id"
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-version">Version</Label>
                      <Input
                        id="edit-version"
                        value={metadata.version}
                        onChange={(e) => setMetadata(prev => ({ ...prev, version: e.target.value }))}
                        data-testid="input-edit-version"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="edit-name">Agent Name</Label>
                    <Input
                      id="edit-name"
                      value={metadata.name}
                      onChange={(e) => setMetadata(prev => ({ ...prev, name: e.target.value }))}
                      data-testid="input-edit-name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-description">Description</Label>
                    <Textarea
                      id="edit-description"
                      value={metadata.description}
                      onChange={(e) => setMetadata(prev => ({ ...prev, description: e.target.value }))}
                      rows={3}
                      data-testid="input-edit-description"
                    />
                  </div>
                </TabsContent>

                <TabsContent value="schema" className="space-y-4 p-1">
                  <div>
                    <Label>JSON Schema</Label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Define the structure for extracted job information
                    </p>
                    <JSONInput
                      placeholder={schema}
                      locale={locale}
                      height="400px"
                      width="100%"
                      onChange={(result: any) => {
                        if (result.jsObject && typeof result.jsObject === 'object') {
                          setSchema(result.jsObject);
                          setSchemaValid(!result.error);
                        }
                      }}
                      theme="dark_vscode_tribute"
                      data-testid="json-editor-schema"
                    />
                  </div>
                </TabsContent>

                <TabsContent value="prompts" className="space-y-4 p-1">
                  <div>
                    <Label htmlFor="system-prompt">System Prompt</Label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Instructions for the AI model's behavior and role
                    </p>
                    <Textarea
                      id="system-prompt"
                      value={prompts.system}
                      onChange={(e) => setPrompts(prev => ({ ...prev, system: e.target.value }))}
                      rows={6}
                      data-testid="textarea-system-prompt"
                    />
                  </div>
                  <div>
                    <Label htmlFor="user-prompt">User Prompt</Label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Template for processing job descriptions
                    </p>
                    <Textarea
                      id="user-prompt"
                      value={prompts.user}
                      onChange={(e) => setPrompts(prev => ({ ...prev, user: e.target.value }))}
                      rows={6}
                      data-testid="textarea-user-prompt"
                    />
                  </div>
                </TabsContent>

                <TabsContent value="missing-rules" className="space-y-4 p-1">
                  <div>
                    <Label>Missing Field Rules</Label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Define validation rules for missing fields
                    </p>
                    <JSONInput
                      placeholder={missingRules}
                      locale={locale}
                      height="400px"
                      width="100%"
                      onChange={(result: any) => {
                        if (result.jsObject && Array.isArray(result.jsObject)) {
                          setMissingRules(result.jsObject);
                          setMissingRulesValid(!result.error);
                        }
                      }}
                      theme="dark_vscode_tribute"
                      data-testid="json-editor-missing-rules"
                    />
                  </div>
                </TabsContent>

                <TabsContent value="normalization" className="space-y-4 p-1">
                  <div>
                    <Label>Normalization Rules</Label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Define field value normalization mappings
                    </p>
                    <JSONInput
                      placeholder={normalizationRules}
                      locale={locale}
                      height="400px"
                      width="100%"
                      onChange={(result: any) => {
                        if (result.jsObject && Array.isArray(result.jsObject)) {
                          setNormalizationRules(result.jsObject);
                          setNormalizationValid(!result.error);
                        }
                      }}
                      theme="dark_vscode_tribute"
                      data-testid="json-editor-normalization"
                    />
                  </div>
                </TabsContent>
              </ScrollArea>
            </Tabs>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center pt-4 border-t">
          <div className="text-xs text-muted-foreground">
            {updateCodexMutation.isPending && "Saving changes..."}
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={onClose}
              data-testid="button-cancel-edit"
            >
              <X className="w-4 h-4 mr-1" />
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!isValid || updateCodexMutation.isPending}
              data-testid="button-save-codex"
            >
              <Save className="w-4 h-4 mr-1" />
              {updateCodexMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}