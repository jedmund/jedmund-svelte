// Simple test to check if project edit page loads correctly
const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    // Go to admin login first (might be needed)
    await page.goto('http://localhost:5173/admin/login');
    await page.waitForTimeout(1000);
    
    // Try to go directly to edit page
    await page.goto('http://localhost:5173/admin/projects/8/edit');
    await page.waitForTimeout(2000);
    
    // Check if title field is populated
    const titleValue = await page.$eval('input[placeholder*="title" i], input[name*="title" i], #title', 
      el => el.value);
    
    console.log('Title field value:', titleValue);
    
    if (titleValue === 'Maitsu') {
      console.log('✅ Form loading works correctly!');
    } else {
      console.log('❌ Form loading failed - title not populated');
    }
    
  } catch (error) {
    console.error('Test failed:', error.message);
  } finally {
    await browser.close();
  }
})();