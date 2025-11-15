# UI Schema Translation Guide

This document explains how to translate UI schemas from other formats to our React Form Builder UI Schema format.

## Overview

The original UI schema format uses a Bootstrap-style grid system with nested rows and columns. Our format uses a more structured approach with explicit layout types and JSON pointers for field references.

## Key Differences

### 1. Field References

**Original Format:** Uses data paths (dot notation)
```json
{
  "name": "person.name.first"
}
```

**Our Format:** Uses JSON Pointers
```typescript
{
  type: 'Control',
  scope: '#/properties/person/properties/name/properties/first'
}
```

**Conversion Rule:**
```
"person.name.first" → "#/properties/person/properties/name/properties/first"
"employment.job_type" → "#/properties/employment/properties/job_type"
```

### 2. Layout System

#### Row and Column Structure

**Original Format:**
```json
{
  "ui:row": {
    "className": "row",
    "children": [
      {
        "ui:col": {
          "className": "col-xs-6",
          "children": ["field1", "field2"]
        }
      }
    ]
  }
}
```

**Our Format:**
```typescript
{
  type: 'GridLayout',
  columns: 2,
  elements: [
    {
      element: { type: 'Control', scope: '#/properties/field1' },
      span: 1
    },
    {
      element: { type: 'Control', scope: '#/properties/field2' },
      span: 1
    }
  ]
}
```

#### Column Classes to Span

Bootstrap grid uses 12-column system with classes like `col-xs-6`, `col-md-4`:

**Conversion Table:**

| Original Class | Span Value | Percentage |
|---------------|------------|------------|
| `col-xs-12` | `12` or `{ xs: 12 }` | 100% |
| `col-xs-6` | `6` or `{ xs: 6 }` | 50% |
| `col-xs-4` | `4` or `{ xs: 4 }` | 33.33% |
| `col-xs-3` | `3` or `{ xs: 3 }` | 25% |
| `col-xs-2` | `2` or `{ xs: 2 }` | 16.67% |

**Responsive Classes:**

```json
// Original
{
  "className": "col-xs-12 col-md-6"
}

// Our Format
{
  "span": {
    "xs": 12,
    "md": 6
  }
}
```

### 3. Conditional Rendering

**Original Format:**
```json
{
  "ui:condition": {
    "field": "employment.job_type",
    "value": "company",
    "operator": "all",
    "children": [...]
  }
}
```

**Our Format:**
```typescript
{
  type: 'Control',
  scope: '#/properties/employment/properties/business',
  rule: {
    effect: 'SHOW',
    condition: {
      scope: '#/properties/employment/properties/job_type',
      expectedValue: 'company',
      operator: 'equals'
    }
  }
}
```

**Operator Mapping:**

| Original | Our Format | Description |
|----------|-----------|-------------|
| `all` | `equals` | Field value equals expected value |
| `none` | `not_equals` | Field value does not equal expected value |
| N/A | `contains` | Array contains value |
| N/A | `greater_than` | Numeric comparison |
| N/A | `less_than` | Numeric comparison |
| N/A | `matches` | Regex pattern match |

**Effect Types:**

| Effect | Description |
|--------|-------------|
| `SHOW` | Show element when condition is true |
| `HIDE` | Hide element when condition is true |
| `ENABLE` | Enable element when condition is true |
| `DISABLE` | Disable element when condition is true |

### 4. Widget Specification

**Original Format:**
```json
{
  "name": "person.birth_date",
  "ui:widget": "date",
  "placeholder": "$lookup=PlaceholderText"
}
```

**Our Format:**
```typescript
{
  type: 'Control',
  scope: '#/properties/person/properties/birth_date',
  widget: 'date',
  placeholder: 'MM/DD/YYYY'
}
```

**Available Widgets:**

| Widget Name | Description | Schema Type |
|-------------|-------------|-------------|
| `text` | Single-line text | string |
| `textarea` | Multi-line text | string |
| `number` | Number input | number, integer |
| `date` | Date picker | string (format: date) |
| `email` | Email input | string (format: email) |
| `select` | Dropdown | string with enum |
| `radio` | Radio buttons | string with enum |
| `checkbox` | Single checkbox | boolean |
| `checkboxes` | Multiple checkboxes | array |
| `switch` | Toggle switch | boolean |
| `slider` | Range slider | number |

### 5. Widget Options

**Original Format:**
```json
{
  "ui:options": {
    "widget": "checkboxes",
    "inline": true
  }
}
```

**Our Format:**
```typescript
{
  type: 'Control',
  scope: '#/properties/race',
  options: {
    inline: true
  }
}
```

**Common Options:**

