// CSV Export Utilities

export const exportToCSV = (data: Record<string, unknown>[], filename: string) => {
  if (data.length === 0) {
    return;
  }

  // Get headers from first object
  const headers = Object.keys(data[0]);
  
  // Create CSV content
  const csvContent = [
    // Header row
    headers.join(','),
    // Data rows
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        // Handle values that contain commas or quotes
        if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value ?? '';
      }).join(',')
    )
  ].join('\n');

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
  }).format(amount);
};

export const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-ZA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

export const formatDateTime = (dateString: string) => {
  return new Date(dateString).toLocaleString('en-ZA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Export to JSON
export const exportToJSON = (data: unknown, filename: string) => {
  const jsonContent = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.json`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Export group data as a comprehensive report
export const exportGroupReport = async (groupData: Record<string, unknown>, filename: string) => {
  const report = {
    exportDate: new Date().toISOString(),
    group: {
      id: groupData.id,
      name: groupData.name,
      description: groupData.description,
      createdAt: groupData.createdAt,
    },
    summary: {
      totalMembers: (groupData.members as unknown[] | undefined)?.length || 0,
      totalContributions: (groupData.contributions as unknown[] | undefined)?.length || 0,
      totalPayouts: (groupData.payouts as unknown[] | undefined)?.length || 0,
      totalMeetings: (groupData.meetings as unknown[] | undefined)?.length || 0,
    },
    data: {
      members: groupData.members || [],
      contributions: groupData.contributions || [],
      payouts: groupData.payouts || [],
      meetings: groupData.meetings || [],
    }
  };
  
  exportToJSON(report, filename);
};
