#!/usr/bin/env node

/**
 * EMERGENCY DATABASE FIX - Delete problematic project 316402
 * 
 * This script safely deletes the project with number 316402 that is causing
 * unique constraint conflicts, preventing new projects from using that number.
 * 
 * Usage: node scripts/emergency-db-fix.js
 */

const { PrismaClient } = require('@prisma/client');
const { unlink } = require('fs/promises');
const { join } = require('path');

const prisma = new PrismaClient();
const PROBLEM_PROJECT_NUMBER = '316402';
const UPLOAD_DIR = process.env.UPLOAD_DIR || join(process.cwd(), 'uploads');

async function emergencyDatabaseFix() {
  try {
    console.log('🚨 EMERGENCY DATABASE FIX - Project Number 316402 Conflict');
    console.log('===========================================================\n');
    
    // Find the problematic project
    const problemProject = await prisma.project.findFirst({
      where: { projectNumber: PROBLEM_PROJECT_NUMBER },
      include: {
        rfis: {
          include: {
            attachments: { select: { id: true, storedName: true } }
          }
        },
        stakeholders: true
      }
    });
    
    if (!problemProject) {
      console.log('✅ No project with number 316402 found - conflict already resolved');
      return;
    }
    
    console.log(`📊 Found problematic project: ${problemProject.name}`);
    console.log(`📊 Project ID: ${problemProject.id}`);
    console.log(`📊 Project number: ${problemProject.projectNumber}`);
    console.log(`📊 Contains: ${problemProject.rfis.length} RFIs, ${problemProject.stakeholders.length} stakeholders`);
    console.log(`📊 Created: ${problemProject.createdAt}`);
    console.log(`📊 Active: ${problemProject.active}\n`);
    
    // Warning and confirmation
    console.log('⚠️  WARNING: This will PERMANENTLY delete the following data:');
    console.log(`   - Project: ${problemProject.name}`);
    console.log(`   - ${problemProject.rfis.length} RFIs with all responses`);
    console.log(`   - ${problemProject.stakeholders.length} stakeholder relationships`);
    console.log(`   - All associated files and attachments`);
    console.log('   - All email logs and queue entries');
    console.log('   - All access requests\n');
    
    // Manual cascading delete in correct order
    let deletedFiles = [];
    let fileErrors = [];
    let deletionSummary = {
      rfis: 0,
      responses: 0,
      attachments: 0,
      emailLogs: 0,
      emailQueue: 0,
      accessRequests: 0,
      stakeholders: 0,
      project: 0
    };
    
    console.log('🗑️ Starting complete hard deletion...\n');
    
    // 1. Delete all RFIs and their associated data
    for (const rfi of problemProject.rfis) {
      console.log(`🗑️ Deleting RFI: ${rfi.rfiNumber} - ${rfi.title}`);
      
      // Delete attachment files from filesystem
      for (const attachment of rfi.attachments) {
        try {
          const filePath = join(UPLOAD_DIR, attachment.storedName);
          await unlink(filePath);
          deletedFiles.push(attachment.storedName);
          console.log(`   📁 Deleted file: ${attachment.storedName}`);
        } catch (error) {
          const errorMsg = `Failed to delete file ${attachment.storedName}: ${error.message}`;
          fileErrors.push(errorMsg);
          console.warn(`   ⚠️ File error: ${attachment.storedName} (${error.message})`);
        }
      }
      
      // Delete email logs
      const emailLogResult = await prisma.emailLog.deleteMany({
        where: { rfiId: rfi.id }
      });
      deletionSummary.emailLogs += emailLogResult.count;
      
      // Delete email queue entries
      const emailQueueResult = await prisma.emailQueue.deleteMany({
        where: { rfiId: rfi.id }
      });
      deletionSummary.emailQueue += emailQueueResult.count;
      
      // Delete responses
      const responsesResult = await prisma.response.deleteMany({
        where: { rfiId: rfi.id }
      });
      deletionSummary.responses += responsesResult.count;
      
      // Delete attachments
      const attachmentResult = await prisma.attachment.deleteMany({
        where: { rfiId: rfi.id }
      });
      deletionSummary.attachments += attachmentResult.count;
      
      // Delete the RFI itself
      await prisma.rFI.delete({
        where: { id: rfi.id }
      });
      deletionSummary.rfis++;
      
      console.log(`   ✅ Deleted RFI: ${rfi.rfiNumber}`);
    }
    
    // 2. Delete access requests
    const accessRequestResult = await prisma.accessRequest.deleteMany({
      where: { projectId: problemProject.id }
    });
    deletionSummary.accessRequests = accessRequestResult.count;
    
    // 3. Delete project stakeholders
    const stakeholderResult = await prisma.projectStakeholder.deleteMany({
      where: { projectId: problemProject.id }
    });
    deletionSummary.stakeholders = stakeholderResult.count;
    
    // 4. Delete the project itself
    await prisma.project.delete({
      where: { id: problemProject.id }
    });
    deletionSummary.project = 1;
    
    console.log('\n📊 EMERGENCY FIX COMPLETION SUMMARY:');
    console.log('=====================================');
    console.log(`✅ Project deleted: ${problemProject.name} (${problemProject.projectNumber})`);
    console.log(`✅ RFIs deleted: ${deletionSummary.rfis}`);
    console.log(`✅ Responses deleted: ${deletionSummary.responses}`);
    console.log(`✅ Attachments deleted: ${deletionSummary.attachments}`);
    console.log(`✅ Email logs deleted: ${deletionSummary.emailLogs}`);
    console.log(`✅ Email queue entries deleted: ${deletionSummary.emailQueue}`);
    console.log(`✅ Access requests deleted: ${deletionSummary.accessRequests}`);
    console.log(`✅ Stakeholder relationships deleted: ${deletionSummary.stakeholders}`);
    console.log(`✅ Files deleted: ${deletedFiles.length}`);
    
    if (fileErrors.length > 0) {
      console.log(`⚠️ File deletion errors: ${fileErrors.length}`);
      fileErrors.forEach(error => console.log(`   - ${error}`));
    }
    
    // Verify complete removal
    const verificationCheck = await prisma.project.findFirst({
      where: { projectNumber: PROBLEM_PROJECT_NUMBER }
    });
    
    if (verificationCheck) {
      console.error('\n❌ ERROR: Project number 316402 still exists after deletion!');
      console.error('   Something went wrong with the deletion process.');
      process.exit(1);
    } else {
      console.log('\n🎉 SUCCESS: Project number 316402 is now completely available for reuse!');
      console.log('🎯 CONFLICT RESOLVED: New projects can now use project number 316402');
    }
    
  } catch (error) {
    console.error('\n❌ EMERGENCY FIX FAILED:', error);
    console.error('The database fix could not be completed.');
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the emergency fix
if (require.main === module) {
  emergencyDatabaseFix()
    .then(() => {
      console.log('\n✅ Emergency database fix completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Emergency database fix failed:', error);
      process.exit(1);
    });
}

module.exports = { emergencyDatabaseFix };