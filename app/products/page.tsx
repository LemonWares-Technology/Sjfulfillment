"use client";

import { useAuth } from "@/app/lib/auth-context";
import DashboardLayout from "@/app/components/dashboard-layout";
import { useApi } from "@/app/lib/use-api";
import { useEffect, useState } from "react";
import { formatCurrency, formatDate } from "@/app/lib/utils";
import { PlusIcon, PencilIcon, TrashIcon, CheckIcon, XMarkIcon, ArrowDownTrayIcon, DocumentArrowUpIcon } from "@heroicons/react/24/outline";
import SearchBar from "@/app/components/search-bar";
import FilterSelect from "@/app/components/filter-select";
import ProductModal from "@/app/components/product-modal";
import BulkOperationsModal from "@/app/components/bulk-operations-modal";
import BulkProductUpload from "@/app/components/bulk-product-upload";
import ExportModal from "@/app/components/export-modal";
import ServiceGate from "@/app/components/service-gate";
import Pagination from "@/app/components/pagination";
import Image from "next/image";

interface Product {
  id: string;
  name: string;
  sku: string;
  description: string;
  unitPrice: number;
  category: string;
  weight: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
  } | string;
  isActive: boolean;
  createdAt: string;
  images?: string[];
  merchant: {
    businessName: string;
  };
  stockItems?: {
    id: string;
    quantity: number;
    availableQuantity: number;
    warehouse: {
      id: string;
      name: string;
    };
  }[];
}

