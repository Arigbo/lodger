import type { Dispatch, SetStateAction } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import type { FormValues } from './schemas';

/** The react-hook-form instance shared by every wizard step. */
export type PropertyForm = UseFormReturn<FormValues>;

/** Result of the automatic image check for one photo slot. */
export type ImageAnalysis = { safety: string; context: string; reason?: string } | null;
export type ImageAnalysisMap = Record<string, ImageAnalysis>;
export type SetImageAnalysis = Dispatch<SetStateAction<ImageAnalysisMap>>;

/** Minimal controlled-field contract used by the upload widgets. */
export type FileField = {
  name: string;
  value: FileList | null | undefined;
  onChange: (files: FileList | null) => void;
};
