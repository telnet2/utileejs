/**
 * Categorization Component
 * Tab-based navigation for form sections
 */

import React, { useState, useCallback } from 'react';
import { UISchemaCategorization } from '../../types/uischema';

interface CategorizationProps {
  uischema: UISchemaCategorization;
  children: React.ReactNode[];
}

export const Categorization: React.FC<CategorizationProps> = ({ uischema, children }) => {
  const [activeTab, setActiveTab] = useState(0);

  const handleTabClick = useCallback((index: number) => {
    setActiveTab(index);
  }, []);

  const variant = uischema.variant || 'tabs';

  return (
    <div className={`layout-categorization variant-${variant} ${uischema.className || ''}`} style={uischema.style}>
      <div className={`category-tabs ${variant}`} role="tablist">
        {uischema.elements.map((category, index) => {
          const isActive = activeTab === index;
          const Icon = typeof category.icon === 'function' ? category.icon : null;

          return (
            <button
              key={index}
              type="button"
              className={`category-tab ${isActive ? 'active' : ''}`}
              onClick={() => handleTabClick(index)}
              role="tab"
              aria-selected={isActive}
              aria-controls={`category-panel-${index}`}
            >
              {Icon && <Icon />}
              {typeof category.icon === 'string' && <span className="tab-icon">{category.icon}</span>}
              <span className="tab-label">{category.label}</span>
            </button>
          );
        })}
      </div>

      <div className="category-panels">
        {React.Children.map(children, (child, index) => {
          const isActive = activeTab === index;

          return (
            <div
              key={index}
              id={`category-panel-${index}`}
              className={`category-panel ${isActive ? 'active' : 'hidden'}`}
              role="tabpanel"
              aria-labelledby={`category-tab-${index}`}
              hidden={!isActive}
            >
              {child}
            </div>
          );
        })}
      </div>
    </div>
  );
};

Categorization.displayName = 'Categorization';
