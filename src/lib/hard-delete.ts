import { prisma } from '@/lib/prisma'
import { unlink } from 'fs/promises'
import { join } from 'path'

const UPLOAD_DIR = join(process.cwd(), 'uploads')

/**
 * Hard delete utility functions that completely remove records and files
 * No soft-delete, no traces left behind
 */

/**
 * Delete all files associated with attachments
 */
async function deleteAttachmentFiles(attachments: { storedName: string }[]) {
  const deletedFiles: string[] = []
  const errors: string[] = []

  for (const attachment of attachments) {
    try {
      const filePath = join(UPLOAD_DIR, attachment.storedName)
      await unlink(filePath)
      deletedFiles.push(attachment.storedName)
      console.log(`✅ Deleted file: ${attachment.storedName}`)
    } catch (error) {
      const errorMsg = `Failed to delete file ${attachment.storedName}: ${error}`
      console.warn(`⚠️ ${errorMsg}`)
      errors.push(errorMsg)
    }
  }

  return { deletedFiles, errors }
}

/**
 * HARD DELETE RFI - Completely removes RFI and all associated data
 */
export async function hardDeleteRFI(rfiId: string) {
  console.log(`🗑️ Starting hard delete of RFI: ${rfiId}`)
  
  try {
    // 1. Get all attachments to delete files
    const attachments = await prisma.attachment.findMany({
      where: { rfiId },
      select: { id: true, storedName: true, filename: true }
    })

    console.log(`📎 Found ${attachments.length} attachments to delete`)

    // 2. Delete attachment files from filesystem
    const { deletedFiles, errors } = await deleteAttachmentFiles(attachments)

    // 3. Delete all database records (order matters for foreign key constraints)
    
    // Delete email logs
    const emailLogResult = await prisma.emailLog.deleteMany({
      where: { rfiId }
    })
    console.log(`📧 Deleted ${emailLogResult.count} email logs`)

    // Delete email queue entries
    const emailQueueResult = await prisma.emailQueue.deleteMany({
      where: { rfiId }
    })
    console.log(`📨 Deleted ${emailQueueResult.count} email queue entries`)

    // Delete responses
    const responsesResult = await prisma.response.deleteMany({
      where: { rfiId }
    })
    console.log(`💬 Deleted ${responsesResult.count} responses`)

    // Delete attachments
    const attachmentResult = await prisma.attachment.deleteMany({
      where: { rfiId }
    })
    console.log(`📎 Deleted ${attachmentResult.count} attachment records`)

    // Delete the RFI itself
    await prisma.rFI.delete({
      where: { id: rfiId }
    })
    console.log(`✅ Deleted RFI: ${rfiId}`)

    return {
      success: true,
      deletedFiles,
      fileErrors: errors,
      deletedRecords: {
        rfi: 1,
        responses: responsesResult.count,
        attachments: attachmentResult.count,
        emailLogs: emailLogResult.count,
        emailQueue: emailQueueResult.count
      }
    }

  } catch (error) {
    console.error(`❌ Error hard deleting RFI ${rfiId}:`, error)
    throw error
  }
}

/**
 * HARD DELETE PROJECT - Completely removes project and all associated data
 */
