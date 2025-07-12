import { FileText, LayoutDashboard, List, Plus } from "lucide-react";

export const currencies = ["EUR", "USD", "GBP", "JPY", "CAD", "AUD", "CHF"];

export const categories = [
  "Services",
  "Matériel",
  "Logiciel",
  "Voyage",
  "Marketing",
  "Utilities",
  "Autres",
];

export const calculateItemTotal = (quantity, unitPrice) => {
  return (quantity * unitPrice).toFixed(2);
};

export const sidebarItems = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    path: "/dashboard",
  },
  {
    id: "invoices",
    label: "Invoices",
    icon: FileText,
    hasChildren: true,
    children: [
      {
        id: "list-invoices",
        label: "List",
        icon: List,
        path: "/invoices/list",
      },
      {
        id: "add-invoice",
        label: "Add",
        icon: Plus,
        path: "/invoices/add",
      },
    ],
  },
];
export const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

export const formatCurrency = (amount, currency = "USD") => {
  // Handle null/undefined amounts
  if (amount === null || amount === undefined || isNaN(amount)) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(0);
  }
  const currencyLocaleMap = {
    USD: "en-US",
    EUR: "de-DE",
    GBP: "en-GB",
    JPY: "ja-JP",
    CAD: "en-CA",
    AUD: "en-AU",
    CHF: "de-CH",
    CNY: "zh-CN",
    INR: "en-IN",
    BRL: "pt-BR",
    KRW: "ko-KR",
    SGD: "en-SG",
    HKD: "en-HK",
    SEK: "sv-SE",
    NOK: "nb-NO",
    DKK: "da-DK",
    PLN: "pl-PL",
    CZK: "cs-CZ",
    HUF: "hu-HU",
    RUB: "ru-RU",
    TRY: "tr-TR",
    ZAR: "en-ZA",
    MXN: "es-MX",
    ARS: "es-AR",
    CLP: "es-CL",
    COP: "es-CO",
    PEN: "es-PE",
    UYU: "es-UY",
  };

  const locale = currencyLocaleMap[currency.toUpperCase()] || "en-US";

  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currency.toUpperCase(),
      minimumFractionDigits:
        currency.toUpperCase() === "JPY" || currency.toUpperCase() === "KRW"
          ? 0
          : 2,
      maximumFractionDigits:
        currency.toUpperCase() === "JPY" || currency.toUpperCase() === "KRW"
          ? 0
          : 2,
    }).format(Number(amount));
  } catch (error) {
    // Fallback to USD formatting if currency is not supported
    console.warn(`Currency ${currency} not supported, falling back to USD`);
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(Number(amount));
  }
};

export const getCategoryColor = (category) => {
  const colors = {
    Software: "#3b82f6",
    Hardware: "#10b981",
    "Professional Services": "#f59e0b",
    Consulting: "#8b5cf6",
  };
  return colors[category] || "#6b7280";
};

export const getSourceIcon = (sourceType) => {
  const icons = {
    pdf: "📄",
    email: "📧",
    image: "🖼️",
  };
  return icons[sourceType] || "📄";
};