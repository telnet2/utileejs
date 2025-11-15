# React Form Builder

A powerful, type-safe, and beautiful form builder for React and Next.js based on JSON Schema. Build complex forms with minimal code using declarative schemas.

## Features

- **JSON Schema Based**: Define your forms using standard JSON Schema (Draft-07 compatible)
- **Flexible UI Schema**: Control layout, widgets, and styling with optional UI Schema
- **Auto-generation**: Automatically generates beautiful forms from JSON Schema alone
- **Type-Safe**: Full TypeScript support with comprehensive type definitions
- **Modern UI**: Beautiful, accessible, and responsive design out of the box
- **SSR Compatible**: Works with Next.js and other SSR frameworks
- **Extensible**: Custom widgets, validators, and layouts
- **Validation**: Built-in JSON Schema validation with custom validators
- **Conditional Fields**: Show/hide or enable/disable fields based on conditions
- **Multiple Layouts**: Vertical, horizontal, grid, groups, and tabs
- **Themeable**: Customize colors, spacing, and styles via CSS variables

## Installation

```bash
npm install @autox/utileejs
# or
yarn add @autox/utileejs
```

## Quick Start

### Basic Usage

```tsx
import React, { useState } from 'react';
import { FormBuilder, JSONSchema } from '@autox/utileejs/form-builder';
import '@autox/utileejs/form-builder/styles';

const schema: JSONSchema = {
  type: 'object',
  required: ['name', 'email'],
  properties: {
    name: {
      type: 'string',
      title: 'Full Name',
      minLength: 2,
    },
    email: {
      type: 'string',
      title: 'Email',
      format: 'email',
    },
    age: {
      type: 'integer',
      title: 'Age',
      minimum: 18,
    },
  },
};

function MyForm() {
  const [data, setData] = useState({});

  return (
    <FormBuilder
      schema={schema}
      data={data}
      onChange={setData}
      onSubmit={(data) => console.log('Submitted:', data)}
    />
  );
}
```

### With Custom UI Schema

```tsx
import { FormBuilder, JSONSchema, UISchema } from '@autox/utileejs/form-builder';

const schema: JSONSchema = {
  type: 'object',
  properties: {
    firstName: { type: 'string', title: 'First Name' },
    lastName: { type: 'string', title: 'Last Name' },
    email: { type: 'string', format: 'email' },
    age: { type: 'integer', minimum: 18, maximum: 120 },
  },
};

const uischema: UISchema = {
  type: 'GridLayout',
  columns: 2,
  elements: [
    {
      element: { type: 'Control', scope: '#/properties/firstName' },
      span: 1,
    },
    {
      element: { type: 'Control', scope: '#/properties/lastName' },
      span: 1,
    },
    {
      element: { type: 'Control', scope: '#/properties/email' },
      span: 2,
    },
    {
      element: { type: 'Control', scope: '#/properties/age', widget: 'slider' },
      span: 2,
    },
  ],
};

function MyForm() {
  return <FormBuilder schema={schema} uischema={uischema} />;
}
```

## JSON Schema Support

The form builder supports JSON Schema Draft-07 with the following features:

### Types

- `string` - Text inputs, textareas, emails, URLs, etc.
- `number` / `integer` - Number inputs, sliders
- `boolean` - Checkboxes, switches
- `object` - Nested objects
- `array` - Arrays of items
- `enum` - Select dropdowns, radio buttons

### String Validations

```json
{
  "type": "string",
  "minLength": 3,
  "maxLength": 50,
  "pattern": "^[A-Za-z]+$",
  "format": "email" // email, uri, url, date, time, date-time, tel, color, password
}
```

### Number Validations

```json
{
  "type": "number",
  "minimum": 0,
  "maximum": 100,
  "exclusiveMinimum": 0,
  "exclusiveMaximum": 100,
  "multipleOf": 5
}
```

### Object Validations

```json
{
  "type": "object",
  "required": ["name", "email"],
  "properties": { ... },
  "minProperties": 1,
  "maxProperties": 10
}
```

### Array Validations

```json
{
  "type": "array",
  "items": { "type": "string" },
  "minItems": 1,
  "maxItems": 5,
  "uniqueItems": true
}
```

## UI Schema

The UI Schema controls how the form is rendered visually.

### UI Schema Types

#### Control

Renders a single form field.

```typescript
{
  type: 'Control',
  scope: '#/properties/fieldName',
  label: 'Custom Label',
  widget: 'text', // Widget type
  placeholder: 'Enter value...',
  helpText: 'Additional help text',
  className: 'custom-class',
  style: { marginBottom: '2rem' },
  disabled: false,
  readOnly: false,
  hidden: false
}
```

#### Vertical Layout

Stacks elements vertically.

```typescript
{
  type: 'VerticalLayout',
  elements: [
    { type: 'Control', scope: '#/properties/field1' },
    { type: 'Control', scope: '#/properties/field2' }
  ]
}
```

#### Horizontal Layout

Arranges elements horizontally.

```typescript
{
  type: 'HorizontalLayout',
  elements: [...],
  gap: '1rem'
}
```

#### Grid Layout

Responsive grid layout.

```typescript
{
  type: 'GridLayout',
  columns: 2, // or { xs: 1, sm: 2, md: 3, lg: 4 }
  gap: '1rem',
  elements: [
    {
      element: { type: 'Control', scope: '#/properties/field1' },
      span: 1 // or { xs: 12, md: 6 }
    }
  ]
}
```

#### Group

Groups elements with a label and optional border.

```typescript
{
  type: 'Group',
  label: 'Personal Information',
  elements: [...],
  collapsible: true,
  defaultCollapsed: false
}
```

#### Categorization (Tabs)

