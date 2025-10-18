'use client'

import { useState, useRef } from 'react'
import { useApi } from '@/app/lib/use-api'
import { formatCurrency } from '@/app/lib/utils'
import { DocumentArrowUpIcon, XMarkIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'

interface BulkOrderUploadProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

interface OrderRow {
  customerName: string
  customerEmail: string
  customerPhone: string
  productSku: string
  quantity: number
  unitPrice?: number
  notes?: string
}

interface UploadResult {
  success: boolean
  totalProcessed: number
  successful: number
  failed: number
  errors: string[]
  createdOrders: any[]
}

export default function BulkOrderUpload({ isOpen, onClose, onSuccess }: BulkOrderUploadProps) {
  const { post, loading } = useApi()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [previewData, setPreviewData] = useState<OrderRow[]>([])

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
      
      const data: OrderRow[] = []
      for (let i = 1; i < Math.min(lines.length, 11); i++) { // Preview first 10 rows
        const values = lines[i].split(',').map(v => v.trim())
        if (values.length >= headers.length) {
          const row: any = {}
          headers.forEach((header, index) => {
            row[header] = values[index] || ''
          })
          
          data.push({
            customerName: row['customer name'] || row['name'] || '',
            customerEmail: row['customer email'] || row['email'] || '',
            customerPhone: row['customer phone'] || row['phone'] || '',
            productSku: row['product sku'] || row['sku'] || '',
            quantity: parseInt(row['quantity'] || '0'),
            unitPrice: parseFloat(row['unit price'] || row['price'] || '0'),
            notes: row['notes'] || row['description'] || ''
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
      formData.append('type', 'bulk-orders')

      const token = localStorage.getItem('token')
      const response = await fetch('/api/orders/bulk-upload', {
        method: 'POST',
        headers: {
          ...(token && { Authorization: `Bearer ${token}` })
        },
        body: formData
      })

      const result: UploadResult = await response.json()

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
    const csvContent = `Customer Name,Customer Email,Customer Phone,Product SKU,Quantity,Unit Price,Notes
John Doe,john@example.com,+2348012345678,PROD001,2,5000.00,Urgent delivery
Jane Smith,jane@example.com,+2348023456789,PROD002,1,7500.00,Standard delivery
Mike Johnson,mike@example.com,+2348034567890,PROD003,3,3000.00,Express delivery`

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'bulk-orders-template.csv'
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
              <h2 className="text-xl font-semibold text-gray-900">Bulk Order Upload</h2>
              <p className="text-sm text-gray-600 mt-1">
                Upload a CSV file to create multiple orders at once
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

        <div className="p-6">
          {!uploadResult ? (
            <>
              {/* File Upload Section */}
              <div className="mb-6">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <DocumentArrowUpIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Upload CSV File
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Select a CSV file with order data or drag and drop it here
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-amber-600 text-white px-6 py-2 rounded-md hover:bg-amber-700"
                  >
                    Choose File
                  </button>
                  <p className="text-sm text-gray-500 mt-2">
                    Maximum file size: 10MB
                  </p>
                </div>

                {selectedFile && (
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-blue-900">{selectedFile.name}</p>
                        <p className="text-sm text-blue-700">
                          {(selectedFile.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                      <button
                        onClick={resetUpload}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <XMarkIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Template Download */}
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-3">CSV Template</h3>
                <p className="text-gray-600 mb-3">
                  Download our template to ensure your CSV file has the correct format:
                </p>
                <button
                  onClick={downloadTemplate}
                  className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center"
                >
                  <DocumentArrowUpIcon className="h-5 w-5 mr-2" />
                  Download Template
                </button>
              </div>

              {/* Preview Section */}
              {previewData.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Preview (First 10 rows)</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {previewData.map((row, index) => (
                          <tr key={index}>
                            <td className="px-3 py-2 text-sm text-gray-900">{row.customerName}</td>
                            <td className="px-3 py-2 text-sm text-gray-900">{row.customerEmail}</td>
                            <td className="px-3 py-2 text-sm text-gray-900">{row.customerPhone}</td>
                            <td className="px-3 py-2 text-sm text-gray-900">{row.productSku}</td>
                            <td className="px-3 py-2 text-sm text-gray-900">{row.quantity}</td>
                            <td className="px-3 py-2 text-sm text-gray-900">{formatCurrency(row.unitPrice)}</td>
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
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpload}
                    disabled={isUploading}
                    className="px-6 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 disabled:opacity-50 flex items-center"
                  >
                    {isUploading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Uploading...
                      </>
                    ) : (
                      <>
                        <DocumentArrowUpIcon className="h-5 w-5 mr-2" />
                        Upload Orders
                      </>
                    )}
                  </button>
                </div>
              )}
            </>
          ) : (
            /* Results Section */
            <div className="text-center">
              {uploadResult.success ? (
                <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto mb-4" />
              ) : (
                <ExclamationTriangleIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
              )}
              
              <h3 className={`text-xl font-semibold mb-2 ${
                uploadResult.success ? 'text-green-900' : 'text-red-900'
              }`}>
                {uploadResult.success ? 'Upload Successful!' : 'Upload Failed'}
              </h3>
              
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{uploadResult.totalProcessed}</p>
                    <p className="text-sm text-gray-600">Total Processed</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-600">{uploadResult.successful}</p>
                    <p className="text-sm text-gray-600">Successful</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-red-600">{uploadResult.failed}</p>
                    <p className="text-sm text-gray-600">Failed</p>
                  </div>
                </div>
              </div>

              {uploadResult.errors && uploadResult.errors.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-medium text-gray-900 mb-2">Errors:</h4>
                  <div className="bg-red-50 rounded-lg p-3 max-h-32 overflow-y-auto">
                    {uploadResult.errors.map((error, index) => (
                      <p key={index} className="text-sm text-red-700">{error}</p>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-center space-x-3">
                <button
                  onClick={resetUpload}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Upload Another File
                </button>
                <button
                  onClick={onClose}
                  className="px-6 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
