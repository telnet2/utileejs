/**
 * Slider Field Component
 */

import React, { useCallback } from 'react';
import { FieldProps } from '../../types';

export const SliderField: React.FC<FieldProps> = ({
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
      const numValue = parseFloat(e.target.value);
      onChange(isNaN(numValue) ? 0 : numValue);
    },
    [onChange]
  );

  const hasError = touched && error;
  const min = uischema.options?.min ?? schema.minimum ?? 0;
  const max = uischema.options?.max ?? schema.maximum ?? 100;
  const step = uischema.options?.step ?? schema.multipleOf ?? 1;

  return (
    <div className={`form-field ${className || ''}`} style={style}>
      {label !== false && (
        <div className="form-label">
          {label || schema.title}
          {required && <span className="required-mark">*</span>}
          <span className="slider-value">{value ?? min}</span>
        </div>
      )}

      <input
        type="range"
        value={value ?? min}
        onChange={handleChange}
        onBlur={onBlur}
        onFocus={onFocus}
        min={min}
        max={max}
        step={step}
        disabled={disabled || uischema.disabled}
        readOnly={readOnly || uischema.readOnly}
        required={required}
        className={`form-slider ${hasError ? 'error' : ''}`}
      />

      <div className="slider-labels">
        <span className="slider-min">{min}</span>
        <span className="slider-max">{max}</span>
      </div>

      {description && <div className="form-description">{description}</div>}
      {uischema.helpText && <div className="form-help-text">{uischema.helpText}</div>}
      {hasError && <div className="form-error">{error}</div>}
    </div>
  );
};

SliderField.displayName = 'SliderField';
