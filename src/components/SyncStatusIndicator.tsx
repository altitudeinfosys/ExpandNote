'use client';

import { SyncStatus } from '@/types';
import { formatDateTime } from '@/lib/utils/date';

interface SyncStatusIndicatorProps {
  status: SyncStatus;
  lastSyncTime: Date | null;
  onSync: () => void;
  className?: string;
}

export function SyncStatusIndicator({
  status,
  lastSyncTime,
  onSync,
  className = '',
}: SyncStatusIndicatorProps) {
  // Set icon and color based on status
  const getStatusDetails = () => {
    switch (status) {
      case 'synced':
        return {
          icon: (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
          ),
          color: 'text-green-600',
          text: 'All changes saved',
          tooltip: lastSyncTime
            ? `Last synced: ${formatDateTime(lastSyncTime)}`
            : 'All changes saved',
        };
      case 'syncing':
        return {
          icon: (
            <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
          ),
          color: 'text-blue-600',
          text: 'Syncing...',
          tooltip: 'Syncing changes with server',
        };
      case 'pending':
        return {
          icon: (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                clipRule="evenodd"
              />
            </svg>
          ),
          color: 'text-yellow-600',
          text: 'Pending changes',
          tooltip: 'Changes will sync when connection is available',
        };
      case 'offline':
        return {
          icon: (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18.364 5.636a9 9 0 010 12.728m-3.536-3.536a5 5 0 010-7.072M13 10a3 3 0 11-6 0 3 3 0 016 0zm-1 0a2 2 0 11-4 0 2 2 0 014 0z"
                clipRule="evenodd"
              />
            </svg>
          ),
          color: 'text-gray-600',
          text: 'Offline',
          tooltip: 'Working offline. Changes will be saved locally.',
        };
      case 'conflict':
        return {
          icon: (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          ),
          color: 'text-red-600',
          text: 'Sync error',
          tooltip: 'There was an error syncing your changes. Click to try again.',
        };
      default:
        return {
          icon: null,
          color: 'text-gray-600',
          text: '',
          tooltip: '',
        };
    }
  };

  const { icon, color, text, tooltip } = getStatusDetails();

  return (
    <button
      onClick={onSync}
      className={`inline-flex items-center px-2 py-1 rounded ${
        status === 'conflict' ? 'bg-red-50' : 'bg-gray-50'
      } ${color} ${className} text-xs hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
      title={tooltip}
      disabled={status === 'syncing'}
    >
      {icon}
      <span className="ml-1">{text}</span>
    </button>
  );
}