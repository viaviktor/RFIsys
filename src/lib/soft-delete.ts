/**
 * Soft Delete Utilities
 * 
 * Provides consistent filtering and operations for soft-deleted records.
 * Records are soft-deleted by setting a `deletedAt` timestamp rather than
 * physically removing them from the database.
 */

export interface SoftDeleteOptions {
  includeDeleted?: boolean
  deletedOnly?: boolean
}

/**
 * Creates a Prisma where clause for filtering soft-deleted records
 */
export function createSoftDeleteFilter(options: SoftDeleteOptions = {}) {
  const { includeDeleted = false, deletedOnly = false } = options

  if (deletedOnly) {
    return { deletedAt: { not: null } }
  }

  if (includeDeleted) {
    return {} // No filter - include all records
  }

  return { deletedAt: null } // Default - exclude deleted records
}

/**
 * Marks a record as soft-deleted by setting deletedAt timestamp
 */
export function markAsDeleted() {
  return { deletedAt: new Date() }
}

/**
 * Restores a soft-deleted record by clearing deletedAt timestamp
 */
export function markAsRestored() {
  return { deletedAt: null }
}

/**
 * Checks if a record is soft-deleted
 */
export function isDeleted(record: { deletedAt?: Date | null }): boolean {
  return record.deletedAt !== null && record.deletedAt !== undefined
}

/**
 * Filters an array of records to exclude soft-deleted ones
 */
export function filterDeleted<T extends { deletedAt?: Date | null }>(
  records: T[], 
  options: SoftDeleteOptions = {}
): T[] {
  const { includeDeleted = false, deletedOnly = false } = options

  if (includeDeleted && !deletedOnly) {
    return records // Return all records
  }

  if (deletedOnly) {
    return records.filter(record => isDeleted(record))
  }

  return records.filter(record => !isDeleted(record))
}

/**
 * Standard soft delete where clauses for common query patterns
 */
export const SOFT_DELETE_FILTERS = {
  // Only active (non-deleted) records
  ACTIVE_ONLY: { deletedAt: null },
  
  // Only deleted records
  DELETED_ONLY: { deletedAt: { not: null } },
  
  // All records (no filter)
  ALL: {},
  
  // Active and not archived (for entities that have both active and deletedAt)
  ACTIVE_AND_NOT_DELETED: { active: true, deletedAt: null },
  
  // Archived but not deleted
  ARCHIVED_NOT_DELETED: { active: false, deletedAt: null }
} as const

/**
 * Combines active status and soft delete filters
 */
export function createActiveAndDeleteFilter(
  active?: boolean | null,
  options: SoftDeleteOptions = {}
) {
  const softDeleteFilter = createSoftDeleteFilter(options)
  
  if (active === null || active === undefined) {
    return softDeleteFilter
  }
  
  return {
    ...softDeleteFilter,
    active
  }
}