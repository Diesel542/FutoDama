import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Download, FileJson, FileSpreadsheet, FileX, Webhook, Zap } from 'lucide-react';
import { exportJob, exportBatch, exportAllJobs, registerWebhook } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
  jobId?: string;
  batchId?: string;
}

type ExportFormat = 'json' | 'csv' | 'xml';

export function ExportDialog({ open, onClose, jobId, batchId }: ExportDialogProps) {
  const [format, setFormat] = useState<ExportFormat>('json');
  const [bulkFilters, setBulkFilters] = useState({
    status: 'all',
    codexId: '',
    fromDate: '',
    toDate: ''
  });
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookEvents, setWebhookEvents] = useState<string[]>(['job.completed']);
  const [webhookSecret, setWebhookSecret] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const formatIcons = {
    json: FileJson,
    csv: FileSpreadsheet,
    xml: FileX
  };

  const formatDescriptions = {
    json: 'Standard JSON format with full data structure',
    csv: 'Comma-separated values for spreadsheet import',
    xml: 'XML format for enterprise integration'
  };

  const handleExport = async (type: 'single' | 'batch' | 'bulk') => {
    setIsExporting(true);
    try {
      switch (type) {
        case 'single':
          if (jobId) {
            await exportJob(jobId, format);
            toast({
              title: "Export Successful",
              description: `Job exported as ${format.toUpperCase()} file.`,
            });
          }
          break;
        case 'batch':
          if (batchId) {
            await exportBatch(batchId, format);
            toast({
              title: "Export Successful", 
              description: `Batch exported as ${format.toUpperCase()} file.`,
            });
          }
          break;
        case 'bulk':
          const filters = Object.fromEntries(
            Object.entries(bulkFilters).filter(([_, value]) => value !== '' && value !== 'all')
          );
          await exportAllJobs(filters, format);
          toast({
            title: "Export Successful",
            description: `All jobs exported as ${format.toUpperCase()} file.`,
          });
          break;
      }
    } catch (error) {
      toast({
        title: "Export Failed",
        description: error instanceof Error ? error.message : "Failed to export data",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleWebhookRegister = async () => {
    if (!webhookUrl) {
      toast({
        title: "Webhook URL Required",
        description: "Please provide a webhook URL",
        variant: "destructive"
      });
      return;
    }

    try {
      await registerWebhook({
        url: webhookUrl,
        events: webhookEvents,
        secret: webhookSecret
      });
      
      toast({
        title: "Webhook Registered",
        description: `Webhook registered for events: ${webhookEvents.join(', ')}`,
      });
      
      setWebhookUrl('');
      setWebhookSecret('');
    } catch (error) {
      toast({
        title: "Webhook Registration Failed",
        description: error instanceof Error ? error.message : "Failed to register webhook",
        variant: "destructive"
      });
    }
  };

  const Icon = formatIcons[format];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            Advanced Export & Integration
          </DialogTitle>
          <DialogDescription>
            Export job data in multiple formats and configure real-time integrations.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Format Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Export Format</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select value={format} onValueChange={(value: ExportFormat) => setFormat(value)}>
                <SelectTrigger data-testid="select-export-format">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="json">
                    <div className="flex items-center gap-2">
                      <FileJson className="w-4 h-4" />
                      JSON
                    </div>
                  </SelectItem>
                  <SelectItem value="csv">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4" />
                      CSV
                    </div>
                  </SelectItem>
                  <SelectItem value="xml">
                    <div className="flex items-center gap-2">
                      <FileX className="w-4 h-4" />
                      XML
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              
              <div className="flex items-center gap-2 p-3 bg-secondary/50 rounded-lg">
                <Icon className="w-4 h-4 text-primary" />
                <span className="text-sm text-muted-foreground">
                  {formatDescriptions[format]}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Export Options */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Export Options</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Single Job Export */}
              {jobId && (
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">Export Current Job</div>
                    <div className="text-sm text-muted-foreground">
                      Export job {jobId.slice(0, 8)}... as {format.toUpperCase()}
                    </div>
                  </div>
                  <Button 
                    onClick={() => handleExport('single')} 
                    disabled={isExporting}
                    data-testid="button-export-job"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export Job
                  </Button>
                </div>
              )}

              {/* Batch Export */}
              {batchId && (
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">Export Batch</div>
                    <div className="text-sm text-muted-foreground">
                      Export batch {batchId.slice(0, 8)}... and all jobs as {format.toUpperCase()}
                    </div>
                  </div>
                  <Button 
                    onClick={() => handleExport('batch')} 
                    disabled={isExporting}
                    data-testid="button-export-batch"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export Batch
                  </Button>
                </div>
              )}

              {/* Bulk Export */}
              <div className="border rounded-lg p-4 space-y-4">
                <div>
                  <div className="font-medium">Bulk Export All Jobs</div>
                  <div className="text-sm text-muted-foreground">
                    Export all jobs with optional filtering
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="status-filter">Status Filter</Label>
                    <Select value={bulkFilters.status} onValueChange={(value) => 
                      setBulkFilters(prev => ({ ...prev, status: value }))}>
                      <SelectTrigger data-testid="select-status-filter">
                        <SelectValue placeholder="All statuses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All statuses</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="processing">Processing</SelectItem>
                        <SelectItem value="error">Error</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="codex-filter">AI Agent Filter</Label>
                    <Input
                      placeholder="Codex ID (optional)"
                      value={bulkFilters.codexId}
                      onChange={(e) => setBulkFilters(prev => ({ ...prev, codexId: e.target.value }))}
                      data-testid="input-codex-filter"
                    />
                  </div>
                </div>
                
                <Button 
                  onClick={() => handleExport('bulk')} 
                  disabled={isExporting} 
                  className="w-full"
                  data-testid="button-export-bulk"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export All Jobs ({format.toUpperCase()})
                </Button>
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Webhook Integration */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Webhook className="w-4 h-4" />
                Real-time Integration
              </CardTitle>
              <CardDescription>
                Register webhooks to receive real-time notifications when jobs complete.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="webhook-url">Webhook URL</Label>
                <Input
                  id="webhook-url"
                  placeholder="https://your-app.com/webhook"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  data-testid="input-webhook-url"
                />
              </div>
              
              <div>
                <Label>Events to Subscribe</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {['job.completed', 'job.failed', 'batch.completed', 'batch.failed'].map((event) => (
                    <Badge 
                      key={event}
                      variant={webhookEvents.includes(event) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => {
                        setWebhookEvents(prev => 
                          prev.includes(event) 
                            ? prev.filter(e => e !== event)
                            : [...prev, event]
                        );
                      }}
                      data-testid={`badge-event-${event}`}
                    >
                      {event}
                    </Badge>
                  ))}
                </div>
              </div>
              
              <div>
                <Label htmlFor="webhook-secret">Secret (Optional)</Label>
                <Input
                  id="webhook-secret"
                  type="password"
                  placeholder="Webhook verification secret"
                  value={webhookSecret}
                  onChange={(e) => setWebhookSecret(e.target.value)}
                  data-testid="input-webhook-secret"
                />
              </div>
              
              <Button 
                onClick={handleWebhookRegister}
                disabled={!webhookUrl}
                className="w-full"
                data-testid="button-register-webhook"
              >
                <Zap className="w-4 h-4 mr-2" />
                Register Webhook
              </Button>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}