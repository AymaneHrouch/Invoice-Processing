import { useState } from 'react';
import { Label } from './label';

const TVA_RATES = [0, 7, 10, 14, 20];

/**
 * TVA rate selector.
 * - allowCustom=false (Ventes): dropdown only, fixed Moroccan rates
 * - allowCustom=true  (Achats): dropdown + "Autre" → free number input for non-standard rates
 */
const TvaRateField = ({
  value = '',
  onChange,
  disabled = false,
  allowCustom = false,
  label = 'TVA (%)',
  isDarkMode = false,
}) => {
  const numericValue = parseFloat(value);
  const isNonStandard =
    allowCustom &&
    value !== '' &&
    !isNaN(numericValue) &&
    !TVA_RATES.includes(numericValue);

  const [custom, setCustom] = useState(isNonStandard);

  const selectClass = `flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-sm transition-colors
    focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50
    ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-input text-gray-900'}`;

  const inputClass = `flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-sm
    focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50
    ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-input text-gray-900'}`;

  const handleSelectChange = (e) => {
    if (e.target.value === 'autre') {
      setCustom(true);
      onChange('');
    } else {
      setCustom(false);
      onChange(e.target.value);
    }
  };

  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <select
        value={custom ? 'autre' : String(numericValue >= 0 ? numericValue : '')}
        onChange={handleSelectChange}
        disabled={disabled}
        className={selectClass}
      >
        {TVA_RATES.map((r) => (
          <option key={r} value={String(r)}>
            {r}%
          </option>
        ))}
        {allowCustom && <option value="autre">Autre…</option>}
      </select>
      {custom && (
        <input
          type="number"
          step="0.01"
          min="0"
          max="100"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Taux personnalisé"
          disabled={disabled}
          className={inputClass}
        />
      )}
    </div>
  );
};

export default TvaRateField;
