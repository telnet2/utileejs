# Form Builder Design Document

## Overview

This document describes the architecture and design of the React Form Builder component - a powerful, type-safe form generation system based on JSON Schema with optional UI Schema for layout control.

## Architecture

### Core Principles

1. **Schema-Driven**: Forms are defined declaratively using JSON Schema
2. **Separation of Concerns**: Data schema (JSON Schema) is separate from UI layout (UI Schema)
3. **Type-Safe**: Full TypeScript support throughout
4. **Extensible**: Easy to add custom widgets, validators, and layouts
5. **SSR Compatible**: Works with Next.js and server-side rendering
6. **Modern & Accessible**: Beautiful UI with WCAG accessibility standards

## Directory Structure

```
src/form-builder/
├── types/              # TypeScript type definitions
│   ├── schema.ts       # JSON Schema types
│   ├── uischema.ts     # UI Schema types
│   └── index.ts        # Main type exports
├── utils/              # Utility functions
│   ├── schema.ts       # Schema manipulation utilities
│   ├── data.ts         # Data path utilities (get/set by path)
│   ├── validation.ts   # JSON Schema validation
│   ├── uischema-generator.ts  # Auto-generate UI Schema
│   └── index.ts
├── components/         # React components
│   ├── fields/         # Field/widget components
│   │   ├── TextField.tsx
│   │   ├── TextAreaField.tsx
│   │   ├── NumberField.tsx
│   │   ├── CheckboxField.tsx
│   │   ├── SwitchField.tsx
│   │   ├── SelectField.tsx
│   │   ├── RadioField.tsx
│   │   ├── SliderField.tsx
│   │   └── index.tsx
│   ├── layouts/        # Layout components
│   │   ├── VerticalLayout.tsx
│   │   ├── HorizontalLayout.tsx
│   │   ├── GridLayout.tsx
│   │   ├── Group.tsx
│   │   ├── Categorization.tsx
│   │   └── index.tsx
│   ├── FormBuilder.tsx      # Main form component
│   ├── UISchemaRenderer.tsx # Renders UI schema recursively
│   ├── ControlRenderer.tsx  # Renders individual controls
│   └── index.tsx
├── hooks/              # React hooks
│   ├── useFormState.ts      # Form state management
│   ├── FormContext.tsx      # Form context provider
│   └── index.ts
├── styles/             # CSS styling
│   ├── form-builder.css     # Main stylesheet
│   └── index.ts
├── examples/           # Usage examples
│   ├── BasicExample.tsx
│   ├── AdvancedExample.tsx
│   └── index.ts
├── README.md           # User documentation
└── index.ts            # Main export
```

## Type System

### JSON Schema Types

Based on JSON Schema Draft-07 specification:

- **JSONSchemaType**: Primitive types (string, number, integer, boolean, object, array, null)
- **JSONSchemaFormat**: Format specifiers (email, url, date, time, etc.)
- **JSONSchemaProperty**: Complete schema property definition
- **JSONSchema**: Main schema type

### UI Schema Types

- **UISchemaElement**: Base interface for all UI elements
- **UISchemaType**: Type discriminator (Control, VerticalLayout, HorizontalLayout, etc.)
- **UISchemaControl**: Form control/field configuration
- **Layout Types**: VerticalLayout, HorizontalLayout, GridLayout, Group, Categorization
- **WidgetType**: Widget type enumeration
- **FieldProps**: Props passed to widget components

## Component Architecture

### FormBuilder (Main Component)

The entry point that:
1. Accepts schema, uischema, and configuration props
2. Initializes form state using `useFormState` hook
3. Auto-generates UI schema if not provided
4. Creates form context for child components
5. Renders the form with error handling

**Key Props:**
- `schema`: JSON Schema (required)
- `uischema`: UI Schema (optional, auto-generated if not provided)
- `data`: Form data
- `onChange`: Data change callback
- `onSubmit`: Form submission callback
- `theme`: Theming configuration
- `widgets`: Custom widget registry

### UISchemaRenderer

Recursively renders UI schema elements:

1. **Type Switching**: Determines element type and renders appropriate component
2. **Layout Handling**: Wraps child elements in layout components
3. **Control Rendering**: Delegates to ControlRenderer for form fields
4. **Recursion**: Handles nested layouts and structures

### ControlRenderer

Renders individual form controls:

1. **Schema Resolution**: Resolves schema from JSON pointer
2. **Value Management**: Gets/sets values from form data
3. **Widget Selection**: Determines appropriate widget based on schema/uischema
4. **Validation**: Shows errors and touched state
5. **Conditional Logic**: Handles show/hide/enable/disable rules

### Field Components (Widgets)

Individual input widgets that:
- Accept standardized `FieldProps`
- Handle user input and onChange events
- Display labels, errors, help text
- Support disabled/readonly states
- Maintain accessibility (ARIA attributes)

