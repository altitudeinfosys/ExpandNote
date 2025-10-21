'use client';

import { useEffect, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import type SimpleMDE from 'simplemde';

// Import SimpleMDE CSS
import 'simplemde/dist/simplemde.min.css';

// Dynamically import SimpleMdeReact to avoid SSR issues
const SimpleMdeReact = dynamic(() => import('react-simplemde-editor'), {
  ssr: false,
});

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
  const editorRef = useRef<SimpleMDE | null>(null);

  // SimpleMDE options
  const options = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const opts: any = {
      spellChecker: false,
      placeholder,
      autofocus: autoFocus,
      status: false,
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
      minHeight: '400px',
      maxHeight: '600px',
      sideBySideFullscreen: false,
    };
    return opts;
  }, [placeholder, autoFocus]);

  // Handle editor instance
  const getMdeInstance = (instance: SimpleMDE) => {
    editorRef.current = instance;
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (editorRef.current) {
        editorRef.current.toTextArea();
        editorRef.current = null;
      }
    };
  }, []);

  if (disabled) {
    return (
      <div className="prose dark:prose-invert max-w-none p-4 bg-gray-50 dark:bg-gray-900 rounded-lg min-h-[400px]">
        <div className="whitespace-pre-wrap">{value || placeholder}</div>
      </div>
    );
  }

  return (
    <div className="markdown-editor">
      <SimpleMdeReact
        value={value}
        onChange={onChange}
        options={options}
        getMdeInstance={getMdeInstance}
      />
    </div>
  );
}
