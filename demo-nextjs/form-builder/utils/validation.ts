/**
 * Validation Utilities
 */

import { JSONSchema, JSONSchemaType } from '../types/schema';
import { ValidationError } from '../types';
import { getValueByPath } from './data';
import { getSchemaType, resolveSchema, pointerToPath } from './schema';

/**
 * Validate a value against a JSON Schema
 * @param value The value to validate
 * @param schema The JSON Schema
 * @param path The path of the value (for error reporting)
 * @returns Array of validation errors
 */
export function validateValue(
  value: any,
  schema: JSONSchema,
  path: string = ''
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Type validation
  if (schema.type) {
    const typeErrors = validateType(value, schema.type, path);
    errors.push(...typeErrors);
  }

  // If type validation failed, skip further validations
  if (errors.length > 0) {
    return errors;
  }

  const type = getSchemaType(schema);

  // Type-specific validations
  switch (type) {
    case 'string':
      errors.push(...validateString(value, schema, path));
      break;
    case 'number':
    case 'integer':
      errors.push(...validateNumber(value, schema, path));
      break;
    case 'array':
      errors.push(...validateArray(value, schema, path));
      break;
    case 'object':
      errors.push(...validateObject(value, schema, path));
      break;
  }

  // Enum validation
  if (schema.enum) {
    errors.push(...validateEnum(value, schema.enum, path));
  }

  // Const validation
  if (schema.const !== undefined) {
    errors.push(...validateConst(value, schema.const, path));
  }

  // Conditional schemas
  if (schema.allOf) {
    errors.push(...validateAllOf(value, schema.allOf, path));
  }

  if (schema.anyOf) {
    errors.push(...validateAnyOf(value, schema.anyOf, path));
  }

  if (schema.oneOf) {
    errors.push(...validateOneOf(value, schema.oneOf, path));
  }

  if (schema.not) {
    errors.push(...validateNot(value, schema.not, path));
  }

  return errors;
}

/**
 * Validate type
 */
function validateType(
  value: any,
  type: JSONSchemaType | JSONSchemaType[],
  path: string
): ValidationError[] {
  const types = Array.isArray(type) ? type : [type];
  const actualType = getActualType(value);

  const isValid = types.some((t) => {
    if (t === 'integer') {
      return typeof value === 'number' && Number.isInteger(value);
    }
    if (t === 'null') {
      return value === null;
    }
    return actualType === t;
  });

  if (!isValid) {
    return [
      {
        path,
        message: `Expected type ${types.join(' or ')}, got ${actualType}`,
        keyword: 'type',
        params: { type: types },
      },
    ];
  }

  return [];
}

/**
 * Get actual type of a value
 */
function getActualType(value: any): JSONSchemaType {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number') return Number.isInteger(value) ? 'integer' : 'number';
  if (typeof value === 'string') return 'string';
  if (typeof value === 'object') return 'object';
  return 'null';
}

/**
 * Validate string
 */
function validateString(value: string, schema: JSONSchema, path: string): ValidationError[] {
  const errors: ValidationError[] = [];

  if (typeof value !== 'string') return errors;

  // Min length
  if (schema.minLength !== undefined && value.length < schema.minLength) {
    errors.push({
      path,
      message: `Must be at least ${schema.minLength} characters`,
      keyword: 'minLength',
      params: { minLength: schema.minLength },
    });
  }

  // Max length
  if (schema.maxLength !== undefined && value.length > schema.maxLength) {
    errors.push({
      path,
      message: `Must be at most ${schema.maxLength} characters`,
      keyword: 'maxLength',
      params: { maxLength: schema.maxLength },
    });
  }

  // Pattern
  if (schema.pattern) {
    const regex = new RegExp(schema.pattern);
    if (!regex.test(value)) {
      errors.push({
        path,
        message: `Must match pattern ${schema.pattern}`,
        keyword: 'pattern',
        params: { pattern: schema.pattern },
      });
    }
  }

  // Format
  if (schema.format) {
    const formatError = validateFormat(value, schema.format, path);
    if (formatError) errors.push(formatError);
  }

  return errors;
}

/**
 * Validate format
 */
