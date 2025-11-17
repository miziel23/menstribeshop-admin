import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import "./index.css";

import Dashboard from "./pages/Dashboard.jsx";
import AdminOrders from "./pages/AdminOrders.jsx";
import Login from "./pages/Login.jsx";
import AdminProducts from "./pages/AdminProducts.jsx";
import AdminSalesReport from "./pages/AdminSalesReport.jsx";
import AdminDiscounts from ".//pages/AdminDiscounts.jsx";
import AdminPaymentOptions from "./pages/AdminPaymentOptions.jsx";
import AdminSellProducts from "./pages/AdminSellProducts.jsx";
import Account from "./pages/Account.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Router>
      <Routes>
         <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/orders" element={<AdminOrders />} />   {/* ✅ Orders page */}
        <Route path="/products" element={<AdminProducts />} /> {/* ✅ Products page */}
        <Route path="/sales-report" element={<AdminSalesReport />} /> {/* ✅ Sales Report page */}
        <Route path="/discounts" element={<AdminDiscounts />} /> {/* ✅ Discounts page */}
        <Route path="/payment-options" element={<AdminPaymentOptions />} /> {/* ✅ Payment Options page */}
        <Route path="/sell-products" element={<AdminSellProducts />} /> {/* 🛍️ Sell Products page */}
        <Route path="/account" element={<Account />} /> {/* 👤 Account/Profile page */}
      </Routes>
    </Router>
  </React.StrictMode>
);
