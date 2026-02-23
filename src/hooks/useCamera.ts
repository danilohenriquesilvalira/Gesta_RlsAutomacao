'use client';

import { useRef, useCallback, useState } from 'react';
import imageCompression from 'browser-image-compression';

export function useCamera() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const openCamera = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const handleCapture = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    setIsProcessing(true);
    try {
      const newPhotos: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const compressed = await imageCompression(file, {
          maxSizeMB: 0.5,
          maxWidthOrHeight: 1280,
          useWebWorker: true,
        });
        const base64 = await imageCompression.getDataUrlFromFile(compressed);
        newPhotos.push(base64);
      }
      setPhotos((prev) => [...prev, ...newPhotos]);
    } finally {
      setIsProcessing(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }, []);

  const removePhoto = useCallback((index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const clearPhotos = useCallback(() => {
    setPhotos([]);
  }, []);

  return {
    inputRef,
    photos,
    isProcessing,
    openCamera,
    handleCapture,
    removePhoto,
    clearPhotos,
  };
}
