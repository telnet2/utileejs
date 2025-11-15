/**
 * Schema Utility Functions
 */

import { JSONSchema, JSONSchemaType } from '../types/schema';

/**
 * Resolve a JSON Pointer path in a schema
 * @param schema The JSON Schema
 * @param pointer JSON Pointer (e.g., "#/properties/user/properties/name")
 * @returns The resolved schema at the pointer location
 */
export function resolveSchema(schema: JSONSchema, pointer: string): JSONSchema | undefined {
  if (!pointer || pointer === '#') {
    return schema;
  }

  // Remove leading '#/' if present
  const path = pointer.replace(/^#\//, '').split('/');
  let current: any = schema;

  for (const segment of path) {
    if (!current || typeof current !== 'object') {
      return undefined;
    }
    current = current[segment];
  }

  return current as JSONSchema;
}

/**
 * Get the property name from a JSON Pointer
 * @param pointer JSON Pointer (e.g., "#/properties/user/properties/name")
 * @returns The property name (e.g., "name")
 */
export function getPropertyNameFromPointer(pointer: string): string {
  const parts = pointer.replace(/^#\//, '').split('/');
  return parts[parts.length - 1];
}

/**
 * Convert JSON Pointer to data path
 * @param pointer JSON Pointer (e.g., "#/properties/user/properties/name")
 * @returns Data path (e.g., "user.name")
 */
export function pointerToPath(pointer: string): string {
  return pointer
    .replace(/^#\//, '')
    .split('/')
    .filter((segment) => segment !== 'properties' && segment !== 'items')
    .join('.');
}

/**
 * Convert data path to JSON Pointer
 * @param path Data path (e.g., "user.name")
 * @returns JSON Pointer (e.g., "#/properties/user/properties/name")
 */
export function pathToPointer(path: string): string {
  if (!path) return '#';
  const segments = path.split('.');
  return '#/properties/' + segments.join('/properties/');
}

/**
 * Get the schema type, handling array types
 * @param schema JSON Schema
 * @returns The primary type
 */
export function getSchemaType(schema: JSONSchema): JSONSchemaType | undefined {
  if (!schema.type) return undefined;
  return Array.isArray(schema.type) ? schema.type[0] : schema.type;
}

/**
 * Check if a field is required based on its parent schema
 * @param schema The parent schema
 * @param propertyName The property name to check
 * @returns Whether the field is required
 */
export function isFieldRequired(schema: JSONSchema, propertyName: string): boolean {
  return schema.required?.includes(propertyName) ?? false;
}

/**
 * Get all property paths from a schema
 * @param schema JSON Schema
 * @param prefix Current path prefix
 * @returns Array of property paths
 */
export function getAllPropertyPaths(schema: JSONSchema, prefix: string = ''): string[] {
  const paths: string[] = [];

  if (schema.properties) {
    Object.keys(schema.properties).forEach((key) => {
      const path = prefix ? `${prefix}.${key}` : key;
      paths.push(path);

      const propertySchema = schema.properties![key];
      if (propertySchema.properties) {
        paths.push(...getAllPropertyPaths(propertySchema, path));
      }
    });
  }

  return paths;
}

/**
 * Get default value for a schema
 * @param schema JSON Schema
 * @returns Default value based on type
 */
export function getDefaultValue(schema: JSONSchema): any {
  if (schema.default !== undefined) {
    return schema.default;
  }

  const type = getSchemaType(schema);

  switch (type) {
    case 'string':
      return '';
    case 'number':
    case 'integer':
      return schema.minimum ?? 0;
    case 'boolean':
      return false;
    case 'array':
      return [];
    case 'object':
      const obj: any = {};
      if (schema.properties) {
        Object.keys(schema.properties).forEach((key) => {
          if (isFieldRequired(schema, key)) {
            obj[key] = getDefaultValue(schema.properties![key]);
          }
        });
      }
      return obj;
    default:
      return null;
  }
}

/**
 * Get the title for a schema property
 * @param schema JSON Schema
 * @param propertyName Property name
 * @returns Title (uses propertyName as fallback)
 */
export function getTitle(schema: JSONSchema, propertyName?: string): string {
  if (schema.title) {
    return schema.title;
  }

  if (propertyName) {
    // Convert camelCase or snake_case to Title Case
    return propertyName
      .replace(/([A-Z])/g, ' $1')
      .replace(/_/g, ' ')
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
  }

  return '';
}

/**
 * Merge schemas (useful for allOf, anyOf, oneOf)
 * @param schemas Array of schemas to merge
 * @returns Merged schema
 */
export function mergeSchemas(...schemas: JSONSchema[]): JSONSchema {
  const merged: JSONSchema = {};

  schemas.forEach((schema) => {
    Object.assign(merged, schema);

    // Merge properties
    if (schema.properties) {
      merged.properties = { ...merged.properties, ...schema.properties };
    }

    // Merge required
    if (schema.required) {
      merged.required = [...(merged.required || []), ...schema.required];
    }
  });

  return merged;
}

/**
 * Check if schema represents an enum
 * @param schema JSON Schema
 * @returns Whether the schema has enum values
 */
export function isEnumSchema(schema: JSONSchema): boolean {
  return Array.isArray(schema.enum) && schema.enum.length > 0;
}

/**
 * Check if schema represents a boolean
 * @param schema JSON Schema
 * @returns Whether the schema is a boolean type
 */
export function isBooleanSchema(schema: JSONSchema): boolean {
  return getSchemaType(schema) === 'boolean';
}

/**
 * Check if schema represents a number
 * @param schema JSON Schema
 * @returns Whether the schema is a number type
 */
export function isNumberSchema(schema: JSONSchema): boolean {
  const type = getSchemaType(schema);
  return type === 'number' || type === 'integer';
}

/**
 * Check if schema represents a string
 * @param schema JSON Schema
 * @returns Whether the schema is a string type
 */
export function isStringSchema(schema: JSONSchema): boolean {
  return getSchemaType(schema) === 'string';
}

/**
 * Check if schema represents an array
 * @param schema JSON Schema
 * @returns Whether the schema is an array type
 */
export function isArraySchema(schema: JSONSchema): boolean {
  return getSchemaType(schema) === 'array';
}

/**
 * Check if schema represents an object
 * @param schema JSON Schema
 * @returns Whether the schema is an object type
 */
export function isObjectSchema(schema: JSONSchema): boolean {
  return getSchemaType(schema) === 'object' || !!schema.properties;
}
