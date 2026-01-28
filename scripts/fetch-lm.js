// scripts/fetch-lm.js (CommonJS version)
// Mengambil harga 1 gram dari LogamMulia dan menyimpan ke data/prices.json

const fs = require('fs');
const path = require('path');
const https = require('https');

const primary = 'https://www.logammulia.com/id/harga-emas-hari-ini';
const reader  = 'https://r.jina.ai/http://www.logammulia.com/id/harga-emas-hari-ini';
const fallbacks = [
  'https://r.jina.ai/http://www.logammulia.com/en/harga-emas-hari-ini',
  'https://r.jina.ai/http://www.logammulia.com/index.php/harga-emas-hari-ini',
  'https://r.jina.ai/http://emasantam.id/harga-emas-antam-harian/',
  'https://r.jina.ai/http://www.goldpedia.org/pasar/antam/'
];

function grab(url){
  return new Promise((resolve, reject)=>{
    https.get(url, (res)=>{
      if(res.statusCode < 200 || res.statusCode >= 300){
        return reject(new Error('HTTP '+res.statusCode));
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', ()=> resolve(data));
    }).on('error', reject);
  });
}

function parsePrice(text){
  const rx = /(\b1\s*(?:gr|gram)\b)[^\n\r]{0,160}?(?:Rp\s*)?([\d\.,]{6,})/i;
  const m = text.match(rx);
  if(!m) return null;
  const n = +m[2].replace(/[^\d]/g,'');
  return n>1000000 ? n : null;
}

async function main(){
  let price = null, src = null;
  const candidates = [reader, ...fallbacks];
  for(const u of candidates){
    try{
      const t = await grab(u);
      const n = parsePrice(t);
      if(n){ price=n; src=u; break; }
    }catch(e){}
  }
  if(!price){
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
  if(!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'prices.json'), JSON.stringify(payload, null, 2));
  console.log('OK:', payload);
}

main().catch(err=>{ console.error(err); process.exit(1); });
