const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const pngToIco = require('png-to-ico');

async function run() {
  const src = process.argv[2] || 'public/gas.png';
  const tmp = path.join(__dirname, '.tmp_oneoff');
  const publicDir = path.join(__dirname, '..', 'public');
  if (!fs.existsSync(tmp)) fs.mkdirSync(tmp);
  const initial = path.join(tmp, 'initial.png');
  await sharp(src).resize(512,512,{fit:'contain',background:{r:255,g:255,b:255,alpha:0}}).png().toFile(initial);
  const sizes = [16,32,48,64,96,128,180,192,256,512];
  for (const s of sizes) {
    await sharp(initial).resize(s,s,{fit:'contain',background:{r:255,g:255,b:255,alpha:0}}).png().toFile(path.join(publicDir, `favicon-${s}.png`));
  }
  const icoPngs = [16,32,48,64].map(s => path.join(publicDir, `favicon-${s}.png`));
  const ico = await pngToIco(icoPngs);
  fs.writeFileSync(path.join(publicDir,'favicon.ico'), ico);
  fs.copyFileSync(path.join(publicDir,'favicon-180.png'), path.join(publicDir,'apple-touch-icon.png'));
  // cleanup tmp
  try { fs.unlinkSync(initial); fs.rmdirSync(tmp); } catch (e) {}
  console.log('One-off favicon generation complete');
}
run().catch(e=>{console.error('One-off generator failed',e); process.exit(1);});
