'use client'

import { useState, useEffect } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { useApi } from '@/app/lib/use-api'

interface Product {
  id?: string
  name: string
  sku?: string
  description: string
  unitPrice?: number
  category: string
  weight?: number
  dimensions?: {
    length: number
    width: number
    height: number
  } | string
  isActive: boolean
  images?: string[]
  brand?: string
  hasExpiry?: boolean
  isPerishable?: boolean
  quantity?: number
  stockItems?: {
    id: string
    quantity: number
    availableQuantity: number
    warehouse: {
      id: string
      name: string
    }
  }[]
}

interface ProductModalProps {
  isOpen: boolean
  onClose: () => void
  product?: Product | null
  onSave: () => void
}

export default function ProductModal({ isOpen, onClose, product, onSave }: ProductModalProps) {
  const { post, put, loading } = useApi()
  const [uploadingImages, setUploadingImages] = useState(false)
  const [formData, setFormData] = useState<Product>({
    name: '',
    description: '',
    unitPrice: undefined,
    category: '',
    weight: undefined,
    dimensions: undefined,
    isActive: true,
    images: [],
    brand: '',
    hasExpiry: false,
    isPerishable: false,
    quantity: undefined
  })

  useEffect(() => {
    if (product) {
      // Calculate total available stock from stock items
      const totalStock = product.stockItems?.reduce((total: number, stock: any) => total + stock.availableQuantity, 0) || 0
      
      setFormData({
        id: product.id,
        name: product.name || '',
        sku: product.sku || '',
        description: product.description || '',
        unitPrice: product.unitPrice || undefined,
        category: product.category || '',
        weight: product.weight || undefined,
        dimensions: product.dimensions || undefined,
        isActive: product.isActive !== undefined ? product.isActive : true,
        images: product.images || [],
        brand: product.brand || '',
        hasExpiry: product.hasExpiry || false,
        isPerishable: product.isPerishable || false,
        quantity: totalStock // Always set the actual stock value, even if 0
      })
    } else {
      setFormData({
        name: '',
        description: '',
        unitPrice: undefined,
        category: '',
        weight: undefined,
        dimensions: undefined,
        isActive: true,
        images: [],
        brand: '',
        hasExpiry: false,
        isPerishable: false,
        quantity: undefined
      })
    }
  }, [product])

  const handleImageUpload = async (files: FileList) => {
    setUploadingImages(true)
    try {
      const formData = new FormData()
      
      // Append all files to FormData
      Array.from(files).forEach(file => {
        formData.append('files', file)
      })
      
      const token = localStorage.getItem('token')
      const response = await fetch('/api/upload/image', {
        method: 'POST',
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: formData,
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Upload failed: ${response.status} ${errorText}`)
      }
      
      const result = await response.json()
      
      // Extract URLs from the new response format
      const uploadedUrls = result.data.files
        .filter((file: any) => !file.error) // Filter out failed uploads
        .map((file: any) => file.url)
      
      console.log('Uploaded URLs:', uploadedUrls)
      console.log('Full API response:', result)
      
      setFormData(prev => ({
        ...prev,
        images: [...(prev.images || []), ...uploadedUrls]
      }))
    } catch (error) {
      console.error('Image upload failed:', error)
      alert('Failed to upload images. Please try again.')
    } finally {
      setUploadingImages(false)
    }
  }

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images?.filter((_, i) => i !== index) || []
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      // Prepare form data with proper quantity handling
      const submitData = {
        ...formData,
        quantity: formData.quantity !== undefined ? parseInt(formData.quantity.toString()) : 0
      }
      
      console.log('Submitting product data:', submitData)
      
      if (product?.id) {
        await put(`/api/products/${product.id}`, submitData)
      } else {
        await post('/api/products', submitData)
      }
      onSave()
      onClose()
    } catch (error) {
      console.error('Failed to save product:', error)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-screen overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-medium text-gray-900">
              {product?.id ? 'Edit Product' : 'Add New Product'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Product Information */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Product Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-[5px] focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unit Price (₦)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.unitPrice || ''}
                  onChange={(e) => setFormData({...formData, unitPrice: e.target.value ? parseFloat(e.target.value) : undefined})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-[5px] focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="Enter price"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Stock Quantity
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.quantity !== undefined ? formData.quantity : ''}
                  onChange={(e) => setFormData({...formData, quantity: e.target.value ? parseInt(e.target.value) : 0})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-[5px] focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="Enter quantity"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-[5px] focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-[5px] focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">Select Category</option>
                  <option value="Electronics">Electronics</option>
                  <option value="Clothing">Clothing</option>
                  <option value="Food">Food</option>
                  <option value="Books">Books</option>
                  <option value="Health">Health</option>
                  <option value="Beauty">Beauty</option>
                  <option value="Sports">Sports</option>
                  <option value="Home">Home</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Brand
                </label>
                <input
                  type="text"
                  value={formData.brand}
                  onChange={(e) => setFormData({...formData, brand: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-[5px] focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Weight (kg)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.weight || ''}
                  onChange={(e) => setFormData({...formData, weight: e.target.value ? parseFloat(e.target.value) : undefined})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-[5px] focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="Enter weight"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dimensions (L x W x H cm)
                </label>
                <input
                  type="text"
                  placeholder="e.g., 20 x 15 x 10"
                  value={typeof formData.dimensions === 'string' ? formData.dimensions : 
                         formData.dimensions ? `${formData.dimensions.length} x ${formData.dimensions.width} x ${formData.dimensions.height}` : ''}
                  onChange={(e) => {
                    const value = e.target.value
                    // Parse dimensions from string format "L x W x H"
                    if (value && value.includes('x')) {
                      const parts = value.split('x').map(p => parseFloat(p.trim()))
                      if (parts.length === 3 && parts.every(p => !isNaN(p) && p > 0)) {
                        setFormData({...formData, dimensions: {length: parts[0], width: parts[1], height: parts[2]}})
                      } else {
                        setFormData({...formData, dimensions: value})
                      }
                    } else {
                      setFormData({...formData, dimensions: value || undefined})
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-[5px] focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>


            <div className="space-y-2">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.hasExpiry || false}
                  onChange={(e) => setFormData({...formData, hasExpiry: e.target.checked})}
                  className="rounded border-gray-300 text-amber-600 focus:ring-amber-500 mr-2"
                />
                <label className="text-sm text-gray-700">Has Expiry Date</label>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.isPerishable || false}
                  onChange={(e) => setFormData({...formData, isPerishable: e.target.checked})}
                  className="rounded border-gray-300 text-amber-600 focus:ring-amber-500 mr-2"
                />
                <label className="text-sm text-gray-700">Perishable</label>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
                  className="rounded border-gray-300 text-amber-600 focus:ring-amber-500 mr-2"
                />
                <label className="text-sm text-gray-700">Active</label>
              </div>
            </div>

            {/* Image Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Product Images
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => e.target.files && handleImageUpload(e.target.files)}
                  className="hidden"
                  id="image-upload"
                />
                <label
                  htmlFor="image-upload"
                  className="cursor-pointer flex flex-col items-center"
                >
                  <svg className="h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                    <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <p className="mt-2 text-sm text-gray-600">
                    {uploadingImages ? 'Uploading...' : 'Click to upload images'}
                  </p>
                </label>
              </div>

              {/* Display uploaded images */}
              {formData.images && formData.images.length > 0 && (
                <div className="mt-4 grid grid-cols-3 gap-4">
                  {formData.images.map((image, index) => (
                    <div key={index} className="relative">
                      <img
                        src={image}
                        alt={`Product ${index + 1}`}
                        className="w-full h-24 object-cover rounded border"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 pt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-[5px]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || uploadingImages}
                className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 rounded-[5px] disabled:opacity-50"
              >
                {loading ? 'Saving...' : (product?.id ? 'Update Product' : 'Create Product')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}