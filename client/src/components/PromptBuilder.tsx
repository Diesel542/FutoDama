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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { 
  Save, X, AlertTriangle, CheckCircle, Eye, Code, Settings, FileText, 
  Sparkles, Wand2, TestTube, Play, Copy, Lightbulb, Target, Book
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

interface PromptBuilderProps {
  open: boolean;
  onClose: () => void;
  codex: any;
}

// Prompt templates for different use cases
const PROMPT_TEMPLATES = {
  tech_jobs: {
    name: "Tech Jobs",
    system: "You are a specialized technical job description extractor. Focus on extracting programming languages, frameworks, technical skills, seniority levels, and engineering-specific requirements. Be precise about technical stack details and experience requirements.",
    user: "Extract technical job information from the following job description. Pay special attention to: programming languages, frameworks, years of experience, technical skills, system architecture requirements, and development methodologies.",
    fields: ["technical_skills", "programming_languages", "frameworks", "seniority", "years_experience"]
  },
  healthcare: {
    name: "Healthcare Jobs",
    system: "You are a healthcare job description extractor. Focus on medical qualifications, certifications, patient care requirements, compliance standards, and healthcare-specific skills.",
    user: "Extract healthcare job information focusing on: medical certifications, patient care responsibilities, compliance requirements, medical specializations, and healthcare facility details.",
    fields: ["certifications", "specializations", "patient_care", "compliance", "medical_qualifications"]
  },
  remote_work: {
    name: "Remote Work Focus",
    system: "You are a remote work specialist extractor. Focus on work arrangements, communication tools, time zone requirements, remote collaboration skills, and distributed team experience.",
    user: "Extract job information with special focus on: remote work arrangements, communication requirements, time zone flexibility, collaboration tools, and distributed team experience.",
    fields: ["work_mode", "time_zones", "communication_tools", "remote_experience"]
  },
  contract_work: {
    name: "Contract & Freelance",
    system: "You are a contract work extractor. Focus on project duration, hourly rates, deliverables, client requirements, and freelance-specific terms.",
    user: "Extract contract job information focusing on: project scope, duration, payment terms, deliverables, client requirements, and contract-specific details.",
    fields: ["contract_type", "duration", "rate_band", "deliverables", "client_requirements"]
  }
};

// Common field suggestions
const FIELD_SUGGESTIONS = {
  basics: ["title", "company", "location", "seniority", "work_mode"],
  requirements: ["years_experience", "must_have", "nice_to_have", "education"],
  compensation: ["salary_range", "rate_band", "benefits", "equity"],
  technical: ["programming_languages", "frameworks", "tools", "methodologies"],
  work_details: ["schedule", "team_size", "reporting_structure", "travel"],
  culture: ["company_values", "team_culture", "growth_opportunities"]
};

export default function PromptBuilder({ open, onClose, codex }: PromptBuilderProps) {
  const { toast } = useToast();
  
  // Form state
  const [metadata, setMetadata] = useState({
    id: '',
    name: '',
    description: '',
    version: '1.0.0'
  });
  
  // Enhanced prompt state
  const [prompts, setPrompts] = useState({
    system: '',
    user: ''
  });
  
  // Schema builder state
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [customFields, setCustomFields] = useState<Array<{name: string, type: string, required: boolean}>>([]);
  const [extractionFocus, setExtractionFocus] = useState<string[]>([]);
  
  // Normalization rules state (simplified)
  const [normalizationMappings, setNormalizationMappings] = useState<Array<{
    field: string;
    from: string;
    to: string;
  }>>([]);
  
  // Missing field rules state (simplified)
  const [requiredFields, setRequiredFields] = useState<Array<{
    field: string;
    severity: 'info' | 'warn' | 'error';
    message: string;
  }>>([]);
  
  // Testing state
  const [testInput, setTestInput] = useState('');
  const [testOutput, setTestOutput] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  
  // UI state
  const [activeTab, setActiveTab] = useState('prompts');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Initialize form with codex data
  useEffect(() => {
    if (codex) {
      setMetadata({
        id: codex.id || '',
        name: codex.name || '',
        description: codex.description || '',
        version: codex.version || '1.0.0'
      });
      
      setPrompts({
        system: codex.prompts?.system || '',
        user: codex.prompts?.user || ''
      });
      
      // Extract field information from existing schema
      if (codex.schema?.properties) {
        const fields = Object.keys(codex.schema.properties);
        setSelectedFields(fields);
      }
      
      // Convert existing normalization rules to simplified format
      if (codex.normalizationRules) {
        const mappings = codex.normalizationRules.flatMap((rule: any) => 
          Object.entries(rule.mappings || {}).map(([from, to]) => ({
            field: rule.field,
            from,
            to: to as string
          }))
        );
        setNormalizationMappings(mappings);
      }
      
      // Convert existing missing rules to simplified format
      if (codex.missingRules) {
        setRequiredFields(codex.missingRules);
      }
    }
  }, [codex]);

  // Apply template
  const applyTemplate = (templateKey: string) => {
    const template = PROMPT_TEMPLATES[templateKey as keyof typeof PROMPT_TEMPLATES];
    if (template) {
      setPrompts({
        system: template.system,
        user: template.user
      });
      setSelectedFields(prev => {
        const combined = [...prev, ...template.fields];
        return Array.from(new Set(combined));
      });
      setSelectedTemplate(templateKey);
      toast({
        title: "Template Applied",
        description: `${template.name} template has been applied to your prompts.`,
      });
    }
  };

  // Generate schema from selected fields
  const generateSchema = () => {
    const properties: any = {};
    
    // Add predefined field structures
    selectedFields.forEach(field => {
      if (field.includes('.')) {
        // Nested field like "basics.title"
        const [parent, child] = field.split('.');
        if (!properties[parent]) {
          properties[parent] = { type: "object", properties: {} };
        }
        properties[parent].properties[child] = { type: "string" };
      } else {
        // Top-level field
        if (FIELD_SUGGESTIONS.technical.includes(field)) {
          properties[field] = { type: "array", items: { type: "string" } };
        } else {
          properties[field] = { type: "string" };
        }
      }
    });
    
    // Add custom fields
    customFields.forEach(field => {
      properties[field.name] = { 
        type: field.type,
        ...(field.type === "array" && { items: { type: "string" } })
      };
    });
    
    // Always include missing_fields
    properties.missing_fields = {
      type: "array",
      items: {
        type: "object",
        properties: {
          path: { type: "string" },
          severity: { type: "string", enum: ["info", "warn", "error"] },
          message: { type: "string" }
        }
      }
    };
    
    return {
      "$schema": "https://json-schema.org/draft/2020-12/schema",
      "title": "JobCard",
      "type": "object",
      "properties": properties
    };
  };

  // Generate normalization rules
  const generateNormalizationRules = () => {
    const rulesMap: Record<string, any> = {};
    
    normalizationMappings.forEach(mapping => {
      if (!rulesMap[mapping.field]) {
        rulesMap[mapping.field] = {
          field: mapping.field,
          mappings: {}
        };
      }
      rulesMap[mapping.field].mappings[mapping.from] = mapping.to;
    });
    
    return Object.values(rulesMap);
  };

  // Test the current configuration
  const testExtraction = async () => {
    if (!testInput.trim()) {
      toast({
        title: "Test Input Required",
        description: "Please provide sample job description text to test extraction.",
        variant: "destructive"
      });
      return;
    }
    
    setIsTesting(true);
    try {
      const response = await fetch('/api/jobs/test-extraction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: testInput,
          codex: {
            schema: generateSchema(),
            prompts,
            normalizationRules: generateNormalizationRules(),
            missingRules: requiredFields
          }
        })
      });
      
      if (!response.ok) throw new Error('Test failed');
      
      const result = await response.json();
      setTestOutput(JSON.stringify(result, null, 2));
      
      toast({
        title: "Test Completed",
        description: "Your AI agent configuration has been tested successfully.",
      });
    } catch (error) {
      toast({
        title: "Test Failed",
        description: error instanceof Error ? error.message : "Failed to test extraction",
        variant: "destructive"
      });
    } finally {
      setIsTesting(false);
    }
  };

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
        description: "Your AI agent configuration has been saved successfully.",
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

  // Handle save
  const handleSave = () => {
    if (!metadata.name || !prompts.system || !prompts.user) {
      toast({
        title: "Required Fields Missing",
        description: "Please provide agent name, system prompt, and user prompt.",
        variant: "destructive"
      });
      return;
    }

    const updatedCodex = {
      id: metadata.id,
      version: metadata.version,
      name: metadata.name,
      description: metadata.description,
      schema: generateSchema(),
      prompts,
      missingRules: requiredFields,
      normalizationRules: generateNormalizationRules()
    };

    updateCodexMutation.mutate(updatedCodex);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[95vh] overflow-hidden" data-testid="modal-prompt-builder">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold text-foreground flex items-center">
              <Wand2 className="w-5 h-5 mr-2 text-primary" />
              AI Agent Studio
            </DialogTitle>
            <div className="flex items-center space-x-2">
              <Badge variant={prompts.system && prompts.user ? "default" : "secondary"}>
                {prompts.system && prompts.user ? (
                  <>
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Ready
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Incomplete
                  </>
                )}
              </Badge>
            </div>
          </div>
          {codex && (
            <p className="text-sm text-muted-foreground">
              Configuring: {codex.name} ({codex.id})
            </p>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="prompts" className="text-xs">
                <Sparkles className="w-3 h-3 mr-1" />
                Smart Prompts
              </TabsTrigger>
              <TabsTrigger value="fields" className="text-xs">
                <Target className="w-3 h-3 mr-1" />
                Data Fields
              </TabsTrigger>
              <TabsTrigger value="rules" className="text-xs">
                <Settings className="w-3 h-3 mr-1" />
                Rules & Logic
              </TabsTrigger>
              <TabsTrigger value="test" className="text-xs">
                <TestTube className="w-3 h-3 mr-1" />
                Live Testing
              </TabsTrigger>
              <TabsTrigger value="metadata" className="text-xs">
                <FileText className="w-3 h-3 mr-1" />
                Agent Info
              </TabsTrigger>
            </TabsList>

            <ScrollArea className="h-[70vh] mt-4">
              <TabsContent value="prompts" className="space-y-6 p-1">
                {/* Template Selection */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center">
                      <Book className="w-4 h-4 mr-2" />
                      Quick Start Templates
                    </CardTitle>
                    <CardDescription>
                      Choose a pre-built template to get started quickly, then customize as needed.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-3">
                      {Object.entries(PROMPT_TEMPLATES).map(([key, template]) => (
                        <Button
                          key={key}
                          variant={selectedTemplate === key ? "default" : "outline"}
                          className="h-auto p-3 flex flex-col items-start"
                          onClick={() => applyTemplate(key)}
                          data-testid={`template-${key}`}
                        >
                          <span className="font-medium">{template.name}</span>
                          <span className="text-xs text-muted-foreground text-left mt-1">
                            {template.fields.slice(0, 3).join(', ')}
                            {template.fields.length > 3 && '...'}
                          </span>
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* System Prompt */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">System Instructions</CardTitle>
                    <CardDescription>
                      Define how your AI agent should behave and what it should focus on when extracting job information.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      value={prompts.system}
                      onChange={(e) => setPrompts(prev => ({ ...prev, system: e.target.value }))}
                      rows={4}
                      placeholder="You are a specialized job description extractor. Focus on..."
                      data-testid="textarea-system-prompt"
                    />
                    <div className="mt-2 flex items-center text-xs text-muted-foreground">
                      <Lightbulb className="w-3 h-3 mr-1" />
                      Tip: Be specific about what information to prioritize and extraction style
                    </div>
                  </CardContent>
                </Card>

                {/* User Prompt */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Extraction Instructions</CardTitle>
                    <CardDescription>
                      Specific instructions for how to process each job description.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      value={prompts.user}
                      onChange={(e) => setPrompts(prev => ({ ...prev, user: e.target.value }))}
                      rows={4}
                      placeholder="Extract job information from the following text, focusing on..."
                      data-testid="textarea-user-prompt"
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="fields" className="space-y-6 p-1">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">What Should Be Extracted?</CardTitle>
                    <CardDescription>
                      Choose which information fields your AI agent should extract from job descriptions.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {Object.entries(FIELD_SUGGESTIONS).map(([category, fields]) => (
                      <div key={category}>
                        <Label className="text-sm font-medium capitalize mb-2 block">
                          {category.replace('_', ' ')}
                        </Label>
                        <div className="grid grid-cols-3 gap-2">
                          {fields.map(field => (
                            <div key={field} className="flex items-center space-x-2">
                              <Switch
                                checked={selectedFields.includes(field)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedFields(prev => [...prev, field]);
                                  } else {
                                    setSelectedFields(prev => prev.filter(f => f !== field));
                                  }
                                }}
                                data-testid={`switch-field-${field}`}
                              />
                              <span className="text-sm">{field.replace('_', ' ')}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Custom Fields */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Custom Fields</CardTitle>
                    <CardDescription>
                      Add your own custom fields for specialized information extraction.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {customFields.map((field, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <Input
                            value={field.name}
                            onChange={(e) => {
                              const updated = [...customFields];
                              updated[index] = { ...field, name: e.target.value };
                              setCustomFields(updated);
                            }}
                            placeholder="Field name"
                            className="flex-1"
                            data-testid={`input-custom-field-name-${index}`}
                          />
                          <Select
                            value={field.type}
                            onValueChange={(value) => {
                              const updated = [...customFields];
                              updated[index] = { ...field, type: value };
                              setCustomFields(updated);
                            }}
                          >
                            <SelectTrigger className="w-24">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="string">Text</SelectItem>
                              <SelectItem value="array">List</SelectItem>
                              <SelectItem value="number">Number</SelectItem>
                              <SelectItem value="boolean">Yes/No</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCustomFields(prev => prev.filter((_, i) => i !== index))}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        variant="outline"
                        onClick={() => setCustomFields(prev => [...prev, { name: '', type: 'string', required: false }])}
                        data-testid="button-add-custom-field"
                      >
                        Add Custom Field
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="rules" className="space-y-6 p-1">
                {/* Normalization Rules */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Value Normalization</CardTitle>
                    <CardDescription>
                      Standardize different ways of expressing the same information (e.g., "remote work" → "remote").
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {normalizationMappings.map((mapping, index) => (
                        <div key={index} className="grid grid-cols-4 gap-2 items-center">
                          <Select
                            value={mapping.field}
                            onValueChange={(value) => {
                              const updated = [...normalizationMappings];
                              updated[index] = { ...mapping, field: value };
                              setNormalizationMappings(updated);
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Field" />
                            </SelectTrigger>
                            <SelectContent>
                              {selectedFields.map(field => (
                                <SelectItem key={field} value={field}>{field}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input
                            value={mapping.from}
                            onChange={(e) => {
                              const updated = [...normalizationMappings];
                              updated[index] = { ...mapping, from: e.target.value };
                              setNormalizationMappings(updated);
                            }}
                            placeholder="Input value"
                            data-testid={`input-normalization-from-${index}`}
                          />
                          <Input
                            value={mapping.to}
                            onChange={(e) => {
                              const updated = [...normalizationMappings];
                              updated[index] = { ...mapping, to: e.target.value };
                              setNormalizationMappings(updated);
                            }}
                            placeholder="Standard value"
                            data-testid={`input-normalization-to-${index}`}
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setNormalizationMappings(prev => prev.filter((_, i) => i !== index))}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        variant="outline"
                        onClick={() => setNormalizationMappings(prev => [...prev, { field: '', from: '', to: '' }])}
                        data-testid="button-add-normalization"
                      >
                        Add Normalization Rule
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Required Fields */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Required Fields</CardTitle>
                    <CardDescription>
                      Set validation rules for fields that must be present in every extraction.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {requiredFields.map((rule, index) => (
                        <div key={index} className="grid grid-cols-4 gap-2 items-center">
                          <Select
                            value={rule.field}
                            onValueChange={(value) => {
                              const updated = [...requiredFields];
                              updated[index] = { ...rule, field: value };
                              setRequiredFields(updated);
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Field" />
                            </SelectTrigger>
                            <SelectContent>
                              {selectedFields.map(field => (
                                <SelectItem key={field} value={field}>{field}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Select
                            value={rule.severity}
                            onValueChange={(value: 'info' | 'warn' | 'error') => {
                              const updated = [...requiredFields];
                              updated[index] = { ...rule, severity: value };
                              setRequiredFields(updated);
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="info">Info</SelectItem>
                              <SelectItem value="warn">Warning</SelectItem>
                              <SelectItem value="error">Error</SelectItem>
                            </SelectContent>
                          </Select>
                          <Input
                            value={rule.message}
                            onChange={(e) => {
                              const updated = [...requiredFields];
                              updated[index] = { ...rule, message: e.target.value };
                              setRequiredFields(updated);
                            }}
                            placeholder="Error message"
                            data-testid={`input-required-field-message-${index}`}
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setRequiredFields(prev => prev.filter((_, i) => i !== index))}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        variant="outline"
                        onClick={() => setRequiredFields(prev => [...prev, { field: '', severity: 'warn', message: '' }])}
                        data-testid="button-add-required-field"
                      >
                        Add Validation Rule
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="test" className="space-y-6 p-1">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center">
                      <Play className="w-4 h-4 mr-2" />
                      Live Testing Environment
                    </CardTitle>
                    <CardDescription>
                      Test your AI agent configuration with real job description text to see how it extracts information.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium">Sample Job Description</Label>
                      <Textarea
                        value={testInput}
                        onChange={(e) => setTestInput(e.target.value)}
                        rows={6}
                        placeholder="Paste a job description here to test your AI agent configuration..."
                        data-testid="textarea-test-input"
                      />
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <Button
                        onClick={testExtraction}
                        disabled={isTesting || !testInput.trim()}
                        data-testid="button-test-extraction"
                      >
                        <Play className="w-4 h-4 mr-2" />
                        {isTesting ? 'Testing...' : 'Test Extraction'}
                      </Button>
                      
                      {testOutput && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigator.clipboard.writeText(testOutput)}
                        >
                          <Copy className="w-3 h-3 mr-1" />
                          Copy Result
                        </Button>
                      )}
                    </div>
                    
                    {testOutput && (
                      <div>
                        <Label className="text-sm font-medium">Extraction Result</Label>
                        <div className="bg-muted p-3 rounded-md overflow-auto max-h-64">
                          <pre className="text-xs">{testOutput}</pre>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="metadata" className="space-y-6 p-1">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Agent Information</CardTitle>
                    <CardDescription>
                      Basic information about your AI agent configuration.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="agent-id">Agent ID</Label>
                        <Input
                          id="agent-id"
                          value={metadata.id}
                          onChange={(e) => setMetadata(prev => ({ ...prev, id: e.target.value }))}
                          data-testid="input-agent-id"
                        />
                      </div>
                      <div>
                        <Label htmlFor="agent-version">Version</Label>
                        <Input
                          id="agent-version"
                          value={metadata.version}
                          onChange={(e) => setMetadata(prev => ({ ...prev, version: e.target.value }))}
                          data-testid="input-agent-version"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="agent-name">Agent Name</Label>
                      <Input
                        id="agent-name"
                        value={metadata.name}
                        onChange={(e) => setMetadata(prev => ({ ...prev, name: e.target.value }))}
                        data-testid="input-agent-name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="agent-description">Description</Label>
                      <Textarea
                        id="agent-description"
                        value={metadata.description}
                        onChange={(e) => setMetadata(prev => ({ ...prev, description: e.target.value }))}
                        rows={3}
                        data-testid="textarea-agent-description"
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center pt-4 border-t">
          <div className="text-xs text-muted-foreground">
            {updateCodexMutation.isPending && "Saving AI agent configuration..."}
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={onClose}
              data-testid="button-cancel"
            >
              <X className="w-4 h-4 mr-1" />
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!metadata.name || !prompts.system || !prompts.user || updateCodexMutation.isPending}
              data-testid="button-save-agent"
            >
              <Save className="w-4 h-4 mr-1" />
              {updateCodexMutation.isPending ? 'Saving...' : 'Save AI Agent'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}