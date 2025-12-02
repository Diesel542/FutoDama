export function jobToCSV(job: any): string {
  const headers = ['id', 'status', 'documentType', 'codexId', 'createdAt'];
  const jobCardHeaders = job.jobCard ? Object.keys(job.jobCard) : [];
  const allHeaders = [...headers, ...jobCardHeaders.map(h => `jobCard_${h}`)];
  
  const csvHeader = allHeaders.join(',');
  const jobData = [
    job.id || '',
    job.status || '',
    job.documentType || '',
    job.codexId || '',
    job.createdAt || ''
  ];
  
  if (job.jobCard) {
    jobCardHeaders.forEach(header => {
      const value = job.jobCard[header];
      jobData.push(typeof value === 'object' ? JSON.stringify(value) : String(value || ''));
    });
  }
  
  const csvRow = jobData.map(field => `"${String(field).replace(/"/g, '""')}"`).join(',');
  return `${csvHeader}\n${csvRow}`;
}

export function jobToXML(job: any): string {
  const escapeXml = (str: string) => str.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case "'": return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<job>\n';
  
  Object.entries(job).forEach(([key, value]) => {
    if (typeof value === 'object' && value !== null) {
      xml += `  <${key}>${JSON.stringify(value)}</${key}>\n`;
    } else {
      xml += `  <${key}>${escapeXml(String(value || ''))}</${key}>\n`;
    }
  });
  
  xml += '</job>';
  return xml;
}

export function batchToCSV(exportData: any): string {
  const { batch, jobs } = exportData;
  let csv = `Batch Information\n`;
  csv += `ID,Status,Total Jobs,Completed Jobs,Codex ID,Created At\n`;
  csv += `"${batch.id}","${batch.status}","${batch.totalJobs}","${batch.completedJobs}","${batch.codexId}","${batch.createdAt}"\n\n`;
  
  if (jobs.length > 0) {
    csv += `Individual Jobs\n`;
    const headers = ['id', 'status', 'documentType', 'codexId'];
    const firstJob = jobs[0];
    const jobCardHeaders = firstJob.jobCard ? Object.keys(firstJob.jobCard) : [];
    const allHeaders = [...headers, ...jobCardHeaders.map(h => `jobCard_${h}`)];
    
    csv += allHeaders.join(',') + '\n';
    
    jobs.forEach((job: any) => {
      const jobData = [
        job.id || '',
        job.status || '',
        job.documentType || '',
        job.codexId || ''
      ];
      
      if (job.jobCard) {
        jobCardHeaders.forEach(header => {
          const value = job.jobCard[header];
          jobData.push(typeof value === 'object' ? JSON.stringify(value) : String(value || ''));
        });
      }
      
      const csvRow = jobData.map(field => `"${String(field).replace(/"/g, '""')}"`).join(',');
      csv += csvRow + '\n';
    });
  }
  
  return csv;
}

export function batchToXML(exportData: any): string {
  const { batch, jobs } = exportData;
  const escapeXml = (str: string) => str.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case "'": return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<batch_export>\n';
  
  xml += '  <batch>\n';
  Object.entries(batch).forEach(([key, value]) => {
    xml += `    <${key}>${escapeXml(String(value || ''))}</${key}>\n`;
  });
  xml += '  </batch>\n';
  
  xml += '  <jobs>\n';
  jobs.forEach((job: any) => {
    xml += '    <job>\n';
    Object.entries(job).forEach(([key, value]) => {
      if (typeof value === 'object' && value !== null) {
        xml += `      <${key}>${JSON.stringify(value)}</${key}>\n`;
      } else {
        xml += `      <${key}>${escapeXml(String(value || ''))}</${key}>\n`;
      }
    });
    xml += '    </job>\n';
  });
  xml += '  </jobs>\n';
  
  xml += '</batch_export>';
  return xml;
}

export function jobsToCSV(jobs: any[]): string {
  if (jobs.length === 0) {
    return 'No jobs to export';
  }
  
  const headers = ['id', 'status', 'documentType', 'codexId', 'createdAt'];
  const firstJob = jobs[0];
  const jobCardHeaders = firstJob.jobCard ? Object.keys(firstJob.jobCard) : [];
  const allHeaders = [...headers, ...jobCardHeaders.map(h => `jobCard_${h}`)];
  
  let csv = allHeaders.join(',') + '\n';
  
  jobs.forEach(job => {
    const jobData = [
      job.id || '',
      job.status || '',
      job.documentType || '',
      job.codexId || '',
      job.createdAt || ''
    ];
    
    if (job.jobCard) {
      jobCardHeaders.forEach(header => {
        const value = job.jobCard[header];
        jobData.push(typeof value === 'object' ? JSON.stringify(value) : String(value || ''));
      });
    }
    
    const csvRow = jobData.map(field => `"${String(field).replace(/"/g, '""')}"`).join(',');
    csv += csvRow + '\n';
  });
  
  return csv;
}

export function jobsToXML(jobs: any[]): string {
  const escapeXml = (str: string) => str.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case "'": return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<jobs_export>\n';
  
  jobs.forEach(job => {
    xml += '  <job>\n';
    Object.entries(job).forEach(([key, value]) => {
      if (typeof value === 'object' && value !== null) {
        xml += `    <${key}>${JSON.stringify(value)}</${key}>\n`;
      } else {
        xml += `    <${key}>${escapeXml(String(value || ''))}</${key}>\n`;
      }
    });
    xml += '  </job>\n';
  });
  
  xml += '</jobs_export>';
  return xml;
}

export function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current && current[key], obj);
}
