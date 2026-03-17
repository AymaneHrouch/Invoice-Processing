import { Button } from '@/components/ui/button';
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

const InvoiceFilters = ({ filters, onFilterChange, onClearFilters }) => {
  const { isDarkMode } = useTheme();

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
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="extracted">Extrait</SelectItem>
                <SelectItem value="validated">Validé</SelectItem>
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
                <SelectItem value="Services">Services</SelectItem>
                <SelectItem value="Equipment">Equipment</SelectItem>
                <SelectItem value="Software">Software</SelectItem>
                <SelectItem value="Travel">Travel</SelectItem>
                <SelectItem value="Marketing">Marketing</SelectItem>
                <SelectItem value="Utilities">Utilities</SelectItem>
                <SelectItem value="Others">Others</SelectItem>
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

          <div className="space-y-2 flex-1 min-w-0">
            <Label className="invisible">Archives</Label>
            <Button
              type="button"
              variant="outline"
              className={`h-11 min-h-0 py-2 w-auto shrink-0 px-3 justify-center text-sm font-normal ${
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
