/**
 * Field Components Index
 */

export { TextField } from './TextField';
export { TextAreaField } from './TextAreaField';
export { NumberField } from './NumberField';
export { CheckboxField } from './CheckboxField';
export { SwitchField } from './SwitchField';
export { SelectField } from './SelectField';
export { RadioField } from './RadioField';
export { SliderField } from './SliderField';

import { TextField } from './TextField';
import { TextAreaField } from './TextAreaField';
import { NumberField } from './NumberField';
import { CheckboxField } from './CheckboxField';
import { SwitchField } from './SwitchField';
import { SelectField } from './SelectField';
import { RadioField } from './RadioField';
import { SliderField } from './SliderField';
import { WidgetType, CustomWidget } from '../../types/uischema';

/**
 * Default widget mapping
 */
export const defaultWidgets: Record<WidgetType, CustomWidget> = {
  text: TextField,
  textarea: TextAreaField,
  number: NumberField,
  password: TextField,
  email: TextField,
  url: TextField,
  tel: TextField,
  date: TextField,
  time: TextField,
  datetime: TextField,
  color: TextField,
  checkbox: CheckboxField,
  radio: RadioField,
  select: SelectField,
  multiselect: SelectField,
  slider: SliderField,
  range: SliderField,
  switch: SwitchField,
  file: TextField, // TODO: Implement FileField
  rating: NumberField, // TODO: Implement RatingField
  chips: TextField, // TODO: Implement ChipsField
};

/**
 * Get widget component by type
 */
export function getWidget(widgetType: WidgetType): CustomWidget {
  return defaultWidgets[widgetType] || TextField;
}
