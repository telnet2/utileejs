/**
 * UI Schema Renderer
 * Recursively renders UI schema elements
 */

import React from 'react';
import {
  UISchema,
  UISchemaControl,
  UISchemaVerticalLayout,
  UISchemaHorizontalLayout,
  UISchemaGridLayout,
  UISchemaGroup,
  UISchemaCategorization,
  UISchemaLabel,
} from '../types/uischema';
import { ControlRenderer } from './ControlRenderer';
import { VerticalLayout, HorizontalLayout, GridLayout, Group, Categorization } from './layouts';

interface UISchemaRendererProps {
  uischema: UISchema;
}

export const UISchemaRenderer: React.FC<UISchemaRendererProps> = ({ uischema }) => {
  switch (uischema.type) {
    case 'Control':
      return <ControlRenderer uischema={uischema as UISchemaControl} />;

    case 'VerticalLayout':
      return (
        <VerticalLayout uischema={uischema as UISchemaVerticalLayout}>
          {(uischema as UISchemaVerticalLayout).elements.map((element, index) => (
            <UISchemaRenderer key={index} uischema={element} />
          ))}
        </VerticalLayout>
      );

    case 'HorizontalLayout':
      return (
        <HorizontalLayout uischema={uischema as UISchemaHorizontalLayout}>
          {(uischema as UISchemaHorizontalLayout).elements.map((element, index) => (
            <UISchemaRenderer key={index} uischema={element} />
          ))}
        </HorizontalLayout>
      );

    case 'GridLayout':
      const gridLayout = uischema as UISchemaGridLayout;
      return (
        <GridLayout uischema={gridLayout}>
          {gridLayout.elements.map((item, index) => {
            const span = item.span;
            const gridItemStyle: React.CSSProperties = {};

            if (typeof span === 'number') {
              gridItemStyle.gridColumn = `span ${span}`;
            } else if (span && typeof span === 'object') {
              // Responsive spans will be handled by CSS classes
              const spanClasses: string[] = [];
              if (span.xs) spanClasses.push(`grid-span-xs-${span.xs}`);
              if (span.sm) spanClasses.push(`grid-span-sm-${span.sm}`);
              if (span.md) spanClasses.push(`grid-span-md-${span.md}`);
              if (span.lg) spanClasses.push(`grid-span-lg-${span.lg}`);
              if (span.xl) spanClasses.push(`grid-span-xl-${span.xl}`);

              return (
                <div key={index} className={spanClasses.join(' ')} style={gridItemStyle}>
                  <UISchemaRenderer uischema={item.element} />
                </div>
              );
            }

            return (
              <div key={index} style={gridItemStyle}>
                <UISchemaRenderer uischema={item.element} />
              </div>
            );
          })}
        </GridLayout>
      );

    case 'Group':
      return (
        <Group uischema={uischema as UISchemaGroup}>
          {(uischema as UISchemaGroup).elements.map((element, index) => (
            <UISchemaRenderer key={index} uischema={element} />
          ))}
        </Group>
      );

    case 'Categorization':
      const categorization = uischema as UISchemaCategorization;
      return (
        <Categorization uischema={categorization}>
          {categorization.elements.map((category, index) => (
            <div key={index}>
              {category.elements.map((element, elemIndex) => (
                <UISchemaRenderer key={elemIndex} uischema={element} />
              ))}
            </div>
          ))}
        </Categorization>
      );

    case 'Label':
      const labelSchema = uischema as UISchemaLabel;
      const LabelTag = labelSchema.variant || 'div';

      return (
        <LabelTag
          className={`form-label-element ${labelSchema.className || ''}`}
          style={labelSchema.style}
        >
          {labelSchema.text}
        </LabelTag>
      );

    default:
      console.warn(`Unknown UI schema type: ${(uischema as any).type}`);
      return null;
  }
};

UISchemaRenderer.displayName = 'UISchemaRenderer';
