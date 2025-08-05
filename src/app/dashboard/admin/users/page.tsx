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
import { CompactTable, Column, TableCell, TableSecondaryText } from '@/components/ui/CompactTable'
import { BulkActionsToolbar, commonBulkActions } from '@/components/ui/BulkActionsToolbar'
import { QuickFilterBadge } from '@/components/ui/ClickableBadge'
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
import { useToast, ToastContainer } from '@/components/ui/Toast'
import { parseDeletionError } from '@/lib/utils'

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
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const toast = useToast()

  const { users, pagination, isLoading: usersLoading, error, refresh } = useUsers({
    page,
    limit: 20,
    search: search || undefined,
    role: roleFilter || undefined,
    active: activeFilter !== '' ? activeFilter : undefined,
  })

  // Fetch ALL users for stats calculation (unfiltered)
  const { users: allUsers } = useUsers({
    page: 1,
    limit: 1000, // Get all users for accurate stats
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

  const handleSelectionChange = (selectedIds: string[]) => {
    setSelectedUsers(selectedIds)
  }

  const handleQuickFilter = (filterKey: string, filterValue?: string | number) => {
    switch (filterKey) {
      case 'role':
        setRoleFilter(filterValue as Role)
        break
      case 'active':
        setActiveFilter(filterValue === 'true')
        break
      default:
        break
    }
  }

  const handleBulkAction = async (actionId: string) => {
    try {
      switch (actionId) {
        case 'delete':
          console.log('Deleting users:', selectedUsers)
          const results = await Promise.allSettled(
            selectedUsers.map(id => deleteUser(id))
          )
          
          // Separate successful and failed deletions
          const successful = results.filter(r => r.status === 'fulfilled').length
          const failures = results.filter(r => r.status === 'rejected') as PromiseRejectedResult[]
          
          if (successful > 0) {
            toast.success(
              'Users Deleted',
              `Successfully deleted ${successful} user${successful !== 1 ? 's' : ''}.`
            )
          }
          
          if (failures.length > 0) {
            // Group similar error messages
            const errorMessages = failures.map(f => parseDeletionError(f.reason))
            const uniqueErrors = [...new Set(errorMessages)]
            
            if (uniqueErrors.length === 1) {
              // All errors are the same
              toast.error(
                `Failed to Delete ${failures.length} User${failures.length !== 1 ? 's' : ''}`,
                uniqueErrors[0],
                8000 // Show longer for error messages
              )
            } else {
              // Multiple different errors
              toast.error(
                `Failed to Delete ${failures.length} User${failures.length !== 1 ? 's' : ''}`,
                `${failures.length} user${failures.length !== 1 ? 's' : ''} could not be deleted due to various dependency conflicts. Check individual users for details.`,
                8000
              )
            }
            
            console.error('Deletion failures:', failures.map(f => ({
              error: f.reason,
              parsed: parseDeletionError(f.reason)
            })))
          }
          
          setSelectedUsers([])
          refresh() // Refresh the list to show updated state
          
          // If there were failures, throw an error to keep the confirmation modal informed
          if (failures.length > 0) {
            throw new Error(`Failed to delete ${failures.length} user${failures.length !== 1 ? 's' : ''}`)
          }
          break
        default:
          break
      }
    } catch (error) {
      console.error('Bulk operation failed:', error)
      // Re-throw to let BulkActionsToolbar know there was an error
      throw error
    }
  }

  // Define table columns
  const userColumns: Column[] = [
    {
      key: 'user',
      label: 'User',
      sortable: true,
      className: 'flex-1',
      render: (user) => (
        <div className="flex items-center">
          <div className="w-10 h-10 bg-gradient-steel rounded-lg flex items-center justify-center mr-3">
            <span className="text-sm font-bold text-steel-700">
              {user.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <TableCell className="font-medium">{user.name}</TableCell>
            <TableSecondaryText>{user.email}</TableSecondaryText>
          </div>
        </div>
      )
    },
    {
      key: 'role',
      label: 'Role',
      sortable: true,
      width: '120px',
      render: (user) => (
        <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          user.role === 'ADMIN' ? 'bg-red-100 text-red-800' :
          user.role === 'MANAGER' ? 'bg-blue-100 text-blue-800' :
          user.role === 'STAKEHOLDER_L1' ? 'bg-green-100 text-green-800' :
          user.role === 'STAKEHOLDER_L2' ? 'bg-yellow-100 text-yellow-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {user.role === 'STAKEHOLDER_L1' ? 'Stakeholder L1' :
           user.role === 'STAKEHOLDER_L2' ? 'Stakeholder L2' :
           user.role}
        </div>
      )
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      width: '100px',
      render: (user) => (
        <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          user.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {user.active ? 'Active' : 'Inactive'}
        </div>
      )
    },
    {
      key: 'details',
      label: 'Details',
      width: '120px',
      render: (user) => (
        <div>
          {(user as any).userType === 'stakeholder' ? (
            <>
              <TableCell className="text-sm">{(user as any).clientName || 'No Client'}</TableCell>
              <TableSecondaryText>{(user as any)._count?.projects || 0} Projects</TableSecondaryText>
            </>
          ) : (
            <>
              <TableCell className="text-sm">{(user as any)._count?.rfisCreated || 0} RFIs</TableCell>
              <TableSecondaryText>{(user as any)._count?.responses || 0} Responses</TableSecondaryText>
            </>
          )}
        </div>
      )
    },
    {
      key: 'createdAt',
      label: 'Created',
      sortable: true,
      width: '100px',
      render: (user) => (
        <TableSecondaryText>
          {format(new Date(user.createdAt), 'MMM dd, yyyy')}
        </TableSecondaryText>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      width: '120px',
      render: (user) => (
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
      )
    }
  ]

  return (
    <DashboardLayout>
      <div className="page-container">
        {/* Welcome Section */}
        <div className="card mb-6">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-steel-900 mb-2">
                  User Management
                </h1>
                <p className="text-steel-600">
                  Manage system users, roles, and permissions
                </p>
              </div>
              <div className="flex gap-3">
                {(search || roleFilter || activeFilter !== '') && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearch('')
                      setRoleFilter('')
                      setActiveFilter('')
                      setPage(1)
                    }}
                  >
                    Clear Filters
                  </Button>
                )}
                <Button
                  variant="primary"
                  leftIcon={<PlusIcon className="w-5 h-5" />}
                  onClick={() => setIsCreateModalOpen(true)}
                >
                  Add User
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div className="stat-icon-primary">
                  <UserGroupIcon className="w-6 h-6" />
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-steel-600">Total Users</p>
                  <p className="text-2xl font-bold text-steel-900">{allUsers.length}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="stat-card cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleQuickFilter('active', 'true')}>
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div className="stat-icon bg-safety-green text-white">
                  <EyeIcon className="w-6 h-6" />
                </div>
                <div className="text-right">
                  <QuickFilterBadge
                    label="Active"
                    count={allUsers.filter(u => u.active).length}
                    filterKey="active"
                    filterValue="true"
                    onFilter={handleQuickFilter}
                    active={activeFilter === true}
                    variant="success"
                    className="text-2xl font-bold"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="stat-card cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleQuickFilter('active', 'false')}>
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div className="stat-icon bg-red-500 text-white">
                  <EyeSlashIcon className="w-6 h-6" />
                </div>
                <div className="text-right">
                  <QuickFilterBadge
                    label="Inactive"
                    count={allUsers.filter(u => !u.active).length}
                    filterKey="active"
                    filterValue="false"
                    onFilter={handleQuickFilter}
                    active={activeFilter === false}
                    variant="error"
                    className="text-2xl font-bold"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="stat-card cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleQuickFilter('role', 'ADMIN')}>
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div className="stat-icon bg-red-600 text-white">
                  <KeyIcon className="w-6 h-6" />
                </div>
                <div className="text-right">
                  <QuickFilterBadge
                    label="Admins"
                    count={users.filter(u => u.role === 'ADMIN').length}
                    filterKey="role"
                    filterValue="ADMIN"
                    onFilter={handleQuickFilter}
                    active={roleFilter === 'ADMIN'}
                    variant="error"
                    className="text-2xl font-bold"
                  />
                </div>
              </div>
            </div>
          </div>
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

        {/* Main Content Grid */}
        <div className="content-grid">
          {/* Main Content */}
          <div className="main-content">
            {/* Bulk Actions Toolbar */}
            <BulkActionsToolbar
              selectedCount={selectedUsers.length}
              totalCount={users.length}
              onClearSelection={() => setSelectedUsers([])}
              actions={[commonBulkActions.delete]}
              onAction={handleBulkAction}
              isLoading={actionLoading}
              className="mb-6"
            />

            {/* Compact Users Table */}
            <CompactTable
              data={users}
              columns={userColumns}
              selectedItems={selectedUsers}
              onSelectionChange={handleSelectionChange}
              getItemId={(user) => user.id}
              onItemClick={(user) => router.push(`/dashboard/users/${user.id}`)}
              isLoading={usersLoading}
              emptyMessage="No users found"
              showSelectAll={true}
              enableHover={true}
            />

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-3 border-t border-steel-200 bg-white rounded-b-lg">
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

          {/* Sidebar Content */}
          <div className="sidebar-content space-y-6">
            {/* Quick Actions */}
            <div className="card">
              <div className="card-body">
                <h3 className="text-lg font-semibold text-steel-900 mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  <Button 
                    variant="outline" 
                    className="w-full justify-start" 
                    leftIcon={<PlusIcon className="w-4 h-4" />}
                    onClick={() => setIsCreateModalOpen(true)}
                  >
                    Add User
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start" 
                    onClick={() => refresh()}
                  >
                    Refresh Users
                  </Button>
                </div>
              </div>
            </div>

            {/* User Statistics */}
            <div className="card">
              <div className="card-body">
                <h3 className="text-lg font-semibold text-steel-900 mb-4">User Statistics</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-steel-600">Total Users</span>
                    <span className="font-semibold">{pagination?.total || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-steel-600">Active Users</span>
                    <span className="font-semibold text-green-600">{users.filter(u => u.active).length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-steel-600">Inactive Users</span>
                    <span className="font-semibold text-red-600">{users.filter(u => !u.active).length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-steel-600">Administrators</span>
                    <span className="font-semibold text-red-600">{users.filter(u => u.role === 'ADMIN').length}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Role Guide */}
            <div className="card">
              <div className="card-body">
                <h3 className="text-lg font-semibold text-steel-900 mb-4">Role Guide</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span className="text-sm text-steel-600">Admin - Full system access</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span className="text-sm text-steel-600">Manager - Project management</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
                    <span className="text-sm text-steel-600">User - Basic access</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-steel-600">Stakeholder L1 - Client admins</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <span className="text-sm text-steel-600">Stakeholder L2 - Sub-contractors</span>
                  </div>
                </div>
              </div>
            </div>
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

        {/* Toast Notifications */}
        <ToastContainer toasts={toast.toasts} onClose={toast.removeToast} />
      </div>
    </DashboardLayout>
  )
}