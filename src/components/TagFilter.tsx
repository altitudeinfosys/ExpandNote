'use client';

import { useState } from 'react';
import { Tag } from '@/types';
import { useTags } from '@/hooks/useTags';

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
  const [filter, setFilter] = useState('');

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

  // Filter and sort tags
  const filteredTags = tags
    .filter((tag) => tag.name.toLowerCase().includes(filter.toLowerCase()))
    .sort((a, b) => {
      // Show selected tags first, then alphabetically
      const aSelected = selectedTagIds.includes(a.id);
      const bSelected = selectedTagIds.includes(b.id);

      if (aSelected && !bSelected) return -1;
      if (!aSelected && bSelected) return 1;
      return a.name.localeCompare(b.name);
    });

  const displayedTags = showMore
    ? filteredTags
    : filteredTags.slice(0, Math.min(10, filteredTags.length));

  const showMoreButton = filteredTags.length > 10;

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          Filter by Tags
        </h3>
        {selectedTagIds.length > 0 && (
          <button
            onClick={() => clearTagSelection()}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
          >
            Clear ({selectedTagIds.length})
          </button>
        )}
      </div>

      {/* Search input */}
      <div className="relative mb-2">
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Search tags..."
          className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-500"
        />
        {filter && (
          <button
            onClick={() => setFilter('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Tags list */}
      {isLoading ? (
        <div className="py-4 text-center">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      ) : (
        <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
          {displayedTags.length === 0 && (
            <div className="py-2 text-center text-sm text-gray-500 dark:text-gray-400">
              {filter ? 'No matching tags found' : 'No tags yet'}
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
              className="w-full py-1 text-xs text-center text-blue-600 dark:text-blue-400 hover:underline"
            >
              Show more ({filteredTags.length - 10} more)
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

  return (
    <div
      className="relative"
      onMouseEnter={() => setShowDelete(true)}
      onMouseLeave={() => setShowDelete(false)}
    >
      <div
        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm cursor-pointer ${
          isSelected
            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
            : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
        }`}
      >
        <span className="truncate" onClick={onToggle}>#{tag.name}</span>
        <div className="flex items-center gap-2">
          {showDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 z-10"
              title="Delete tag"
            >
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          )}
          <button
            onClick={onToggle}
            className={`w-4 h-4 flex-shrink-0 rounded-full border ${
              isSelected
                ? 'bg-blue-600 border-blue-600 flex items-center justify-center'
                : 'border-gray-400 dark:border-gray-500'
            }`}
            aria-label={isSelected ? 'Unselect tag' : 'Select tag'}
          >
            {isSelected && (
              <svg
                className="w-3 h-3 text-white"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}