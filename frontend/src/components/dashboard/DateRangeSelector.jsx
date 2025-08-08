import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
import { useTheme } from '@/contexts';

const DateRangeSelector = ({
  onDateRangeChange,
  initialPreset = '1year',
  className = '',
}) => {
  const { isDarkMode } = useTheme();
  const [preset, setPreset] = useState(initialPreset);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const initializedRef = useRef(false);

  const presets = [
    { value: '1month', label: 'Last Month' },
    { value: '3months', label: 'Last 3 Months' },
    { value: '6months', label: 'Last 6 Months' },
    { value: '1year', label: 'Last Year' },
    { value: '2years', label: 'Last 2 Years' },
    { value: 'all', label: 'All Time' },
    { value: 'custom', label: 'Custom Range' },
  ];

  // Calculate date ranges for presets
  const getDateRange = (presetValue) => {
    const now = new Date();
    let endDate = new Date(now);
    let startDate = new Date(now);

    switch (presetValue) {
      case '1month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case '3months':
        startDate.setMonth(now.getMonth() - 3);
        break;
      case '6months':
        startDate.setMonth(now.getMonth() - 6);
        break;
      case '1year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      case '2years':
        startDate.setFullYear(now.getFullYear() - 2);
        break;
      case 'all':
        startDate = new Date(0); // Beginning of time
        break;
      case 'custom':
        if (customStartDate && customEndDate) {
          startDate = new Date(customStartDate);
          endDate = new Date(customEndDate);
        }
        break;
      default:
        startDate.setFullYear(now.getFullYear() - 1);
    }

    return { startDate, endDate };
  };

  // Format date for display
  const formatDateRange = (presetValue) => {
    if (presetValue === 'custom' && customStartDate && customEndDate) {
      const start = new Date(customStartDate).toLocaleDateString();
      const end = new Date(customEndDate).toLocaleDateString();
      return `${start} - ${end}`;
    }

    const { startDate, endDate } = getDateRange(presetValue);
    if (presetValue === 'all') {
      return 'All Time';
    }

    const start = startDate.toLocaleDateString();
    const end = endDate.toLocaleDateString();
    return `${start} - ${end}`;
  };

  // Handle preset change
  const handlePresetChange = (newPreset) => {
    setPreset(newPreset);
    setIsCustomMode(newPreset === 'custom');
    setIsDropdownOpen(false);

    if (newPreset !== 'custom') {
      const { startDate, endDate } = getDateRange(newPreset);
      onDateRangeChange({
        preset: newPreset,
        startDate,
        endDate,
        isCustom: false,
      });
    }
  };

  // Handle custom date input changes
  const handleCustomStartDateChange = (date) => {
    setCustomStartDate(date);
  };

  const handleCustomEndDateChange = (date) => {
    setCustomEndDate(date);
  };

  // Effect to handle custom date changes
  useEffect(() => {
    if (isCustomMode && customStartDate && customEndDate) {
      const startDate = new Date(customStartDate);
      const endDate = new Date(customEndDate);

      if (startDate <= endDate) {
        onDateRangeChange({
          preset: 'custom',
          startDate,
          endDate,
          isCustom: true,
        });
      }
    }
  }, [isCustomMode, customStartDate, customEndDate, onDateRangeChange]);

  // Initialize with default range
  useEffect(() => {
    if (!initializedRef.current && !isCustomMode) {
      const { startDate, endDate } = getDateRange(preset);
      onDateRangeChange({
        preset,
        startDate,
        endDate,
        isCustom: false,
      });
      initializedRef.current = true;
    }
  }, [preset, isCustomMode, onDateRangeChange]);

  return (
    <div className={`relative ${className}`}>
      {/* Main Selector */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
            isDarkMode
              ? 'bg-slate-700 border-slate-600 text-white hover:border-slate-500'
              : 'bg-white border-gray-300 text-gray-900 hover:border-gray-400'
          } focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent`}
        >
          <Calendar className="w-4 h-4" />
          <span className="text-sm font-medium">{formatDateRange(preset)}</span>
          <ChevronDown
            className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
          />
        </button>
      </div>

      {/* Dropdown Menu */}
      {isDropdownOpen && (
        <div
          className={`absolute top-full left-0 mt-1 w-64 rounded-lg shadow-lg border z-50 ${
            isDarkMode
              ? 'bg-slate-800 border-slate-700'
              : 'bg-white border-gray-200'
          }`}
        >
          <div className="p-2">
            {/* Preset Options */}
            <div className="space-y-1">
              {presets.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handlePresetChange(option.value)}
                  className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                    preset === option.value
                      ? isDarkMode
                        ? 'bg-purple-600 text-white'
                        : 'bg-purple-100 text-purple-900'
                      : isDarkMode
                        ? 'text-gray-300 hover:bg-slate-700'
                        : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            {/* Custom Date Range Inputs */}
            {isCustomMode && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="space-y-3">
                  <div>
                    <label
                      className={`block text-xs font-medium mb-1 ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}
                    >
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) =>
                        handleCustomStartDateChange(e.target.value)
                      }
                      max={customEndDate || undefined}
                      className={`w-full px-3 py-2 text-sm rounded border transition-colors ${
                        isDarkMode
                          ? 'bg-slate-700 border-slate-600 text-white focus:border-purple-500'
                          : 'bg-white border-gray-300 text-gray-900 focus:border-purple-500'
                      } focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50`}
                    />
                  </div>
                  <div>
                    <label
                      className={`block text-xs font-medium mb-1 ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}
                    >
                      End Date
                    </label>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) =>
                        handleCustomEndDateChange(e.target.value)
                      }
                      min={customStartDate || undefined}
                      max={new Date().toISOString().split('T')[0]}
                      className={`w-full px-3 py-2 text-sm rounded border transition-colors ${
                        isDarkMode
                          ? 'bg-slate-700 border-slate-600 text-white focus:border-purple-500'
                          : 'bg-white border-gray-300 text-gray-900 focus:border-purple-500'
                      } focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50`}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Backdrop to close dropdown */}
      {isDropdownOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsDropdownOpen(false)}
        />
      )}
    </div>
  );
};

export default DateRangeSelector;
