'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface CameraCaptureProps {
  photos: string[]
  onCapture: (e: React.ChangeEvent<HTMLInputElement>) => void
  onRemove: (index: number) => void
  inputRef: React.RefObject<HTMLInputElement | null>
  isProcessing: boolean
}

export function CameraCapture({
  photos,
  onCapture,
  onRemove,
  inputRef,
  isProcessing,
}: CameraCaptureProps) {
  return (
    <div className="flex flex-col gap-4">
      {/* Hidden file input */}
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={onCapture}
        className="hidden"
        aria-hidden="true"
      />

      {/* Capture button */}
      <Button
        type="button"
        variant="outline"
        onClick={() => inputRef.current?.click()}
        disabled={isProcessing}
        className={cn(
          'flex h-14 w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-border text-gray-text transition-colors hover:border-accent-blue hover:text-accent-blue',
          isProcessing && 'cursor-not-allowed opacity-60'
        )}
      >
        {isProcessing ? (
          <>
            {/* Spinner icon */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="animate-spin"
            >
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
            <span className="text-sm font-medium">Processando...</span>
          </>
        ) : (
          <>
            {/* Camera icon */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
              <circle cx="12" cy="13" r="3" />
            </svg>
            <span className="text-sm font-medium">Tirar Foto</span>
          </>
        )}
      </Button>

      {/* Photo grid preview */}
      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {photos.map((photo, index) => (
            <div
              key={index}
              className="group relative aspect-square overflow-hidden rounded-lg border border-gray-border"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo}
                alt={`Foto ${index + 1}`}
                className="h-full w-full object-cover"
              />

              {/* Remove button */}
              <button
                type="button"
                onClick={() => onRemove(index)}
                className="absolute right-1 top-1 flex size-6 items-center justify-center rounded-full bg-error/90 text-white shadow-sm transition-opacity hover:bg-error"
                aria-label={`Remover foto ${index + 1}`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Photo count */}
      {photos.length > 0 && (
        <p className="text-center text-xs text-gray-muted">
          {photos.length} {photos.length === 1 ? 'foto capturada' : 'fotos capturadas'}
        </p>
      )}
    </div>
  )
}