export async function hardDeleteProject(projectId: string) {
  console.log(`🗑️ Starting hard delete of Project: ${projectId}`)
  
  try {
    // 1. Get project details
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        rfis: {
          include: {
            attachments: { select: { id: true, storedName: true, filename: true } }
          }
        },
        stakeholders: true,
        accessRequests: true
      }
    })

    if (!project) {
      throw new Error(`Project not found: ${projectId}`)
    }

    console.log(`🏗️ Project: ${project.name}`)
    console.log(`📄 Found ${project.rfis.length} RFIs to delete`)
    console.log(`👥 Found ${project.stakeholders.length} stakeholders to remove`)
    console.log(`🔐 Found ${project.accessRequests.length} access requests to remove`)

    // 2. Delete all RFIs and their attachments
    let totalDeletedFiles: string[] = []
    let totalFileErrors: string[] = []
    let totalDeletedRecords = {
      rfis: 0,
      responses: 0,
      attachments: 0,
      emailLogs: 0,
      emailQueue: 0
    }

    for (const rfi of project.rfis) {
      console.log(`🗑️ Deleting RFI: ${rfi.rfiNumber} - ${rfi.title}`)
      const result = await hardDeleteRFI(rfi.id)
      
      totalDeletedFiles.push(...result.deletedFiles)
      totalFileErrors.push(...result.fileErrors)
      totalDeletedRecords.rfis += result.deletedRecords.rfi
      totalDeletedRecords.responses += result.deletedRecords.responses
      totalDeletedRecords.attachments += result.deletedRecords.attachments
      totalDeletedRecords.emailLogs += result.deletedRecords.emailLogs
      totalDeletedRecords.emailQueue += result.deletedRecords.emailQueue
    }

    // 3. Delete access requests
    const accessRequestResult = await prisma.accessRequest.deleteMany({
      where: { projectId }
    })
    console.log(`🔐 Deleted ${accessRequestResult.count} access requests`)

    // 4. Delete project stakeholders
    const stakeholderResult = await prisma.projectStakeholder.deleteMany({
      where: { projectId }
    })
    console.log(`👥 Deleted ${stakeholderResult.count} stakeholder relationships`)

    // 5. Delete the project itself
    await prisma.project.delete({
      where: { id: projectId }
    })
    console.log(`✅ Deleted project: ${project.name}`)

    return {
      success: true,
      projectName: project.name,
      deletedFiles: totalDeletedFiles,
      fileErrors: totalFileErrors,
      deletedRecords: {
        project: 1,
        ...totalDeletedRecords,
        stakeholders: stakeholderResult.count,
        accessRequests: accessRequestResult.count
      }
    }

  } catch (error) {
    console.error(`❌ Error hard deleting project ${projectId}:`, error)
    throw error
  }
}

/**
 * HARD DELETE USER - Completely removes user and reassigns/orphans their data
 */
export async function hardDeleteUser(userId: string, reassignToUserId?: string) {
  console.log(`🗑️ Starting hard delete of User: ${userId}`)
  
  try {
    // 1. Get user details
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        _count: {
          select: {
            rfisCreated: true,
            projects: true,
            responses: true,
            addedStakeholders: true
          }
        }
      }
    })

    if (!user) {
      throw new Error(`User not found: ${userId}`)
    }

    console.log(`👤 User: ${user.name} (${user.email})`)
    console.log(`📄 Created ${user._count.rfisCreated} RFIs`)
    console.log(`🏗️ Manages ${user._count.projects} projects`)
    console.log(`💬 Authored ${user._count.responses} responses`)

    // 2. Handle data reassignment or orphaning
    if (reassignToUserId) {
      console.log(`🔄 Reassigning data to user: ${reassignToUserId}`)
      
      // Reassign managed projects
      await prisma.project.updateMany({
        where: { managerId: userId },
        data: { managerId: reassignToUserId }
      })
      
      // Reassign created RFIs
      await prisma.rFI.updateMany({
        where: { createdById: userId },
        data: { createdById: reassignToUserId }
      })
      
      // Reassign responses
      await prisma.response.updateMany({
        where: { authorId: userId },
        data: { authorId: reassignToUserId }
      })
      
      // Reassign stakeholder additions
      await prisma.projectStakeholder.updateMany({
        where: { addedById: userId },
        data: { addedById: reassignToUserId }
      })
      
    } else {
      console.log(`🔗 Orphaning data (setting foreign keys to null)`)
      
      // Orphan managed projects
      await prisma.project.updateMany({
        where: { managerId: userId },
        data: { managerId: null }
      })
      
      // Note: createdById cannot be null, so RFIs will prevent deletion
      const rfiCount = await prisma.rFI.count({
        where: { createdById: userId }
      })
      
      if (rfiCount > 0) {
        throw new Error(
          `Cannot delete user: ${rfiCount} RFIs were created by this user. ` +
          `Please reassign to another user first.`
        )
      }
      
      // Orphan responses
      await prisma.response.updateMany({
        where: { authorId: userId },
        data: { authorId: null }
      })
      
      // Orphan stakeholder additions
      await prisma.projectStakeholder.updateMany({
        where: { addedById: userId },
        data: { addedById: null }
      })
    }

    // 3. Delete the user
    await prisma.user.delete({
      where: { id: userId }
    })
    console.log(`✅ Deleted user: ${user.name}`)

    return {
      success: true,
      userName: user.name,
      userEmail: user.email,
      reassignedTo: reassignToUserId || null,
      affectedRecords: {
        projects: user._count.projects,
        rfis: user._count.rfisCreated,
        responses: user._count.responses,
        stakeholders: user._count.addedStakeholders
      }
    }

  } catch (error) {
    console.error(`❌ Error hard deleting user ${userId}:`, error)
    throw error
  }
}

