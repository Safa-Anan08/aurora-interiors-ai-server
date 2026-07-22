const dns = require('dns'); 
dns.setServers(['8.8.8.8', '8.8.4.4']);
require('ts-node').register();
const mongoose = require('mongoose');
const { products } = require('./products.ts');

async function fixPaintColors() {
  await mongoose.connect('mongodb+srv://aurora-interiors-ai:aurora-interiors-ai_098@cluster0.wms0khi.mongodb.net/aurora_interiors_ai?retryWrites=true&w=majority&appName=Cluster0');
  const Product = mongoose.connection.collection('products');
  
  const paintProducts = products.filter(p => p.category === 'paint');
  let updated = 0;
  
  for (const p of paintProducts) {
    if (!p.color) continue;
    const res = await Product.updateOne(
      { name: p.name, category: 'paint' },
      { $set: { color: p.color } }
    );
    if (res.modifiedCount > 0) {
      console.log('Updated color for:', p.name, 'to', p.color);
      updated++;
    }
  }
  
  console.log('Finished updating. Total updated:', updated);
  
  // Verification print
  const allPaints = await Product.find({ category: 'paint' }).toArray();
  console.log('\n--- VERIFICATION ---');
  allPaints.forEach(dbP => {
    console.log(dbP.name.padEnd(35), '->', dbP.color);
  });
  
  process.exit(0);
}

fixPaintColors().catch(console.error);
