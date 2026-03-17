import { Label } from './label';
import { Input } from './input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './select';
import { CalendarIcon } from 'lucide-react';

export const FormField = ({
  type = 'text',
  label,
  value,
  onChange,
  placeholder,
  options = [],
  required = false,
  error,
  min,
  max,
  step,
  className = 'w-full',
  icon: Icon,
  ...props
}) => {
  const renderInput = () => {
    switch (type) {
      case 'select':
        return (
          <div className="relative">
            {Icon && (
              <Icon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />
            )}
            <Select value={value} onValueChange={onChange}>
              <SelectTrigger className={`${className} ${Icon ? 'pl-10' : ''}`}>
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>
              <SelectContent>
                {options.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      case 'number':
        return (
          <div className="relative">
            {Icon && (
              <Icon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />
            )}
            <Input
              type="number"
              value={value}
              onChange={onChange}
              placeholder={placeholder}
              min={min}
              max={max}
              step={step}
              className={`${className} ${Icon ? 'pl-10' : ''}`}
              {...props}
            />
          </div>
        );

      case 'date':
        return (
          <div className="relative w-full">
            <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              type="date"
              value={value || ''}
              onChange={onChange}
              className="date-input flex h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [color-scheme:light] dark:[color-scheme:dark]"
              {...props}
            />
          </div>
        );

      default:
        return (
          <div className="relative">
            {Icon && (
              <Icon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />
            )}
            <Input
              type={type}
              value={value}
              onChange={onChange}
              placeholder={placeholder}
              className={`${className} ${Icon ? 'pl-10' : ''}`}
              {...props}
            />
          </div>
        );
    }
  };

  return (
    <div className="space-y-2">
      <Label
        htmlFor={props.id}
        className={
          required ? 'after:content-["*"] after:ml-0.5 after:text-red-500' : ''
        }
      >
        {label}
      </Label>
      {renderInput()}
      {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
    </div>
  );
};
