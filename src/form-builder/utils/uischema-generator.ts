/**
 * UI Schema Auto-Generation Utility
 * Automatically generates a UI schema from a JSON schema
 */

import { JSONSchema } from '../types/schema';
import {
  UISchema,
  UISchemaControl,
  UISchemaVerticalLayout,
  WidgetType,
} from '../types/uischema';
import {
  getSchemaType,
  isEnumSchema,
  isBooleanSchema,
  isArraySchema,
  isObjectSchema,
  isNumberSchema,
  isStringSchema,
} from './schema';

/**
 * Generate UI schema from JSON schema
 * @param schema JSON Schema
 * @param pointer JSON Pointer prefix (for nested objects)
 * @returns Generated UI Schema
 */
export function generateUISchema(schema: JSONSchema, pointer: string = '#'): UISchema {
  if (isObjectSchema(schema) && schema.properties) {
    // Generate vertical layout with controls for each property
    const elements: UISchemaControl[] = [];

    Object.keys(schema.properties).forEach((propertyName) => {
      const propertySchema = schema.properties![propertyName];
      const propertyPointer = `${pointer}/properties/${propertyName}`;

      const control = generateControlForProperty(propertySchema, propertyPointer);
      elements.push(control);
    });

    return {
      type: 'VerticalLayout',
      elements,
    } as UISchemaVerticalLayout;
  }

  // For non-object schemas, create a single control
  return generateControlForProperty(schema, pointer);
}

/**
 * Generate a control element for a property
 * @param schema Property schema
 * @param pointer JSON Pointer to the property
 * @returns UI Schema Control
 */
function generateControlForProperty(schema: JSONSchema, pointer: string): UISchemaControl {
  const widget = inferWidget(schema);

  const control: UISchemaControl = {
    type: 'Control',
    scope: pointer,
    widget,
  };

  // Add placeholder if format suggests it
  if (schema.format === 'email') {
    control.placeholder = 'email@example.com';
  } else if (schema.format === 'uri' || schema.format === 'url') {
    control.placeholder = 'https://example.com';
  } else if (schema.format === 'tel') {
    control.placeholder = '+1 (555) 000-0000';
  }

  // Set as read-only if specified
  if (schema.readOnly) {
    control.readOnly = true;
  }

  // Add help text from description
  if (schema.description) {
    control.helpText = schema.description;
  }

  return control;
}

/**
 * Infer the appropriate widget type from a schema
 * @param schema JSON Schema
 * @returns Widget type
 */
function inferWidget(schema: JSONSchema): WidgetType {
  // Boolean
  if (isBooleanSchema(schema)) {
    return 'checkbox';
  }

  // Enum (select)
  if (isEnumSchema(schema)) {
    return schema.enum!.length > 4 ? 'select' : 'radio';
  }

  // String types
  if (isStringSchema(schema)) {
    // Format-based inference
    if (schema.format) {
      switch (schema.format) {
        case 'email':
          return 'email';
        case 'uri':
        case 'url':
          return 'url';
        case 'tel':
          return 'tel';
        case 'date':
          return 'date';
        case 'time':
          return 'time';
        case 'date-time':
          return 'datetime';
        case 'color':
          return 'color';
        case 'password':
          return 'password';
      }
    }

    // Length-based inference
    if (schema.maxLength && schema.maxLength > 100) {
      return 'textarea';
    }

    return 'text';
  }

  // Number types
  if (isNumberSchema(schema)) {
    // Use slider if min/max are defined and range is reasonable
    if (
      schema.minimum !== undefined &&
      schema.maximum !== undefined &&
      schema.maximum - schema.minimum <= 100
    ) {
      return 'slider';
    }

    return 'number';
  }

  // Array types
  if (isArraySchema(schema)) {
    return 'multiselect';
  }

  // Default to text
  return 'text';
}

/**
 * Generate a grid layout UI schema
 * @param schema JSON Schema
 * @param columns Number of columns
 * @param pointer JSON Pointer prefix
 * @returns Grid Layout UI Schema
 */
