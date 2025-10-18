'use client'

import { useAuth } from '@/app/lib/auth-context'
import DashboardLayout from '@/app/components/dashboard-layout'
import { useApi } from '@/app/lib/use-api'
import { useEffect, useState } from 'react'
import { formatDateTime } from '@/app/lib/utils'
import { DocumentTextIcon } from '@heroicons/react/24/outline'
import SearchBar from '@/app/components/search-bar'
import FilterSelect from '@/app/components/filter-select'

interface AuditLog {
  id: string
  action: string
  entityType: string
  entityId: string
  oldValues: Record<string, any> | null
  newValues: Record<string, any> | null
  ipAddress: string
  userAgent: string
  createdAt: string
  user: {
    id: string
    firstName: string
    lastName: string
    email: string
    role: string
  }
}

export default function AuditLogsPage() {
  const { user } = useAuth()
  const { get, loading } = useApi()
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [actionFilter, setActionFilter] = useState('ALL')
  const [entityTypeFilter, setEntityTypeFilter] = useState('ALL')

  useEffect(() => {
    fetchAuditLogs()
  }, [])

  const fetchAuditLogs = async () => {
    try {
      const data = await get<AuditLog[]>('/api/audit-logs', { silent: true })
      setAuditLogs(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Failed to fetch audit logs:', error)
      setAuditLogs([])
    }
  }

  const getActionColor = (action: string) => {
    switch (action) {
      case 'CREATE':
        return 'bg-green-100 text-green-800'
      case 'UPDATE':
        return 'bg-blue-100 text-blue-800'
      case 'DELETE':
        return 'bg-red-100 text-red-800'
      case 'LOGIN':
        return 'bg-purple-100 text-purple-800'
      case 'LOGOUT':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-yellow-100 text-yellow-800'
    }
  }

  const filteredLogs = (auditLogs || []).filter(log => {
    const matchesSearch = log.user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.entityType.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.action.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesAction = actionFilter === 'ALL' || log.action === actionFilter
    const matchesEntityType = entityTypeFilter === 'ALL' || log.entityType === entityTypeFilter
    
    return matchesSearch && matchesAction && matchesEntityType
  })

  return (
    <DashboardLayout userRole="SJFS_ADMIN">
      <div className="px-4 py-6 sm:px-0">
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
                <h1 className="text-3xl font-bold text-[#f08c17]">Audit Logs</h1>
                <p className="mt-2 text-white">
                  Track all system activities and changes
                </p>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <SearchBar
                placeholder="Search by user, action, or entity..."
                value={searchTerm}
                onChange={setSearchTerm}
              />
            </div>
            <div className="sm:w-48">
              <FilterSelect
                options={[
                  { value: 'CREATE', label: 'Create' },
                  { value: 'UPDATE', label: 'Update' },
                  { value: 'DELETE', label: 'Delete' },
                  { value: 'LOGIN', label: 'Login' },
                  { value: 'LOGOUT', label: 'Logout' }
                ]}
                value={actionFilter}
                onChange={setActionFilter}
                placeholder="All Actions"
              />
            </div>
            <div className="sm:w-48">
              <FilterSelect
                options={[
                  { value: 'User', label: 'User' },
                  { value: 'Product', label: 'Product' },
                  { value: 'Order', label: 'Order' },
                  { value: 'Stock', label: 'Stock' },
                  { value: 'Merchant', label: 'Merchant' },
                  { value: 'Warehouse', label: 'Warehouse' }
                ]}
                value={entityTypeFilter}
                onChange={setEntityTypeFilter}
                placeholder="All Entities"
              />
            </div>
          </div>
        </div>

        {/* Audit Logs Table */}
        <div className="bg-white/30 shadow overflow-hidden sm:rounded-[5px]">
          <div className="px-4 py-5 sm:p-6">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-white/30">
                <thead className="bg-[#f08c17]">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                      Action
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                      Entity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                      Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                      IP Address
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                      Timestamp
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white/30 divide-y divide-white/30">
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-white/40">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-white">
                            {log.user.firstName} {log.user.lastName}
                          </div>
                          <div className="text-sm text-white/80">
                            {log.user.email}
                          </div>
                          <div className="text-xs text-white/60">
                            {log.user.role.replace('_', ' ')}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getActionColor(log.action)}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-white">
                            {log.entityType}
                          </div>
                          <div className="text-sm text-white/80">
                            ID: {log.entityId}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-white max-w-xs">
                          {log.newValues && Object.keys(log.newValues).length > 0 && (
                            <div className="mb-1">
                              <span className="font-medium">Changed:</span>
                              <div className="text-xs text-white/80 mt-1">
                                {Object.keys(log.newValues).slice(0, 3).map(key => (
                                  <div key={key}>
                                    {key}: {String(log.newValues![key]).substring(0, 30)}
                                    {String(log.newValues![key]).length > 30 ? '...' : ''}
                                  </div>
                                ))}
                                {Object.keys(log.newValues).length > 3 && (
                                  <div className="text-white/60">+{Object.keys(log.newValues).length - 3} more</div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-white/80">
                        {log.ipAddress}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-white/80">
                        {formatDateTime(log.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {filteredLogs.length === 0 && (
              <div className="text-center py-8">
                <DocumentTextIcon className="mx-auto h-12 w-12 text-[#f08c17]" />
                <h3 className="mt-2 text-sm font-medium text-white">No audit logs found</h3>
                <p className="mt-1 text-sm text-white/80">
                  System activities will appear here.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
