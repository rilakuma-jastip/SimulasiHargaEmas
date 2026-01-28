// scripts/fetch-lm.js
// Mengambil harga 1 gram dari halaman resmi LogamMulia setiap hari dan menyimpan ke data/prices.json
// Jadwal diatur melalui GitHub Actions (lihat .github/workflows/update-lm.yml)

import fs from 'fs';
import path from 'path';

const primary = 'https://www.logammulia.com/id/harga-emas-hari-ini';
const reader = 'https://r.jina.ai/http://www.logammulia.com/id/harga-emas-hari-ini';
const fallbacks = [
  'https://r.jina.ai/http://www.logammulia.com/en/harga-emas-hari-ini',
  'https://r.jina.ai/http://www.logammulia.com/index.php/harga-emas-hari-ini',
  'https://r.jina.ai/http://emasantam.id/harga-emas-antam-harian/',
  'https://r.jina.ai/http://www.goldpedia.org/pasar/antam/'
];

async function grab(url){
  const res = await fetch(url, { cache: 'no-store', redirect: 'follow' });
  if(!res.ok) throw new Error('HTTP '+res.status);
  return await res.text();
}

function parsePrice(text){
  // Cari baris 1 gr / 1 gram
  const rx = /(1\s*(?:gr|gram))[^
]{0,160}?(?:Rp\s*)?([\d\.,]{6,})/i;
  const m = text.match(rx);
  if(!m) return null;
  const n = +m[2].replace(/[^\d]/g,'');
  if(n>1000000) return n;
  return null;
}

async function main(){
  let price = null, src = null;
  const candidates = [reader, ...fallbacks];
  for(const u of candidates){
    try{
      const t = await grab(u);
      const n = parsePrice(t);
      if(n){ price=n; src=u; break; }
    }catch(e){ /* try next */ }
  }
  if(!price){
    // Terakhir, coba langsung primary tanpa reader
    try{
      const t = await grab(primary);
      const n = parsePrice(t);
      if(n){ price=n; src=primary; }
    }catch(e){}
  }
  if(!price) throw new Error('Harga 1g tidak ditemukan');

  const payload = {
    source: 'logammulia',
    source_url: src,
    extracted_at: new Date().toISOString(),
    price_1g: price,
    currency: 'IDR'
  };

  const outDir = path.join('data');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'prices.json'), JSON.stringify(payload, null, 2));
  console.log('OK:', payload);
}

await main();
