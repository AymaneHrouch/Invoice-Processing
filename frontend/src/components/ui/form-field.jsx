import { Label } from './label';
import { Input } from './input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './select';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { CalendarIcon } from 'lucide-react';
import { Button } from './button';
import { Calendar } from './calendar';
import { useState } from 'react';
import { format } from 'date-fns';

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
  const [date, setDate] = useState(value ? new Date(value) : null);

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
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={`w-full justify-start text-left font-normal ${!date ? 'text-muted-foreground' : ''} ${Icon ? 'pl-10' : ''}`}
              >
                <CalendarIcon className={`h-4 w-4 ${Icon ? 'ml-2' : 'mr-2'}`} />
                {date ? format(date, 'PPP') : placeholder || 'Pick a date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-auto p-0 overflow-hidden"
              align="start"
              side="bottom"
              sideOffset={4}
            >
              <Calendar
                mode="single"
                selected={date}
                onSelect={(selectedDate) => {
                  setDate(selectedDate);
                  onChange?.(selectedDate);
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
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
