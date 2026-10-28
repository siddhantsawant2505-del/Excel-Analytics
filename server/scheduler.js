import cron from 'node-cron';
import fs from 'fs';
import path from 'path';

const UPLOAD_DIR = path.resolve('uploads');

// Scheduled maintenance: runs every Sunday at 2 AM
cron.schedule('0 2 * * 0', async () => {
  console.log('⏰ Running scheduled platform maintenance...');

  try {
    // Clean up abandoned temp files older than 24 hours in upload directory
    if (fs.existsSync(UPLOAD_DIR)) {
      const files = fs.readdirSync(UPLOAD_DIR);
      const now = Date.now();
      const oneDayMs = 24 * 60 * 60 * 1000;

      let cleaned = 0;
      for (const file of files) {
        if (file === '.gitkeep') continue;
        const filePath = path.join(UPLOAD_DIR, file);
        try {
          const stats = fs.statSync(filePath);
          if (now - stats.mtimeMs > oneDayMs && file.startsWith('temp-')) {
            fs.unlinkSync(filePath);
            cleaned++;
          }
        } catch {
          // Ignore individual file stat/unlink errors
        }
      }
      if (cleaned > 0) {
        console.log(`🧹 Cleaned up ${cleaned} temporary upload files.`);
      }
    }
    console.log('✅ Scheduled platform maintenance completed.');
  } catch (error) {
    console.error('❌ Error during scheduled maintenance:', error.message);
  }
});
