import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud } from 'lucide-react';

interface ImageUploaderProps {
  onUpload: (base64: string) => void;
}

export function ImageUploader({ onUpload }: ImageUploaderProps) {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (typeof e.target?.result === 'string') {
          onUpload(e.target.result);
        }
      };
      reader.readAsDataURL(file);
    }
  }, [onUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    multiple: false,
  });

  return (
    <div
      {...getRootProps()}
      className={`w-full max-w-2xl p-12 border-2 border-dashed rounded-xl cursor-pointer transition-colors duration-200 flex flex-col items-center justify-center text-center
        ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400 bg-gray-50'}`}
    >
      <input {...getInputProps()} />
      <UploadCloud className="w-12 h-12 text-gray-400 mb-4" />
      <p className="text-lg font-medium text-gray-700">
        {isDragActive ? 'Drop the image here...' : 'Drag & drop a photo of your space here'}
      </p>
      <p className="text-sm text-gray-500 mt-2">or click to select a file</p>
    </div>
  );
}
