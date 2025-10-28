'use client';

import { useState, useMemo } from 'react';
import { Tag } from '@/types';
import { useTags } from '@/hooks/useTags';

// Constants
const MAX_TAGS_DISPLAY = 10; // Number of tags to show before "Show more" button

interface TagFilterProps {
  className?: string;
}

export function TagFilter({ className = '' }: TagFilterProps) {
  const {
    tags,
    selectedTagIds,
    isLoading,
    toggleTagSelection,
    clearTagSelection,
    deleteTag,
  } = useTags();

  const [showMore, setShowMore] = useState(false);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const handleDeleteTag = async (tagId: string, tagName: string) => {
    if (window.confirm(`Are you sure you want to delete the tag "#${tagName}"? This will remove it from all notes.`)) {
      try {
        await deleteTag(tagId);
      } catch (error) {
        console.error('Failed to delete tag:', error);
        alert('Failed to delete tag. Please try again.');
      }
    }
  };

  // Sort tags alphabetically (no reordering on selection) - optimized with memoization
  const sortedTags = useMemo(() => {
    return [...tags].sort((a, b) => {  // Spread to avoid mutating original array
      const comparison = a.name.localeCompare(b.name);
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [tags, sortOrder]);

  const displayedTags = showMore
    ? sortedTags
    : sortedTags.slice(0, Math.min(MAX_TAGS_DISPLAY, sortedTags.length));

  const showMoreButton = sortedTags.length > MAX_TAGS_DISPLAY;

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-white">
            TAGS
          </h3>
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="p-1 hover:bg-gray-700 dark:hover:bg-gray-800 rounded transition-colors"
            title={sortOrder === 'asc' ? 'Sort Z-A' : 'Sort A-Z'}
            aria-label={sortOrder === 'asc' ? 'Sort descending' : 'Sort ascending'}
          >
            <svg className="w-3 h-3 text-gray-400 hover:text-white" fill="currentColor" viewBox="0 0 20 20">
              {sortOrder === 'asc' ? (
                <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 7a1 1 0 011-1h8a1 1 0 110 2H4a1 1 0 01-1-1zM3 11a1 1 0 011-1h4a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
              ) : (
                <path fillRule="evenodd" d="M3 3a1 1 0 011-1h4a1 1 0 110 2H4a1 1 0 01-1-1zM3 7a1 1 0 011-1h8a1 1 0 110 2H4a1 1 0 01-1-1zM3 11a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
              )}
            </svg>
          </button>
        </div>
        {selectedTagIds.length > 0 && (
          <button
            onClick={() => clearTagSelection()}
            className="text-xs text-blue-400 hover:text-blue-300"
          >
            Clear
          </button>
        )}
      </div>

      {/* Tags list - Simplenote style */}
      {isLoading ? (
        <div className="py-4 text-center">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500 mx-auto"></div>
        </div>
      ) : (
        <div className="space-y-0.5">
          {sortedTags.length === 0 && (
            <div className="py-2 text-sm text-gray-400">
              No tags yet
            </div>
          )}
          {displayedTags.map((tag) => (
            <TagFilterItem
              key={tag.id}
              tag={tag}
              isSelected={selectedTagIds.includes(tag.id)}
              onToggle={() => toggleTagSelection(tag.id)}
              onDelete={() => handleDeleteTag(tag.id, tag.name)}
            />
          ))}
          {showMoreButton && !showMore && (
            <button
              onClick={() => setShowMore(true)}
              className="w-full py-2 text-sm text-left text-gray-400 hover:text-gray-200"
            >
              Show {sortedTags.length - MAX_TAGS_DISPLAY} more...
            </button>
          )}
        </div>
      )}
    </div>
  );
}

interface TagFilterItemProps {
  tag: Tag;
  isSelected: boolean;
  onToggle: () => void;
  onDelete: () => void;
}

function TagFilterItem({ tag, isSelected, onToggle, onDelete }: TagFilterItemProps) {
  const [showDelete, setShowDelete] = useState(false);
  const [isTouchDevice] = useState(() =>
    typeof window !== 'undefined' && 'ontouchstart' in window
  );

  return (
    <div
      className="relative group flex items-center gap-1"
      onMouseEnter={() => !isTouchDevice && setShowDelete(true)}
      onMouseLeave={() => !isTouchDevice && setShowDelete(false)}
    >
      <button
        onClick={onToggle}
        className={`flex-1 flex items-center justify-between py-1.5 text-sm cursor-pointer transition-colors focus:outline-none focus:ring-1 focus:ring-blue-500 rounded px-1 ${
          isSelected
            ? 'text-white font-medium bg-blue-600/30 border-l-2 border-blue-500'
            : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
        }`}
        aria-pressed={isSelected}
        aria-label={`Filter by ${tag.name}${isSelected ? ' - selected' : ''}`}
      >
        <span className="flex items-center gap-2">
          {isSelected && (
            <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
            </svg>
          )}
          <span className="truncate">{tag.name}</span>
        </span>
      </button>

      {/* Always show delete button on touch devices, show on hover for desktop */}
      {(showDelete || isTouchDevice) && (
        <button
          onClick={onDelete}
          className="p-1 rounded hover:bg-red-900/30 text-red-400 focus:outline-none focus:ring-1 focus:ring-red-400 transition-opacity"
          title="Delete tag"
          aria-label={`Delete ${tag.name} tag`}
        >
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      )}
    </div>
  );
}