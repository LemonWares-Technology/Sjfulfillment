'use client'

import { useState, useRef } from 'react'
import { useApi } from '@/app/lib/use-api'
import { useAuth } from '@/app/lib/auth-context'
import { formatCurrency } from '@/app/lib/utils'
import { DocumentArrowUpIcon, DocumentArrowDownIcon, XMarkIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'

interface ProductRow {
  name: string
  description: string
  category: string
  unitPrice: number
  weight: number
  length?: number
  width?: number
  height?: number
  initialStock?: number
  reorderPoint?: number
  sku?: string
}

interface UploadResult {
  success: boolean
  totalProcessed: number
  successful: number
  failed: number
  errors: string[]
  createdProducts: any[]
}

interface BulkProductUploadProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function BulkProductUpload({ isOpen, onClose, onSuccess }: BulkProductUploadProps) {
  const { user } = useAuth()
  const { post } = useApi()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [previewData, setPreviewData] = useState<ProductRow[]>([])

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setUploadResult(null)
      previewFile(file)
    }
  }

  const previewFile = async (file: File) => {
    try {
      const text = await file.text()
      const lines = text.split('\n').filter(line => line.trim())
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
      
      const data: ProductRow[] = []
      for (let i = 1; i < Math.min(lines.length, 11); i++) { // Preview first 10 rows
        const values = lines[i].split(',').map(v => v.trim())
        if (values.length >= headers.length) {
          const row: any = {}
          headers.forEach((header, index) => {
            row[header] = values[index] || ''
          })
          
          data.push({
            name: row['product name'] || row['name'] || '',
            description: row['description'] || '',
            category: row['category'] || '',
            unitPrice: parseFloat(row['unit price'] || row['price'] || '0'),
            weight: parseFloat(row['weight'] || '0'),
            length: row['length'] ? parseFloat(row['length']) : undefined,
            width: row['width'] ? parseFloat(row['width']) : undefined,
            height: row['height'] ? parseFloat(row['height']) : undefined,
            initialStock: row['initial stock'] ? parseInt(row['initial stock']) : 0,
            reorderPoint: row['reorder point'] ? parseInt(row['reorder point']) : 0,
            sku: row['sku'] || ''
          })
        }
      }
      
      setPreviewData(data)
    } catch (error) {
      console.error('Error previewing file:', error)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) return

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('type', 'bulk-products')

      const token = localStorage.getItem('token')
      const response = await fetch('/api/products/bulk-upload', {
        method: 'POST',
        headers: {
          ...(token && { Authorization: `Bearer ${token}` })
        },
        body: formData
      })

      const result: UploadResult = await response.json()
      console.log('Upload result:', result) // Debug log

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed')
      }

      setUploadResult(result)
      if (result.success && result.successful > 0) {
        onSuccess()
      }
    } catch (error) {
      console.error('Upload error:', error)
      setUploadResult({
        success: false,
        totalProcessed: 0,
        successful: 0,
        failed: 0,
        errors: ['Upload failed. Please try again.']
      })
    } finally {
      setIsUploading(false)
    }
  }

  const resetUpload = () => {
    setSelectedFile(null)
    setUploadResult(null)
    setPreviewData([])
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const downloadTemplate = () => {
    const csvContent = `Product Name,Description,Category,Unit Price,Weight,Length,Width,Height,Initial Stock,Reorder Point,SKU
iPhone 15 Pro,Latest iPhone with advanced features,Electronics,150000,200,15,7,0.8,50,10,IPHONE15PRO
Samsung Galaxy S24,High-end Android smartphone,Electronics,120000,180,16,7.5,0.8,30,5,SAMSUNG24
MacBook Air M3,Lightweight laptop for professionals,Electronics,800000,1200,30,21,1.5,20,3,MACBOOKAIR
Nike Air Max,Comfortable running shoes,Footwear,25000,300,30,12,10,100,20,NIKEAIRMAX
Adidas Ultraboost,Premium running shoes,Footwear,30000,350,31,13,11,80,15,ADIDASUB`

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'bulk-products-template.csv'
    a.click()
    window.URL.revokeObjectURL(url)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Bulk Product Upload</h2>
              <p className="text-sm text-gray-600 mt-1">
                Upload a CSV file to create multiple products at once
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {!uploadResult ? (
            <>
              {/* File Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select CSV File
                </label>
                <div className="flex items-center space-x-4">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileSelect}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100"
                  />
                  <button
                    onClick={downloadTemplate}
                    className="flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
                    Download Template
                  </button>
                </div>
              </div>

              {/* Preview */}
              {previewData.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Preview (First 10 rows)</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Weight</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {previewData.map((row, index) => (
                          <tr key={index}>
                            <td className="px-3 py-2 text-sm text-gray-900">{row.name}</td>
                            <td className="px-3 py-2 text-sm text-gray-900">{row.category}</td>
                            <td className="px-3 py-2 text-sm text-gray-900">{formatCurrency(row.unitPrice)}</td>
                            <td className="px-3 py-2 text-sm text-gray-900">{row.weight}g</td>
                            <td className="px-3 py-2 text-sm text-gray-900">{row.initialStock || 0}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Upload Button */}
              {selectedFile && (
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={resetUpload}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Reset
                  </button>
                  <button
                    onClick={handleUpload}
                    disabled={isUploading}
                    className="flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 disabled:opacity-50"
                  >
                    {isUploading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Uploading...
                      </>
                    ) : (
                      <>
                        <DocumentArrowUpIcon className="h-4 w-4 mr-2" />
                        Upload Products
                      </>
                    )}
                  </button>
                </div>
              )}
            </>
          ) : (
            /* Results */
            <div className="space-y-4">
              <div className={`p-4 rounded-lg ${uploadResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                <div className="flex items-center">
                  {uploadResult.success ? (
                    <CheckCircleIcon className="h-5 w-5 text-green-400 mr-2" />
                  ) : (
                    <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mr-2" />
                  )}
                  <h3 className={`text-lg font-medium ${uploadResult.success ? 'text-green-800' : 'text-red-800'}`}>
                    Upload {uploadResult.success ? 'Completed' : 'Failed'}
                  </h3>
                </div>
                <div className="mt-2 text-sm">
                  <p className={uploadResult.success ? 'text-green-700' : 'text-red-700'}>
                    Processed: {uploadResult.totalProcessed} | 
                    Successful: {uploadResult.successful} | 
                    Failed: {uploadResult.failed}
                  </p>
                </div>
              </div>

              {uploadResult.errors && uploadResult.errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-red-800 mb-2">Errors:</h4>
                  <ul className="text-sm text-red-700 space-y-1">
                    {uploadResult.errors.map((error, index) => (
                      <li key={index}>• {error}</li>
                    ))}
                  </ul>
                </div>
              )}

              {uploadResult.createdProducts && uploadResult.createdProducts.length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-green-800 mb-2">Created Products:</h4>
                  <ul className="text-sm text-green-700 space-y-1">
                    {uploadResult.createdProducts.slice(0, 10).map((product, index) => (
                      <li key={index}>• {product.name} (SKU: {product.sku})</li>
                    ))}
                    {uploadResult.createdProducts.length > 10 && (
                      <li>... and {uploadResult.createdProducts.length - 10} more</li>
                    )}
                  </ul>
                </div>
              )}

              <div className="flex justify-end space-x-3">
                <button
                  onClick={resetUpload}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Upload Another File
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-amber-600 hover:bg-amber-700"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
