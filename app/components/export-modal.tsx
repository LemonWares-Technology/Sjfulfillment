'use client'

import { useState } from 'react'
import { XMarkIcon, ArrowDownTrayIcon, DocumentIcon, TableCellsIcon } from '@heroicons/react/24/outline'
import { useApi } from '@/app/lib/use-api'
import toast from 'react-hot-toast'

interface ExportModalProps {
  isOpen: boolean
  onClose: () => void
  type: 'products' | 'orders' | 'customers' | 'returns' | 'warehouses'
  selectedItems?: string[]
  filters?: any
  title?: string
}

const EXPORT_FORMATS = [
  { value: 'excel', label: 'Excel (.xlsx)', icon: TableCellsIcon, description: 'Spreadsheet format for data analysis' },
  { value: 'pdf', label: 'PDF (.pdf)', icon: DocumentIcon, description: 'Document format for sharing' },
  { value: 'csv', label: 'CSV (.csv)', icon: TableCellsIcon, description: 'Simple text format for import' }
]

export default function ExportModal({ isOpen, onClose, type, selectedItems = [], filters = {}, title }: ExportModalProps) {
  const { get, loading } = useApi()
  const [selectedFormat, setSelectedFormat] = useState('excel')
  const [includeImages, setIncludeImages] = useState(false)
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  })

  const handleExport = async () => {
    try {
      const params = new URLSearchParams({
        type,
        format: selectedFormat,
        includeImages: includeImages.toString(),
        startDate: dateRange.start,
        endDate: dateRange.end
      })

      // Add selected items if any
      if (selectedItems.length > 0) {
        params.append('itemIds', selectedItems.join(','))
      }

      // Add filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value) {
          params.append(key, value.toString())
        }
      })

      const response = await fetch(`/api/export?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (!response.ok) {
        throw new Error('Export failed')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${type}-export-${dateRange.start}-to-${dateRange.end}.${selectedFormat}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast.success('Export completed successfully!')
      onClose()
    } catch (error) {
      console.error('Export failed:', error)
      toast.error('Export failed. Please try again.')
    }
  }

  const getExportDescription = () => {
    switch (type) {
      case 'products':
        return 'Export product catalog with details, pricing, and inventory information'
      case 'orders':
        return 'Export order data with customer information and order items'
      case 'customers':
        return 'Export customer database with contact information and order history'
      case 'returns':
        return 'Export return requests with status and refund information'
      case 'warehouses':
        return 'Export warehouse and zone information with capacity data'
      default:
        return 'Export data in your preferred format'
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-medium text-gray-900">
              {title || `Export ${type.charAt(0).toUpperCase() + type.slice(1)}`}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <div className="space-y-6">
            {/* Export Description */}
            <div className="p-3 bg-amber-50 rounded-md">
              <p className="text-sm text-amber-800">
                {getExportDescription()}
              </p>
              {selectedItems.length > 0 && (
                <p className="text-sm text-amber-700 mt-1">
                  {selectedItems.length} items selected for export
                </p>
              )}
            </div>

            {/* Date Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date Range
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">From</label>
                  <input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">To</label>
                  <input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Export Format */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Export Format
              </label>
              <div className="space-y-2">
                {EXPORT_FORMATS.map((format) => (
                  <label key={format.value} className="flex items-start space-x-3 p-3 border border-gray-200 rounded-md cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="format"
                      value={format.value}
                      checked={selectedFormat === format.value}
                      onChange={(e) => setSelectedFormat(e.target.value)}
                      className="mt-1 text-amber-600 focus:ring-amber-500"
                    />
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <format.icon className="h-4 w-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-900">{format.label}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{format.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Additional Options */}
            {type === 'products' && (
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="includeImages"
                  checked={includeImages}
                  onChange={(e) => setIncludeImages(e.target.checked)}
                  className="rounded border-gray-300 text-amber-600 focus:ring-amber-500 mr-2"
                />
                <label htmlFor="includeImages" className="text-sm text-gray-700">
                  Include product images (Excel only)
                </label>
              </div>
            )}

            {/* Export Button */}
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={handleExport}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 rounded-md disabled:opacity-50 flex items-center"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Exporting...
                  </>
                ) : (
                  <>
                    <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                    Export
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