**Available Widgets:**
- TextField (text, email, url, tel, password, etc.)
- TextAreaField (multi-line text)
- NumberField (number, integer with validation)
- CheckboxField (boolean)
- SwitchField (toggle boolean)
- SelectField (enum selection)
- RadioField (enum as radio buttons)
- SliderField (range input)

### Layout Components

Organize and structure form fields:

1. **VerticalLayout**: Stack elements vertically
2. **HorizontalLayout**: Arrange elements horizontally
3. **GridLayout**: Responsive grid with column/span control
4. **Group**: Labeled section with optional collapse
5. **Categorization**: Tab-based navigation

## State Management

### useFormState Hook

Manages all form state:

```typescript
{
  data,              // Current form data
  errors,            // Validation errors
  touched,           // Touched fields
  formState,         // Form metadata (isValid, isDirty, etc.)
  updateData,        // Update field value
  setTouched,        // Mark field as touched
  validateField,     // Validate single field
  validateForm,      // Validate entire form
  resetForm          // Reset to initial state
}
```

**State Flow:**
1. User interacts with field
2. `onChange` → `updateData` → immutable data update
3. Validation triggered (if enabled)
4. Errors calculated and stored
5. Parent `onChange` callback invoked

### Form Context

Provides form state to all components via React Context:
- Eliminates prop drilling
- Centralized state access
- Type-safe with TypeScript

## Validation System

### Built-in JSON Schema Validation

Validates against JSON Schema constraints:

**String Validations:**
- minLength, maxLength
- pattern (regex)
- format (email, url, etc.)

**Number Validations:**
- minimum, maximum
- exclusiveMinimum, exclusiveMaximum
- multipleOf

**Object Validations:**
- required properties
- minProperties, maxProperties

**Array Validations:**
- minItems, maxItems
- uniqueItems
- items schema

### Custom Validators

Users can provide custom validation functions:

```typescript
const customValidators = {
  passwordMatch: (formData, errors) => {
    if (formData.password !== formData.confirmPassword) {
      errors.push({
        path: 'confirmPassword',
        message: 'Passwords do not match'
      });
    }
    return errors;
  }
};
```

### Validation Modes

1. **validateOnChange**: Validate after every change
2. **validateOnBlur**: Validate when field loses focus
3. **liveValidate**: Continuous validation
4. **Manual**: Only validate on submit or explicit call

## UI Schema Features

### Auto-Generation

If no UI schema is provided:
1. Analyzes JSON schema structure
2. Infers appropriate widgets based on type/format
3. Generates vertical layout
4. Creates responsive layouts for objects

**Widget Inference Logic:**
- `type: boolean` → checkbox
- `enum` → select or radio (based on count)
- `format: email` → email input
- `format: date` → date picker
- `maxLength > 100` → textarea
- `min/max with small range` → slider

### Conditional Rendering

Rules for showing/hiding or enabling/disabling fields:

```typescript
{
  rule: {
    effect: 'SHOW',  // SHOW, HIDE, ENABLE, DISABLE
    condition: {
      scope: '#/properties/accountType',
      expectedValue: 'business',
      operator: 'equals'  // equals, not_equals, contains, etc.
    }
  }
}
```

### Responsive Layouts

Grid layout supports responsive columns and spans:

```typescript
{
  type: 'GridLayout',
  columns: {
    xs: 1,    // 1 column on mobile
    md: 2,    // 2 columns on tablet
    lg: 3     // 3 columns on desktop
  },
  elements: [
    {
      element: { ... },
      span: {
        xs: 12,  // Full width on mobile
        md: 6    // Half width on tablet+
      }
    }
  ]
}
```

## Styling System

### CSS Architecture

1. **CSS Variables**: Theme customization without JS
2. **BEM-style Classes**: Predictable, scoped class names
3. **No CSS-in-JS**: SSR-compatible, better performance
4. **Responsive**: Mobile-first design
5. **Dark Mode**: Prefers-color-scheme support

### Theme Customization

**Via CSS Variables:**
```css
:root {
  --form-primary-color: #3b82f6;
  --form-error-color: #ef4444;
  --form-border-radius: 0.375rem;
}
```

**Via Theme Prop:**
```typescript
theme={{
  primaryColor: '#6366f1',
  borderRadius: '0.5rem',
  spacing: { medium: '1rem' }
}}
```

## Data Flow

### Top-Down Flow

1. **Schema** → defines structure and validation
2. **UI Schema** → defines presentation
3. **Data** → current form values
4. **Context** → provides access to all components

### Bottom-Up Flow

1. **User Input** → field component
2. **onChange** → ControlRenderer
3. **updateData** → useFormState
4. **Validation** → error calculation
5. **Parent onChange** → external state update

### Path Resolution