function validateFormat(value: string, format: string, path: string): ValidationError | null {
  const formatRegexes: Record<string, RegExp> = {
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    uri: /^https?:\/\/.+/,
    url: /^https?:\/\/.+/,
    date: /^\d{4}-\d{2}-\d{2}$/,
    time: /^\d{2}:\d{2}(:\d{2})?$/,
    'date-time': /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/,
    tel: /^\+?[\d\s\-()]+$/,
    color: /^#[0-9A-Fa-f]{6}$/,
  };

  const regex = formatRegexes[format];
  if (regex && !regex.test(value)) {
    return {
      path,
      message: `Must be a valid ${format}`,
      keyword: 'format',
      params: { format },
    };
  }

  return null;
}

/**
 * Validate number
 */
function validateNumber(value: number, schema: JSONSchema, path: string): ValidationError[] {
  const errors: ValidationError[] = [];

  if (typeof value !== 'number') return errors;

  // Minimum
  if (schema.minimum !== undefined && value < schema.minimum) {
    errors.push({
      path,
      message: `Must be at least ${schema.minimum}`,
      keyword: 'minimum',
      params: { minimum: schema.minimum },
    });
  }

  // Exclusive minimum
  if (schema.exclusiveMinimum !== undefined && value <= schema.exclusiveMinimum) {
    errors.push({
      path,
      message: `Must be greater than ${schema.exclusiveMinimum}`,
      keyword: 'exclusiveMinimum',
      params: { exclusiveMinimum: schema.exclusiveMinimum },
    });
  }

  // Maximum
  if (schema.maximum !== undefined && value > schema.maximum) {
    errors.push({
      path,
      message: `Must be at most ${schema.maximum}`,
      keyword: 'maximum',
      params: { maximum: schema.maximum },
    });
  }

  // Exclusive maximum
  if (schema.exclusiveMaximum !== undefined && value >= schema.exclusiveMaximum) {
    errors.push({
      path,
      message: `Must be less than ${schema.exclusiveMaximum}`,
      keyword: 'exclusiveMaximum',
      params: { exclusiveMaximum: schema.exclusiveMaximum },
    });
  }

  // Multiple of
  if (schema.multipleOf !== undefined && value % schema.multipleOf !== 0) {
    errors.push({
      path,
      message: `Must be a multiple of ${schema.multipleOf}`,
      keyword: 'multipleOf',
      params: { multipleOf: schema.multipleOf },
    });
  }

  return errors;
}

/**
 * Validate array
 */
function validateArray(value: any[], schema: JSONSchema, path: string): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!Array.isArray(value)) return errors;

  // Min items
  if (schema.minItems !== undefined && value.length < schema.minItems) {
    errors.push({
      path,
      message: `Must have at least ${schema.minItems} items`,
      keyword: 'minItems',
      params: { minItems: schema.minItems },
    });
  }

  // Max items
  if (schema.maxItems !== undefined && value.length > schema.maxItems) {
    errors.push({
      path,
      message: `Must have at most ${schema.maxItems} items`,
      keyword: 'maxItems',
      params: { maxItems: schema.maxItems },
    });
  }

  // Unique items
  if (schema.uniqueItems) {
    const seen = new Set();
    const duplicates = value.filter((item) => {
      const key = JSON.stringify(item);
      if (seen.has(key)) return true;
      seen.add(key);
      return false;
    });

    if (duplicates.length > 0) {
      errors.push({
        path,
        message: 'Items must be unique',
        keyword: 'uniqueItems',
        params: {},
      });
    }
  }

  // Items validation
  if (schema.items) {
    if (Array.isArray(schema.items)) {
      // Tuple validation
      const itemSchemas = schema.items as JSONSchema[];
      value.forEach((item, index) => {
        if (index < itemSchemas.length) {
          const itemSchema = itemSchemas[index];
          const itemPath = `${path}[${index}]`;
          errors.push(...validateValue(item, itemSchema, itemPath));
        }
      });
    } else {
      // All items must match the same schema
      const itemSchema = schema.items as JSONSchema;
      value.forEach((item, index) => {
        const itemPath = `${path}[${index}]`;
        errors.push(...validateValue(item, itemSchema, itemPath));
      });
    }
  }

  return errors;
}

/**
 * Validate object
 */
