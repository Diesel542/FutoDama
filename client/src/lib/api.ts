import { apiRequest } from './queryClient';

export interface UploadResponse {
  jobId: string;
  status: string;
}

export interface JobStatus {
  id: string;
  status: 'processing' | 'extracting' | 'validating' | 'completed' | 'error';
  originalText: string;
  documentType: string;
  jobCard?: any;
  codexId: string;
  createdAt?: string;
}

export async function uploadJobDescription(formData: FormData): Promise<UploadResponse> {
  const response = await fetch('/api/jobs/upload', {
    method: 'POST',
    body: formData,
  });
  
  if (!response.ok) {
    throw new Error(`Upload failed: ${response.statusText}`);
  }
  
  return response.json();
}

export async function getJobStatus(jobId: string): Promise<JobStatus> {
  const response = await fetch(`/api/jobs/${jobId}`);
  
  if (!response.ok) {
    throw new Error(`Failed to get job status: ${response.statusText}`);
  }
  
  return response.json();
}

export async function getAllCodexes() {
  const response = await apiRequest('GET', '/api/codex');
  return response.json();
}

export async function getCodex(id: string) {
  const response = await apiRequest('GET', `/api/codex/${id}`);
  return response.json();
}

export async function exportCodex(id: string) {
  const response = await fetch(`/api/codex/${id}/export`);
  
  if (!response.ok) {
    throw new Error(`Failed to export codex: ${response.statusText}`);
  }
  
  // Download the file
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = `${id}.json`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

// Advanced Export API Functions
export async function exportJob(jobId: string, format: 'json' | 'csv' | 'xml' = 'json') {
  const response = await fetch(`/api/jobs/${jobId}/export?format=${format}`);
  
  if (!response.ok) {
    throw new Error(`Failed to export job: ${response.statusText}`);
  }
  
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = `job-${jobId}.${format}`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

export async function exportBatch(batchId: string, format: 'json' | 'csv' | 'xml' = 'json') {
  const response = await fetch(`/api/batch/${batchId}/export?format=${format}`);
  
  if (!response.ok) {
    throw new Error(`Failed to export batch: ${response.statusText}`);
  }
  
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = `batch-${batchId}.${format}`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

export async function exportAllJobs(filters?: { 
  status?: string; 
  codexId?: string; 
  fromDate?: string; 
  toDate?: string; 
}, format: 'json' | 'csv' | 'xml' = 'json') {
  const params = new URLSearchParams({ format });
  
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.append(key, value);
    });
  }
  
  const response = await fetch(`/api/jobs/export/bulk?${params}`);
  
  if (!response.ok) {
    throw new Error(`Failed to export jobs: ${response.statusText}`);
  }
  
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = `jobs-export-${new Date().toISOString().split('T')[0]}.${format}`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

// Webhook API Functions
export async function registerWebhook(webhook: {
  url: string;
  events: string[];
  secret?: string;
}) {
  const response = await apiRequest('POST', '/api/webhooks/register', webhook);
  return response.json();
}

export async function getWebhooks() {
  const response = await apiRequest('GET', '/api/webhooks');
  return response.json();
}

export async function deleteWebhook(id: string) {
  const response = await apiRequest('DELETE', `/api/webhooks/${id}`);
  return response.json();
}
