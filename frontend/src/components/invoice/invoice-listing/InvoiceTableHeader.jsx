import { useTheme } from "@/contexts";

const InvoiceTableHeader = () => {
  const { isDarkMode } = useTheme();

  return (
    <thead className={isDarkMode ? "bg-gray-700" : "bg-gray-50"}>
      <tr>
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
          Exported
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
