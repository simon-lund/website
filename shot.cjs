const puppeteer = require('/home/simon/.npm/_npx/668c188756b835f3/node_modules/puppeteer-core');
(async () => {
  const browser = await puppeteer.launch({ executablePath:'/usr/bin/google-chrome', headless:'new',
    args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--window-size=1400,1000'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 1000, deviceScaleFactor: 2 });
  await page.goto('http://localhost:4329/', { waitUntil:'networkidle0', timeout:30000 });
  await page.waitForSelector('canvas', { timeout:15000 });
  await new Promise(r=>setTimeout(r,1500));
  await (await page.$('canvas')).screenshot({ path: process.argv[2] || '/tmp/current.png' });
  await browser.close();
})().catch(e=>{console.error(e.message);process.exit(1);});
