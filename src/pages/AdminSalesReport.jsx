// deno-lint-ignore-file
import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient.js";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function AdminSalesReport() {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterSoldBy, setFilterSoldBy] = useState("");
  const [timeFilter, setTimeFilter] = useState("");

  // Fetch sales data
  const fetchSales = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("sales")
      .select("*")
      .order("date", { ascending: false });

    if (error) {
      console.error("Error fetching sales:", error);
    } else {
      setSales(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSales();
  }, []);

  // Filters
  const filteredBySoldBy = filterSoldBy
    ? sales.filter((s) => s.sold_by === filterSoldBy)
    : sales;

  const filteredSales = filteredBySoldBy.filter((s) => {
    if (!timeFilter) return true;
    const saleDate = new Date(s.date);
    const now = new Date();

    switch (timeFilter) {
      case "Daily":
        return saleDate.toDateString() === now.toDateString();
      case "Weekly": {
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        return saleDate >= startOfWeek && saleDate <= endOfWeek;
      }
      case "Monthly":
        return (
          saleDate.getMonth() === now.getMonth() &&
          saleDate.getFullYear() === now.getFullYear()
        );
      case "Yearly":
        return saleDate.getFullYear() === now.getFullYear();
      default:
        return true;
    }
  });

  // Computations
  const computeSubtotal = (sale) => {
    const qty = parseFloat(sale.quantity || 0);
    const price = parseFloat(sale.price || 0);
    const subtotal = parseFloat(sale.subtotal || 0);
    return subtotal > 0 ? subtotal : qty * price;
  };

  const computeTotalSales = (sale) => {
    const subtotal = computeSubtotal(sale);
    const shipping = parseFloat(sale.shipping_fee || 0);
    return subtotal + shipping;
  };

  const computeProfit = (sale) => {
    const subtotal = computeSubtotal(sale);
    const cost = parseFloat(sale.cost || 0);
    return subtotal - cost;
  };

  const totalSales = filteredSales.reduce(
    (sum, s) => sum + computeTotalSales(s),
    0
  );
  const totalProfit = filteredSales.reduce(
    (sum, s) => sum + computeProfit(s),
    0
  );
  const totalItemsSold = filteredSales.reduce(
    (sum, s) => sum + parseFloat(s.quantity || 0),
    0
  );

  // Generate PDF
  const downloadPDF = () => {
    try {
      const doc = new jsPDF("p", "pt");
      doc.setFontSize(18);
      doc.text("Sales Report", 40, 40);
      doc.setFontSize(11);
      doc.setTextColor(100);

      const tableColumn = [
        "#",
        "Product",
        "Qty",
        "Price",
        "Subtotal",
        "Shipping Fee",
        "Total Sales",
        "Profit",
        "Payment",
        "Sold By",
        "Date",
      ];

      const tableRows = filteredSales.map((s, idx) => [
        idx + 1,
        s.product_name || "",
        parseFloat(s.quantity || 0),
        parseFloat(s.price || 0).toFixed(2),
        computeSubtotal(s).toFixed(2),
        parseFloat(s.shipping_fee || 0).toFixed(2),
        computeTotalSales(s).toFixed(2),
        computeProfit(s).toFixed(2),
        s.payment_method || "",
        s.sold_by || "",
        new Date(s.date).toLocaleString(),
      ]);

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 60,
        theme: "grid",
        styles: { fontSize: 10, cellPadding: 4 },
        headStyles: { fillColor: [76, 175, 80], textColor: 255 },
      });

      // Summary placement with page break handling
      const pageHeight = doc.internal.pageSize.height;
      const finalY = doc.lastAutoTable?.finalY || 60;
      const spaceNeeded = 60;
      if (finalY + spaceNeeded > pageHeight) {
        doc.addPage();
        doc.setFontSize(12);
        doc.text("Summary", 40, 50);
        doc.text(`Items Sold: ${totalItemsSold}`, 40, 70);
        doc.text(`Total Sales: ${totalSales.toFixed(2)}`, 40, 90);
        doc.text(`Total Profit: ${totalProfit.toFixed(2)}`, 40, 110);
      } else {
        doc.setFontSize(12);
        const summaryY = finalY + 30;
        doc.text("Summary", 40, summaryY);
        doc.text(`Items Sold: ${totalItemsSold}`, 40, summaryY + 20);
        doc.text(`Total Sales: ${totalSales.toFixed(2)}`, 40, summaryY + 40);
        doc.text(`Total Profit: ${totalProfit.toFixed(2)}`, 40, summaryY + 60);
      }

      doc.save("Sales_Report.pdf");
    } catch (err) {
      console.error("PDF download error:", err);
      alert("Failed to download PDF.");
    }
  };

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">📊 Sales Report</h2>
        <button
          onClick={downloadPDF}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          📄 Download PDF
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-4">
        <select
          value={filterSoldBy}
          onChange={(e) => setFilterSoldBy(e.target.value)}
          className="border p-2 rounded w-full md:w-1/4"
        >
          <option value="">All Sold</option>
          <option value="On Store">On Store</option>
          <option value="Online">Online</option>
        </select>

        <select
          value={timeFilter}
          onChange={(e) => setTimeFilter(e.target.value)}
          className="border p-2 rounded w-full md:w-1/4"
        >
          <option value="">All Time</option>
          <option value="Weekly">Weekly</option>
          <option value="Monthly">Monthly</option>
          <option value="Yearly">Yearly</option>
        </select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mt-6 mb-6">
        <div className="bg-blue-300 p-4 rounded shadow text-center">
          <h3 className="font-bold text-lg text-blue-700">Items Sold</h3>
          <p className="text-2xl">{totalItemsSold}</p>
        </div>
        <div className="bg-green-300 p-4 rounded shadow text-center">
          <h3 className="font-bold text-lg text-green-700">Total Sales</h3>
          <p className="text-2xl">{totalSales.toFixed(2)}</p>
        </div>
        <div className="bg-yellow-300 p-4 rounded shadow text-center">
          <h3 className="font-bold text-lg text-yellow-700">Total Profit</h3>
          <p className="text-2xl">{totalProfit.toFixed(2)}</p>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border rounded-lg shadow">
        <table className="w-full text-sm border table-fixed">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 border w-12">#</th>
              <th className="p-2 border w-32">Product</th>
              <th className="p-2 border w-20">Qty</th>
              <th className="p-2 border w-24">Price</th>
              <th className="p-2 border w-24">Subtotal</th>
              <th className="p-2 border w-24">Shipping Fee</th>
              <th className="p-2 border w-24">Total Sales</th>
              <th className="p-2 border w-24">Profit</th>
              <th className="p-2 border w-24">Payment</th>
              <th className="p-2 border w-24">Sold By</th>
              <th className="p-2 border w-32">Date</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={11} className="p-4 text-center">
                  Loading sales...
                </td>
              </tr>
            ) : filteredSales.length === 0 ? (
              <tr>
                <td colSpan={11} className="p-4 text-center">
                  No sales found.
                </td>
              </tr>
            ) : (
              filteredSales.map((s, idx) => {
                const subtotal = computeSubtotal(s);
                const totalSalesRow = computeTotalSales(s);
                const profit = computeProfit(s);
                return (
                  <tr key={s.id}>
                    <td className="p-2 border text-center">{idx + 1}</td>
                    <td className="p-2 border">{s.product_name}</td>
                    <td className="p-2 border text-center">{s.quantity}</td>
                    <td className="p-2 border text-right">
                      {parseFloat(s.price).toFixed(2)}
                    </td>
                    <td className="p-2 border text-right">
                      {subtotal.toFixed(2)}
                    </td>
                    <td className="p-2 border text-right">
                      {parseFloat(s.shipping_fee || 0).toFixed(2)}
                    </td>
                    <td className="p-2 border text-right">
                      {totalSalesRow.toFixed(2)}
                    </td>
                    <td className="p-2 border text-right">
                      {profit.toFixed(2)}
                    </td>
                    <td className="p-2 border text-center">
                      {s.payment_method}
                    </td>
                    <td className="p-2 border text-center">{s.sold_by}</td>
                    <td className="p-2 border">
                      {new Date(s.date).toLocaleString()}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
