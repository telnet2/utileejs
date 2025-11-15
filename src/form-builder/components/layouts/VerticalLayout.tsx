/**
 * Vertical Layout Component
 * Stacks elements vertically
 */

import React from 'react';
import { UISchemaVerticalLayout } from '../../types/uischema';

interface VerticalLayoutProps {
  uischema: UISchemaVerticalLayout;
  children: React.ReactNode;
}

export const VerticalLayout: React.FC<VerticalLayoutProps> = ({ uischema, children }) => {
  return (
    <div className={`layout-vertical ${uischema.className || ''}`} style={uischema.style}>
      {children}
    </div>
  );
};

VerticalLayout.displayName = 'VerticalLayout';
