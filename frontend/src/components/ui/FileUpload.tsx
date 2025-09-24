'use client';

import React, { useState, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import {
  CloudArrowUpIcon,
  XMarkIcon,
  DocumentIcon,
  PhotoIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';

interface FileUploadProps {
  accept?: string;
  multiple?: boolean;
  maxSize?: number; // in bytes
  maxFiles?: number;
  onUpload: (files: File[]) => void | Promise<void>;
  onRemove?: (file: File) => void;
  files?: File[];
  loading?: boolean;
  error?: string;
  className?: string;
  disabled?: boolean;
}

interface UploadedFile {
  file: File;
  id: string;
  preview?: string;
  progress?: number;
  error?: string;
}

const FileUpload: React.FC<FileUploadProps> = ({
  accept = '*/*',
  multiple = false,
  maxSize = 10 * 1024 * 1024, // 10MB
  maxFiles = 5,
  onUpload,
  onRemove,
  files = [],
  loading = false,
  error,
  className,
  disabled = false,
}) => {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    if (file.size > maxSize) {
      return `File size must be less than ${(maxSize / (1024 * 1024)).toFixed(1)}MB`;
    }
    return null;
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return <PhotoIcon className="h-8 w-8 text-blue-500" />;
    }
    return <DocumentIcon className="h-8 w-8 text-gray-500" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleFiles = useCallback(async (newFiles: FileList | File[]) => {
    const fileArray = Array.from(newFiles);
    
    // Validate files
    const validFiles: File[] = [];
    const errors: string[] = [];

    fileArray.forEach(file => {
      const error = validateFile(file);
      if (error) {
        errors.push(`${file.name}: ${error}`);
      } else {
        validFiles.push(file);
      }
    });

    if (errors.length > 0) {
      console.error('File validation errors:', errors);
    }

    // Check max files limit
    if (uploadedFiles.length + validFiles.length > maxFiles) {
      console.error(`Maximum ${maxFiles} files allowed`);
      return;
    }

    // Create uploaded file objects
    const newUploadedFiles: UploadedFile[] = validFiles.map(file => ({
      file,
      id: Math.random().toString(36).substr(2, 9),
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
    }));

    setUploadedFiles(prev => [...prev, ...newUploadedFiles]);

    // Upload files
    try {
      await onUpload(validFiles);
    } catch (error) {
      console.error('Upload error:', error);
    }
  }, [maxFiles, maxSize, onUpload, uploadedFiles.length]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (disabled || loading) return;

    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles && droppedFiles.length > 0) {
      handleFiles(droppedFiles);
    }
  }, [disabled, loading, handleFiles]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      handleFiles(selectedFiles);
    }
  }, [handleFiles]);

  const handleRemoveFile = (fileId: string) => {
    setUploadedFiles(prev => {
      const fileToRemove = prev.find(f => f.id === fileId);
      if (fileToRemove && onRemove) {
        onRemove(fileToRemove.file);
      }
      return prev.filter(f => f.id !== fileId);
    });
  };

  const handleClick = () => {
    if (!disabled && !loading) {
      fileInputRef.current?.click();
    }
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Upload Area */}
      <div
        className={cn(
          'relative border-2 border-dashed rounded-lg p-6 transition-colors',
          dragActive
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400',
          disabled && 'opacity-50 cursor-not-allowed',
          loading && 'opacity-50 cursor-not-allowed'
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleFileInput}
          className="hidden"
          disabled={disabled || loading}
        />

        <div className="text-center">
          <CloudArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
          <div className="mt-4">
            <button
              type="button"
              onClick={handleClick}
              className="font-medium text-blue-600 hover:text-blue-500"
              disabled={disabled || loading}
            >
              {loading ? 'Uploading...' : 'Click to upload'}
            </button>
            <p className="mt-1 text-sm text-gray-600">
              or drag and drop
            </p>
          </div>
          <p className="mt-2 text-xs text-gray-500">
            {accept !== '*/*' && `Accepted formats: ${accept}`}
            <br />
            Max file size: {(maxSize / (1024 * 1024)).toFixed(1)}MB
            {maxFiles > 1 && ` • Max files: ${maxFiles}`}
          </p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
          {error}
        </div>
      )}

      {/* Uploaded Files */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-900">
            Uploaded Files ({uploadedFiles.length})
          </h4>
          <div className="space-y-2">
            {uploadedFiles.map((uploadedFile) => (
              <div
                key={uploadedFile.id}
                className="flex items-center p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex-shrink-0">
                  {uploadedFile.preview ? (
                    <img
                      src={uploadedFile.preview}
                      alt={uploadedFile.file.name}
                      className="h-10 w-10 object-cover rounded"
                    />
                  ) : (
                    getFileIcon(uploadedFile.file)
                  )}
                </div>
                <div className="ml-3 flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {uploadedFile.file.name}
                  </p>
                  <p className="text-sm text-gray-500">
                    {formatFileSize(uploadedFile.file.size)}
                  </p>
                  {uploadedFile.error && (
                    <p className="text-sm text-red-600">{uploadedFile.error}</p>
                  )}
                </div>
                <div className="flex-shrink-0 ml-3">
                  <button
                    onClick={() => handleRemoveFile(uploadedFile.id)}
                    className="text-gray-400 hover:text-red-600"
                    disabled={loading}
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUpload;
