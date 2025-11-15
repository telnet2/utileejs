/**
 * Group Component
 * Groups elements with a label and optional border
 */

import React, { useState, useCallback } from 'react';
import { UISchemaGroup } from '../../types/uischema';

interface GroupProps {
  uischema: UISchemaGroup;
  children: React.ReactNode;
}

export const Group: React.FC<GroupProps> = ({ uischema, children }) => {
  const [collapsed, setCollapsed] = useState(uischema.defaultCollapsed ?? false);

  const toggleCollapsed = useCallback(() => {
    if (uischema.collapsible) {
      setCollapsed((prev) => !prev);
    }
  }, [uischema.collapsible]);

  return (
    <div className={`layout-group ${uischema.className || ''}`} style={uischema.style}>
      <div
        className={`group-header ${uischema.collapsible ? 'collapsible' : ''}`}
        onClick={toggleCollapsed}
        role={uischema.collapsible ? 'button' : undefined}
        aria-expanded={uischema.collapsible ? !collapsed : undefined}
      >
        <h3 className="group-label">{uischema.label}</h3>
        {uischema.collapsible && (
          <span className={`collapse-icon ${collapsed ? 'collapsed' : 'expanded'}`}>
            {collapsed ? '▶' : '▼'}
          </span>
        )}
      </div>

      {!collapsed && <div className="group-content">{children}</div>}
    </div>
  );
};

Group.displayName = 'Group';
