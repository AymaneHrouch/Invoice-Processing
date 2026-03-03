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

const InvoiceFilters = ({
  filters,
  onFilterChange,
  onClearFilters,
}) => {
  const { isDarkMode } = useTheme();

  return (
    <Card
      className={`mb-6 border-0 shadow-lg ${
        isDarkMode ? 'bg-gray-800/50' : 'bg-white/80'
      } backdrop-blur-sm`}
    >
      <CardHeader>
        <CardTitle className={isDarkMode ? 'text-white' : 'text-gray-800'}>
          Filters
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <div className="space-y-2">
            <Label className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>
              Status
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
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="extracted">Extracted</SelectItem>
                <SelectItem value="validated">Validated</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>
              Category
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
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
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

          <div className="space-y-2">
            <Label className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>
              Paid
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
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="true">Paid</SelectItem>
                <SelectItem value="false">Unpaid</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>
              Export Status
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
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="false">Not Exported</SelectItem>
                <SelectItem value="true">Exported</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>
              Archives
            </Label>
            <Button
              type="button"
              variant="outline"
              className={`h-11 w-full justify-center ${
                filters.include_archived
                  ? isDarkMode
                    ? 'border-blue-500 bg-blue-900/20 text-blue-300'
                    : 'border-blue-500 bg-blue-50 text-blue-700'
                  : ''
              }`}
              onClick={() =>
                onFilterChange('include_archived', !(filters.include_archived ?? false))
              }
            >
              {filters.include_archived ? 'Hide archives' : 'Show archives'}
            </Button>
          </div>

          <div className="space-y-2">
            <Label className="invisible">Clear</Label>
            <Button variant="outline" onClick={onClearFilters} className="h-11 w-full">
              Clear Filters
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default InvoiceFilters;
