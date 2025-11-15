/**
 * Text Input Field Component
 */

import React, { useCallback } from 'react';
import { FieldProps } from '../../types';

export const TextField: React.FC<FieldProps> = ({
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
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.value);
    },
    [onChange]
  );

  const inputType = uischema.widget || schema.format || 'text';
  const hasError = touched && error;

  return (
    <div className={`form-field ${className || ''}`} style={style}>
      {label !== false && (
        <label className="form-label">
          {label || schema.title}
          {required && <span className="required-mark">*</span>}
        </label>
      )}

      <input
        type={inputType}
        value={value || ''}
        onChange={handleChange}
        onBlur={onBlur}
        onFocus={onFocus}
        placeholder={placeholder || uischema.placeholder}
        disabled={disabled || uischema.disabled}
        readOnly={readOnly || uischema.readOnly}
        required={required}
        className={`form-input ${hasError ? 'error' : ''}`}
        min={schema.minimum}
        max={schema.maximum}
        minLength={schema.minLength}
        maxLength={schema.maxLength}
        pattern={schema.pattern}
        autoComplete={uischema.options?.autocomplete}
      />

      {description && <div className="form-description">{description}</div>}
      {uischema.helpText && <div className="form-help-text">{uischema.helpText}</div>}
      {hasError && <div className="form-error">{error}</div>}
    </div>
  );
};

TextField.displayName = 'TextField';