Tab-based navigation.

```typescript
{
  type: 'Categorization',
  variant: 'tabs', // 'tabs', 'pills', or 'vertical'
  elements: [
    {
      type: 'Category',
      label: 'Personal',
      icon: '👤',
      elements: [...]
    },
    {
      type: 'Category',
      label: 'Address',
      elements: [...]
    }
  ]
}
```

### Widgets

Available widget types:

- `text` - Text input
- `textarea` - Multi-line text
- `number` - Number input
- `password` - Password input
- `email` - Email input
- `url` - URL input
- `tel` - Phone number input
- `date` - Date picker
- `time` - Time picker
- `datetime` - Date-time picker
- `color` - Color picker
- `checkbox` - Checkbox
- `switch` - Toggle switch
- `radio` - Radio buttons
- `select` - Dropdown select
- `multiselect` - Multi-select dropdown
- `slider` - Range slider

### Conditional Rendering

Show/hide or enable/disable fields based on conditions.

```typescript
{
  type: 'Control',
  scope: '#/properties/companyName',
  rule: {
    effect: 'SHOW', // 'SHOW', 'HIDE', 'ENABLE', 'DISABLE'
    condition: {
      scope: '#/properties/accountType',
      expectedValue: 'business',
      operator: 'equals' // 'equals', 'not_equals', 'contains', 'greater_than', 'less_than', 'matches'
    }
  }
}
```

## Theming

Customize the form appearance using CSS variables or the theme prop.

### Using Theme Prop

```tsx
<FormBuilder
  schema={schema}
  theme={{
    primaryColor: '#6366f1',
    errorColor: '#ef4444',
    successColor: '#10b981',
    borderRadius: '0.5rem',
    spacing: {
      small: '0.5rem',
      medium: '1rem',
      large: '1.5rem',
    },
    fontFamily: 'Inter, sans-serif',
    fontSize: '1rem',
  }}
/>
```

### Using CSS Variables

```css
:root {
  --form-primary-color: #6366f1;
  --form-error-color: #ef4444;
  --form-success-color: #10b981;
  --form-border-radius: 0.5rem;
  --form-spacing-medium: 1rem;
  --form-font-family: 'Inter', sans-serif;
}
```

## Validation

The form builder includes built-in JSON Schema validation and supports custom validators.

### Custom Validators

```tsx
const customValidators = {
  passwordMatch: (formData, errors) => {
    if (formData.password !== formData.confirmPassword) {
      errors.push({
        path: 'confirmPassword',
        message: 'Passwords do not match',
      });
    }
    return errors;
  },
};

<FormBuilder
  schema={schema}
  customValidators={customValidators}
  validateOnChange={true}
  validateOnBlur={true}
  liveValidate={false}
/>;
```

## Custom Widgets

Create and register custom widgets.

```tsx
import { FieldProps } from '@autox/utileejs/form-builder';

const RatingWidget: React.FC<FieldProps> = ({ value, onChange, schema }) => {
  return (
    <div>
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          onClick={() => onChange(star)}
          style={{ cursor: 'pointer', color: star <= value ? 'gold' : 'gray' }}
        >
          ★
        </span>
      ))}
    </div>
  );
};

const widgets = {
  rating: RatingWidget,
};

<FormBuilder schema={schema} widgets={widgets} />;
```

## API Reference

### FormBuilder Props

| Prop                | Type                      | Description                                |
| ------------------- | ------------------------- | ------------------------------------------ |
| `schema`            | `JSONSchema`              | Required. The JSON Schema definition       |
| `uischema`          | `UISchema`                | Optional. UI Schema for layout control     |
| `data`              | `any`                     | Form data                                  |
| `onChange`          | `(data: any) => void`     | Called when form data changes              |
| `onSubmit`          | `(data: any) => void`     | Called when form is submitted              |
| `onError`           | `(errors) => void`        | Called when validation errors occur        |
| `widgets`           | `WidgetRegistry`          | Custom widget components                   |
| `theme`             | `FormTheme`               | Theme configuration                        |
| `validateOnChange`  | `boolean`                 | Validate on every change (default: false)  |
| `validateOnBlur`    | `boolean`                 | Validate on field blur (default: true)     |
| `liveValidate`      | `boolean`                 | Continuous validation (default: false)     |
| `showErrorList`     | `boolean`                 | Show error summary (default: false)        |
| `disabled`          | `boolean`                 | Disable entire form (default: false)       |
| `readOnly`          | `boolean`                 | Make form read-only (default: false)       |
| `customValidators`  | `ValidatorRegistry`       | Custom validation functions                |
| `transformErrors`   | `(errors) => errors`      | Transform validation errors                |
| `className`         | `string`                  | Additional CSS class                       |
| `style`             | `React.CSSProperties`     | Inline styles                              |

## Utilities

### Auto-generate UI Schema

```tsx
import { generateUISchema, generateGridLayout } from '@autox/utileejs/form-builder';

// Generate default vertical layout
const uischema = generateUISchema(schema);

// Generate grid layout
const gridUISchema = generateGridLayout(schema, 2);

// Generate responsive layout
const responsiveUISchema = generateResponsiveLayout(schema);
```

## Next.js Integration

The form builder is fully compatible with Next.js SSR.

```tsx
// pages/form.tsx
import { FormBuilder } from '@autox/utileejs/form-builder';
import '@autox/utileejs/form-builder/styles';

export default function FormPage() {
  return <FormBuilder schema={schema} />;
}
```

## Examples

See the `/examples` directory for:

- `BasicExample.tsx` - Simple form with auto-generated UI
- `AdvancedExample.tsx` - Complex form with tabs, conditional fields, and custom layouts

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## License

EPL-2.0

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
