/**
 * FTP Synchronization Cron Setup Script
 * 
 * This script helps set up a cron job for automated FTP synchronization.
 * It generates the necessary crontab entries and provides instructions
 * for installing them.
 * 
 * Usage:
 *   node scripts/setup-ftp-cron.js [hourly|daily|weekly]
 * 
 * Examples:
 *   node scripts/setup-ftp-cron.js hourly  # Sync every hour
 *   node scripts/setup-ftp-cron.js daily   # Sync once per day at midnight
 *   node scripts/setup-ftp-cron.js weekly  # Sync once per week on Sunday at midnight
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Get the current working directory
const cwd = process.cwd();

// Check for arguments
const args = process.argv.slice(2);
const scheduleType = args[0] || 'daily';

// Define cron schedules
const cronSchedules = {
  hourly: '0 * * * *',         // At minute 0 of every hour
  daily: '0 0 * * *',          // At 00:00 (midnight) every day
  weekly: '0 0 * * 0',         // At 00:00 on Sunday
  monthly: '0 0 1 * *',        // At 00:00 on the 1st of every month
};

// Ensure the schedule type is valid
if (!cronSchedules[scheduleType]) {
  console.error(`Error: Invalid schedule type: ${scheduleType}`);
  console.error('Valid schedule types: hourly, daily, weekly, monthly');
  process.exit(1);
}

// Create a cron job entry
const syncScriptPath = path.join(cwd, 'scripts', 'synchronize-benton-county-ftp.ts');
const logPath = path.join(cwd, 'logs', 'ftp-cron.log');

// Ensure logs directory exists
if (!fs.existsSync(path.join(cwd, 'logs'))) {
  fs.mkdirSync(path.join(cwd, 'logs'), { recursive: true });
}

// Create cron entry
const cronEntry = `${cronSchedules[scheduleType]} cd ${cwd} && npx tsx ${syncScriptPath} --silent >> ${logPath} 2>&1`;

// Create a temporary file with the cron entry
const tempCronFile = path.join(cwd, 'temp-cron');
fs.writeFileSync(tempCronFile, cronEntry + '\n');

console.log('==================================================');
console.log('FTP Synchronization Cron Setup');
console.log('==================================================');
console.log(`Schedule Type: ${scheduleType}`);
console.log(`Cron Schedule: ${cronSchedules[scheduleType]}`);
console.log(`Command: ${cronEntry}`);
console.log('==================================================');
console.log('\nTo install this cron job, run the following command:');
console.log('\n  crontab -l | cat - temp-cron | crontab -');
console.log('\nTo verify the cron job was installed:');
console.log('\n  crontab -l');
console.log('\nTo remove the temp file after installation:');
console.log('\n  rm temp-cron');
console.log('\n==================================================');

// Optional: Check if cron is installed
try {
  execSync('which cron >/dev/null 2>&1 || which crond >/dev/null 2>&1');
  console.log('✓ Cron service detected on this system');
} catch (error) {
  console.log('⚠ Cron service may not be installed on this system');
  console.log('  You may need to install it with:');
  console.log('  sudo apt-get install cron    # Debian/Ubuntu');
  console.log('  sudo yum install cronie      # RHEL/CentOS');
}

console.log('==================================================');