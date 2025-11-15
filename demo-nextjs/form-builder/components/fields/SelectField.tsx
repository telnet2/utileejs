/**
 * Select Field Component
 */

import React, { useCallback } from 'react';
import { FieldProps } from '../../types';

export const SelectField: React.FC<FieldProps> = ({
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
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const selectedValue = e.target.value;

      // Try to parse as number if schema type is number
      if (schema.type === 'number' || schema.type === 'integer') {
        const numValue = parseFloat(selectedValue);
        onChange(isNaN(numValue) ? selectedValue : numValue);
      } else if (selectedValue === '') {
        onChange(undefined);
      } else {
        onChange(selectedValue);
      }
    },
    [onChange, schema.type]
  );

  const hasError = touched && error;
  const enumValues = schema.enum || [];
  const enumNames = schema.enumNames || enumValues;

  return (
    <div className={`form-field ${className || ''}`} style={style}>
      {(label as any) !== false && (
        <label className="form-label">
          {label || schema.title}
          {required && <span className="required-mark">*</span>}
        </label>
      )}

      <select
        value={value ?? ''}
        onChange={handleChange}
        onBlur={onBlur}
        onFocus={onFocus}
        disabled={disabled || uischema.disabled || readOnly || uischema.readOnly}
        required={required}
        className={`form-select ${hasError ? 'error' : ''}`}
        multiple={uischema.options?.multiple}
      >
        <option value="">{placeholder || uischema.placeholder || 'Select an option...'}</option>
        {enumValues.map((enumValue, index) => (
          <option key={index} value={enumValue}>
            {enumNames[index] ?? enumValue}
          </option>
        ))}
      </select>

      {description && <div className="form-description">{description}</div>}
      {uischema.helpText && <div className="form-help-text">{uischema.helpText}</div>}
      {hasError && <div className="form-error">{error}</div>}
    </div>
  );
};

SelectField.displayName = 'SelectField';