export function generateGridLayout(
  schema: JSONSchema,
  columns: number = 2,
  pointer: string = '#'
): UISchema {
  if (!isObjectSchema(schema) || !schema.properties) {
    return generateUISchema(schema, pointer);
  }

  const elements: any[] = [];
  const properties = Object.keys(schema.properties);

  properties.forEach((propertyName) => {
    const propertySchema = schema.properties![propertyName];
    const propertyPointer = `${pointer}/properties/${propertyName}`;

    const control = generateControlForProperty(propertySchema, propertyPointer);
    elements.push({
      element: control,
      span: 1,
    });
  });

  return {
    type: 'GridLayout',
    elements,
    columns,
  };
}

/**
 * Generate a categorized UI schema (tabs)
 * @param schema JSON Schema with categorized properties
 * @param categories Category configuration
 * @param pointer JSON Pointer prefix
 * @returns Categorization UI Schema
 */
export function generateCategorizedLayout(
  schema: JSONSchema,
  categories: Record<string, string[]>,
  pointer: string = '#'
): UISchema {
  if (!isObjectSchema(schema) || !schema.properties) {
    return generateUISchema(schema, pointer);
  }

  const categoryElements = Object.entries(categories).map(([categoryLabel, propertyNames]) => {
    const controls: UISchemaControl[] = propertyNames
      .filter((name) => schema.properties![name])
      .map((name) => {
        const propertySchema = schema.properties![name];
        const propertyPointer = `${pointer}/properties/${name}`;
        return generateControlForProperty(propertySchema, propertyPointer);
      });

    return {
      type: 'Category',
      label: categoryLabel,
      elements: controls,
    };
  });

  return {
    type: 'Categorization',
    elements: categoryElements,
  };
}

/**
 * Generate a grouped UI schema
 * @param schema JSON Schema
 * @param groups Group configuration
 * @param pointer JSON Pointer prefix
 * @returns Vertical Layout with Groups
 */
export function generateGroupedLayout(
  schema: JSONSchema,
  groups: Record<string, string[]>,
  pointer: string = '#'
): UISchema {
  if (!isObjectSchema(schema) || !schema.properties) {
    return generateUISchema(schema, pointer);
  }

  const groupElements = Object.entries(groups).map(([groupLabel, propertyNames]) => {
    const controls: UISchemaControl[] = propertyNames
      .filter((name) => schema.properties![name])
      .map((name) => {
        const propertySchema = schema.properties![name];
        const propertyPointer = `${pointer}/properties/${name}`;
        return generateControlForProperty(propertySchema, propertyPointer);
      });

    return {
      type: 'Group',
      label: groupLabel,
      elements: controls,
    };
  });

  return {
    type: 'VerticalLayout',
    elements: groupElements,
  };
}

/**
 * Generate a responsive two-column layout
 * @param schema JSON Schema
 * @param pointer JSON Pointer prefix
 * @returns Grid Layout UI Schema
 */
export function generateResponsiveLayout(schema: JSONSchema, pointer: string = '#'): UISchema {
  if (!isObjectSchema(schema) || !schema.properties) {
    return generateUISchema(schema, pointer);
  }

  const elements: any[] = [];
  const properties = Object.keys(schema.properties);

  properties.forEach((propertyName) => {
    const propertySchema = schema.properties![propertyName];
    const propertyPointer = `${pointer}/properties/${propertyName}`;

    const control = generateControlForProperty(propertySchema, propertyPointer);

    // Full width for textareas and certain types
    const isFullWidth =
      propertySchema.type === 'object' ||
      propertySchema.type === 'array' ||
      (propertySchema.type === 'string' && propertySchema.maxLength && propertySchema.maxLength > 100);

    elements.push({
      element: control,
      span: isFullWidth
        ? { xs: 12, sm: 12, md: 12, lg: 12, xl: 12 }
        : { xs: 12, sm: 12, md: 6, lg: 6, xl: 6 },
    });
  });

  return {
    type: 'GridLayout',
    elements,
    columns: { xs: 1, sm: 1, md: 2, lg: 2, xl: 2 },
  };
}
