/**
 * Control Renderer
 * Renders a single form control/field
 */

import React, { useCallback, useMemo } from 'react';
import { UISchemaControl, FieldProps } from '../types';
import { useFormContext } from '../hooks';
import { resolveSchema, getPropertyNameFromPointer, pointerToPath, getTitle, isFieldRequired } from '../utils/schema';
import { getValueByPath } from '../utils/data';
import { getErrorForPath } from '../utils/validation';
import { getWidget } from './fields';

interface ControlRendererProps {
  uischema: UISchemaControl;
}

export const ControlRenderer: React.FC<ControlRendererProps> = ({ uischema }) => {
  const formContext = useFormContext();
  const { schema, data, errors, touched, updateData, setTouched, widgets } = formContext;

  // Resolve the schema for this control
  const controlSchema = useMemo(() => {
    return resolveSchema(schema, uischema.scope);
  }, [schema, uischema.scope]);

  // Get the data path
  const path = useMemo(() => {
    return pointerToPath(uischema.scope);
  }, [uischema.scope]);

  // Get the property name
  const propertyName = useMemo(() => {
    return getPropertyNameFromPointer(uischema.scope);
  }, [uischema.scope]);

  // Get the value
  const value = useMemo(() => {
    return getValueByPath(data, path);
  }, [data, path]);

  // Get the error
  const error = useMemo(() => {
    return getErrorForPath(errors, path);
  }, [errors, path]);

  // Check if touched
  const isTouched = useMemo(() => {
    return touched.has(path);
  }, [touched, path]);

  // Check if required
  const isRequired = useMemo(() => {
    // Get parent schema to check required
    const parentPointer = uischema.scope.substring(0, uischema.scope.lastIndexOf('/properties/'));
    const parentSchema = resolveSchema(schema, parentPointer || '#');
    return parentSchema ? isFieldRequired(parentSchema, propertyName) : false;
  }, [schema, uischema.scope, propertyName]);

  // Handle change
  const handleChange = useCallback(
    (newValue: any) => {
      updateData(path, newValue);
    },
    [updateData, path]
  );

  // Handle blur
  const handleBlur = useCallback(() => {
    setTouched(path);
  }, [setTouched, path]);

  // Handle focus
  const handleFocus = useCallback(() => {
    // Can be used for tracking or other purposes
  }, []);

  // Check if hidden by rule
  const isHidden = useMemo(() => {
    if (uischema.hidden) return true;

    if (uischema.rule) {
      const { effect, condition } = uischema.rule;
      const conditionPath = pointerToPath(condition.scope);
      const conditionValue = getValueByPath(data, conditionPath);

      let conditionMet = false;

      if (condition.expectedValue !== undefined) {
        const operator = condition.operator || 'equals';

        switch (operator) {
          case 'equals':
            conditionMet = conditionValue === condition.expectedValue;
            break;
          case 'not_equals':
            conditionMet = conditionValue !== condition.expectedValue;
            break;
          case 'contains':
            conditionMet = Array.isArray(conditionValue) && conditionValue.includes(condition.expectedValue);
            break;
          case 'greater_than':
            conditionMet = conditionValue > condition.expectedValue;
            break;
          case 'less_than':
            conditionMet = conditionValue < condition.expectedValue;
            break;
          case 'matches':
            conditionMet = new RegExp(condition.expectedValue).test(String(conditionValue));
            break;
        }
      }

      if (effect === 'HIDE') {
        return conditionMet;
      } else if (effect === 'SHOW') {
        return !conditionMet;
      }
    }

    return false;
  }, [uischema.hidden, uischema.rule, data]);

  // Check if disabled by rule
  const isDisabled = useMemo(() => {
    if (uischema.disabled) return true;

    if (uischema.rule) {
      const { effect, condition } = uischema.rule;
      const conditionPath = pointerToPath(condition.scope);
      const conditionValue = getValueByPath(data, conditionPath);

      let conditionMet = false;

      if (condition.expectedValue !== undefined) {
        conditionMet = conditionValue === condition.expectedValue;
      }

      if (effect === 'DISABLE') {
        return conditionMet;
      } else if (effect === 'ENABLE') {
        return !conditionMet;
      }
    }

    return false;
  }, [uischema.disabled, uischema.rule, data]);

  if (!controlSchema) {
    console.warn(`Schema not found for scope: ${uischema.scope}`);
    return null;
  }

  if (isHidden) {
    return null;
  }

  // Determine which widget to use
  let WidgetComponent: React.ComponentType<FieldProps>;

  if (typeof uischema.widget === 'function') {
    // Custom component provided
    WidgetComponent = uischema.widget;
  } else if (typeof uischema.widget === 'string') {
    // Widget type string provided
    if (widgets && widgets[uischema.widget]) {
      WidgetComponent = widgets[uischema.widget];
    } else {
      WidgetComponent = getWidget(uischema.widget);
    }
  } else {
    // Auto-detect widget based on schema
    // This logic is in the field components index
    WidgetComponent = getWidget('text');
  }

  // Build field props
  const fieldProps: FieldProps = {
    value,
    onChange: handleChange,
    onBlur: handleBlur,
    onFocus: handleFocus,
    schema: controlSchema,
    uischema,
    path,
    label: uischema.label !== false ? (uischema.label || getTitle(controlSchema, propertyName)) : undefined,
    description: controlSchema.description,
    placeholder: uischema.placeholder,
    required: isRequired,
    disabled: isDisabled,
    readOnly: uischema.readOnly || controlSchema.readOnly,
    error,
    touched: isTouched,
    className: uischema.className,
    style: uischema.style,
  };

  return <WidgetComponent {...fieldProps} />;
};

ControlRenderer.displayName = 'ControlRenderer';
