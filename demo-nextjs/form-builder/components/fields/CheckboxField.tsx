/**
 * Checkbox Field Component
 */

import React, { useCallback } from 'react';
import { FieldProps } from '../../types';

export const CheckboxField: React.FC<FieldProps> = ({
  value,
  onChange,
  onBlur,
  onFocus,
  schema,
  uischema,
  label,
  description,
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
      onChange(e.target.checked);
    },
    [onChange]
  );

  const hasError = touched && error;

  return (
    <div className={`form-field form-field-checkbox ${className || ''}`} style={style}>
      <label className="form-checkbox-label">
        <input
          type="checkbox"
          checked={!!value}
          onChange={handleChange}
          onBlur={onBlur}
          onFocus={onFocus}
          disabled={disabled || uischema.disabled}
          readOnly={readOnly || uischema.readOnly}
          required={required}
          className={`form-checkbox ${hasError ? 'error' : ''}`}
        />
        <span className="checkbox-text">
          {(label as any) !== false && (label || schema.title)}
          {required && <span className="required-mark">*</span>}
        </span>
      </label>

      {description && <div className="form-description">{description}</div>}
      {uischema.helpText && <div className="form-help-text">{uischema.helpText}</div>}
      {hasError && <div className="form-error">{error}</div>}
    </div>
  );
};

CheckboxField.displayName = 'CheckboxField';
