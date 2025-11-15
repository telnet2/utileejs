'use client';

/**
 * Next.js Demo Page for Form Builder
 * Demonstrates a complex form with nested objects, conditionals, and $ref definitions
 */

import React, { useState } from 'react';
import { FormBuilder } from '../form-builder';
import '../form-builder/styles/form-builder.css';
import { personEmploymentSchema } from './schema';
import { personEmploymentUISchema } from './uischema';
import styles from './page.module.css';

export default function Home() {
  const [formData, setFormData] = useState({
    employment: {
      job_type: 'company', // Default to company
    },
  });
  const [submittedData, setSubmittedData] = useState<any>(null);
  const [showJson, setShowJson] = useState(false);

  const handleChange = (data: any) => {
    console.log('Form data changed:', data);
    setFormData(data);
  };

  const handleSubmit = (data: any) => {
    console.log('Form submitted:', data);
    setSubmittedData(data);
    alert('Form submitted successfully! Check the "Submitted Data" section below.');
  };

  const handleReset = () => {
    setFormData({
      employment: {
        job_type: 'company',
      },
    });
    setSubmittedData(null);
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>React Form Builder Demo</h1>
        <p className={styles.subtitle}>
          A powerful form builder based on JSON Schema with flexible UI Schema
        </p>
      </header>

      <main className={styles.main}>
        <div className={styles.intro}>
          <h2>Person & Employment Information Form</h2>
          <p>
            This demo showcases a complex form with:
          </p>
          <ul>
            <li><strong>$ref definitions</strong> - Reusable schema components</li>
            <li><strong>Nested objects</strong> - Person name, address, location</li>
            <li><strong>Conditional fields</strong> - Different fields based on employment type</li>
            <li><strong>Array inputs</strong> - Multi-select race checkboxes</li>
            <li><strong>Custom layouts</strong> - Grid layouts with responsive columns</li>
            <li><strong>Validation</strong> - Required fields, pattern matching, min/max lengths</li>
          </ul>
        </div>

        <div className={styles.formContainer}>
          <FormBuilder
            schema={personEmploymentSchema as any}
            uischema={personEmploymentUISchema}
            data={formData}
            onChange={handleChange}
            onSubmit={handleSubmit}
            validateOnBlur={true}
            showErrorList={false}
            theme={{
              primaryColor: '#3b82f6',
              errorColor: '#ef4444',
              successColor: '#10b981',
              borderRadius: '0.5rem',
            }}
          />

          <div className={styles.actions}>
            <button type="submit" className={styles.submitButton} onClick={() => handleSubmit(formData)}>
              Submit Form
            </button>
            <button type="button" className={styles.resetButton} onClick={handleReset}>
              Reset Form
            </button>
            <button
              type="button"
              className={styles.toggleButton}
              onClick={() => setShowJson(!showJson)}
            >
              {showJson ? 'Hide' : 'Show'} Current Data
            </button>
          </div>
        </div>

        {showJson && (
          <div className={styles.dataPreview}>
            <h3>Current Form Data</h3>
            <pre>{JSON.stringify(formData, null, 2)}</pre>
          </div>
        )}

        {submittedData && (
          <div className={styles.submittedData}>
            <h3>Submitted Data</h3>
            <pre>{JSON.stringify(submittedData, null, 2)}</pre>
          </div>
        )}

        <div className={styles.schemaInfo}>
          <details>
            <summary>View JSON Schema</summary>
            <pre>{JSON.stringify(personEmploymentSchema, null, 2)}</pre>
          </details>

          <details>
            <summary>View UI Schema</summary>
            <pre>{JSON.stringify(personEmploymentUISchema, null, 2)}</pre>
          </details>

          <details>
            <summary>UI Schema Translation Notes</summary>
            <div className={styles.translationNotes}>
              <h4>Original Format → Our Format</h4>
              <table>
                <thead>
                  <tr>
                    <th>Original</th>
                    <th>Our Format</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><code>ui:row</code> / <code>ui:col</code></td>
                    <td><code>GridLayout</code> with columns and span</td>
                  </tr>
                  <tr>
                    <td><code>"person.name.first"</code></td>
                    <td><code>#/properties/person/properties/name/properties/first</code></td>
                  </tr>
                  <tr>
                    <td><code>ui:condition</code></td>
                    <td><code>rule</code> with effect and condition</td>
                  </tr>
                  <tr>
                    <td><code>ui:widget</code></td>
                    <td><code>widget</code> property on Control</td>
                  </tr>
                  <tr>
                    <td><code>ui:options</code></td>
                    <td><code>options</code> property on Control</td>
                  </tr>
                  <tr>
                    <td><code>className: "col-xs-6"</code></td>
                    <td><code>span: 6</code> or responsive <code>{`{ xs: 12, md: 6 }`}</code></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </details>
        </div>
      </main>

      <footer className={styles.footer}>
        <p>
          Built with <strong>React Form Builder</strong> - A JSON Schema based form generation system
        </p>
      </footer>
    </div>
  );
}
