/**
 * Radio Button Group Field Component
 */

import React, { useCallback } from 'react';
import { FieldProps } from '../../types';

export const RadioField: React.FC<FieldProps> = ({
  value,
  onChange,
  onBlur,
  onFocus,
  schema,
  uischema,
  path,
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
    (enumValue: any) => {
      // Try to parse as number if schema type is number
      if (schema.type === 'number' || schema.type === 'integer') {
        const numValue = parseFloat(enumValue);
        onChange(isNaN(numValue) ? enumValue : numValue);
      } else {
        onChange(enumValue);
      }
    },
    [onChange, schema.type]
  );

  const hasError = touched && error;
  const enumValues = schema.enum || [];
  const enumNames = schema.enumNames || enumValues;
  const inline = uischema.options?.inline;

  return (
    <div className={`form-field ${className || ''}`} style={style}>
      {label !== false && (
        <div className="form-label">
          {label || schema.title}
          {required && <span className="required-mark">*</span>}
        </div>
      )}

      <div className={`radio-group ${inline ? 'radio-group-inline' : 'radio-group-vertical'}`}>
        {enumValues.map((enumValue, index) => {
          const id = `${path}-${index}`;
          const checked = value === enumValue || JSON.stringify(value) === JSON.stringify(enumValue);

          return (
            <label key={index} className="radio-label" htmlFor={id}>
              <input
                id={id}
                type="radio"
                name={path}
                value={String(enumValue)}
                checked={checked}
                onChange={() => handleChange(enumValue)}
                onBlur={onBlur}
                onFocus={onFocus}
                disabled={disabled || uischema.disabled}
                readOnly={readOnly || uischema.readOnly}
                required={required && index === 0}
                className={`form-radio ${hasError ? 'error' : ''}`}
              />
              <span className="radio-text">{enumNames[index] ?? enumValue}</span>
            </label>
          );
        })}
      </div>

      {description && <div className="form-description">{description}</div>}
      {uischema.helpText && <div className="form-help-text">{uischema.helpText}</div>}
      {hasError && <div className="form-error">{error}</div>}
    </div>
  );
};

RadioField.displayName = 'RadioField';
