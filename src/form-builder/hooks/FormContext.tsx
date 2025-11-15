/**
 * Form Context
 * Provides form state and methods to all components
 */

import React, { createContext, useContext } from 'react';
import { FormContext as IFormContext } from '../types';

const FormContext = createContext<IFormContext | null>(null);

export const FormProvider = FormContext.Provider;

/**
 * Hook to access form context
 */
export function useFormContext(): IFormContext {
  const context = useContext(FormContext);

  if (!context) {
    throw new Error('useFormContext must be used within a FormBuilder component');
  }

  return context;
}

/**
 * Hook to check if we're inside a form context
 */
export function useIsInsideForm(): boolean {
  const context = useContext(FormContext);
  return context !== null;
}
