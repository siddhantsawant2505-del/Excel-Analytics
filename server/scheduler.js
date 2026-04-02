// server/scheduler.js
import cron from 'node-cron';
import fs from 'fs';

// ⏰ Every Sunday at 2 AM — run scheduled report task
cron.schedule('0 2 * * 0', () => {
  console.log('🧠 Scheduled Analysis Running...');

  try {
    // Placeholder logic: Simulate a task
    const logMessage = `Report generated at ${new Date().toLocaleString()}\n`;
    fs.appendFileSync('report-log.txt', logMessage);
    console.log('✅ Scheduled report created.');
  } catch (error) {
    console.error('❌ Error during scheduled task:', error.message);
  }
});
