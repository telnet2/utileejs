/**
 * Main Form Builder Type Definitions
 */

export * from './schema';
export * from './uischema';

import { JSONSchema } from './schema';
import { UISchema, WidgetRegistry } from './uischema';

/**
 * Form Builder Props
 */
export interface FormBuilderProps {
  // Required
  schema: JSONSchema;

  // Optional
  uischema?: UISchema;
  data?: any;
  onChange?: (data: any) => void;
  onSubmit?: (data: any) => void;
  onError?: (errors: ValidationError[]) => void;

  // Customization
  widgets?: WidgetRegistry;
  theme?: FormTheme;
  className?: string;
  style?: React.CSSProperties;

  // Behavior
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  liveValidate?: boolean;
  showErrorList?: boolean;
  disabled?: boolean;
  readOnly?: boolean;

  // Advanced
  customValidators?: ValidatorRegistry;
  transformErrors?: (errors: ValidationError[]) => ValidationError[];
  extraErrors?: ExtraErrorsMap;
}

/**
 * Form Theme Configuration
 */
export interface FormTheme {
  // Color scheme
  primaryColor?: string;
  errorColor?: string;
  successColor?: string;
  warningColor?: string;

  // Spacing
  spacing?: {
    small?: string;
    medium?: string;
    large?: string;
  };

  // Border radius
  borderRadius?: string;

  // Font
  fontFamily?: string;
  fontSize?: string;

  // Custom CSS variables
  cssVariables?: Record<string, string>;
}

/**
 * Validation Error
 */
export interface ValidationError {
  path: string;
  message: string;
  keyword?: string;
  params?: any;
}

/**
 * Extra Errors Map
 */
export interface ExtraErrorsMap {
  [path: string]: {
    __errors?: string[];
    [key: string]: any;
  };
}

/**
 * Custom Validator Function
 */
export type CustomValidator = (
  formData: any,
  errors: ValidationError[]
) => ValidationError[];

/**
 * Validator Registry
 */
export interface ValidatorRegistry {
  [validatorName: string]: CustomValidator;
}

/**
 * Form Context
 */
export interface FormContext {
  schema: JSONSchema;
  uischema?: UISchema;
  data: any;
  errors: ValidationError[];
  touched: Set<string>;
  formState: FormState;
  theme?: FormTheme;
  widgets?: WidgetRegistry;
  updateData: (path: string, value: any) => void;
  setTouched: (path: string) => void;
  validateField: (path: string) => void;
  validateForm: () => boolean;
  resetForm: () => void;
}

/**
 * Form State
 */
export interface FormState {
  isValid: boolean;
  isValidating: boolean;
  isSubmitting: boolean;
  submitCount: number;
  dirty: boolean;
}

/**
 * Field State
 */
export interface FieldState {
  value: any;
  error?: string;
  touched: boolean;
  dirty: boolean;
}
