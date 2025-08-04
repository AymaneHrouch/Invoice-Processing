import { categories, InvoiceStatus } from '@/constants';

export const generateMockData = (fileName) => {
  const mockItems = [
    {
      name: 'Professional Services',
      description: 'Consulting hours',
      quantity: 10,
      unit_price: '150.00',
    },
    {
      name: 'Software License',
      description: 'Annual subscription',
      quantity: 1,
      unit_price: '299.00',
    },
  ];

  return {
    fileName,
    supplier: 'ACME Corporation',
    invoice_number: `INV-${Math.floor(Math.random() * 10000)}`,
    amount: '1799.00',
    currency: 'EUR',
    date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0],
    category: categories[Math.floor(Math.random() * categories.length)],
    items: mockItems,
    tags: ['business', 'service', 'urgent'],
    extractedText: `Invoice from ACME Corporation\nAmount: €1,799.00\nDate: ${new Date().toLocaleDateString()}\nServices provided...`,
    status: InvoiceStatus.COMPLETED,
  };
};
