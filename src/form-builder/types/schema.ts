/**
 * JSON Schema Type Definitions (Draft-07 compatible)
 */
export type JSONSchemaType =
  | 'string'
  | 'number'
  | 'integer'
  | 'boolean'
  | 'object'
  | 'array'
  | 'null';

export type JSONSchemaFormat =
  | 'date'
  | 'time'
  | 'date-time'
  | 'email'
  | 'uri'
  | 'url'
  | 'tel'
  | 'color'
  | 'password';

export interface JSONSchemaProperty {
  type?: JSONSchemaType | JSONSchemaType[];
  title?: string;
  description?: string;
  default?: any;
  enum?: any[];
  enumNames?: string[];
  const?: any;

  // String validations
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  format?: JSONSchemaFormat;

  // Number validations
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: number;
  exclusiveMaximum?: number;
  multipleOf?: number;

  // Array validations
  items?: JSONSchema | JSONSchema[];
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;
  contains?: JSONSchema;

  // Object validations
  properties?: Record<string, JSONSchema>;
  required?: string[];
  additionalProperties?: boolean | JSONSchema;
  patternProperties?: Record<string, JSONSchema>;
  minProperties?: number;
  maxProperties?: number;
  dependencies?: Record<string, JSONSchema | string[]>;

  // Conditional schemas
  if?: JSONSchema;
  then?: JSONSchema;
  else?: JSONSchema;
  allOf?: JSONSchema[];
  anyOf?: JSONSchema[];
  oneOf?: JSONSchema[];
  not?: JSONSchema;

  // Metadata
  readOnly?: boolean;
  writeOnly?: boolean;
  examples?: any[];
}

export type JSONSchema = JSONSchemaProperty;
