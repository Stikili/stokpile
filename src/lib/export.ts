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

// Module-level current country — set once on session load via setUserCountry()
// so every formatCurrency / formatDate call across the app respects the user's locale
// without threading country through every component prop.
let CURRENT_COUNTRY: string | null = null;

export const setUserCountry = (country: string | null | undefined) => {
  CURRENT_COUNTRY = country || null;
};

import { formatCurrency as localeCurrency, formatDate as localeDate, formatDateTime as localeDateTime } from './locale';

export const formatCurrency = (amount: number, country?: string | null) => {
  return localeCurrency(amount, country ?? CURRENT_COUNTRY);
};

export const formatDate = (dateString: string, country?: string | null) => {
  return localeDate(dateString, country ?? CURRENT_COUNTRY);
};

export const formatDateTime = (dateString: string, country?: string | null) => {
  return localeDateTime(dateString, country ?? CURRENT_COUNTRY);
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
