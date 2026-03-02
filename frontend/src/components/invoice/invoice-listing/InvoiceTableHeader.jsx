import { useTheme } from "@/contexts";

const InvoiceTableHeader = ({ showSelect, allSelected, onSelectAll }) => {
  const { isDarkMode } = useTheme();

  return (
    <thead className={isDarkMode ? "bg-gray-700" : "bg-gray-50"}>
      <tr>
        {showSelect && (
          <th
            className={`px-3 py-4 text-center font-semibold border-b w-10 ${
              isDarkMode
                ? "text-gray-300 border-gray-600"
                : "text-gray-600 border-gray-200"
            }`}
          >
            <input
              type="checkbox"
              checked={allSelected}
              onChange={(e) => onSelectAll?.(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              title="Select all"
            />
          </th>
        )}
        <th
          className={`px-3 py-4 text-left font-semibold border-b ${
            isDarkMode
              ? "text-gray-300 border-gray-600"
              : "text-gray-600 border-gray-200"
          }`}
        ></th>
        <th
          className={`px-3 py-4 text-left font-semibold border-b whitespace-nowrap ${
            isDarkMode
              ? "text-gray-300 border-gray-600"
              : "text-gray-600 border-gray-200"
          }`}
        >
          Invoice #
        </th>
        <th
          className={`px-3 py-4 text-left font-semibold border-b whitespace-nowrap ${
            isDarkMode
              ? "text-gray-300 border-gray-600"
              : "text-gray-600 border-gray-200"
          }`}
        >
          Vendor
        </th>
        <th
          className={`px-3 py-4 text-left font-semibold border-b whitespace-nowrap ${
            isDarkMode
              ? "text-gray-300 border-gray-600"
              : "text-gray-600 border-gray-200"
          }`}
        >
          Date
        </th>
        <th
          className={`px-3 py-4 text-left font-semibold border-b whitespace-nowrap w-24 ${
            isDarkMode
              ? "text-gray-300 border-gray-600"
              : "text-gray-600 border-gray-200"
          }`}
        >
          Status
        </th>
        <th
          className={`px-3 py-4 text-left font-semibold border-b whitespace-nowrap ${
            isDarkMode
              ? "text-gray-300 border-gray-600"
              : "text-gray-600 border-gray-200"
          }`}
        >
          Amount
        </th>
        <th
          className={`px-3 py-4 text-left font-semibold border-b whitespace-nowrap w-32 ${
            isDarkMode
              ? "text-gray-300 border-gray-600"
              : "text-gray-600 border-gray-200"
          }`}
        >
          Category
        </th>
        <th
          className={`px-3 py-4 text-left font-semibold border-b whitespace-nowrap ${
            isDarkMode
              ? "text-gray-300 border-gray-600"
              : "text-gray-600 border-gray-200"
          }`}
        >
          Source
        </th>
        <th
          className={`px-3 py-4 text-center font-semibold border-b whitespace-nowrap ${
            isDarkMode
              ? "text-gray-300 border-gray-600"
              : "text-gray-600 border-gray-200"
          }`}
        >
          Direction
        </th>
        <th
          className={`px-3 py-4 text-center font-semibold border-b whitespace-nowrap ${
            isDarkMode
              ? "text-gray-300 border-gray-600"
              : "text-gray-600 border-gray-200"
          }`}
        >
          Paid
        </th>
        <th
          className={`px-3 py-4 text-center font-semibold border-b whitespace-nowrap ${
            isDarkMode
              ? "text-gray-300 border-gray-600"
              : "text-gray-600 border-gray-200"
          }`}
        >
          Exported
        </th>
        <th
          className={`px-3 py-4 text-left font-semibold border-b whitespace-nowrap ${
            isDarkMode
              ? "text-gray-300 border-gray-600"
              : "text-gray-600 border-gray-200"
          }`}
        >
          Actions
        </th>
      </tr>
    </thead>
  );
};

export default InvoiceTableHeader;
