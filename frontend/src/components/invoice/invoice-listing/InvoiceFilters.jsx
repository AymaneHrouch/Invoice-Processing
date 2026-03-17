import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { CalendarIcon } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useTheme } from '@/contexts';
import { useCategories } from '@/hooks/useCategories';

const STATUS_OPTIONS = {
  incoming: [
    { value: 'all', label: 'Tous' },
    { value: 'extracted', label: 'Extrait' },
    { value: 'validated', label: 'Validé' },
    { value: 'paid', label: 'Payé' },
  ],
  outgoing: [
    { value: 'all', label: 'Tous' },
    { value: 'draft', label: 'Brouillon' },
    { value: 'validated', label: 'Validé' },
    { value: 'sent', label: 'Envoyé' },
    { value: 'paid', label: 'Payé' },
  ],
  all: [
    { value: 'all', label: 'Tous' },
    { value: 'draft', label: 'Brouillon' },
    { value: 'extracted', label: 'Extrait' },
    { value: 'validated', label: 'Validé' },
    { value: 'sent', label: 'Envoyé' },
    { value: 'paid', label: 'Payé' },
  ],
};

const InvoiceFilters = ({
  filters,
  onFilterChange,
  onClearFilters,
  direction,
}) => {
  const { isDarkMode } = useTheme();
  const { categories } = useCategories();

  // Local state for date inputs — debounced before propagating to parent
  const [startDateInput, setStartDateInput] = useState(
    filters.start_date ?? '',
  );
  const [endDateInput, setEndDateInput] = useState(filters.end_date ?? '');

  // Sync local state when parent clears filters
  useEffect(() => {
    setStartDateInput(filters.start_date ?? '');
  }, [filters.start_date]);
  useEffect(() => {
    setEndDateInput(filters.end_date ?? '');
  }, [filters.end_date]);

  // Debounce: only fire onFilterChange 600ms after the user stops typing,
  // and only if the value actually changed (prevents spurious fetches on mount).
  useEffect(() => {
    const newVal = startDateInput || undefined;
    if (newVal === filters.start_date) return;
    const t = setTimeout(() => {
      onFilterChange('start_date', newVal);
    }, 600);
    return () => clearTimeout(t);
  }, [startDateInput]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const newVal = endDateInput || undefined;
    if (newVal === filters.end_date) return;
    const t = setTimeout(() => {
      onFilterChange('end_date', newVal);
    }, 600);
    return () => clearTimeout(t);
  }, [endDateInput]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Card
      className={`mb-6 border-0 shadow-lg ${
        isDarkMode ? 'bg-gray-800/50' : 'bg-white/80'
      } backdrop-blur-sm`}
    >
      <CardHeader>
        <CardTitle className={isDarkMode ? 'text-white' : 'text-gray-800'}>
          Filtres
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-2 min-w-[140px] flex-1">
            <Label className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>
              Statut
            </Label>
            <Select
              value={filters.status}
              onValueChange={(value) => onFilterChange('status', value)}
            >
              <SelectTrigger
                className={`h-11 ${
                  isDarkMode
                    ? 'bg-gray-700 border-gray-600 text-white'
                    : 'bg-white'
                }`}
              >
                <SelectValue placeholder="Tous" />
              </SelectTrigger>
              <SelectContent>
                {(STATUS_OPTIONS[direction] ?? STATUS_OPTIONS.all).map(
                  (opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 min-w-[140px] flex-1">
            <Label className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>
              Catégorie
            </Label>
            <Select
              value={filters.category}
              onValueChange={(value) => onFilterChange('category', value)}
            >
              <SelectTrigger
                className={`h-11 ${
                  isDarkMode
                    ? 'bg-gray-700 border-gray-600 text-white'
                    : 'bg-white'
                }`}
              >
                <SelectValue placeholder="Tous" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 min-w-[140px] flex-1">
            <Label className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>
              Payé
            </Label>
            <Select
              value={filters.is_paid ?? 'all'}
              onValueChange={(value) => onFilterChange('is_paid', value)}
            >
              <SelectTrigger
                className={`h-11 ${
                  isDarkMode
                    ? 'bg-gray-700 border-gray-600 text-white'
                    : 'bg-white'
                }`}
              >
                <SelectValue placeholder="Tous" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="true">Payé</SelectItem>
                <SelectItem value="false">Non payé</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 min-w-[140px] flex-1">
            <Label className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>
              Exporté
            </Label>
            <Select
              value={filters.is_exported ?? 'all'}
              onValueChange={(value) => onFilterChange('is_exported', value)}
            >
              <SelectTrigger
                className={`h-11 ${
                  isDarkMode
                    ? 'bg-gray-700 border-gray-600 text-white'
                    : 'bg-white'
                }`}
              >
                <SelectValue placeholder="Tous" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="false">Non exporté</SelectItem>
                <SelectItem value="true">Exporté</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date range */}
          <div className="space-y-2 min-w-[140px] flex-1">
            <Label className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>
              Du
            </Label>
            <div className="relative w-full">
              <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
              <input
                type="date"
                value={startDateInput}
                onChange={(e) => setStartDateInput(e.target.value)}
                className={`date-input flex h-11 w-full rounded-md border pl-9 pr-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 [color-scheme:light] dark:[color-scheme:dark] ${
                  isDarkMode
                    ? 'bg-gray-700 border-gray-600 text-white'
                    : 'bg-white border-input'
                }`}
              />
            </div>
          </div>

          <div className="space-y-2 min-w-[140px] flex-1">
            <Label className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>
              Au
            </Label>
            <div className="relative w-full">
              <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
              <input
                type="date"
                value={endDateInput}
                onChange={(e) => setEndDateInput(e.target.value)}
                className={`date-input flex h-11 w-full rounded-md border pl-9 pr-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 [color-scheme:light] dark:[color-scheme:dark] ${
                  isDarkMode
                    ? 'bg-gray-700 border-gray-600 text-white'
                    : 'bg-white border-input'
                }`}
              />
            </div>
          </div>

          <div className="space-y-2 flex-none">
            <Label className="invisible">Archives</Label>
            <Button
              type="button"
              variant="outline"
              className={`h-11 min-h-0 py-2 px-3 text-sm font-normal whitespace-nowrap ${
                filters.include_archived
                  ? isDarkMode
                    ? 'border-blue-500 bg-blue-900/20 text-blue-300'
                    : 'border-blue-500 bg-blue-50 text-blue-700'
                  : ''
              }`}
              onClick={() =>
                onFilterChange(
                  'include_archived',
                  !(filters.include_archived ?? false),
                )
              }
            >
              {filters.include_archived
                ? 'Masquer les archives'
                : 'Afficher les archives'}
            </Button>
          </div>

          {/* Overdue filter */}
          <div className="space-y-2 flex-none">
            <Label className="invisible">En retard</Label>
            <Button
              type="button"
              variant="outline"
              className={`h-11 min-h-0 py-2 px-3 text-sm font-normal whitespace-nowrap ${
                filters.overdue
                  ? isDarkMode
                    ? 'border-red-500 bg-red-900/20 text-red-300'
                    : 'border-red-500 bg-red-50 text-red-700'
                  : ''
              }`}
              onClick={() =>
                onFilterChange('overdue', !(filters.overdue ?? false))
              }
            >
              En retard
            </Button>
          </div>

          <div className="space-y-2 flex flex-col justify-end flex-1 min-w-0">
            <button
              type="button"
              onClick={onClearFilters}
              className={`text-sm font-normal bg-transparent border-0 cursor-pointer self-center lg:self-end ${
                isDarkMode
                  ? 'text-gray-400 hover:text-gray-200 hover:underline'
                  : 'text-gray-500 hover:text-gray-800 hover:underline'
              }`}
            >
              Effacer les filtres
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default InvoiceFilters;
