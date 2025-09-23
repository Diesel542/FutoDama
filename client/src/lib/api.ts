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
