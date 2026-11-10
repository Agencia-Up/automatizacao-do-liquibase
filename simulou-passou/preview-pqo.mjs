import {createApp} from './server.mjs';
import {seed} from './seed.mjs';
import {installPqoCatalog} from './pqo-catalog.mjs';

const port=Number(process.env.PORT||4188);
const {server}=createApp({dataFile:null,initialDb:installPqoCatalog(seed())});
server.listen(port,'127.0.0.1',()=>console.log('Prévia PQO: http://127.0.0.1:'+port+'/'));
