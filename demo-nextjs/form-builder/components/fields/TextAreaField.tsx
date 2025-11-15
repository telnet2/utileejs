/**
 * TextArea Field Component
 */

import React, { useCallback } from 'react';
import { FieldProps } from '../../types';

export const TextAreaField: React.FC<FieldProps> = ({
  value,
  onChange,
  onBlur,
  onFocus,
  schema,
  uischema,
  label,
  description,
  placeholder,
  required,
  disabled,
  readOnly,
  error,
  touched,
  className,
  style,
}) => {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange(e.target.value);
    },
    [onChange]
  );

  const hasError = touched && error;
  const rows = uischema.options?.rows || 4;
  const cols = uischema.options?.cols;

  return (
    <div className={`form-field ${className || ''}`} style={style}>
      {(label as any) !== false && (
        <label className="form-label">
          {label || schema.title}
          {required && <span className="required-mark">*</span>}
        </label>
      )}

      <textarea
        value={value || ''}
        onChange={handleChange}
        onBlur={onBlur}
        onFocus={onFocus}
        placeholder={placeholder || uischema.placeholder}
        disabled={disabled || uischema.disabled}
        readOnly={readOnly || uischema.readOnly}
        required={required}
        className={`form-textarea ${hasError ? 'error' : ''}`}
        rows={rows}
        cols={cols}
        minLength={schema.minLength}
        maxLength={schema.maxLength}
      />

      {description && <div className="form-description">{description}</div>}
      {uischema.helpText && <div className="form-help-text">{uischema.helpText}</div>}
      {hasError && <div className="form-error">{error}</div>}
    </div>
  );
};

TextAreaField.displayName = 'TextAreaField';