export default function ProductsPage() {
  const { user } = useAuth();
  const { get, delete: deleteProduct, loading } = useApi();
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [itemsPerPage] = useState(10);

  useEffect(() => {
    fetchProducts();
  }, []);

  // Refetch when filters change
  useEffect(() => {
    if (currentPage === 1) {
      fetchProducts(1);
    } else {
      setCurrentPage(1);
    }
  }, [searchTerm, categoryFilter, statusFilter]);

  const fetchProducts = async (page: number = currentPage) => {
    try {
      // Build query parameters
      const params = new URLSearchParams({
        page: page.toString(),
        limit: itemsPerPage.toString()
      });

      if (searchTerm) params.append('search', searchTerm);
      if (categoryFilter !== 'ALL') params.append('category', categoryFilter);
      if (statusFilter !== 'ALL') params.append('isActive', statusFilter === 'ACTIVE' ? 'true' : 'false');

      console.log('Fetching products with params:', params.toString());
      const response = await get<{ products: Product[], pagination: any }>(
        `/api/products?${params.toString()}`
      );
      console.log('Products response:', response);

      if (response?.products) {
        setProducts(Array.isArray(response.products) ? response.products : []);
      } else {
        setProducts([]);
      }

      // Update pagination info
      if (response?.pagination) {
        setTotalPages(response.pagination.pages || 1);
        setTotalItems(response.pagination.total || 0);
        setCurrentPage(response.pagination.page || 1);
      }
    } catch (error) {
      console.error("Failed to fetch products:", error);
      setProducts([]);
    }
  };

  const handleDelete = async (productId: string) => {
    if (confirm("Are you sure you want to delete this product?")) {
      try {
        await deleteProduct(`/api/products/${productId}`);
        // Refresh the products list to ensure UI is updated
        fetchProducts(currentPage);
      } catch (error) {
        console.error("Failed to delete product:", error);
        alert("Failed to delete product. Please try again.");
      }
    }
  };

  const handleAddProduct = () => {
    setEditingProduct(null);
    setShowProductModal(true);
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setShowProductModal(true);
  };

  const handleCloseModal = () => {
    setShowProductModal(false);
    setEditingProduct(null);
  };

  const handleSaveProduct = () => {
    fetchProducts(1); // Refresh products after save, go to first page
  };

  const getTotalAvailableStock = (product: Product) => {
    if (!product.stockItems || product.stockItems.length === 0) return 0;
    return product.stockItems.reduce((total, stock) => total + stock.availableQuantity, 0);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchProducts(page);
  };

  // const handlePreviousPage = () => {
  //   if (currentPage > 1) {
  //     handlePageChange(currentPage - 1);
  //   }
  // };

  // const handleNextPage = () => {
  //   if (currentPage < totalPages) {
  //     handlePageChange(currentPage + 1);
  //   }
  // };

  const handleSelectProduct = (productId: string) => {
    setSelectedProducts(prev =>
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(filteredProducts.map(p => p.id));
    }
    setSelectAll(!selectAll);
  };

  const handleBulkOperation = () => {
    if (selectedProducts.length === 0) return;
    setShowBulkModal(true);
  };

  const handleBulkComplete = () => {
    setSelectedProducts([]);
    setSelectAll(false);
    fetchProducts(1); // Go to first page to see all products
  };

  // No need for client-side filtering since we're doing server-side filtering
  const filteredProducts = products || [];



  // Get unique categories for filter
  const categories = Array.from(new Set(products.map(p => p.category))).map(cat => ({
    value: cat,
    label: cat
  }));

  return (
    <DashboardLayout userRole={user?.role || "MERCHANT_ADMIN"}>
      <div className="px-4 py-6 sm:px-0">
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-white">Products</h1>
              <p className="mt-2 text-white">Manage your product catalog</p>
            </div>
            <div className="flex space-x-3">
              {selectedProducts.length > 0 && (
                <button
                  onClick={handleBulkOperation}
                  className="bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-white px-4 py-2 rounded-[5px] flex items-center"
                >
                  <CheckIcon className="h-5 w-5 mr-2" />
                  Bulk Actions ({selectedProducts.length})
                </button>
              )}
              <button
                onClick={() => setShowBulkUpload(true)}
                className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-4 py-2 rounded-[5px] flex items-center"
              >
                <DocumentArrowUpIcon className="h-5 w-5 mr-2" />
                Bulk Upload
              </button>
              <button
                onClick={() => fetchProducts(1)}
                className="border-2 border-blue-500 text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-[5px] flex items-center"
              >
                <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>
              <button
                onClick={() => setShowExportModal(true)}
                className="border-2 border-amber-500 text-amber-600 hover:bg-amber-50 px-4 py-2 rounded-[5px] flex items-center"
              >
                <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
                Export
              </button>
              <ServiceGate serviceName="Inventory Management">
                <button
                  onClick={handleAddProduct}
                  className="bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-white px-4 py-2 rounded-[5px] flex items-center"
                >
                  <PlusIcon className="h-5 w-5 mr-2" />
                  Add Product
                </button>
              </ServiceGate>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <SearchBar
                placeholder="Search products by name, SKU, or description..."
                value={searchTerm}
                onChange={setSearchTerm}
              />
            </div>
            <div className="sm:w-48">
              <FilterSelect
                options={categories}
                value={categoryFilter}
                onChange={setCategoryFilter}
                placeholder="All Categories"
              />
            </div>
            <div className="sm:w-48">
              <FilterSelect
                options={[
                  { value: "ACTIVE", label: "Active" },
                  { value: "INACTIVE", label: "Inactive" }
                ]}
                value={statusFilter}
                onChange={setStatusFilter}
                placeholder="All Status"
              />
            </div>
          </div>
        </div>

        {/* Products Table */}
        <div className="bg-white/30 shadow overflow-hidden sm:rounded-[5px]">
          <div className="px-4 py-5 sm:p-6">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-white/30 rounded-[5px]">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                      <input
                        type="checkbox"
                        checked={selectAll}
                        onChange={handleSelectAll}
                        className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                      Product
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                      SKU
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                      Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                      Available Stock
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white/50 divide-y divide-gray-200">
                  {filteredProducts.map((product) => (
                    <tr key={product.id} className="">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedProducts.includes(product.id)}
                          onChange={() => handleSelectProduct(product.id)}
                          className="rounded-[5px] border-gray-300 text-amber-600 focus:ring-amber-500"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {product.images && product.images.length > 0 ? (
                            <div className="flex-shrink-0 h-12 w-12 mr-4">
                              <Image
                                height={48}
                                width={48}
                                loading="lazy"
                                className="h-12 w-12 rounded-[5px] object-cover"
                                src={product.images[0]}
                                alt={product.name}
                              />
                            </div>
                          ) : (
                            <div className="flex-shrink-0 h-12 w-12 mr-4 bg-gray-200 rounded-[5px] flex items-center justify-center">
                              <span className="text-gray-400 text-xs">No Image</span>
                            </div>
                          )}
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {product.name}
                            </div>
                            <div className="text-sm text-gray-900">
                              {product.description}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {product.sku}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(product.unitPrice)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {product.category}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {getTotalAvailableStock(product)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${product.isActive
                            ? "bg-amber-100 text-amber-800"
                            : "bg-gray-100 text-gray-800"
                            }`}
                        >
                          {product.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(product.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEditProduct(product)}
                            className="text-amber-600 hover:text-amber-900"
                          >
                            <PencilIcon className="h-4 w-4 text-white" />
                          </button>
                          <button
                            onClick={() => handleDelete(product.id)}
                            className="text-white"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredProducts.length === 0 && (
              <div className="text-center py-8">
                <p className="text-white">No products found</p>
              </div>
            )}

            {/* Pagination */}
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              itemsPerPage={itemsPerPage}
              onPageChange={handlePageChange}
            />
          </div>
        </div>

        {/* Product Modal */}
        <ProductModal
          isOpen={showProductModal}
          onClose={handleCloseModal}
          product={editingProduct}
          onSave={handleSaveProduct}
        />

        {/* Bulk Operations Modal */}
        <BulkOperationsModal
          isOpen={showBulkModal}
          onClose={() => setShowBulkModal(false)}
          operation={{
            type: 'products',
            action: '',
            selectedItems: selectedProducts
          }}
          onComplete={handleBulkComplete}
        />

        {/* Bulk Product Upload Modal */}
        <BulkProductUpload
          isOpen={showBulkUpload}
          onClose={() => setShowBulkUpload(false)}
          onSuccess={() => {
            fetchProducts(1) // Reset to page 1 and refresh
            setShowBulkUpload(false)
          }}
        />

        {/* Export Modal */}
        <ExportModal
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
          type="products"
          selectedItems={selectedProducts.length > 0 ? selectedProducts : undefined}
          filters={{
            category: categoryFilter !== 'ALL' ? categoryFilter : undefined,
            status: statusFilter !== 'ALL' ? statusFilter : undefined
          }}
        />
      </div>
    </DashboardLayout>
  );
}
