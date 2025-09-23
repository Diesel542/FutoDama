import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Info } from "lucide-react";

interface MissingField {
  path: string;
  severity: 'info' | 'warn' | 'error';
  message: string;
}

interface MissingInfoAlertProps {
  missingFields: MissingField[];
}

export default function MissingInfoAlert({ missingFields }: MissingInfoAlertProps) {
  if (!missingFields || missingFields.length === 0) {
    return (
      <Card className="bg-card border-border" data-testid="card-missing-info">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground">Missing Information</h3>
          </div>
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <Info className="w-4 h-4" />
            <span>All available information has been extracted successfully.</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const errorCount = missingFields.filter(field => field.severity === 'error').length;
  const warningCount = missingFields.filter(field => field.severity === 'warn').length;

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'error':
        return '✕';
      case 'warn':
        return '⚠';
      default:
        return 'ℹ';
    }
  };

  return (
    <Card className="bg-card border-destructive/20" data-testid="card-missing-info">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">Missing Information</h3>
          <div className="flex space-x-2">
            {errorCount > 0 && (
              <Badge className="severity-badge severity-error" data-testid="badge-error-count">
                {errorCount} error{errorCount !== 1 ? 's' : ''}
              </Badge>
            )}
            {warningCount > 0 && (
              <Badge className="severity-badge severity-warn" data-testid="badge-warning-count">
                {warningCount} warning{warningCount !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        </div>
        
        <div className="space-y-2">
          {missingFields.map((missing, index) => (
            <div 
              key={index}
              className={`flex items-start space-x-3 p-3 rounded-lg ${
                missing.severity === 'error' ? 'bg-destructive/5' : 
                missing.severity === 'warn' ? 'bg-amber-500/5' : 'bg-blue-500/5'
              }`}
              data-testid={`missing-field-${index}`}
            >
              <Badge 
                className={`severity-badge ${
                  missing.severity === 'error' ? 'severity-error' : 
                  missing.severity === 'warn' ? 'severity-warn' : 'bg-blue-500/20 text-blue-500'
                }`}
              >
                {missing.severity}
              </Badge>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground" data-testid={`missing-path-${index}`}>
                  {missing.path}
                </p>
                <p className="text-xs text-muted-foreground" data-testid={`missing-message-${index}`}>
                  {missing.message}
                </p>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-4 pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground flex items-center">
            <AlertTriangle className="w-3 h-3 mr-1" />
            The AI agent has extracted all available information. Consider refining the original job description to include missing details.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