| Option | Type | Description |
|--------|------|-------------|
| `inline` | boolean | Display inline (for radio/checkbox groups) |
| `rows` | number | Number of rows (for textarea) |
| `placeholder` | string | Placeholder text |
| `autocomplete` | string | Autocomplete attribute |

### 6. Special Fields

#### Array of Checkboxes

**Original Format:**
```json
{
  "person": {
    "race": {
      "ui:options": {
        "widget": "checkboxes"
      }
    }
  }
}
```

**Our Format:**
The schema defines it as an array with oneOf items. The form builder will automatically render checkboxes for this structure.

```typescript
// Schema
{
  "race": {
    "type": "array",
    "items": {
      "type": "string",
      "oneOf": [
        { "const": "asian", "title": "Asian" },
        { "const": "black", "title": "Black" }
      ]
    }
  }
}

// UI Schema
{
  type: 'Control',
  scope: '#/properties/person/properties/race',
  helpText: '(Check all that apply)'
}
```

## Complete Example

### Original UI Schema (Excerpt)

```json
{
  "ui:row": {
    "className": "row",
    "children": [
      {
        "ui:columns": {
          "className": "col-xs-4",
          "children": [
            "person.name.first",
            "person.name.middle",
            "person.name.last"
          ]
        }
      }
    ]
  }
}
```

### Translated UI Schema

```typescript
{
  type: 'GridLayout',
  columns: 3,
  elements: [
    {
      element: {
        type: 'Control',
        scope: '#/properties/person/properties/name/properties/first'
      },
      span: 1
    },
    {
      element: {
        type: 'Control',
        scope: '#/properties/person/properties/name/properties/middle'
      },
      span: 1
    },
    {
      element: {
        type: 'Control',
        scope: '#/properties/person/properties/name/properties/last'
      },
      span: 1
    }
  ]
}
```

## Translation Workflow

1. **Identify Layout Structure**
   - Find `ui:row`, `ui:col`, `ui:columns`
   - Map to `GridLayout`, `VerticalLayout`, or `HorizontalLayout`

2. **Convert Field References**
   - Replace dot notation with JSON pointers
   - Add `#/properties/` prefix
   - Replace dots with `/properties/`

3. **Map Column Classes to Spans**
   - Extract number from `col-xs-N` → `span: N`
   - Handle responsive classes → `span: { xs: 12, md: 6 }`

4. **Translate Conditionals**
   - Move `ui:condition` to `rule` property
   - Convert `field` to `scope` with JSON pointer
   - Map `value` to `expectedValue`
   - Map `operator` appropriately

5. **Set Widgets and Options**
   - Move `ui:widget` to `widget` property
   - Move `ui:options` to `options` property
   - Add additional properties like `placeholder`, `helpText`

6. **Group Related Fields**
   - Use `Group` for labeled sections
   - Use `Categorization` for tabs
   - Nest layouts as needed

## Best Practices

1. **Use Responsive Spans** for better mobile experience:
   ```typescript
   span: { xs: 12, sm: 12, md: 6, lg: 4 }
   ```

2. **Group Related Fields** for better organization:
   ```typescript
   {
     type: 'Group',
     label: 'Personal Information',
     elements: [...]
   }
   ```

3. **Use Appropriate Widgets** based on data type:
   - `select` for enums with many options
   - `radio` for enums with few options (2-5)
   - `slider` for bounded numeric ranges

4. **Add Help Text** for complex fields:
   ```typescript
   {
     type: 'Control',
     scope: '#/properties/field',
     helpText: 'Additional information...'
   }
   ```

5. **Validate Early** - Use `validateOnBlur` for better UX:
   ```typescript
   <FormBuilder
     schema={schema}
     uischema={uischema}
     validateOnBlur={true}
   />
   ```

## Automated Translation

For large schemas, you can create a utility function to automate translation:

```typescript
function translateUISchema(original: any): UISchema {
  // Convert field paths to JSON pointers
  const fieldToScope = (path: string) => {
    return '#/properties/' + path.split('.').join('/properties/');
  };

  // Convert column class to span
  const classToSpan = (className: string) => {
    const match = className.match(/col-xs-(\d+)/);
    return match ? parseInt(match[1]) : 12;
  };

  // Recursively translate...
  // (Implementation details depend on your specific format)
}
```

## Summary

The translation from other UI schema formats to our format involves:

1. Converting data paths to JSON pointers
2. Mapping grid classes to span values
3. Restructuring conditionals into rules
4. Organizing fields into appropriate layout types
5. Setting widgets and options explicitly

Our format is more explicit and type-safe, which provides better tooling support and clearer intent.