/**
 * HARD DELETE CLIENT - Completely removes client and all associated data
 */
export async function hardDeleteClient(clientId: string) {
  console.log(`🗑️ Starting hard delete of Client: ${clientId}`)
  
  try {
    // 1. Get client details with all related data
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: {
        projects: { include: { rfis: true } },
        contacts: true,
        rfis: { include: { attachments: true } }
      }
    })

    if (!client) {
      throw new Error(`Client not found: ${clientId}`)
    }

    console.log(`🏢 Client: ${client.name}`)
    console.log(`🏗️ Found ${client.projects.length} projects to delete`)
    console.log(`👥 Found ${client.contacts.length} contacts to delete`)
    console.log(`📄 Found ${client.rfis.length} direct RFIs to delete`)

    // 2. Delete all projects (which will cascade delete their RFIs)
    let totalDeletedFiles: string[] = []
    let totalFileErrors: string[] = []
    let totalDeletedRecords = {
      projects: 0,
      rfis: 0,
      responses: 0,
      attachments: 0,
      emailLogs: 0,
      emailQueue: 0,
      stakeholders: 0,
      accessRequests: 0
    }

    for (const project of client.projects) {
      const result = await hardDeleteProject(project.id)
      totalDeletedFiles.push(...result.deletedFiles)
      totalFileErrors.push(...result.fileErrors)
      totalDeletedRecords.projects += result.deletedRecords.project
      totalDeletedRecords.rfis += result.deletedRecords.rfis
      totalDeletedRecords.responses += result.deletedRecords.responses
      totalDeletedRecords.attachments += result.deletedRecords.attachments
      totalDeletedRecords.emailLogs += result.deletedRecords.emailLogs
      totalDeletedRecords.emailQueue += result.deletedRecords.emailQueue
      totalDeletedRecords.stakeholders += result.deletedRecords.stakeholders
      totalDeletedRecords.accessRequests += result.deletedRecords.accessRequests
    }

    // 3. Delete any direct RFIs not associated with projects
    for (const rfi of client.rfis) {
      if (!client.projects.some(p => p.id === rfi.projectId)) {
        const result = await hardDeleteRFI(rfi.id)
        totalDeletedFiles.push(...result.deletedFiles)
        totalFileErrors.push(...result.fileErrors)
        totalDeletedRecords.rfis += result.deletedRecords.rfi
      }
    }

    // 4. Delete registration tokens for client contacts
    await prisma.registrationToken.deleteMany({
      where: { 
        contact: { clientId } 
      }
    })

    // 5. Delete contacts (cascade will handle project stakeholders)
    const contactsResult = await prisma.contact.deleteMany({
      where: { clientId }
    })
    console.log(`👥 Deleted ${contactsResult.count} contacts`)

    // 6. Delete the client
    await prisma.client.delete({
      where: { id: clientId }
    })
    console.log(`✅ Deleted client: ${client.name}`)

    return {
      success: true,
      clientName: client.name,
      deletedFiles: totalDeletedFiles,
      fileErrors: totalFileErrors,
      deletedRecords: {
        client: 1,
        contacts: contactsResult.count,
        ...totalDeletedRecords
      }
    }

  } catch (error) {
    console.error(`❌ Error hard deleting client ${clientId}:`, error)
    throw error
  }
}