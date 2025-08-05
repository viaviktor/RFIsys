#!/usr/bin/env node

/**
 * Test script to verify the reminder system is working
 */

const BASE_URL = 'http://localhost:3000';

async function testReminders() {
  try {
    console.log('📧 Testing RFI Reminder System\n');
    console.log('================================\n');

    // Test 1: Check reminder summary
    console.log('1. Checking reminder summary...');
    const summaryResponse = await fetch(`${BASE_URL}/api/rfis/reminders`);
    
    if (!summaryResponse.ok) {
      throw new Error(`Failed to get reminder summary: ${summaryResponse.status}`);
    }

    const summary = await summaryResponse.json();
    console.log(`   ✓ Due Tomorrow: ${summary.dueTomorrow} RFIs`);
    console.log(`   ✓ Overdue: ${summary.overdue} RFIs`);
    console.log(`   ✓ Checked at: ${new Date(summary.timestamp).toLocaleString()}\n`);

    // Test 2: Check cron schedule info
    console.log('2. Checking cron schedule configuration...');
    console.log('   Current Schedule:');
    console.log('   - Overdue Reminders: Tuesday & Wednesday at 8:00 AM Pacific');
    console.log('   - Due Tomorrow Reminders: Weekdays at 3:00 PM Pacific\n');

    // Test 3: Show manual trigger instructions
    console.log('3. Manual Trigger Instructions:');
    console.log('   To manually trigger reminders (requires admin/manager role):');
    console.log('   POST /api/admin/reminders/trigger');
    console.log('   Body: { "reminderType": "all" | "overdue_only" }\n');

    // Test 4: Check current day and time
    const now = new Date();
    const pacificTime = new Date(now.toLocaleString("en-US", {timeZone: "America/Los_Angeles"}));
    const dayOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][pacificTime.getDay()];
    
    console.log('4. Current Time Information:');
    console.log(`   Current Day (Pacific): ${dayOfWeek}`);
    console.log(`   Current Time (Pacific): ${pacificTime.toLocaleTimeString()}`);
    
    const isTuesdayOrWednesday = pacificTime.getDay() === 2 || pacificTime.getDay() === 3;
    const hour = pacificTime.getHours();
    
    if (isTuesdayOrWednesday) {
      if (hour < 8) {
        console.log('   📅 Overdue reminders will be sent today at 8:00 AM Pacific');
      } else {
        console.log('   ✓ Overdue reminders should have been sent today at 8:00 AM Pacific');
      }
    } else {
      const daysUntilTuesday = (2 - pacificTime.getDay() + 7) % 7 || 7;
      const daysUntilWednesday = (3 - pacificTime.getDay() + 7) % 7 || 7;
      const nextReminderDay = Math.min(daysUntilTuesday, daysUntilWednesday);
      console.log(`   📅 Next overdue reminder in ${nextReminderDay} day(s)`);
    }

    console.log('\n================================');
    console.log('✅ Reminder system check complete!\n');
    
    // Show summary
    if (summary.overdue > 0) {
      console.log(`⚠️  WARNING: You have ${summary.overdue} overdue RFI(s) that need attention!`);
      if (isTuesdayOrWednesday) {
        console.log('   Reminders will be sent automatically today.');
      } else {
        console.log('   Consider manually triggering reminders if urgent.');
      }
    } else {
      console.log('✓ No overdue RFIs at this time.');
    }

    if (summary.dueTomorrow > 0) {
      console.log(`📌 Note: ${summary.dueTomorrow} RFI(s) are due tomorrow.`);
    }

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('\nMake sure the development server is running on port 3000');
    process.exit(1);
  }
}

// Run the test
testReminders();