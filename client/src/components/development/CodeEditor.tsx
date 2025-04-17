import React, { useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: string;
  height?: string;
  theme?: 'light' | 'dark';
}

// This is a placeholder for a real Monaco editor component
// In a production app, we would use Monaco Editor or CodeMirror
const CodeEditor: React.FC<CodeEditorProps> = ({
  value,
  onChange,
  language = 'javascript',
  height = '100%',
  theme = 'light'
}) => {
  const editorRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // This would typically be where we'd initialize Monaco Editor
    // For now, we'll just focus the textarea
    if (editorRef.current) {
      editorRef.current.focus();
    }
  }, []);

  const getLanguageClass = () => {
    switch (language) {
      case 'javascript':
        return 'language-javascript';
      case 'typescript':
        return 'language-typescript';
      case 'html':
        return 'language-html';
      case 'css':
        return 'language-css';
      case 'python':
        return 'language-python';
      case 'json':
        return 'language-json';
      default:
        return 'language-plaintext';
    }
  };

  return (
    <div 
      className={cn(
        "h-full overflow-hidden border-0",
        theme === 'dark' ? 'bg-gray-900 text-gray-100' : 'bg-white text-gray-900'
      )}
      style={{ height }}
    >
      <textarea
        ref={editorRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "w-full h-full p-4 font-mono text-sm resize-none focus:outline-none",
          theme === 'dark' ? 'bg-gray-900 text-gray-100' : 'bg-white text-gray-900',
          getLanguageClass()
        )}
        spellCheck={false}
      />
    </div>
  );
};

export default CodeEditor;