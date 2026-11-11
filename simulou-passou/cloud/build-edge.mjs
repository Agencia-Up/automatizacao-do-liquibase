import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const productImage=readFileSync(resolve(root,'public/simulou-passou-logo.png')).toString('base64');
const files=[{name:'index.ts',content:readFileSync(resolve(root,'cloud/edge-index.ts'),'utf8')},
  {name:'checkout-image.mjs',content:'export default '+JSON.stringify(productImage)+';\n'},
  {name:'gateway.mjs',content:readFileSync(resolve(root,'cloud/gateway.mjs'),'utf8').replace("'../server.mjs'","'./runtime/server.mjs'").replace("'../seed.mjs'","'./runtime/seed.mjs'")},
  {name:'checkout.mjs',content:readFileSync(resolve(root,'cloud/checkout.mjs'),'utf8')},
  {name:'account-mail.mjs',content:readFileSync(resolve(root,'cloud/account-mail.mjs'),'utf8')},
  ...['server.mjs','seed.mjs','workspace.mjs'].map(file=>({name:'runtime/'+file,content:readFileSync(resolve(root,file),'utf8')}))];
mkdirSync(resolve(root,'dist'),{recursive:true});
writeFileSync(resolve(root,'dist/edge-files.json'),JSON.stringify(files));
console.log('Edge package generated from canonical runtime:',files.map(f=>f.name).join(', '));
