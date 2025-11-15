/**
 * UI Schema Translation
 *
 * Original format uses:
 * - ui:row, ui:col, ui:columns for layouts
 * - Field references as data paths (e.g., "person.name.first")
 * - ui:condition for conditional rendering
 *
 * Our format uses:
 * - GridLayout, VerticalLayout, HorizontalLayout
 * - Controls with scope as JSON pointers (e.g., "#/properties/person/properties/name/properties/first")
 * - Rules for conditional rendering
 */

import { UISchema } from '../../src/form-builder/types';

export const personEmploymentUISchema: UISchema = {
  type: 'VerticalLayout',
  elements: [
    // Person Info Section (Full Width Header)
    {
      type: 'Group',
      label: 'Person Info',
      elements: [
        // Name fields in a 3-column grid
        {
          type: 'GridLayout',
          columns: 3,
          elements: [
            {
              element: {
                type: 'Control',
                scope: '#/properties/person/properties/name/properties/first',
              },
              span: 1,
            },
            {
              element: {
                type: 'Control',
                scope: '#/properties/person/properties/name/properties/middle',
              },
              span: 1,
            },
            {
              element: {
                type: 'Control',
                scope: '#/properties/person/properties/name/properties/last',
              },
              span: 1,
            },
          ],
        },

        // Birth date and race row
        {
          type: 'GridLayout',
          columns: { xs: 1, sm: 1, md: 3, lg: 3, xl: 3 },
          elements: [
            {
              element: {
                type: 'Control',
                scope: '#/properties/person/properties/birth_date',
                widget: 'date',
                placeholder: 'MM/DD/YYYY',
              },
              span: { xs: 12, sm: 12, md: 3, lg: 3, xl: 3 },
            },
            {
              element: {
                type: 'Control',
                scope: '#/properties/person/properties/race',
                // Race is an array of checkboxes - we'll handle this specially
                helpText: '(Check all that apply)',
              },
              span: { xs: 12, sm: 12, md: 9, lg: 9, xl: 9 },
            },
          ],
        },

        // Address Section
        {
          type: 'Group',
          label: 'Address',
          elements: [
            {
              type: 'Control',
              scope: '#/properties/person/properties/address/properties/line_1',
            },
            {
              type: 'Control',
              scope: '#/properties/person/properties/address/properties/line_2',
            },
            {
              type: 'Control',
              scope: '#/properties/person/properties/address/properties/city',
            },
            {
              type: 'GridLayout',
              columns: 2,
              elements: [
                {
                  element: {
                    type: 'Control',
                    scope: '#/properties/person/properties/address/properties/state',
                    widget: 'select',
                  },
                  span: 1,
                },
                {
                  element: {
                    type: 'Control',
                    scope: '#/properties/person/properties/address/properties/postal_code',
                  },
                  span: 1,
                },
              ],
            },
          ],
        },
      ],
    },

    // Employment Section
    {
      type: 'Group',
      label: 'Employment',
      elements: [
        // Employment type selector (radio buttons inline)
        {
          type: 'Control',
          scope: '#/properties/employment/properties/job_type',
          widget: 'radio',
          options: {
            inline: true,
          },
        },

        // Company fields (shown when job_type === 'company')
        {
          type: 'GridLayout',
          columns: 2,
          elements: [
            {
              element: {
                type: 'Control',
                scope: '#/properties/employment/properties/business',
                rule: {
                  effect: 'SHOW',
                  condition: {
                    scope: '#/properties/employment/properties/job_type',
                    expectedValue: 'company',
                    operator: 'equals',
                  },
                },
              },
              span: 1,
            },
            {
              element: {
                type: 'Control',
                scope: '#/properties/employment/properties/title',
                rule: {
                  effect: 'SHOW',
                  condition: {
                    scope: '#/properties/employment/properties/job_type',
                    expectedValue: 'company',
                    operator: 'equals',
                  },
                },
              },
              span: 1,
            },
          ],
        },
        {
          type: 'GridLayout',
          columns: 3,
          elements: [
            {
              element: {
                type: 'Control',
                scope: '#/properties/employment/properties/location/properties/city',
                rule: {
                  effect: 'SHOW',
                  condition: {
                    scope: '#/properties/employment/properties/job_type',
                    expectedValue: 'company',
                    operator: 'equals',
                  },
                },
              },
              span: 2,
            },
            {
              element: {
                type: 'Control',
                scope: '#/properties/employment/properties/location/properties/state',
                widget: 'select',
                rule: {
                  effect: 'SHOW',
                  condition: {
                    scope: '#/properties/employment/properties/job_type',
                    expectedValue: 'company',
                    operator: 'equals',
                  },
                },
              },
              span: 1,
            },
          ],
        },

        // Education fields (shown when job_type === 'education')
        {
          type: 'GridLayout',
          columns: 2,
          elements: [
            {
              element: {
                type: 'Control',
                scope: '#/properties/employment/properties/district',
                rule: {
                  effect: 'SHOW',
                  condition: {
                    scope: '#/properties/employment/properties/job_type',
                    expectedValue: 'education',
                    operator: 'equals',
                  },
                },
              },
              span: 1,
            },
            {
              element: {
                type: 'Control',
                scope: '#/properties/employment/properties/school',
                rule: {
                  effect: 'SHOW',
                  condition: {
                    scope: '#/properties/employment/properties/job_type',
                    expectedValue: 'education',
                    operator: 'equals',
                  },
                },
              },
              span: 1,
            },
          ],
        },
        {
          type: 'Control',
          scope: '#/properties/employment/properties/title',
          rule: {
            effect: 'SHOW',
            condition: {
              scope: '#/properties/employment/properties/job_type',
              expectedValue: 'education',
              operator: 'equals',
            },
          },
        },
        {
          type: 'GridLayout',
          columns: 3,
          elements: [
            {
              element: {
                type: 'Control',
                scope: '#/properties/employment/properties/location/properties/city',
                rule: {
                  effect: 'SHOW',
                  condition: {
                    scope: '#/properties/employment/properties/job_type',
                    expectedValue: 'education',
                    operator: 'equals',
                  },
                },
              },
              span: 2,
            },
            {
              element: {
                type: 'Control',
                scope: '#/properties/employment/properties/location/properties/state',
                widget: 'select',
                rule: {
                  effect: 'SHOW',
                  condition: {
                    scope: '#/properties/employment/properties/job_type',
                    expectedValue: 'education',
                    operator: 'equals',
                  },
                },
              },
              span: 1,
            },
          ],
        },

        // Other fields (shown when job_type === 'other')
        {
          type: 'Control',
          scope: '#/properties/employment/properties/description',
          widget: 'textarea',
          options: {
            rows: 6,
          },
          rule: {
            effect: 'SHOW',
            condition: {
              scope: '#/properties/employment/properties/job_type',
              expectedValue: 'other',
              operator: 'equals',
            },
          },
        },
      ],
    },
  ],
};
