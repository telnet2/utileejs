/**
 * Form Builder Component
 * Main component that renders a form from JSON Schema and UI Schema
 */

import React, { useCallback, useMemo } from 'react';
import { FormBuilderProps, FormContext } from '../types';
import { FormProvider } from '../hooks';
import { useFormState } from '../hooks/useFormState';
import { UISchemaRenderer } from './UISchemaRenderer';
import { generateUISchema } from '../utils/uischema-generator';

export const FormBuilder: React.FC<FormBuilderProps> = (props) => {
  const {
    schema,
    uischema: providedUISchema,
    onSubmit,
    theme,
    widgets,
    className = '',
    style,
    showErrorList = false,
    disabled = false,
    readOnly = false,
  } = props;

  // Use form state hook
  const {
    data,
    errors,
    touched,
    formState,
    updateData,
    setTouched,
    validateField,
    validateForm,
    resetForm,
  } = useFormState(props);

  // Auto-generate UI schema if not provided
  const uischema = useMemo(() => {
    return providedUISchema || generateUISchema(schema);
  }, [providedUISchema, schema]);

  // Create form context value
  const contextValue: FormContext = useMemo(
    () => ({
      schema,
      uischema,
      data,
      errors,
      touched,
      formState,
      theme,
      widgets,
      updateData,
      setTouched,
      validateField,
      validateForm,
      resetForm,
    }),
    [
      schema,
      uischema,
      data,
      errors,
      touched,
      formState,
      theme,
      widgets,
      updateData,
      setTouched,
      validateField,
      validateForm,
      resetForm,
    ]
  );

  // Handle form submission
  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      // Validate form
      const isValid = validateForm();

      if (isValid && onSubmit) {
        onSubmit(data);
      }
    },
    [validateForm, onSubmit, data]
  );

  // Apply theme CSS variables
  const formStyle = useMemo(() => {
    const cssVars: Record<string, string> = {};

    if (theme) {
      if (theme.primaryColor) cssVars['--form-primary-color'] = theme.primaryColor;
      if (theme.errorColor) cssVars['--form-error-color'] = theme.errorColor;
      if (theme.successColor) cssVars['--form-success-color'] = theme.successColor;
      if (theme.warningColor) cssVars['--form-warning-color'] = theme.warningColor;
      if (theme.borderRadius) cssVars['--form-border-radius'] = theme.borderRadius;
      if (theme.fontFamily) cssVars['--form-font-family'] = theme.fontFamily;
      if (theme.fontSize) cssVars['--form-font-size'] = theme.fontSize;

      if (theme.spacing) {
        if (theme.spacing.small) cssVars['--form-spacing-small'] = theme.spacing.small;
        if (theme.spacing.medium) cssVars['--form-spacing-medium'] = theme.spacing.medium;
        if (theme.spacing.large) cssVars['--form-spacing-large'] = theme.spacing.large;
      }

      if (theme.cssVariables) {
        Object.assign(cssVars, theme.cssVariables);
      }
    }

    return { ...cssVars, ...style } as React.CSSProperties;
  }, [theme, style]);

  // Build class names
  const formClassName = useMemo(() => {
    const classes = ['form-builder'];

    if (disabled) classes.push('form-disabled');
    if (readOnly) classes.push('form-readonly');
    if (!formState.isValid) classes.push('form-invalid');
    if (formState.dirty) classes.push('form-dirty');
    if (formState.isSubmitting) classes.push('form-submitting');

    if (className) classes.push(className);

    return classes.join(' ');
  }, [disabled, readOnly, formState, className]);

  return (
    <FormProvider value={contextValue}>
      <form className={formClassName} style={formStyle} onSubmit={handleSubmit} noValidate>
        {/* Error list */}
        {showErrorList && errors.length > 0 && (
          <div className="form-error-list">
            <h3 className="error-list-title">Please fix the following errors:</h3>
            <ul className="error-list">
              {errors.map((error, index) => (
                <li key={index} className="error-list-item">
                  <strong>{error.path || 'Form'}:</strong> {error.message}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Render UI schema */}
        <UISchemaRenderer uischema={uischema} />
      </form>
    </FormProvider>
  );
};

FormBuilder.displayName = 'FormBuilder';
