import React, { useState, useRef, useEffect } from 'react';
import { X, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TagInputProps {
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  placeholder?: string;
  maxTags?: number;
  suggestions?: string[];
  className?: string;
  disabled?: boolean;
}

// Tag normalization utilities
const normalizeTag = (tag: string): string => {
  // Remove leading #, trim whitespace, convert to lowercase
  return tag.replace(/^#/, '').trim().toLowerCase();
};

const formatTagForDisplay = (tag: string): string => {
  // Always display with # prefix
  return `#${normalizeTag(tag)}`;
};

const splitTagsOnSpace = (input: string): string[] => {
  // Split on spaces and filter out empty strings
  return input.split(/\s+/).filter((part) => part.length > 0);
};

export const TagInput: React.FC<TagInputProps> = ({
  tags,
  onTagsChange,
  placeholder = 'Add tags (press space or enter to add)...',
  maxTags = 15,
  suggestions = [],
  className,
  disabled = false,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (inputValue.length > 0) {
      const normalizedInput = normalizeTag(inputValue);
      const filtered = suggestions.filter(
        (suggestion) =>
          normalizeTag(suggestion).includes(normalizedInput) &&
          !tags.some((tag) => normalizeTag(tag) === normalizeTag(suggestion))
      );
      setFilteredSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setShowSuggestions(false);
    }
  }, [inputValue, suggestions, tags]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const addTags = (input: string) => {
    if (!input.trim()) return;

    // Split input on spaces to handle multiple words
    const inputParts = splitTagsOnSpace(input);
    const newTags: string[] = [];

    inputParts.forEach((part) => {
      const normalizedTag = normalizeTag(part);
      // Check if tag is valid (not empty after normalization)
      if (
        normalizedTag &&
        // Check for duplicates (case-insensitive)
        !tags.some((existingTag) => normalizeTag(existingTag) === normalizedTag) &&
        // Check if we already added this tag in current operation
        !newTags.some((newTag) => normalizeTag(newTag) === normalizedTag) &&
        // Check tag limit
        tags.length + newTags.length < maxTags
      ) {
        newTags.push(normalizedTag);
      }
    });

    if (newTags.length > 0) {
      onTagsChange([...tags, ...newTags]);
    }

    setInputValue('');
    setShowSuggestions(false);
  };

  const removeTag = (indexToRemove: number) => {
    onTagsChange(tags.filter((_, index) => index !== indexToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTags(inputValue);
    } else if (e.key === ' ') {
      // Handle space as tag separator
      e.preventDefault();
      addTags(inputValue);
    } else if (e.key === 'Backspace' && inputValue === '' && tags.length > 0) {
      removeTag(tags.length - 1);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    // If input contains spaces, auto-add tags for each word
    if (value.includes(' ')) {
      addTags(value);
    } else {
      setInputValue(value);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    addTags(suggestion);
  };

  return (
    <div className={cn('relative', className)} ref={containerRef}>
      <div
        className={cn(
          'flex min-h-[42px] flex-wrap gap-2 rounded-md border border-border bg-background p-3',
          disabled && 'cursor-not-allowed opacity-50',
          'focus-within:border-primary focus-within:ring-2 focus-within:ring-primary'
        )}
        onClick={() => !disabled && inputRef.current?.focus()}
      >
        {tags.map((tag, index) => (
          <span
            key={index}
            className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-sm text-primary"
          >
            {formatTagForDisplay(tag)}
            {!disabled && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeTag(index);
                }}
                className="ml-1 rounded-full p-0.5 transition-colors hover:bg-primary/20"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </span>
        ))}

        {!disabled && tags.length < maxTags && (
          <div className="flex min-w-[120px] flex-1 items-center">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onFocus={() => setShowSuggestions(filteredSuggestions.length > 0)}
              placeholder={tags.length === 0 ? placeholder : ''}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              disabled={disabled}
            />
          </div>
        )}
      </div>

      {/* Tags counter and instructions */}
      <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
        <span>Press space or enter to add tags</span>
        <span>
          {tags.length}/{maxTags} tags
        </span>
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && filteredSuggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-48 overflow-y-auto rounded-md border border-border bg-background shadow-lg">
          {filteredSuggestions.slice(0, 10).map((suggestion, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleSuggestionClick(suggestion)}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
            >
              <span className="text-muted-foreground">{formatTagForDisplay(suggestion)}</span>
            </button>
          ))}
        </div>
      )}

      {tags.length >= maxTags && (
        <p className="mt-1 text-xs text-muted-foreground">Maximum {maxTags} tags reached</p>
      )}
    </div>
  );
};
