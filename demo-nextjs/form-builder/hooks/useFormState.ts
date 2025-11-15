/**
 * Form State Hook
 * Manages form data, validation, and state
 */

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { JSONSchema, FormBuilderProps, ValidationError, FormState } from '../types';
import { validateFormData } from '../utils/validation';
import { setValueByPath, getValueByPath, deepClone } from '../utils/data';
import { getDefaultValue } from '../utils/schema';

export function useFormState(props: FormBuilderProps) {
  const {
    schema,
    data: initialData,
    onChange,
    onError,
    validateOnChange = false,
    validateOnBlur = true,
    liveValidate = false,
    customValidators,
    transformErrors,
    extraErrors,
  } = props;

  // Initialize data with defaults from schema
  const getInitialData = useCallback(() => {
    if (initialData !== undefined) {
      return initialData;
    }
    return getDefaultValue(schema);
  }, [initialData, schema]);

  const [data, setData] = useState(getInitialData);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [formState, setFormState] = useState<FormState>({
    isValid: true,
    isValidating: false,
    isSubmitting: false,
    submitCount: 0,
    dirty: false,
  });

  const initialDataRef = useRef(getInitialData());

  // Update data when initialData changes
  useEffect(() => {
    if (initialData !== undefined) {
      setData(initialData);
    }
  }, [initialData]);

  // Validate form data
  const validateForm = useCallback((): boolean => {
    setFormState((prev) => ({ ...prev, isValidating: true }));

    let validationErrors = validateFormData(data, schema);

    // Apply custom validators
    if (customValidators) {
      Object.values(customValidators).forEach((validator) => {
        validationErrors = validator(data, validationErrors);
      });
    }

    // Apply extra errors
    if (extraErrors) {
      Object.entries(extraErrors).forEach(([path, errorData]) => {
        if (errorData.__errors) {
          errorData.__errors.forEach((message) => {
            validationErrors.push({ path, message });
          });
        }
      });
    }

    // Transform errors if provided
    if (transformErrors) {
      validationErrors = transformErrors(validationErrors);
    }

    setErrors(validationErrors);
    setFormState((prev) => ({
      ...prev,
      isValid: validationErrors.length === 0,
      isValidating: false,
    }));

    if (onError && validationErrors.length > 0) {
      onError(validationErrors);
    }

    return validationErrors.length === 0;
  }, [data, schema, customValidators, extraErrors, transformErrors, onError]);

  // Validate a specific field
  const validateField = useCallback(
    (path: string) => {
      const value = getValueByPath(data, path);
      // For now, validate the entire form
      // TODO: Implement field-level validation
      validateForm();
    },
    [data, validateForm]
  );

  // Update data
  const updateData = useCallback(
    (path: string, value: any) => {
      const newData = setValueByPath(data, path, value);
      setData(newData);

      // Mark as dirty
      setFormState((prev) => ({ ...prev, dirty: true }));

      // Trigger onChange callback
      if (onChange) {
        onChange(newData);
      }

      // Validate on change if enabled
      if (validateOnChange || liveValidate) {
        setTimeout(() => {
          validateForm();
        }, 0);
      }
    },
    [data, onChange, validateOnChange, liveValidate, validateForm]
  );

  // Set touched
  const setTouchedField = useCallback(
    (path: string) => {
      setTouched((prev) => {
        const newTouched = new Set(prev);
        newTouched.add(path);
        return newTouched;
      });

      // Validate on blur if enabled
      if (validateOnBlur) {
        setTimeout(() => {
          validateField(path);
        }, 0);
      }
    },
    [validateOnBlur, validateField]
  );

  // Reset form
  const resetForm = useCallback(() => {
    setData(initialDataRef.current);
    setErrors([]);
    setTouched(new Set());
    setFormState({
      isValid: true,
      isValidating: false,
      isSubmitting: false,
      submitCount: 0,
      dirty: false,
    });
  }, []);

  // Live validation effect
  useEffect(() => {
    if (liveValidate) {
      validateForm();
    }
  }, [data, liveValidate]);

  return {
    data,
    errors,
    touched,
    formState,
    updateData,
    setTouched: setTouchedField,
    validateField,
    validateForm,
    resetForm,
  };
}
