'use client'

import { useAuth } from '@/app/lib/auth-context'
import DashboardLayout from '@/app/components/dashboard-layout'
import { useApi } from '@/app/lib/use-api'
import { useEffect, useState } from 'react'
import { formatDate } from '@/app/lib/utils'
import { PlusIcon, PencilIcon, TrashIcon, UserIcon } from '@heroicons/react/24/outline'
import SearchBar from '@/app/components/search-bar'
import FilterSelect from '@/app/components/filter-select'
import ServiceGate from '@/app/components/service-gate'

interface StaffMember {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  role: string
  isActive: boolean
  emailVerified: string
  createdAt: string
}

interface NewStaffData {
  firstName: string
  lastName: string
  email: string
  phone: string
  role: string
  password: string
}

export default function StaffManagementPage() {
  const { user } = useAuth()
  const { get, post, put, delete: deleteStaff, loading } = useApi()
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('ALL')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newStaffData, setNewStaffData] = useState<NewStaffData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: 'MERCHANT_STAFF',
    password: ''
  })

  useEffect(() => {
    fetchStaff()
  }, [])

  const fetchStaff = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await get<{users: StaffMember[]}>('/api/users', { silent: true, cache: true, cacheTTL: 2 * 60 * 1000 })
      // The API already filters by merchant for MERCHANT_ADMIN, so we just need to filter by role
      const allUsers = response?.users || []
      setStaff(allUsers.filter(member => 
        member.role === 'MERCHANT_STAFF' || member.role === 'MERCHANT_ADMIN'
      ))
    } catch (error) {
      console.error('Failed to fetch staff:', error)
      setError('Failed to load staff members. Please try again.')
      setStaff([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddStaff = async () => {
    try {
      await post('/api/users', {
        ...newStaffData,
        merchantId: user?.merchantId
      })
      setShowAddModal(false)
      setNewStaffData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        role: 'MERCHANT_STAFF',
        password: ''
      })
      fetchStaff()
    } catch (error) {
      console.error('Failed to add staff member:', error)
    }
  }

  const handleUpdateStaff = async () => {
    if (!editingStaff || !editingStaff.id) {
      console.error('No staff member selected or missing ID')
      return
    }
    
    try {
      await put(`/api/users/${editingStaff.id}`, {
        firstName: editingStaff.firstName,
        lastName: editingStaff.lastName,
        email: editingStaff.email,
        phone: editingStaff.phone,
        role: editingStaff.role,
        isActive: editingStaff.isActive
      })
      setEditingStaff(null)
      fetchStaff()
    } catch (error) {
      console.error('Failed to update staff member:', error)
    }
  }

  const handleDeactivateStaff = async (staffId: string) => {
    if (confirm('Are you sure you want to deactivate this staff member?')) {
      try {
        await deleteStaff(`/api/users/${staffId}`)
        fetchStaff()
      } catch (error) {
        console.error('Failed to deactivate staff member:', error)
      }
    }
  }

  const filteredStaff = (staff || []).filter(member => {
    const matchesSearch = member.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         member.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         member.email.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesRole = roleFilter === 'ALL' || member.role === roleFilter
    
    return matchesSearch && matchesRole
  })

  return (
    <DashboardLayout userRole="MERCHANT_ADMIN">
      <div className="px-4 py-6 sm:px-0">
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-[#f08c17]">Staff Management</h1>
              <p className="mt-2 text-white/90">
                Manage your team members and their access
              </p>
            </div>
            <ServiceGate serviceName="Staff Management">
              <button
                onClick={() => setShowAddModal(true)}
                className="bg-gradient-to-r from-[#f08c17] to-orange-400 hover:from-orange-500 hover:to-orange-400 text-white px-4 py-2 rounded-[5px] flex items-center shadow-md"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Add Staff Member
              </button>
            </ServiceGate>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <SearchBar
                placeholder="Search staff by name or email..."
                value={searchTerm}
                onChange={setSearchTerm}
              />
            </div>
            <div className="sm:w-48">
              <FilterSelect
                options={[
                  { value: 'MERCHANT_ADMIN', label: 'Admin' },
                  { value: 'MERCHANT_STAFF', label: 'Staff' }
                ]}
                value={roleFilter}
                onChange={setRoleFilter}
                placeholder="All Roles"
                className="bg-white/20 text-white/90 border-none rounded-[5px]"
              />
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="bg-white/30 shadow-lg backdrop-blur-md overflow-hidden sm:rounded-[5px]">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#f08c17] mx-auto mb-4"></div>
                  <p className="text-white/90">Loading staff members...</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-white/30 shadow-lg backdrop-blur-md overflow-hidden sm:rounded-[5px]">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                    <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-[#f08c17] mb-2">Error Loading Staff</h3>
                  <p className="text-white/90 mb-4">{error}</p>
                  <button
                    onClick={fetchStaff}
                    className="bg-gradient-to-r from-[#f08c17] to-orange-400 hover:from-orange-500 hover:to-orange-400 text-white px-4 py-2 rounded-[5px]"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Staff Table */}
        {!isLoading && !error && (
          <div className="bg-white/30 shadow-lg backdrop-blur-md overflow-hidden sm:rounded-[5px]">
            <div className="px-4 py-5 sm:p-6">
              <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-white/30">
                <thead className="bg-gradient-to-r from-[#f08c17] to-orange-400">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
                      Staff Member
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
                      Joined
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white/10 divide-y divide-white/20">
                  {filteredStaff.map((member) => (
                    <tr key={member.id} className="hover:bg-white/20 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                            <UserIcon className="h-6 w-6 text-[#f08c17]" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-semibold text-white/90">
                              {member.firstName} {member.lastName}
                            </div>
                            <div className="text-sm text-white/70">
                              {member.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-white/90">{member.email}</div>
                        <div className="text-sm text-white/70">{member.phone}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          member.role === 'MERCHANT_ADMIN' 
                            ? 'bg-purple-100 text-purple-800' 
                            : 'bg-blue-100 text-blue-800'
                        } bg-white/20`}> 
                          {member.role === 'MERCHANT_ADMIN' ? 'Admin' : 'Staff'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          member.isActive 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        } bg-white/20`}>
                          {member.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-white/70">
                        {formatDate(member.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => setEditingStaff(member)}
                            className="text-[#f08c17] hover:text-orange-400 bg-white/20 rounded-full p-1 transition-colors"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          {member.id !== user?.id && (
                            <button
                              onClick={() => handleDeactivateStaff(member.id)}
                              className="text-red-400 hover:text-red-300 bg-white/20 rounded-full p-1"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {filteredStaff.length === 0 && (
              <div className="text-center py-12">
                <UserIcon className="mx-auto h-12 w-12 text-[#f08c17]" />
                <h3 className="mt-2 text-sm font-medium text-white/90">No staff members found</h3>
                <p className="mt-1 text-sm text-white/70">
                  {searchTerm || roleFilter !== 'ALL' 
                    ? 'Try adjusting your search or filter criteria.'
                    : 'Get started by adding your first team member.'
                  }
                </p>
                {(!searchTerm && roleFilter === 'ALL') && (
                  <div className="mt-4">
                    <ServiceGate serviceName="Staff Management">
                      <button
                        onClick={() => setShowAddModal(true)}
                        className="bg-gradient-to-r from-[#f08c17] to-orange-400 hover:from-orange-500 hover:to-orange-400 text-white px-4 py-2 rounded-[5px] flex items-center mx-auto"
                      >
                        <PlusIcon className="h-4 w-4 mr-2" />
                        Add Staff Member
                      </button>
                    </ServiceGate>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        )}

        {/* Add Staff Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
            <div className="bg-white/90 rounded-lg shadow-xl max-w-md w-full backdrop-blur-md">
              <div className="p-6">
                <h2 className="text-lg font-bold text-[#f08c17] mb-4">Add Staff Member</h2>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[#f08c17] mb-1">
                        First Name
                      </label>
                      <input
                        type="text"
                        value={newStaffData.firstName}
                        onChange={(e) => setNewStaffData({...newStaffData, firstName: e.target.value})}
                        className="w-full px-3 py-2 border border-[#f08c17] rounded-[5px] focus:outline-none focus:ring-2 focus:ring-[#f08c17] bg-white/80 text-[#f08c17]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#f08c17] mb-1">
                        Last Name
                      </label>
                      <input
                        type="text"
                        value={newStaffData.lastName}
                        onChange={(e) => setNewStaffData({...newStaffData, lastName: e.target.value})}
                        className="w-full px-3 py-2 border border-[#f08c17] rounded-[5px] focus:outline-none focus:ring-2 focus:ring-[#f08c17] bg-white/80 text-[#f08c17]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#f08c17] mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={newStaffData.email}
                      onChange={(e) => setNewStaffData({...newStaffData, email: e.target.value})}
                      className="w-full px-3 py-2 border border-[#f08c17] rounded-[5px] focus:outline-none focus:ring-2 focus:ring-[#f08c17] bg-white/80 text-[#f08c17]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#f08c17] mb-1">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={newStaffData.phone}
                      onChange={(e) => setNewStaffData({...newStaffData, phone: e.target.value})}
                      className="w-full px-3 py-2 border border-[#f08c17] rounded-[5px] focus:outline-none focus:ring-2 focus:ring-[#f08c17] bg-white/80 text-[#f08c17]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#f08c17] mb-1">
                      Role
                    </label>
                    <select
                      value={newStaffData.role}
                      onChange={(e) => setNewStaffData({...newStaffData, role: e.target.value})}
                      className="w-full px-3 py-2 border border-[#f08c17] rounded-[5px] focus:outline-none focus:ring-2 focus:ring-[#f08c17] bg-white/80 text-[#f08c17]"
                    >
                      <option value="MERCHANT_STAFF">Staff</option>
                      <option value="MERCHANT_ADMIN">Admin</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#f08c17] mb-1">
                      Temporary Password
                    </label>
                    <input
                      type="password"
                      value={newStaffData.password}
                      onChange={(e) => setNewStaffData({...newStaffData, password: e.target.value})}
                      className="w-full px-3 py-2 border border-[#f08c17] rounded-[5px] focus:outline-none focus:ring-2 focus:ring-[#f08c17] bg-white/80 text-[#f08c17]"
                    />
                  </div>
                </div>
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 text-sm font-medium text-[#f08c17] bg-white/80 hover:bg-white/90 rounded-[5px]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddStaff}
                    className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-[#f08c17] to-orange-400 hover:from-orange-500 hover:to-orange-400 rounded-[5px]"
                  >
                    Add Staff Member
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Staff Modal */}
        {editingStaff && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
            <div className="bg-white/90 rounded-lg shadow-xl max-w-md w-full backdrop-blur-md">
              <div className="p-6">
                <h2 className="text-lg font-bold text-[#f08c17] mb-4">Edit Staff Member</h2>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[#f08c17] mb-1">
                        First Name
                      </label>
                      <input
                        type="text"
                        value={editingStaff.firstName}
                        onChange={(e) => setEditingStaff({...editingStaff, firstName: e.target.value})}
                        className="w-full px-3 py-2 border border-[#f08c17] rounded-[5px] focus:outline-none focus:ring-2 focus:ring-[#f08c17] bg-white/80 text-[#f08c17]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#f08c17] mb-1">
                        Last Name
                      </label>
                      <input
                        type="text"
                        value={editingStaff.lastName}
                        onChange={(e) => setEditingStaff({...editingStaff, lastName: e.target.value})}
                        className="w-full px-3 py-2 border border-[#f08c17] rounded-[5px] focus:outline-none focus:ring-2 focus:ring-[#f08c17] bg-white/80 text-[#f08c17]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#f08c17] mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={editingStaff.email}
                      onChange={(e) => setEditingStaff({...editingStaff, email: e.target.value})}
                      className="w-full px-3 py-2 border border-[#f08c17] rounded-[5px] focus:outline-none focus:ring-2 focus:ring-[#f08c17] bg-white/80 text-[#f08c17]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#f08c17] mb-1">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={editingStaff.phone}
                      onChange={(e) => setEditingStaff({...editingStaff, phone: e.target.value})}
                      className="w-full px-3 py-2 border border-[#f08c17] rounded-[5px] focus:outline-none focus:ring-2 focus:ring-[#f08c17] bg-white/80 text-[#f08c17]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#f08c17] mb-1">
                      Role
                    </label>
                    <select
                      value={editingStaff.role}
                      onChange={(e) => setEditingStaff({...editingStaff, role: e.target.value})}
                      className="w-full px-3 py-2 border border-[#f08c17] rounded-[5px] focus:outline-none focus:ring-2 focus:ring-[#f08c17] bg-white/80 text-[#f08c17]"
                    >
                      <option value="MERCHANT_STAFF">Staff</option>
                      <option value="MERCHANT_ADMIN">Admin</option>
                    </select>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={editingStaff.isActive}
                      onChange={(e) => setEditingStaff({...editingStaff, isActive: e.target.checked})}
                      className="rounded border-[#f08c17] text-[#f08c17] focus:ring-[#f08c17] mr-2"
                    />
                    <label className="text-sm text-[#f08c17]">Active</label>
                  </div>
                </div>
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    onClick={() => setEditingStaff(null)}
                    className="px-4 py-2 text-sm font-medium text-[#f08c17] bg-white/80 hover:bg-white/90 rounded-[5px]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpdateStaff}
                    className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-[#f08c17] to-orange-400 hover:from-orange-500 hover:to-orange-400 rounded-[5px]"
                  >
                    Update Staff Member
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
