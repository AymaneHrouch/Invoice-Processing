import React from 'react';
import { Label } from './label';
import { Input } from './input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';

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
  className = '',
  ...props 
}) => {
  const renderInput = () => {
    switch (type) {
      case 'select':
        return (
          <Select value={value} onValueChange={onChange}>
            <SelectTrigger className={className}>
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {options.map(option => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      
      case 'number':
        return (
          <Input
            type="number"
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            min={min}
            max={max}
            step={step}
            className={className}
            {...props}
          />
        );
      
      case 'date':
        return (
          <Input
            type="date"
            value={value || ''}
            onChange={onChange}
            className={className}
            {...props}
          />
        );
      
      default:
        return (
          <Input
            type={type}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            className={className}
            {...props}
          />
        );
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={props.id} className={required ? 'after:content-["*"] after:ml-0.5 after:text-red-500' : ''}>
        {label}
      </Label>
      {renderInput()}
      {error && (
        <p className="text-sm text-red-500 mt-1">{error}</p>
      )}
    </div>
  );
};
