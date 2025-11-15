/**
 * Grid Layout Component
 * Responsive grid layout system
 */

import React, { useMemo } from 'react';
import { UISchemaGridLayout } from '../../types/uischema';

interface GridLayoutProps {
  uischema: UISchemaGridLayout;
  children: React.ReactNode;
}

export const GridLayout: React.FC<GridLayoutProps> = ({ uischema, children }) => {
  const gridStyle = useMemo(() => {
    const style: React.CSSProperties = {
      ...uischema.style,
      gap: uischema.gap,
    };

    // Handle columns
    if (typeof uischema.columns === 'number') {
      style.gridTemplateColumns = `repeat(${uischema.columns}, 1fr)`;
    } else if (uischema.columns) {
      // Responsive columns using CSS custom properties
      // This will be handled by CSS media queries
    }

    return style;
  }, [uischema.style, uischema.gap, uischema.columns]);

  const gridClassName = useMemo(() => {
    const classes = ['layout-grid'];

    if (uischema.className) {
      classes.push(uischema.className);
    }

    // Add responsive column classes if needed
    if (typeof uischema.columns === 'object') {
      if (uischema.columns.xs) classes.push(`grid-cols-xs-${uischema.columns.xs}`);
      if (uischema.columns.sm) classes.push(`grid-cols-sm-${uischema.columns.sm}`);
      if (uischema.columns.md) classes.push(`grid-cols-md-${uischema.columns.md}`);
      if (uischema.columns.lg) classes.push(`grid-cols-lg-${uischema.columns.lg}`);
      if (uischema.columns.xl) classes.push(`grid-cols-xl-${uischema.columns.xl}`);
    }

    return classes.join(' ');
  }, [uischema.className, uischema.columns]);

  return (
    <div className={gridClassName} style={gridStyle}>
      {children}
    </div>
  );
};

GridLayout.displayName = 'GridLayout';
