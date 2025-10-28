'use client';

import { useEffect, useRef, useState } from 'react';

// Import SimpleMDE CSS
import 'simplemde/dist/simplemde.min.css';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  disabled?: boolean;
}

export function MarkdownEditor({
  value,
  onChange,
  placeholder = 'Start typing your note...',
  autoFocus = false,
  disabled = false,
}: MarkdownEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const editorInstanceRef = useRef<any>(null);
  const [isMounted, setIsMounted] = useState(false);

  // Initialize SimpleMDE on client side only
  useEffect(() => {
    setIsMounted(true);

    // Wait for next tick to ensure DOM is ready
    const initTimer = setTimeout(async () => {
      if (textareaRef.current && !editorInstanceRef.current) {
        try {
          // Dynamically import SimpleMDE only on client
          const SimpleMDE = (await import('simplemde')).default;

          const instance = new SimpleMDE({
            element: textareaRef.current,
            spellChecker: false,
            placeholder,
            autofocus: autoFocus,
            status: false,
            initialValue: value,
            toolbar: [
              'bold',
              'italic',
              'heading',
              '|',
              'quote',
              'unordered-list',
              'ordered-list',
              '|',
              'link',
              'image',
              '|',
              'preview',
              'side-by-side',
              'fullscreen',
            ],
            shortcuts: {
              toggleBold: 'Cmd-B',
              toggleItalic: 'Cmd-I',
              toggleHeadingSmaller: 'Cmd-H',
              toggleCodeBlock: 'Cmd-Alt-C',
              togglePreview: 'Cmd-P',
              toggleSideBySide: 'F9',
              toggleFullScreen: 'F11',
            },
          });

          // Listen for changes
          instance.codemirror.on('change', () => {
            onChange(instance.value());
          });

          editorInstanceRef.current = instance;
        } catch (error) {
          console.error('Failed to initialize SimpleMDE:', error);
        }
      }
    }, 100);

    return () => {
      clearTimeout(initTimer);

      // Cleanup SimpleMDE instance
      if (editorInstanceRef.current) {
        try {
          editorInstanceRef.current.toTextArea();
        } catch {
          // Silently handle cleanup errors
        } finally {
          editorInstanceRef.current = null;
        }
      }
    };
    // Include value in dependencies so editor reinitializes with correct content when component remounts
  }, [value, placeholder, autoFocus, onChange]);

  // Update editor value when prop changes
  useEffect(() => {
    if (editorInstanceRef.current && editorInstanceRef.current.value() !== value) {
      const cursorPos = editorInstanceRef.current.codemirror.getCursor();
      editorInstanceRef.current.value(value);
      editorInstanceRef.current.codemirror.setCursor(cursorPos);
    }
  }, [value]);

  if (disabled) {
    return (
      <div className="prose dark:prose-invert max-w-none p-4 bg-gray-50 dark:bg-gray-900 rounded-lg min-h-[400px]">
        <div className="whitespace-pre-wrap">{value || placeholder}</div>
      </div>
    );
  }

  return (
    <div className="markdown-editor">
      <textarea
        ref={textareaRef}
        defaultValue={value}
        style={{ display: isMounted ? 'none' : 'block' }}
        className="w-full min-h-[400px] p-4 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg"
      />
      {!isMounted && (
        <div className="w-full min-h-[400px] bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-4">
          <div className="animate-pulse">Loading editor...</div>
        </div>
      )}
    </div>
  );
}
