/**
 * UI Schema Type Definitions
 * Defines how the form should be rendered visually
 */

import { JSONSchema } from './schema';

/**
 * Base UI Schema Element
 */
export interface UISchemaElement {
  type: UISchemaType;
  rule?: UISchemaRule;
  options?: UISchemaOptions;
}

/**
 * UI Schema Types
 */
export type UISchemaType =
  | 'Control'
  | 'VerticalLayout'
  | 'HorizontalLayout'
  | 'GridLayout'
  | 'Group'
  | 'Categorization'
  | 'Category'
  | 'Label';

/**
 * Control Element - represents an actual form input
 */
export interface UISchemaControl extends UISchemaElement {
  type: 'Control';
  scope: string; // JSON Pointer to the schema property (e.g., "#/properties/firstName")
  label?: string | false; // Custom label or false to hide
  widget?: WidgetType | React.ComponentType<FieldProps>;
  placeholder?: string;
  helpText?: string;
  className?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
  readOnly?: boolean;
  hidden?: boolean;
  options?: ControlOptions;
}

/**
 * Widget Types
 */
export type WidgetType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'password'
  | 'email'
  | 'url'
  | 'tel'
  | 'date'
  | 'time'
  | 'datetime'
  | 'color'
  | 'checkbox'
  | 'radio'
  | 'select'
  | 'multiselect'
  | 'slider'
  | 'range'
  | 'file'
  | 'rating'
  | 'switch'
  | 'chips';

/**
 * Control-specific options
 */
export interface ControlOptions extends UISchemaOptions {
  autocomplete?: string;
  min?: number;
  max?: number;
  step?: number;
  rows?: number;
  cols?: number;
  multiple?: boolean;
  accept?: string; // For file inputs
  showLabels?: boolean; // For radio/checkbox groups
  inline?: boolean; // For radio/checkbox groups
  format?: string;
}

/**
 * Vertical Layout - stacks elements vertically
 */
export interface UISchemaVerticalLayout extends UISchemaElement {
  type: 'VerticalLayout';
  elements: UISchemaElement[];
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Horizontal Layout - arranges elements horizontally
 */
export interface UISchemaHorizontalLayout extends UISchemaElement {
  type: 'HorizontalLayout';
  elements: UISchemaElement[];
  className?: string;
  style?: React.CSSProperties;
  gap?: number | string;
}

/**
 * Grid Layout - responsive grid layout
 */
export interface UISchemaGridLayout extends UISchemaElement {
  type: 'GridLayout';
  elements: UISchemaGridItem[];
  columns?: number | { xs?: number; sm?: number; md?: number; lg?: number; xl?: number };
  gap?: number | string;
  className?: string;
  style?: React.CSSProperties;
}

export interface UISchemaGridItem {
  element: UISchemaElement;
  span?: number | { xs?: number; sm?: number; md?: number; lg?: number; xl?: number };
}

/**
 * Group - vertical layout with label and optional border
 */
export interface UISchemaGroup extends UISchemaElement {
  type: 'Group';
  label: string;
  elements: UISchemaElement[];
  className?: string;
  style?: React.CSSProperties;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}

/**
 * Categorization - tab-based navigation
 */
export interface UISchemaCategorization extends UISchemaElement {
  type: 'Categorization';
  elements: UISchemaCategory[];
  variant?: 'tabs' | 'pills' | 'vertical';
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Category - single tab/category
 */
export interface UISchemaCategory extends UISchemaElement {
  type: 'Category';
  label: string;
  icon?: string | React.ComponentType;
  elements: UISchemaElement[];
}

/**
 * Label - standalone text/label
 */
export interface UISchemaLabel extends UISchemaElement {
  type: 'Label';
  text: string;
  variant?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'body' | 'caption';
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Conditional rendering rule
 */
export interface UISchemaRule {
  effect: 'SHOW' | 'HIDE' | 'ENABLE' | 'DISABLE';
  condition: UISchemaCondition;
}

export interface UISchemaCondition {
  scope: string; // JSON Pointer to the data property
  schema?: JSONSchema; // JSON Schema to validate against
  expectedValue?: any; // Simple equality check
  operator?: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'matches';
}

/**
 * General UI Schema Options
 */
export interface UISchemaOptions {
  [key: string]: any;
}

/**
 * Field Props passed to custom widgets
 */
export interface FieldProps {
  value: any;
  onChange: (value: any) => void;
  onBlur?: () => void;
  onFocus?: () => void;
  schema: JSONSchema;
  uischema: UISchemaControl;
  path: string;
  label?: string;
  description?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  error?: string;
  touched?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Union type for all UI Schema elements
 */
export type UISchema =
  | UISchemaControl
  | UISchemaVerticalLayout
  | UISchemaHorizontalLayout
  | UISchemaGridLayout
  | UISchemaGroup
  | UISchemaCategorization
  | UISchemaCategory
  | UISchemaLabel;

/**
 * Helper type for custom widget components
 */
export type CustomWidget = React.ComponentType<FieldProps>;

/**
 * Widget registry for custom widgets
 */
export interface WidgetRegistry {
  [widgetName: string]: CustomWidget;
}
