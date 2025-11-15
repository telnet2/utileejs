/**
 * Advanced Form Builder Example
 * Demonstrates custom UI schema with layouts, widgets, and conditional rendering
 */

import React, { useState } from 'react';
import { FormBuilder } from '../components/FormBuilder';
import { JSONSchema, UISchema } from '../types';
import '../styles/form-builder.css';

export const AdvancedExample: React.FC = () => {
  const [formData, setFormData] = useState({
    accountType: 'personal',
  });

  // Complex JSON Schema
  const schema: JSONSchema = {
    type: 'object',
    title: 'Advanced User Profile',
    required: ['accountType', 'email', 'username'],
    properties: {
      accountType: {
        type: 'string',
        title: 'Account Type',
        enum: ['personal', 'business'],
        enumNames: ['Personal Account', 'Business Account'],
        default: 'personal',
      },
      username: {
        type: 'string',
        title: 'Username',
        minLength: 3,
        maxLength: 20,
        pattern: '^[a-zA-Z0-9_]+$',
      },
      email: {
        type: 'string',
        title: 'Email',
        format: 'email',
      },
      password: {
        type: 'string',
        title: 'Password',
        format: 'password',
        minLength: 8,
      },
      // Personal account fields
      firstName: {
        type: 'string',
        title: 'First Name',
      },
      lastName: {
        type: 'string',
        title: 'Last Name',
      },
      dateOfBirth: {
        type: 'string',
        title: 'Date of Birth',
        format: 'date',
      },
      // Business account fields
      companyName: {
        type: 'string',
        title: 'Company Name',
      },
      taxId: {
        type: 'string',
        title: 'Tax ID',
      },
      website: {
        type: 'string',
        title: 'Website',
        format: 'url',
      },
      // Common fields
      phone: {
        type: 'string',
        title: 'Phone Number',
        format: 'tel',
      },
      address: {
        type: 'object',
        title: 'Address',
        properties: {
          street: {
            type: 'string',
            title: 'Street Address',
          },
          city: {
            type: 'string',
            title: 'City',
          },
          state: {
            type: 'string',
            title: 'State',
          },
          zipCode: {
            type: 'string',
            title: 'ZIP Code',
            pattern: '^\\d{5}(-\\d{4})?$',
          },
        },
      },
      preferences: {
        type: 'object',
        title: 'Preferences',
        properties: {
          theme: {
            type: 'string',
            title: 'Theme',
            enum: ['light', 'dark', 'auto'],
            enumNames: ['Light', 'Dark', 'Auto'],
            default: 'auto',
          },
          notifications: {
            type: 'boolean',
            title: 'Enable Notifications',
            default: true,
          },
          emailFrequency: {
            type: 'integer',
            title: 'Email Frequency (days)',
            minimum: 1,
            maximum: 30,
            default: 7,
          },
        },
      },
      termsAccepted: {
        type: 'boolean',
        title: 'I accept the terms and conditions',
      },
    },
  };

  // Custom UI Schema with layouts and conditional rendering
  const uischema: UISchema = {
    type: 'Categorization',
    elements: [
      {
        type: 'Category',
        label: 'Account',
        elements: [
          {
            type: 'Control',
            scope: '#/properties/accountType',
            widget: 'radio',
            options: {
              inline: true,
            },
          },
          {
            type: 'GridLayout',
            columns: 2,
            elements: [
              {
                element: {
                  type: 'Control',
                  scope: '#/properties/username',
                },
                span: 1,
              },
              {
                element: {
                  type: 'Control',
                  scope: '#/properties/email',
                },
                span: 1,
              },
            ],
          },
          {
            type: 'Control',
            scope: '#/properties/password',
            widget: 'password',
          },
        ],
      },
      {
        type: 'Category',
        label: 'Personal Info',
        elements: [
          {
            type: 'Group',
            label: 'Personal Details',
            elements: [
              {
                type: 'Control',
                scope: '#/properties/firstName',
                rule: {
                  effect: 'SHOW',
                  condition: {
                    scope: '#/properties/accountType',
                    expectedValue: 'personal',
                  },
                },
              },
              {
                type: 'Control',
                scope: '#/properties/lastName',
                rule: {
                  effect: 'SHOW',
                  condition: {
                    scope: '#/properties/accountType',
                    expectedValue: 'personal',
                  },
                },
              },
              {
                type: 'Control',
                scope: '#/properties/dateOfBirth',
                rule: {
                  effect: 'SHOW',
                  condition: {
                    scope: '#/properties/accountType',
                    expectedValue: 'personal',
                  },
                },
              },
            ],
          },
          {
            type: 'Group',
            label: 'Business Details',
            elements: [
              {
                type: 'Control',
                scope: '#/properties/companyName',
                rule: {
                  effect: 'SHOW',
                  condition: {
                    scope: '#/properties/accountType',
                    expectedValue: 'business',
                  },
                },
              },
              {
                type: 'Control',
                scope: '#/properties/taxId',
                rule: {
                  effect: 'SHOW',
                  condition: {
                    scope: '#/properties/accountType',
                    expectedValue: 'business',
                  },
                },
              },
              {
                type: 'Control',
                scope: '#/properties/website',
                rule: {
                  effect: 'SHOW',
                  condition: {
                    scope: '#/properties/accountType',
                    expectedValue: 'business',
                  },
                },
              },
            ],
          },
          {
            type: 'Control',
            scope: '#/properties/phone',
          },
        ],
      },
      {
        type: 'Category',
        label: 'Address',
        elements: [
          {
            type: 'Control',
            scope: '#/properties/address/properties/street',
          },
          {
            type: 'GridLayout',
            columns: 3,
            elements: [
              {
                element: {
                  type: 'Control',
                  scope: '#/properties/address/properties/city',
                },
                span: 1,
              },
              {
                element: {
                  type: 'Control',
                  scope: '#/properties/address/properties/state',
                },
                span: 1,
              },
              {
                element: {
                  type: 'Control',
                  scope: '#/properties/address/properties/zipCode',
                },
                span: 1,
              },
            ],
          },
        ],
      },
      {
        type: 'Category',
        label: 'Preferences',
        elements: [
          {
            type: 'Control',
            scope: '#/properties/preferences/properties/theme',
            widget: 'select',
          },
          {
            type: 'Control',
            scope: '#/properties/preferences/properties/notifications',
            widget: 'switch',
          },
          {
            type: 'Control',
            scope: '#/properties/preferences/properties/emailFrequency',
            widget: 'slider',
            rule: {
              effect: 'ENABLE',
              condition: {
                scope: '#/properties/preferences/properties/notifications',
                expectedValue: true,
              },
            },
          },
          {
            type: 'Control',
            scope: '#/properties/termsAccepted',
            widget: 'checkbox',
          },
        ],
      },
    ],
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
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
      <h1>Advanced Form Example</h1>
      <p>
        This demonstrates a complex form with custom UI schema, tabs, conditional fields, and various
        widget types.
      </p>

      <FormBuilder
        schema={schema}
        uischema={uischema}
        data={formData}
        onChange={handleChange}
        onSubmit={handleSubmit}
        validateOnBlur={true}
        showErrorList={true}
        theme={{
          primaryColor: '#6366f1',
          errorColor: '#ef4444',
          borderRadius: '0.5rem',
        }}
      />

      <details style={{ marginTop: '2rem' }}>
        <summary>Current Form Data</summary>
        <pre>{JSON.stringify(formData, null, 2)}</pre>
      </details>
    </div>
  );
};