function validateObject(value: any, schema: JSONSchema, path: string): ValidationError[] {
  const errors: ValidationError[] = [];

  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return errors;
  }

  // Required properties
  if (schema.required) {
    schema.required.forEach((prop) => {
      if (!(prop in value)) {
        const propPath = path ? `${path}.${prop}` : prop;
        errors.push({
          path: propPath,
          message: 'This field is required',
          keyword: 'required',
          params: { missingProperty: prop },
        });
      }
    });
  }

  // Properties validation
  if (schema.properties) {
    Object.keys(schema.properties).forEach((prop) => {
      if (prop in value) {
        const propPath = path ? `${path}.${prop}` : prop;
        const propSchema = schema.properties![prop];
        errors.push(...validateValue(value[prop], propSchema, propPath));
      }
    });
  }

  // Min properties
  const propCount = Object.keys(value).length;
  if (schema.minProperties !== undefined && propCount < schema.minProperties) {
    errors.push({
      path,
      message: `Must have at least ${schema.minProperties} properties`,
      keyword: 'minProperties',
      params: { minProperties: schema.minProperties },
    });
  }

  // Max properties
  if (schema.maxProperties !== undefined && propCount > schema.maxProperties) {
    errors.push({
      path,
      message: `Must have at most ${schema.maxProperties} properties`,
      keyword: 'maxProperties',
      params: { maxProperties: schema.maxProperties },
    });
  }

  return errors;
}

/**
 * Validate enum
 */
function validateEnum(value: any, enumValues: any[], path: string): ValidationError[] {
  const isValid = enumValues.some((enumValue) => {
    return JSON.stringify(enumValue) === JSON.stringify(value);
  });

  if (!isValid) {
    return [
      {
        path,
        message: `Must be one of: ${enumValues.join(', ')}`,
        keyword: 'enum',
        params: { allowedValues: enumValues },
      },
    ];
  }

  return [];
}

/**
 * Validate const
 */
function validateConst(value: any, constValue: any, path: string): ValidationError[] {
  if (JSON.stringify(value) !== JSON.stringify(constValue)) {
    return [
      {
        path,
        message: `Must be ${JSON.stringify(constValue)}`,
        keyword: 'const',
        params: { allowedValue: constValue },
      },
    ];
  }

  return [];
}

/**
 * Validate allOf
 */
function validateAllOf(value: any, schemas: JSONSchema[], path: string): ValidationError[] {
  const errors: ValidationError[] = [];

  schemas.forEach((schema) => {
    errors.push(...validateValue(value, schema, path));
  });

  return errors;
}

/**
 * Validate anyOf
 */
function validateAnyOf(value: any, schemas: JSONSchema[], path: string): ValidationError[] {
  const allErrors = schemas.map((schema) => validateValue(value, schema, path));

  const hasValid = allErrors.some((errors) => errors.length === 0);

  if (!hasValid) {
    return [
      {
        path,
        message: 'Must match at least one of the schemas',
        keyword: 'anyOf',
        params: {},
      },
    ];
  }

  return [];
}

/**
 * Validate oneOf
 */
function validateOneOf(value: any, schemas: JSONSchema[], path: string): ValidationError[] {
  const allErrors = schemas.map((schema) => validateValue(value, schema, path));

  const validCount = allErrors.filter((errors) => errors.length === 0).length;

  if (validCount !== 1) {
    return [
      {
        path,
        message: 'Must match exactly one of the schemas',
        keyword: 'oneOf',
        params: { matches: validCount },
      },
    ];
  }

  return [];
}

/**
 * Validate not
 */
function validateNot(value: any, schema: JSONSchema, path: string): ValidationError[] {
  const errors = validateValue(value, schema, path);

  if (errors.length === 0) {
    return [
      {
        path,
        message: 'Must not match the schema',
        keyword: 'not',
        params: {},
      },
    ];
  }

  return [];
}

/**
 * Validate entire form data against schema
 * @param data Form data
 * @param schema JSON Schema
 * @returns Array of validation errors
 */
export function validateFormData(data: any, schema: JSONSchema): ValidationError[] {
  return validateValue(data, schema, '');
}

/**
 * Get error message for a specific path
 * @param errors Array of validation errors
 * @param path Path to get error for
 * @returns Error message or undefined
 */
export function getErrorForPath(errors: ValidationError[], path: string): string | undefined {
  const error = errors.find((e) => e.path === path);
  return error?.message;
}

/**
 * Check if there are any errors for a path or its children
 * @param errors Array of validation errors
 * @param path Path to check
 * @returns Whether there are errors
 */
export function hasErrorsForPath(errors: ValidationError[], path: string): boolean {
  return errors.some((e) => e.path === path || e.path.startsWith(`${path}.`));
}
