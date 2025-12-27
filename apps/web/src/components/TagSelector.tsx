'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { Tag } from '@/types';
import { useTags } from '@/hooks/useTags';
import { MAX_TAGS_PER_NOTE } from '@/lib/constants';

interface TagSelectorProps {
  selectedTags: Tag[];
  onTagsChange: (tags: Tag[]) => void;
  disabled?: boolean;
  className?: string;
}

export function TagSelector({
  selectedTags,
  onTagsChange,
  disabled = false,
  className = '',
}: TagSelectorProps) {
  const { tags, isLoading, createTag } = useTags();
  const [searchText, setSearchText] = useState('');
  const [isTagMenuOpen, setIsTagMenuOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter tags based on search text
  const filteredTags = tags.filter((tag) =>
    tag.name.toLowerCase().includes(searchText.toLowerCase()) &&
    !selectedTags.some(selectedTag => selectedTag.id === tag.id)
  );

  const handleSelectTag = useCallback((tag: Tag) => {
    if (selectedTags.length >= MAX_TAGS_PER_NOTE) {
      alert(`You can only add up to ${MAX_TAGS_PER_NOTE} tags to a note.`);
      return;
    }

    onTagsChange([...selectedTags, tag]);
    setSearchText('');
    inputRef.current?.focus();
  }, [selectedTags, onTagsChange]);

  const handleRemoveTag = useCallback((tagId: string) => {
    onTagsChange(selectedTags.filter(tag => tag.id !== tagId));
  }, [selectedTags, onTagsChange]);

  const handleCreateTag = useCallback(async () => {
    if (!searchText.trim()) return;

    try {
      const newTag = await createTag(searchText.trim());
      handleSelectTag(newTag);
      setSearchText('');
    } catch (error) {
      // Error is already handled in the useTags hook
    }
  }, [searchText, createTag, handleSelectTag]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();

      // If there's a matching tag, select it
      const matchingTag = filteredTags[0];
      if (matchingTag) {
        handleSelectTag(matchingTag);
      } else if (searchText.trim()) {
        // Otherwise create a new tag
        handleCreateTag();
      }
    } else if (e.key === 'Escape') {
      setIsTagMenuOpen(false);
      inputRef.current?.blur();
    } else if (e.key === 'Backspace' && !searchText && selectedTags.length > 0) {
      // Remove the last tag when backspace is pressed and input is empty
      handleRemoveTag(selectedTags[selectedTags.length - 1].id);
    }
  }, [filteredTags, searchText, selectedTags, handleSelectTag, handleRemoveTag, handleCreateTag]);

  // Close the tag menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsTagMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative ${className}`}
    >
      <div className="flex flex-wrap items-center gap-2 p-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg min-h-[40px] focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
        {/* Selected tags */}
        {selectedTags.map((tag) => (
          <div
            key={tag.id}
            className="flex items-center bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-2 py-1 rounded text-sm"
          >
            <span className="mr-1">#{tag.name}</span>
            <button
              type="button"
              onClick={() => handleRemoveTag(tag.id)}
              disabled={disabled}
              className="text-blue-700 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-200 disabled:opacity-50"
              aria-label={`Remove ${tag.name} tag`}
            >
              <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        ))}

        {/* Tag input */}
        <div className="flex-1">
          <input
            ref={inputRef}
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onFocus={() => setIsTagMenuOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder={selectedTags.length ? "Add more tags..." : "Add tags..."}
            disabled={disabled || selectedTags.length >= MAX_TAGS_PER_NOTE}
            className="w-full min-w-[100px] bg-transparent border-none outline-none text-sm text-gray-900 dark:text-white placeholder-gray-500 disabled:opacity-50"
          />
        </div>
      </div>

      {/* Tag suggestions dropdown */}
      {isTagMenuOpen && searchText && (
        <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          <ul className="py-1">
            {isLoading && (
              <li className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                Loading...
              </li>
            )}

            {!isLoading && filteredTags.length === 0 && (
              <li
                className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                onClick={handleCreateTag}
              >
                Create tag: <span className="font-medium">#{searchText}</span>
              </li>
            )}

            {filteredTags.map((tag) => (
              <li
                key={tag.id}
                className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                onClick={() => handleSelectTag(tag)}
              >
                #{tag.name}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Helper text */}
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
        {selectedTags.length}/{MAX_TAGS_PER_NOTE} tags
      </p>
    </div>
  );
}