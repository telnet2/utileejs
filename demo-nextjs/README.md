# Form Builder Next.js Demo

This is a demo Next.js application showcasing the React Form Builder component with a complex real-world schema.

## Features Demonstrated

- **Complex JSON Schema** with `$ref` definitions
- **Nested objects** (Person name, address, location)
- **Conditional rendering** based on employment type
- **Array inputs** for multi-select checkboxes
- **Custom layouts** using Grid layouts
- **Validation** with required fields and pattern matching
- **UI Schema translation** from another format

## Running the Demo

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the development server:
   ```bash
   npm run dev
   ```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

## Schema Structure

### Person Information
- **Name**: First, Middle (optional), Last
- **Date of Birth**: Date picker
- **Race**: Multi-select checkboxes
- **Address**: Street, City, State, ZIP Code

### Employment Information

The form dynamically shows different fields based on employment type:

#### Company
- Company Name
- Job Title
- Location (City, State)

#### Education
- District Name (optional)
- School Name
- Job Title (optional)
- Location (City, State)

#### Other
- Job Description (textarea)

## UI Schema Translation

This demo includes a translation from a fictional UI schema format to our format. Key translations:

| Original Format | Our Format |
|----------------|-----------|
| `ui:row` / `ui:col` | `GridLayout` with columns and span |
| `"person.name.first"` | `#/properties/person/properties/name/properties/first` |
| `ui:condition` | `rule` with effect and condition |
| `ui:widget` | `widget` property on Control |
| `ui:options` | `options` property on Control |
| `className: "col-xs-6"` | `span: 6` or responsive object |

## Files

- **`app/schema.ts`**: JSON Schema definition
- **`app/uischema.ts`**: UI Schema with layout and conditionals
- **`app/page.tsx`**: Main demo page component
- **`app/page.module.css`**: Styling for the demo page

## Learn More

- [React Form Builder Documentation](../src/form-builder/README.md)
- [Form Builder Design Document](../FORM_BUILDER_DESIGN.md)
- [Next.js Documentation](https://nextjs.org/docs)

## License

EPL-2.0
