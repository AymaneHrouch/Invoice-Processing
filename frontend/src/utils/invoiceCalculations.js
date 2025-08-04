export const calculateItemTotal = (quantity, unitPrice) => {
  const qty = parseFloat(quantity) || 0;
  const price = parseFloat(unitPrice) || 0;
  return (qty * price).toFixed(2);
};

export const calculateInvoiceTotal = (items) => {
  return items
    .reduce((total, item) => {
      return (
        total +
        (parseFloat(calculateItemTotal(item.quantity, item.unit_price)) || 0)
      );
    }, 0)
    .toFixed(2);
};
