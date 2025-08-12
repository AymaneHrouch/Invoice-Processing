import {
  File,
  FileText,
  Image,
  LayoutDashboard,
  List,
  Mail,
  Plus,
  UserPen,
} from 'lucide-react';

export const currencies = [
  'MAD',
  'EUR',
  'USD',
  'GBP',
  'JPY',
  'CAD',
  'AUD',
  'CHF',
];

export const categories = [
  'Services',
  'Equipment',
  'Software',
  'Travel',
  'Marketing',
  'Utilities',
  'Others',
];

export const InvoiceStatus = {
  DRAFT: 'Draft',
  SENT: 'Sent',
  VIEWED: 'Viewed',
  PAID: 'Paid',
  OVERDUE: 'Overdue',
  CANCELLED: 'Cancelled',
  COMPLETED: 'Completed',
};

export const calculateItemTotal = (quantity, unitPrice) => {
  return (quantity * unitPrice).toFixed(2);
};

export const sidebarItems = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    path: '/dashboard',
  },
  {
    id: 'invoices',
    label: 'Invoices',
    icon: FileText,
    hasChildren: true,
    children: [
      {
        id: 'list-invoices',
        label: 'List',
        icon: List,
        path: '/invoices/list',
      },
      {
        id: 'add-invoice',
        label: 'Add',
        icon: Plus,
        path: '/invoices/add',
      },
    ],
  },
];
export const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const formatCurrency = (amount, currency = 'USD') => {
  // Handle null/undefined amounts
  if (amount === null || amount === undefined || isNaN(amount)) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(0);
  }
  const currencyLocaleMap = {
    USD: 'en-US',
    EUR: 'de-DE',
    GBP: 'en-GB',
    JPY: 'ja-JP',
    CAD: 'en-CA',
    AUD: 'en-AU',
    CHF: 'de-CH',
    CNY: 'zh-CN',
    INR: 'en-IN',
    BRL: 'pt-BR',
    KRW: 'ko-KR',
    SGD: 'en-SG',
    HKD: 'en-HK',
    SEK: 'sv-SE',
    NOK: 'nb-NO',
    DKK: 'da-DK',
    PLN: 'pl-PL',
    CZK: 'cs-CZ',
    HUF: 'hu-HU',
    RUB: 'ru-RU',
    TRY: 'tr-TR',
    ZAR: 'en-ZA',
    MXN: 'es-MX',
    ARS: 'es-AR',
    CLP: 'es-CL',
    COP: 'es-CO',
    PEN: 'es-PE',
    UYU: 'es-UY',
  };

  const locale = currencyLocaleMap[currency.toUpperCase()] || 'en-US';

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency.toUpperCase(),
      minimumFractionDigits:
        currency.toUpperCase() === 'JPY' || currency.toUpperCase() === 'KRW'
          ? 0
          : 2,
      maximumFractionDigits:
        currency.toUpperCase() === 'JPY' || currency.toUpperCase() === 'KRW'
          ? 0
          : 2,
    }).format(Number(amount));
  } catch (error) {
    // Fallback to USD formatting if currency is not supported
    console.warn(`Currency ${currency} not supported, falling back to USD`);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(Number(amount));
  }
};

export const getCategoryColor = (category) => {
  const colors = {
    Services: '#3b82f6', // bleu
    Equipment: '#10b981', // vert
    Software: '#6366f1', // indigo
    Travel: '#f59e0b', // orange
    Marketing: '#ec4899', // rose
    Utilities: '#f43f5e', // rouge
    Others: '#6b7280', // gris
  };
  return colors[category] || '#6b7280';
};

export const getSourceIcon = (sourceType) => {
  const icons = {
    pdf: <FileText />,
    email: <Mail />,
    image: <Image />,
    manual: <UserPen />,
  };
  return icons[sourceType] || <File />;
};

// Mock data generator for demonstration
export const generateMockData = (fileName) => {
  const mockSuppliers = [
    'Acme Corp',
    'Tech Solutions Ltd',
    'Global Services Inc',
    'Premium Supplies Co',
  ];
  const mockCategories = [
    'Office Supplies',
    'Software',
    'Consulting',
    'Equipment',
    'Marketing',
  ];
  const mockCurrencies = ['EUR', 'USD', 'GBP'];

  const randomSupplier =
    mockSuppliers[Math.floor(Math.random() * mockSuppliers.length)];
  const randomCategory =
    mockCategories[Math.floor(Math.random() * mockCategories.length)];
  const randomCurrency =
    mockCurrencies[Math.floor(Math.random() * mockCurrencies.length)];
  const randomAmount = (Math.random() * 5000 + 100).toFixed(2);
  const randomDate = new Date(
    Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000,
  )
    .toISOString()
    .split('T')[0];
  const randomDueDate = new Date(
    Date.now() + Math.random() * 90 * 24 * 60 * 60 * 1000,
  )
    .toISOString()
    .split('T')[0];
  const invoiceNumber = `INV-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

  const mockItems = [
    {
      name: 'Professional Consulting Services',
      description: 'Monthly consulting and advisory services',
      quantity: 1,
      unit_price: (randomAmount * 0.6).toFixed(2),
      total: (randomAmount * 0.6).toFixed(2),
    },
    {
      name: 'Additional Support',
      description: 'Technical support and maintenance fees',
      quantity: 1,
      unit_price: (randomAmount * 0.4).toFixed(2),
      total: (randomAmount * 0.4).toFixed(2),
    },
  ];

  const mockTags = ['urgent', 'quarterly', 'approved'].slice(
    0,
    Math.floor(Math.random() * 3) + 1,
  );

  return {
    supplier: randomSupplier,
    date: randomDate,
    due_date: randomDueDate,
    amount: randomAmount,
    currency: randomCurrency,
    invoice_number: invoiceNumber,
    category: randomCategory,
    items: mockItems,
    tags: mockTags,
    extractedText: `Invoice from ${randomSupplier}\nDate: ${randomDate}\nDue Date: ${randomDueDate}\nAmount: ${randomAmount} ${randomCurrency}\nInvoice #: ${invoiceNumber}\n\n${mockItems.map((item) => `${item.name}: ${item.quantity} x ${item.unit_price}`).join('\n')}`,
    fileName: fileName,
  };
};
export const SUPPORTED_FILE_TYPES = ['.pdf', '.png', '.jpg', '.jpeg'];
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
