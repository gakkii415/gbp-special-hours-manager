import fs from 'node:fs';
import path from 'node:path';
const root=new URL('../',import.meta.url);
const read=name=>fs.readFileSync(new URL(name,root),'utf8');
const target=process.argv[2];if(!target)throw Error('Output directory is required.');
const backendStoreId=process.argv[3]||'tattoo';if(!['tattoo','spa'].includes(backendStoreId))throw Error('Backend store must be tattoo or spa.');
const stores=read('stores.js').replaceAll('export const ','const ').replaceAll('export function ','function ');
const hours=read('hours.js').replaceAll('export function ','function ');
const app=read('app.js').replace(/^import .*?;\nimport .*?;\n/,'');
// HtmlService loads classic scripts; put startup after the actual DOM and bind the build to one backend store.
const script='<script>\n(()=>{\nwindow.__GBP_BACKEND_STORE_ID__='+JSON.stringify(backendStoreId)+';\n'+stores+'\n'+hours+'\n'+app+'\n})();\n</script>';
let html=read('index.html')
  .replace('<link rel="stylesheet" href="style.css">',()=>'<style>'+read('style.css')+'</style>')
  .replace('<script type="module" src="app.js"></script>','')
  .replace('</body>',()=>script+'\n</body>');
if(html.includes('</script>\n</script>'))throw Error('Unexpected script content');
fs.mkdirSync(target,{recursive:true});fs.writeFileSync(path.join(target,'SpecialHoursUI.html'),html);
fs.writeFileSync(path.join(target,'SpecialHoursRules.js'),hours);
