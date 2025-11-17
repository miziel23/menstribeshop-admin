// deno-lint-ignore-file
import React, { useState } from "react";
import { supabase } from "../lib/supabaseClient.js";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function AdminProducts({ products, fetchProducts, sendProductNotification }) {
  const [showProductModal, setShowProductModal] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
  const [stockProduct, setStockProduct] = useState(null);
  const [stockAmount, setStockAmount] = useState("");
  const [loadingProductSave, setLoadingProductSave] = useState(false);
  const [loadingStockSave, setLoadingStockSave] = useState(false);

  const [newProduct, setNewProduct] = useState({
    id: null,
    name: "",
    description: "",
    price: "",
    stock: "",
    category: "Hair Product",
    weight: "",
    imageFile: null,
    image_url: ""
  });

  const LOW_STOCK_THRESHOLD = 5;
  const categories = ["Hair Product", "Perfume", "Hair Cutting Tool"];

  // 📸 File Change
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setNewProduct({ ...newProduct, imageFile: e.target.files[0] });
    }
  };

  // ✨ Open Product Modal
  const openProductModal = (product = null) => {
    if (product) {
      setNewProduct({ ...product, imageFile: null });
    } else {
      setNewProduct({
        id: null,
        name: "",
        description: "",
        price: "",
        stock: "",
        category: "Hair Product",
        weight: "",
        imageFile: null,
        image_url: ""
      });
    }
    setShowProductModal(true);
  };

  // 🗑 Delete Product
  const deleteProduct = async (id) => {
    if (!window.confirm("Are you sure you want to delete this product?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) alert("Failed to delete product");
    else fetchProducts();
  };

  // 🆙 Open Stock Modal
  const openStockModal = (product) => {
    setStockProduct(product);
    setStockAmount("");
    setShowStockModal(true);
  };

  // 🆙 Save Stock (numeric-only) with loading
  const saveStock = async () => {
    if (loadingStockSave) return;
    setLoadingStockSave(true);

    if (!stockAmount || isNaN(stockAmount) || parseInt(stockAmount) <= 0) {
      alert("Please enter a valid number greater than 0");
      setLoadingStockSave(false);
      return;
    }

    const newStock = parseInt(stockProduct.stock) + parseInt(stockAmount);

    const { error } = await supabase
      .from("products")
      .update({ stock: newStock })
      .eq("id", stockProduct.id);

    if (error) {
      console.error(error);
      alert("Failed to update stock.");
    } else {
      await sendProductNotification(`📦 Stock updated for "${stockProduct.name}". New stock: ${newStock}`);
      fetchProducts();
      alert(`✅ Stock updated. Current stock: ${newStock}`);
      setShowStockModal(false);
    }

    setLoadingStockSave(false);
  };

  // ☁️ Upload Image
  const uploadImage = async () => {
    try {
      if (!newProduct.imageFile) return newProduct.image_url;

      const ext = newProduct.imageFile.name.split(".").pop();
      const fileName = `${Date.now()}.${ext}`;
      const filePath = `uploads/${fileName}`;

      const blob = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(new Blob([reader.result], { type: newProduct.imageFile.type }));
        reader.onerror = reject;
        reader.readAsArrayBuffer(newProduct.imageFile);
      });

      const { error } = await supabase.storage.from("product-images").upload(filePath, blob, { upsert: true });
      if (error) throw error;

      const { data } = supabase.storage.from("product-images").getPublicUrl(filePath);
      return data.publicUrl;
    } catch (error) {
      console.error("Image upload error:", error.message);
      alert("Image upload failed");
      return null;
    }
  };

  // 💾 Save Product with loading
  const saveProduct = async () => {
    if (loadingProductSave) return;
    setLoadingProductSave(true);

    const { id, name, description, price, stock, category, weight } = newProduct;
    if (!name || !price || !stock || !category || !weight) {
      alert("Please fill all fields");
      setLoadingProductSave(false);
      return;
    }

    const imageUrl = await uploadImage();
    if (!imageUrl) {
      setLoadingProductSave(false);
      return;
    }

    const payload = {
      name,
      description,
      price: parseFloat(price),
      stock: parseInt(stock, 10),
      category,
      weight,
      image_url: imageUrl
    };

    try {
      let action = "";
      let notifMessage = "";

      if (id) {
        await supabase.from("products").update(payload).eq("id", id);
        action = "updated";
        notifMessage = `✏️ Product "${name}" has been updated.`;
      } else {
        await supabase.from("products").insert([payload]);
        action = "added";
        notifMessage = `🛍️ New product alert! "${name}" is now available with ${stock} in stock.`;
      }

      await sendProductNotification(notifMessage);

      alert(`Product successfully ${action}!`);
      fetchProducts();
      setShowProductModal(false);
      setNewProduct({
        id: null,
        name: "",
        description: "",
        price: "",
        stock: "",
        category: "Hair Product",
        weight: "",
        imageFile: null,
        image_url: ""
      });
    } catch (error) {
      console.error(error);
      alert("An unexpected error occurred.");
    } finally {
      setLoadingProductSave(false);
    }
  };

  const downloadProductsPDF = () => {
    try {
      const doc = new jsPDF("p", "pt", "a4");
      doc.setFontSize(14);
      doc.text("Products List", 40, 40);

      const tableColumn = ["Name", "Description", "Category", "Weight", "Price", "Stock"];
      const tableRows = [];

      products.forEach((product) => {
        tableRows.push([
          product.name,
          product.description || "",
          product.category,
          product.weight || "",
          `PHP ${product.price}`,
          product.stock.toString(),
        ]);
      });

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 60,
        styles: {
          fontSize: 10,
          cellPadding: 4,
          overflow: "linebreak",
          valign: "top",
        },
        columnStyles: {
          0: { cellWidth: 100 },
          1: { cellWidth: 150 },
          2: { cellWidth: 100 },
          3: { cellWidth: 50 },
          4: { cellWidth: 60 },
          5: { cellWidth: 50 },
        },
        headStyles: { fillColor: [76, 175, 80], textColor: 255 },
        tableWidth: "auto",
        willDrawCell: (data) => {
          if (data.column.index === 5 && parseInt(data.cell.raw) <= LOW_STOCK_THRESHOLD) {
            data.cell.styles.fillColor = [255, 200, 200];
          }
        },
      });

      doc.save("products.pdf");
    } catch (err) {
      console.error("PDF download error:", err);
      alert("Failed to download PDF.");
    }
  };

  // 🚫 Prevent non-numeric input
  const handleNumberInput = (e, field) => {
    const value = e.target.value;
    if (/^\d*\.?\d*$/.test(value)) {
      setNewProduct({ ...newProduct, [field]: value });
    }
  };

  return (
    <div className="p-4">
      <div className="flex justify-between mb-4">
        <h2 className="text-2xl font-bold">📋 Products List</h2>
        <div className="flex items-center gap-2 px-3 py-2 rounded-md">
          <div className="w-4 h-4 bg-red-200 border border-red-400 rounded-sm"></div>
          <span className="text-sm font-bold text-gray-700">Low Stock</span>
        </div>
        <div>
          <button
            className="bg-green-600 text-white px-4 py-2 rounded mr-2"
            onClick={() => openProductModal()}
          >
            Add Product
          </button>
          <button
            className="bg-blue-600 text-white px-4 py-2 rounded"
            onClick={downloadProductsPDF}
          >
            📄 Download PDF
          </button>
        </div>
      </div>

      {/* ✅ Products Table */}
      <div className="overflow-x-auto border rounded-lg shadow">
        <table className="w-full text-sm border table-fixed">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 border w-20">Image</th>
              <th className="p-2 border w-36">Name</th>
              <th className="p-2 border w-64">Description</th>
              <th className="p-2 border w-32">Category</th>
              <th className="p-2 border w-24">Weight</th>
              <th className="p-2 border w-24">Price</th>
              <th className="p-2 border w-24">Stock</th>
              <th className="p-2 border w-36">Action</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr
                key={p.id}
                className={`${p.stock <= LOW_STOCK_THRESHOLD ? "bg-red-200" : ""}`}
              >
                <td className="p-2 border text-center align-top">
                  <img
                    src={p.image_url}
                    alt={p.name}
                    className="w-10 h-10 object-cover rounded mx-auto"
                  />
                </td>
                <td className="p-2 border align-top break-words">{p.name}</td>
                <td className="p-2 border align-top break-words whitespace-normal">{p.description}</td>
                <td className="p-2 border align-top break-words">{p.category}</td>
                <td className="p-2 border align-top">{p.weight}</td>
                <td className="p-2 border align-top">PHP {p.price}</td>
                <td className="p-2 border align-top">{p.stock}</td>
                <td className="p-2 border align-middle">
                  <div className="flex justify-center items-center gap-2">
                    <button
                      title="Add Stock"
                      onClick={() => openStockModal(p)}
                      className="px-2 py-1 bg-green-500 rounded text-white hover:bg-green-600"
                    >
                      ➕
                    </button>
                    <button
                      title="Edit Product"
                      onClick={() => openProductModal(p)}
                      className="px-2 py-1 bg-yellow-400 rounded text-white hover:bg-yellow-500"
                    >
                      ✏️
                    </button>
                    <button
                      title="Delete Product"
                      onClick={() => deleteProduct(p.id)}
                      className="px-2 py-1 bg-red-500 rounded text-white hover:bg-red-600"
                    >
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 🪄 Product Modal */}
      {showProductModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded shadow-md w-96">
            <h3 className="text-lg font-bold mb-4">
              {newProduct.id ? "Edit Product" : "Add Product"}
            </h3>
            <input
              className="border p-2 w-full mb-2"
              placeholder="Name"
              value={newProduct.name}
              onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
            />
            <textarea
              className="border p-2 w-full mb-2 h-24 resize-none"
              placeholder="Description"
              value={newProduct.description}
              onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
            />
            <input
              type="text"
              inputMode="decimal"
              className="border p-2 w-full mb-2"
              placeholder="Price"
              value={newProduct.price}
              onChange={(e) => handleNumberInput(e, "price")}
            />
            {newProduct.id ? (
              <input
                type="text"
                className="border p-2 w-full mb-2 bg-gray-100 text-gray-700"
                value={newProduct.stock}
                readOnly
              />
            ) : (
              <input
                type="text"
                inputMode="numeric"
                className="border p-2 w-full mb-2"
                placeholder="Stock"
                value={newProduct.stock}
                onChange={(e) => handleNumberInput(e, "stock")}
              />
            )}
            <select
              className="border p-2 w-full mb-2"
              value={newProduct.category}
              onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <input
              type="text"
              className="border p-2 w-full mb-3"
              placeholder={`Weight (${newProduct.category === "Perfume" ? "ml" : "g"})`}
              value={newProduct.weight}
              onChange={(e) => setNewProduct({ ...newProduct, weight: e.target.value })}
            />
            <input type="file" onChange={handleFileChange} className="mb-3" />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowProductModal(false)}
                className="px-4 py-2 bg-gray-300 rounded"
                disabled={loadingProductSave}
              >
                Cancel
              </button>
              <button
                onClick={saveProduct}
                className="px-4 py-2 bg-green-600 text-white rounded flex items-center justify-center gap-2"
                disabled={loadingProductSave}
              >
                {loadingProductSave && <span className="loader-border h-4 w-4 border-2 border-white rounded-full animate-spin"></span>}
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🪄 Stock Modal */}
      {showStockModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded shadow-md w-80">
            <h3 className="text-lg font-bold mb-4">
              Add Stock for "{stockProduct?.name}"
            </h3>
            <input
              type="number"
              min="1"
              value={stockAmount}
              onChange={(e) => setStockAmount(e.target.value)}
              className="border p-2 w-full mb-4"
              placeholder="Enter quantity"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowStockModal(false)}
                className="px-4 py-2 bg-gray-300 rounded"
                disabled={loadingStockSave}
              >
                Cancel
              </button>
              <button
                onClick={saveStock}
                className="px-4 py-2 bg-green-600 text-white rounded flex items-center justify-center gap-2"
                disabled={loadingStockSave}
              >
                {loadingStockSave && <span className="loader-border h-4 w-4 border-2 border-white rounded-full animate-spin"></span>}
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Spinner CSS */}
      <style>{`
        .loader-border {
          border-top-color: transparent;
        }
      `}</style>
    </div>
  );
}