Uses dot notation for nested data:
- JSON Pointer: `#/properties/user/properties/name`
- Data Path: `user.name`
- Value Access: `getValueByPath(data, 'user.name')`
- Value Update: `setValueByPath(data, 'user.name', value)`

All updates are **immutable** - new objects created on each change.

## Extensibility

### Custom Widgets

Create custom field components:

```typescript
const CustomWidget: React.FC<FieldProps> = (props) => {
  return <div>...</div>;
};

<FormBuilder widgets={{ custom: CustomWidget }} />
```

Use in UI schema:
```typescript
{ type: 'Control', scope: '...', widget: 'custom' }
```

### Custom Validators

Add domain-specific validation:

```typescript
const validators = {
  customRule: (data, errors) => { ... }
};

<FormBuilder customValidators={validators} />
```

### Custom Layouts

Create custom layout components following the pattern:
- Accept `uischema` prop
- Render children
- Apply custom styling/behavior

## Performance Optimizations

1. **Memoization**: useMemo for expensive computations
2. **Immutable Updates**: Only re-render changed components
3. **Lazy Validation**: Validate on blur/submit, not every keystroke
4. **Code Splitting**: Components can be lazily loaded
5. **CSS-only Styling**: No runtime CSS generation

## Accessibility

1. **Semantic HTML**: Proper form elements and labels
2. **ARIA Attributes**: Role, aria-labelledby, aria-describedby
3. **Keyboard Navigation**: Full keyboard support
4. **Focus Management**: Visible focus indicators
5. **Error Announcements**: Screen reader friendly error messages
6. **Required Indicators**: Visual and semantic

## Browser & Framework Compatibility

**Browsers:**
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)

**Frameworks:**
- React 16.8+ (hooks support)
- Next.js (full SSR support)
- Create React App
- Vite
- Any React-based framework

**TypeScript:**
- 4.5+ (full type support)
- Strict mode compatible

## Future Enhancements

Potential additions:

1. **Array Support**: Dynamic array fields with add/remove
2. **File Upload**: File input widget with preview
3. **Rich Text**: WYSIWYG editor widget
4. **Date Range**: Date range picker
5. **Autocomplete**: Async search widget
6. **Drag & Drop**: Reorderable arrays
7. **Form Wizard**: Multi-step forms
8. **Schema Editor**: Visual schema builder
9. **Localization**: i18n support
10. **Animation**: Smooth transitions

## Design Decisions

### Why JSON Schema?

- **Standard**: Well-established specification
- **Validation**: Built-in validation rules
- **Interoperability**: Works with backend schemas
- **Documentation**: Schema serves as documentation
- **Tooling**: Existing ecosystem of tools

### Why Separate UI Schema?

- **Separation of Concerns**: Data structure ≠ UI layout
- **Flexibility**: Same schema, different UIs
- **Defaults**: Works without UI schema (auto-generation)
- **Progressive Enhancement**: Start simple, add UI schema as needed

### Why TypeScript?

- **Type Safety**: Catch errors at compile time
- **IntelliSense**: Better developer experience
- **Refactoring**: Safe refactoring with confidence
- **Documentation**: Types as documentation
- **Modern**: Industry best practice

### Why CSS Variables?

- **Performance**: No runtime CSS generation
- **SSR**: Server-side rendering compatible
- **Simplicity**: Easy to understand and customize
- **Standards**: Native browser feature
- **Themes**: Easy theme switching

## Comparison with Alternatives

### vs. react-jsonschema-form (RJSF)

**Similarities:**
- Both use JSON Schema
- Both support custom widgets
- Both have UI schema concept

**Differences:**
- **Architecture**: Our solution has cleaner separation with dedicated layout components
- **TypeScript**: Full TypeScript-first design vs. JavaScript with types
- **Layouts**: More powerful layout system (Grid, Categorization)
- **Modern**: Uses modern React patterns (hooks, context)
- **Styling**: CSS variables vs. inline styles
- **Size**: Smaller, more focused codebase

### vs. JSON Forms

**Similarities:**
- Both use JSON Schema + UI Schema
- Both support complex layouts
- Both are extensible

**Differences:**
- **Framework**: Our solution is React-only vs. framework-agnostic
- **Simplicity**: Simpler API, easier to get started
- **Styling**: Beautiful defaults out of the box
- **Widgets**: More built-in widgets
- **TypeScript**: Better TypeScript integration

## Conclusion

This form builder provides a robust, type-safe, and beautiful solution for building forms in React applications. The architecture is designed to be:

1. **Easy to use**: Auto-generation gets you started quickly
2. **Powerful**: Full control with UI schema when needed
3. **Extensible**: Custom widgets, validators, layouts
4. **Type-safe**: Comprehensive TypeScript support
5. **Modern**: Uses latest React best practices
6. **Production-ready**: SSR support, accessibility, validation

The design balances simplicity for basic use cases with power for complex requirements, making it suitable for everything from simple contact forms to complex multi-step wizards.
