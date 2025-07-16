import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "@/contexts";
import {
  formatDate,
  formatCurrency,
  getCategoryColor,
  getSourceIcon,
} from "@/constants";
import { EditInvoice } from "@/components/invoice";

const InvoiceRow = ({ 
  invoice, 
  isExpanded, 
  onToggleExpand, 
  onExportPDF 
}) => {
  const { isDarkMode } = useTheme();

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  return (
    <>
      <tr
        className={`transition-colors ${
          isDarkMode ? "hover:bg-gray-700" : "hover:bg-gray-50"
        }`}
      >
        <td
          className={`px-3 py-4 border-b align-middle ${
            isDarkMode ? "border-gray-600" : "border-gray-100"
          }`}
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onToggleExpand(invoice.id || invoice._id)}
            aria-label={isExpanded ? "Collapse" : "Expand"}
            className={`p-1 h-6 w-6 ${
              isDarkMode
                ? "text-gray-400 hover:text-gray-200 hover:bg-gray-600"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-200"
            }`}
          >
            {isExpanded ? "▼" : "▶"}
          </Button>
        </td>
        <td
          className={`px-3 py-4 border-b align-middle ${
            isDarkMode ? "border-gray-600" : "border-gray-100"
          }`}
        >
          <span
            className={`font-semibold ${
              isDarkMode ? "text-gray-200" : "text-gray-800"
            }`}
          >
            {invoice.invoice_number}
          </span>
        </td>
        <td
          className={`px-3 py-4 border-b align-middle ${
            isDarkMode ? "border-gray-600" : "border-gray-100"
          }`}
        >
          <span
            className={`font-medium ${
              isDarkMode ? "text-gray-300" : "text-gray-600"
            }`}
          >
            {invoice.vendor_name}
          </span>
        </td>
        <td
          className={`px-3 py-4 border-b align-middle ${
            isDarkMode ? "border-gray-600" : "border-gray-100"
          }`}
        >
          <span className={isDarkMode ? "text-gray-400" : "text-gray-500"}>
            {formatDate(invoice.invoice_date)}
          </span>
        </td>
        <td
          className={`px-3 py-4 border-b align-middle w-24 ${
            isDarkMode ? "border-gray-600" : "border-gray-100"
          }`}
        >
          <Badge
            variant={
              invoice.status?.toLowerCase() === "paid"
                ? "default"
                : invoice.status?.toLowerCase() === "processed"
                ? "secondary"
                : "outline"
            }
            className="min-w-[70px] text-center justify-center"
          >
            {invoice.status}
          </Badge>
        </td>
        <td
          className={`px-3 py-4 border-b align-middle ${
            isDarkMode ? "border-gray-600" : "border-gray-100"
          }`}
        >
          <span className="font-semibold text-green-600 text-base">
            {formatCurrency(invoice.total_amount, invoice.currency)}
          </span>
        </td>
        <td
          className={`px-3 py-4 border-b align-middle w-32 ${
            isDarkMode ? "border-gray-600" : "border-gray-100"
          }`}
        >
          <Badge
            variant="secondary"
            style={{
              backgroundColor: getCategoryColor(invoice.category),
              color: "white",
            }}
            className="text-white font-medium text-xs uppercase tracking-wide min-w-[90px] text-center justify-center"
          >
            {invoice.category}
          </Badge>
        </td>
        <td
          className={`px-3 py-4 border-b align-middle ${
            isDarkMode ? "border-gray-600" : "border-gray-100"
          }`}
        >
          <span
            className={`flex items-center gap-1 text-xs ${
              isDarkMode ? "text-gray-400" : "text-gray-500"
            }`}
          >
            {getSourceIcon(invoice.source_type)} {invoice.source_type}
          </span>
        </td>
        <td
          className={`px-3 py-4 border-b align-middle ${
            isDarkMode ? "border-gray-600" : "border-gray-100"
          }`}
        >
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className={`text-xs border-blue-500 text-blue-600 hover:bg-blue-50 hover:text-blue-700 ${
                isDarkMode
                  ? "border-blue-400 text-blue-400 hover:bg-blue-900/20 hover:text-blue-300"
                  : ""
              }`}
            >
              View
            </Button>
            <Button
              variant="outline"
              size="sm"
              className={`text-xs border-green-500 text-green-600 hover:bg-green-50 hover:text-green-700 ${
                isDarkMode
                  ? "border-green-400 text-green-400 hover:bg-green-900/20 hover:text-green-300"
                  : ""
              }`}
              onClick={() => { setSelectedInvoice(invoice); setEditModalOpen(true); }}
            >
              Edit
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onExportPDF(invoice)}
            >
              pdf
            </Button>
          </div>
        </td>
      </tr>
      
      {/* Edit Invoice Modal */}
      {editModalOpen && selectedInvoice && (
        <EditInvoice
          open={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          invoice={selectedInvoice}
          onSuccess={() => { setEditModalOpen(false); setSelectedInvoice(null); fetchInvoices(); }}
        />
      )}
    </>
  );
};

export default InvoiceRow;
