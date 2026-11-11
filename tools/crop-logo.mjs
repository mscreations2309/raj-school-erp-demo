import sharp from 'sharp';
const src = process.argv[2], dst = process.argv[3];
const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
let minX = info.width, maxX = 0, minY = info.height, maxY = 0;
for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
  const i = (y * info.width + x) * 4;
  if (data[i + 3] > 20 && data[i] + data[i + 1] + data[i + 2] < 720) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
}
console.log(info.width, info.height, { minX, maxX, minY, maxY });
const w = maxX - minX + 1, h = maxY - minY + 1, side = Math.max(w, h);
await sharp(src).extract({ left: minX, top: minY, width: w, height: h })
  .extend({ top: Math.floor((side - h) / 2), bottom: Math.ceil((side - h) / 2), left: Math.floor((side - w) / 2), right: Math.ceil((side - w) / 2), background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .resize(256, 256).png().toFile(dst);
console.log('saved', dst);
