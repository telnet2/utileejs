/**
 * Basic Form Builder Example
 * Demonstrates simple form creation with auto-generated UI
 */

import React, { useState } from 'react';
import { FormBuilder } from '../components/FormBuilder';
import { JSONSchema } from '../types';
import '../styles/form-builder.css';

export const BasicExample: React.FC = () => {
  const [formData, setFormData] = useState({});

  // Define a simple JSON Schema
  const schema: JSONSchema = {
    type: 'object',
    title: 'User Registration',
    required: ['firstName', 'lastName', 'email'],
    properties: {
      firstName: {
        type: 'string',
        title: 'First Name',
        minLength: 2,
        maxLength: 50,
      },
      lastName: {
        type: 'string',
        title: 'Last Name',
        minLength: 2,
        maxLength: 50,
      },
      email: {
        type: 'string',
        title: 'Email Address',
        format: 'email',
      },
      age: {
        type: 'integer',
        title: 'Age',
        minimum: 18,
        maximum: 120,
      },
      bio: {
        type: 'string',
        title: 'Bio',
        maxLength: 500,
      },
      newsletter: {
        type: 'boolean',
        title: 'Subscribe to newsletter',
        default: false,
      },
    },
  };

  const handleChange = (data: any) => {
    console.log('Form data changed:', data);
    setFormData(data);
  };

  const handleSubmit = (data: any) => {
    console.log('Form submitted:', data);
    alert('Form submitted! Check console for data.');
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '2rem' }}>
      <h1>Basic Form Example</h1>
      <p>This form is auto-generated from the JSON Schema with no UI schema specified.</p>

      <FormBuilder
        schema={schema}
        data={formData}
        onChange={handleChange}
        onSubmit={handleSubmit}
        validateOnBlur={true}
        showErrorList={true}
      />

      <button type="submit" form="form">
        Submit
      </button>

      <details style={{ marginTop: '2rem' }}>
        <summary>Current Form Data</summary>
        <pre>{JSON.stringify(formData, null, 2)}</pre>
      </details>
    </div>
  );
};
