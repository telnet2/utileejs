/**
 * Number Input Field Component
 */

import React, { useCallback } from 'react';
import { FieldProps } from '../../types';

export const NumberField: React.FC<FieldProps> = ({
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
      const stringValue = e.target.value;

      if (stringValue === '') {
        onChange(undefined);
        return;
      }

      const numValue = parseFloat(stringValue);

      if (!isNaN(numValue)) {
        // For integer type, ensure it's an integer
        if (schema.type === 'integer') {
          onChange(Math.round(numValue));
        } else {
          onChange(numValue);
        }
      }
    },
    [onChange, schema.type]
  );

  const hasError = touched && error;
  const step = uischema.options?.step ?? schema.multipleOf ?? (schema.type === 'integer' ? 1 : 'any');

  return (
    <div className={`form-field ${className || ''}`} style={style}>
      {(label as any) !== false && (
        <label className="form-label">
          {label || schema.title}
          {required && <span className="required-mark">*</span>}
        </label>
      )}

      <input
        type="number"
        value={value ?? ''}
        onChange={handleChange}
        onBlur={onBlur}
        onFocus={onFocus}
        placeholder={placeholder || uischema.placeholder}
        disabled={disabled || uischema.disabled}
        readOnly={readOnly || uischema.readOnly}
        required={required}
        className={`form-input ${hasError ? 'error' : ''}`}
        min={uischema.options?.min ?? schema.minimum}
        max={uischema.options?.max ?? schema.maximum}
        step={step}
      />

      {description && <div className="form-description">{description}</div>}
      {uischema.helpText && <div className="form-help-text">{uischema.helpText}</div>}
      {hasError && <div className="form-error">{error}</div>}
    </div>
  );
};

NumberField.displayName = 'NumberField';
