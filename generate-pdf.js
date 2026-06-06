const fs = require('fs');
const path = require('path');

// Intentar usar la mejor librería disponible
let converter;

try {
  // Intenta con html-pdf-node (mejor para estilos CSS)
  const nodeHtmlToImage = require('node-html-to-image');
  const html = fs.readFileSync('./PRESENTACION_DEALERS.html', 'utf8');
  
  nodeHtmlToImage({
    output: './PRESENTACION_DEALERS.pdf',
    html: html,
    puppeteerArgs: {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
  }).then(() => console.log('✅ PDF generado: PRESENTACION_DEALERS.pdf'))
    .catch(err => console.error('Error:', err));
    
} catch (e1) {
  try {
    // Alternativa: html-pdf
    const pdf = require('html-pdf');
    const html = fs.readFileSync('./PRESENTACION_DEALERS.html', 'utf8');
    
    const options = {
      format: 'Letter',
      margin: {
        top: '0.5in',
        right: '0.5in',
        bottom: '0.5in',
        left: '0.5in'
      },
      timeout: 30000,
      phantomPath: null
    };
    
    pdf.create(html, options).toFile('./PRESENTACION_DEALERS.pdf', (err, res) => {
      if (err) throw new Error('Error con html-pdf: ' + err.message);
      console.log('✅ PDF generado: PRESENTACION_DEALERS.pdf');
    });
    
  } catch (e2) {
    console.log('Advertencia: Se necesitan dependencias adicionales');
    console.log('Ejecuta: npm install html-pdf');
    console.log('O: npm install node-html-to-image');
  }
}
