'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers/AuthProvider'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { useUsers, useUserActions } from '@/hooks/useUsers'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { 
  UserGroupIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  KeyIcon,
  EyeSlashIcon,
  EyeIcon
} from '@heroicons/react/24/outline'
import { Role, User } from '@/types'
import { format } from 'date-fns'

export default function AdminUsersPage() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<Role | ''>('')
  const [activeFilter, setActiveFilter] = useState<boolean | ''>('')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)

  const { users, pagination, isLoading: usersLoading, error, refresh } = useUsers({
    page,
    limit: 20,
    search: search || undefined,
    role: roleFilter || undefined,
    active: activeFilter !== '' ? activeFilter : undefined,
  })

  const {
    createUser,
    updateUser,
    deleteUser,
    resetPassword,
    toggleUserStatus,
    changeUserRole,
    isLoading: actionLoading,
  } = useUserActions()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login')
    } else if (!isLoading && isAuthenticated && user?.role !== 'ADMIN') {
      router.replace('/dashboard')
    }
  }, [isAuthenticated, isLoading, user, router])

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="page-container">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!isAuthenticated || !user || user.role !== 'ADMIN') {
    return null
  }

  const handleCreateUser = async (formData: FormData) => {
    try {
      const userData = {
        name: formData.get('name') as string,
        email: formData.get('email') as string,
        password: formData.get('password') as string,
        role: formData.get('role') as Role,
      }
      await createUser(userData)
      setIsCreateModalOpen(false)
      refresh()
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to create user')
    }
  }

  const handleEditUser = async (formData: FormData) => {
    if (!selectedUser) return
    try {
      const updates = {
        name: formData.get('name') as string,
        email: formData.get('email') as string,
        role: formData.get('role') as Role,
      }
      await updateUser(selectedUser.id, updates)
      setIsEditModalOpen(false)
      setSelectedUser(null)
      refresh()
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to update user')
    }
  }

  const handleResetPassword = async (formData: FormData) => {
    if (!selectedUser) return
    try {
      const newPassword = formData.get('password') as string
      await resetPassword(selectedUser.id, newPassword)
      setIsPasswordModalOpen(false)
      setSelectedUser(null)
      alert('Password reset successfully')
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to reset password')
    }
  }

  const handleToggleStatus = async (userId: string, active: boolean) => {
    try {
      await toggleUserStatus(userId, active)
      refresh()
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to update user status')
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return
    }
    try {
      const result = await deleteUser(userId)
      alert(result.message)
      refresh()
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to delete user')
    }
  }

  return (
    <DashboardLayout>
      <div className="page-container">
        {/* Page Header */}
        <div className="page-header">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <UserGroupIcon className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-steel-900">User Management</h1>
                <p className="text-steel-600 font-medium">
                  Manage system users, roles, and permissions
                </p>
              </div>
            </div>
          </div>
          <Button
            variant="primary"
            leftIcon={<PlusIcon className="w-5 h-5" />}
            onClick={() => setIsCreateModalOpen(true)}
          >
            Add User
          </Button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-steel border border-steel-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-steel-400" />
              <Input
                type="text"
                placeholder="Search users..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as Role | '')}
            >
              <option value="">All Roles</option>
              <option value="USER">User</option>
              <option value="MANAGER">Manager</option>
              <option value="ADMIN">Admin</option>
              <option value="STAKEHOLDER_L1">Stakeholder L1</option>
              <option value="STAKEHOLDER_L2">Stakeholder L2</option>
            </Select>
            <Select
              value={activeFilter.toString()}
              onChange={(e) => setActiveFilter(e.target.value === '' ? '' : e.target.value === 'true')}
            >
              <option value="">All Status</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </Select>
            <Button
              variant="secondary"
              onClick={() => {
                setSearch('')
                setRoleFilter('')
                setActiveFilter('')
                setPage(1)
              }}
            >
              Clear Filters
            </Button>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-lg shadow-steel border border-steel-200">
          <div className="card-header">
            <h3 className="text-xl font-bold text-steel-900">
              Users ({pagination?.total || 0})
            </h3>
          </div>
          
          <div className="card-body">
            {usersLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <p className="text-red-600">Error loading users: {error.message}</p>
                <Button variant="secondary" onClick={() => refresh()} className="mt-4">
                  Retry
                </Button>
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-12">
                <UserGroupIcon className="w-12 h-12 text-steel-400 mx-auto mb-4" />
                <p className="text-steel-600">No users found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-steel-50 border-b border-steel-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-steel-500 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-steel-500 uppercase tracking-wider">
                        Role
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-steel-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-steel-500 uppercase tracking-wider">
                        Details
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-steel-500 uppercase tracking-wider">
                        Created
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-steel-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-steel-200">
                    {users.map((user) => (
                      <tr 
                        key={user.id} 
                        className="hover:bg-steel-50 cursor-pointer transition-colors"
                        onClick={() => router.push(`/dashboard/users/${user.id}`)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-gradient-steel rounded-lg flex items-center justify-center">
                              <span className="text-sm font-bold text-steel-700">
                                {user.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-steel-900">{user.name}</div>
                              <div className="text-sm text-steel-500">{user.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            user.role === 'ADMIN' ? 'bg-red-100 text-red-800' :
                            user.role === 'MANAGER' ? 'bg-blue-100 text-blue-800' :
                            user.role === 'STAKEHOLDER_L1' ? 'bg-green-100 text-green-800' :
                            user.role === 'STAKEHOLDER_L2' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {user.role === 'STAKEHOLDER_L1' ? 'Stakeholder L1' :
                             user.role === 'STAKEHOLDER_L2' ? 'Stakeholder L2' :
                             user.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            user.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {user.active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-steel-500">
                          {(user as any).userType === 'stakeholder' ? (
                            <div>
                              <div>{(user as any).clientName || 'No Client'}</div>
                              <div>{(user as any)._count?.projects || 0} Projects</div>
                            </div>
                          ) : (
                            <div>
                              <div>{(user as any)._count?.rfisCreated || 0} RFIs</div>
                              <div>{(user as any)._count?.responses || 0} Responses</div>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-steel-500">
                          {format(new Date(user.createdAt), 'MMM dd, yyyy')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-2">
                            {/* Only show toggle status for internal users */}
                            {(user as any).userType !== 'stakeholder' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleToggleStatus(user.id, !user.active)
                                }}
                                className="text-steel-400 hover:text-blue-600 transition-colors"
                                title={user.active ? 'Deactivate User' : 'Activate User'}
                                disabled={actionLoading}
                              >
                                {user.active ? (
                                  <EyeSlashIcon className="w-4 h-4" />
                                ) : (
                                  <EyeIcon className="w-4 h-4" />
                                )}
                              </button>
                            )}
                            {/* Password reset available for all user types */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedUser(user)
                                setIsPasswordModalOpen(true)
                              }}
                              className="text-steel-400 hover:text-yellow-600 transition-colors"
                              title="Reset Password"
                              disabled={actionLoading || !(user as any).active}
                            >
                              <KeyIcon className="w-4 h-4" />
                            </button>
                            {/* Edit only for internal users */}
                            {(user as any).userType !== 'stakeholder' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setSelectedUser(user)
                                  setIsEditModalOpen(true)
                                }}
                                className="text-steel-400 hover:text-orange-600 transition-colors"
                                title="Edit User"
                                disabled={actionLoading}
                              >
                                <PencilIcon className="w-4 h-4" />
                              </button>
                            )}
                            {/* Delete only for internal users */}
                            {(user as any).userType !== 'stakeholder' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDeleteUser(user.id)
                                }}
                                className="text-steel-400 hover:text-red-600 transition-colors"
                                title="Delete User"
                                disabled={actionLoading || user.id === user.id}
                              >
                                <TrashIcon className="w-4 h-4" />
                              </button>
                            )}
                            {/* Show stakeholder indicator */}
                            {(user as any).userType === 'stakeholder' && (
                              <span className="text-xs text-steel-400 italic">
                                Stakeholder
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-3 border-t border-steel-200">
                <div className="text-sm text-steel-700">
                  Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} results
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={pagination.page <= 1}
                    onClick={() => setPage(pagination.page - 1)}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-steel-600">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={pagination.page >= pagination.totalPages}
                    onClick={() => setPage(pagination.page + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Create User Modal */}
        <Modal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          title="Create New User"
        >
          <form onSubmit={(e) => {
            e.preventDefault()
            handleCreateUser(new FormData(e.currentTarget))
          }}>
            <div className="space-y-4">
              <Input
                name="name"
                label="Full Name"
                placeholder="Enter full name"
                required
              />
              <Input
                name="email"
                type="email"
                label="Email Address"
                placeholder="Enter email address"
                required
              />
              <Input
                name="password"
                type="password"
                label="Password"
                placeholder="Enter password (min 8 characters)"
                required
              />
              <Select name="role" label="Role" required>
                <option value="">Select Role</option>
                <option value="USER">User</option>
                <option value="MANAGER">Manager</option>
                <option value="ADMIN">Admin</option>
              </Select>
            </div>
            <div className="flex items-center justify-end gap-3 mt-6">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setIsCreateModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={actionLoading}
              >
                {actionLoading ? 'Creating...' : 'Create User'}
              </Button>
            </div>
          </form>
        </Modal>

        {/* Edit User Modal */}
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false)
            setSelectedUser(null)
          }}
          title="Edit User"
        >
          {selectedUser && (
            <form onSubmit={(e) => {
              e.preventDefault()
              handleEditUser(new FormData(e.currentTarget))
            }}>
              <div className="space-y-4">
                <Input
                  name="name"
                  label="Full Name"
                  defaultValue={selectedUser.name}
                  required
                />
                <Input
                  name="email"
                  type="email"
                  label="Email Address"
                  defaultValue={selectedUser.email}
                  required
                />
                <Select name="role" label="Role" defaultValue={selectedUser.role} required>
                  <option value="USER">User</option>
                  <option value="MANAGER">Manager</option>
                  <option value="ADMIN">Admin</option>
                </Select>
              </div>
              <div className="flex items-center justify-end gap-3 mt-6">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setIsEditModalOpen(false)
                    setSelectedUser(null)
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={actionLoading}
                >
                  {actionLoading ? 'Updating...' : 'Update User'}
                </Button>
              </div>
            </form>
          )}
        </Modal>

        {/* Reset Password Modal */}
        <Modal
          isOpen={isPasswordModalOpen}
          onClose={() => {
            setIsPasswordModalOpen(false)
            setSelectedUser(null)
          }}
          title="Reset Password"
        >
          {selectedUser && (
            <form onSubmit={(e) => {
              e.preventDefault()
              handleResetPassword(new FormData(e.currentTarget))
            }}>
              <div className="space-y-4">
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    You are about to reset the password for <strong>{selectedUser.name}</strong> ({selectedUser.email}).
                  </p>
                </div>
                <Input
                  name="password"
                  type="password"
                  label="New Password"
                  placeholder="Enter new password (min 8 characters)"
                  required
                />
              </div>
              <div className="flex items-center justify-end gap-3 mt-6">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setIsPasswordModalOpen(false)
                    setSelectedUser(null)
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="warning"
                  disabled={actionLoading}
                >
                  {actionLoading ? 'Resetting...' : 'Reset Password'}
                </Button>
              </div>
            </form>
          )}
        </Modal>
      </div>
    </DashboardLayout>
  )
}