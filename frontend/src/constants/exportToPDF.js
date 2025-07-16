import jsPDF from "jspdf";
import autotable from "jspdf-autotable";
import { formatDate, formatCurrency } from ".";
export const exportToPDF = (invoice) => {
  const doc = new jsPDF();

  // Title
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("INVOICE", 105, 20, { align: "center" });

  // Divider line
  doc.setDrawColor(150);
  doc.setLineWidth(0.5);
  doc.line(20, 25, 190, 25);

  // Left Column – Invoice Details
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(`Invoice Number: ${invoice.invoice_number || "N/A"}`, 20, 35);
  doc.text(
    `Date: ${invoice.invoice_date ? formatDate(invoice.invoice_date) : "N/A"}`,
    20,
    42
  );
  doc.text(
    `Due Date: ${invoice.due_date ? formatDate(invoice.due_date) : "N/A"}`,
    20,
    49
  );
  doc.text(`Status: ${invoice.status || "N/A"}`, 20, 56);

  // Right Column – From (Vendor)
  doc.setFont("helvetica", "bold");
  doc.text("From:", 140, 35);
  doc.setFont("helvetica", "normal");
  doc.text(invoice.vendor_name || "Vendor Name", 140, 42);
  if (invoice.vendor_email) doc.text(invoice.vendor_email, 140, 49);

  // Prepare table data
  const tableData =
    invoice.items?.map((item, index) => [
      index + 1,
      item.name || "Service",
      item.description || "",
      item.quantity || 1,
      formatCurrency(item.unit_price, invoice.currency),
      formatCurrency(item.total, invoice.currency),
    ]) || [];

  // Generate table
  autotable(doc, {
    head: [["N°", "Item", "Description", "Qty", "Unit Price", "Total"]],
    body: tableData,
    startY: 115,
    headStyles: {
      fillColor: [66, 139, 202],
      textColor: 255,
      fontSize: 10,
      fontStyle: "bold",
    },
    bodyStyles: {
      fontSize: 11,
      cellPadding: 4,
    },
    columnStyles: {
      0: { cellWidth: 15, halign: "center" }, // N°
      1: { cellWidth: 40 }, // Item
      2: { cellWidth: 45 }, // Description
      3: { cellWidth: 15, halign: "center" }, // Qty
      4: { cellWidth: 35, halign: "right" }, // Unit Price
      5: { cellWidth: 35, halign: "right" }, // Total
    },
    margin: { left: 10, right: 10 },
  });

  // Add total
  const finalY = doc.lastAutoTable.finalY || 115;
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(
    `TOTAL: ${formatCurrency(invoice.total_amount, invoice.currency)}`,
    165,
    finalY + 20,
    { align: "right" }
  );

  // Add notes if available
  if (invoice.notes) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Notes:", 20, finalY + 35);
    doc.setFont("helvetica", "normal");
    const noteLines = doc.splitTextToSize(invoice.notes, 170);
    doc.text(noteLines, 20, finalY + 45);
  }

  // Add footer
  const footerY = invoice.notes ? finalY + 65 : finalY + 35;
  doc.setFontSize(8);
  doc.setFont("helvetica", "italic");
  doc.text("Generated on: " + new Date().toLocaleString(), 20, footerY);

  // Save the PDF
  const fileName = `invoice_${invoice.invoice_number}.pdf`;
  doc.save(fileName);
};
