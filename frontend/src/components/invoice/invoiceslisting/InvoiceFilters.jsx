import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useTheme } from "@/contexts";

const InvoiceFilters = ({ 
  filters, 
  vendorSearchInput, 
  onFilterChange, 
  onClearFilters 
}) => {
  const { isDarkMode } = useTheme();

  return (
    <Card
      className={`mb-6 border-0 shadow-lg ${
        isDarkMode ? "bg-gray-800/50" : "bg-white/80"
      } backdrop-blur-sm`}
    >
      <CardHeader>
        <CardTitle className={isDarkMode ? "text-white" : "text-gray-800"}>
          Filters
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label className={isDarkMode ? "text-gray-300" : "text-gray-700"}>
              Status
            </Label>
            <Select
              value={filters.status}
              onValueChange={(value) => onFilterChange("status", value)}
            >
              <SelectTrigger
                className={`h-11 ${
                  isDarkMode
                    ? "bg-gray-700 border-gray-600 text-white"
                    : "bg-white"
                }`}
              >
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="processed">Processed</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className={isDarkMode ? "text-gray-300" : "text-gray-700"}>
              Vendor
            </Label>
            <Input
              value={vendorSearchInput}
              onChange={(e) => onFilterChange("vendor_name", e.target.value)}
              placeholder="Search vendor..."
              className={`h-11 ${
                isDarkMode
                  ? "bg-gray-700 border-gray-600 text-white"
                  : "bg-white"
              }`}
            />
          </div>

          <div className="space-y-2">
            <Label className={isDarkMode ? "text-gray-300" : "text-gray-700"}>
              Category
            </Label>
            <Select
              value={filters.category}
              onValueChange={(value) => onFilterChange("category", value)}
            >
              <SelectTrigger
                className={`h-11 ${
                  isDarkMode
                    ? "bg-gray-700 border-gray-600 text-white"
                    : "bg-white"
                }`}
              >
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="Software">Software</SelectItem>
                <SelectItem value="Hardware">Hardware</SelectItem>
                <SelectItem value="Professional Services">
                  Professional Services
                </SelectItem>
                <SelectItem value="Consulting">Consulting</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end">
            <Button variant="outline" onClick={onClearFilters} className="h-11">
              Clear Filters
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default InvoiceFilters;
