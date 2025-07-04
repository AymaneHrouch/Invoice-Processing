import { FileText, LayoutDashboard, List, Plus } from "lucide-react";

export const currencies = ['EUR', 'USD', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF'];

export const categories = ['Services', 'Matériel', 'Logiciel', 'Voyage', 'Marketing', 'Utilities', 'Autres'];

export const calculateItemTotal = (quantity, unitPrice) => {
  return (quantity * unitPrice).toFixed(2);
};

export const sidebarItems = [
  { 
    id: 'dashboard', 
    label: 'Dashboard', 
    icon: LayoutDashboard,
    path: '/dashboard'
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
        path: '/invoices/list'
      },
      { 
        id: 'add-invoice', 
        label: 'Add', 
        icon: Plus,
        path: '/invoices/add'
      }
    ]
  }
];
