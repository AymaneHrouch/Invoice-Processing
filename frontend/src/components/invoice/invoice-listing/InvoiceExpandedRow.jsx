import { useTheme } from '@/contexts';
import { formatDate, formatCurrency } from '@/constants';

const InvoiceExpandedRow = ({ invoice }) => {
  const { isDarkMode } = useTheme();

  return (
    <tr className={isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}>
      <td colSpan="12" className="px-6 py-6">
        <div className="space-y-8">
          <div className="space-y-6">
            <div>
              <h4
                className={`text-lg font-semibold mb-4 pb-2 border-b ${
                  isDarkMode
                    ? 'text-gray-200 border-gray-600'
                    : 'text-gray-800 border-gray-200'
                }`}
              >
                Items
              </h4>
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {invoice.items && invoice.items.length > 0 ? (
                  invoice.items.map((item, index) => (
                    <div
                      key={index}
                      className={`border rounded-lg p-4 transition-shadow hover:shadow-md ${
                        isDarkMode
                          ? 'bg-gray-800 border-gray-600'
                          : 'bg-white border-gray-200'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h5
                          className={`text-sm font-semibold ${
                            isDarkMode ? 'text-gray-200' : 'text-gray-800'
                          }`}
                        >
                          {item.name}
                        </h5>
                        <span className="text-green-600 font-semibold text-sm">
                          {formatCurrency(item.total, invoice.currency)}
                        </span>
                      </div>
                      <p
                        className={`text-sm mb-3 leading-relaxed ${
                          isDarkMode ? 'text-gray-300' : 'text-gray-600'
                        }`}
                      >
                        {item.description}
                      </p>
                      <div
                        className={`space-y-1 text-xs ${
                          isDarkMode ? 'text-gray-400' : 'text-gray-500'
                        }`}
                      >
                        <span className="block">
                          Unit Price:{' '}
                          {formatCurrency(item.unit_price, invoice.currency)}
                        </span>
                        <span className="block">Quantity: {item.quantity}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div
                    className={`col-span-full text-center text-sm italic ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}
                  >
                    No items
                  </div>
                )}
              </div>
            </div>

            <div>
              <h4
                className={`text-lg font-semibold mb-4 pb-2 border-b ${
                  isDarkMode
                    ? 'text-gray-200 border-gray-600'
                    : 'text-gray-800 border-gray-200'
                }`}
              >
                Additional Information
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label
                    className={`text-sm font-medium ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}
                  >
                    Tags:
                  </label>
                  <div className="flex flex-wrap gap-1">
                    {invoice.tags && invoice.tags.length > 0 ? (
                      invoice.tags.map((tag, index) => (
                        <span
                          key={index}
                          className={`inline-block text-xs px-2 py-1 rounded-full ${
                            isDarkMode
                              ? 'bg-blue-900 text-blue-200'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {tag}
                        </span>
                      ))
                    ) : (
                      <span
                        className={`text-xs italic ${
                          isDarkMode ? 'text-gray-400' : 'text-gray-500'
                        }`}
                      >
                        No tags
                      </span>
                    )}
                  </div>
                </div>
                <div className="space-y-1">
                  <label
                    className={`text-sm font-medium ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}
                  >
                    Due Date:
                  </label>
                  <span
                    className={`text-sm ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}
                  >
                    {invoice.invoice_due_date
                      ? formatDate(invoice.invoice_due_date)
                      : 'No due date'}
                  </span>
                </div>
                <div className="space-y-1">
                  <label
                    className={`text-sm font-medium ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}
                  >
                    Created:
                  </label>
                  <span
                    className={`text-sm ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}
                  >
                    {formatDate(invoice.created_at)}
                  </span>
                </div>
                <div className="space-y-1">
                  <label
                    className={`text-sm font-medium ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}
                  >
                    Updated:
                  </label>
                  <span
                    className={`text-sm ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}
                  >
                    {invoice.updated_at
                      ? formatDate(invoice.updated_at)
                      : 'Never updated'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </td>
    </tr>
  );
};

export default InvoiceExpandedRow;
