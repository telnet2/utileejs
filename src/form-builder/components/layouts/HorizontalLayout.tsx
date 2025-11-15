/**
 * Horizontal Layout Component
 * Arranges elements horizontally
 */

import React from 'react';
import { UISchemaHorizontalLayout } from '../../types/uischema';

interface HorizontalLayoutProps {
  uischema: UISchemaHorizontalLayout;
  children: React.ReactNode;
}

export const HorizontalLayout: React.FC<HorizontalLayoutProps> = ({ uischema, children }) => {
  const style: React.CSSProperties = {
    ...uischema.style,
    gap: uischema.gap,
  };

  return (
    <div className={`layout-horizontal ${uischema.className || ''}`} style={style}>
      {children}
    </div>
  );
};

HorizontalLayout.displayName = 'HorizontalLayout';
