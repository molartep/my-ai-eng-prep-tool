import {db} from './db';
import {createApp} from './app';
const port=Number(process.env.PORT||3000);
if(!Number.isInteger(port)||port<1024||port>65535)throw Error('PORT must be an integer between 1024 and 65535.');
await db.$queryRaw`SELECT 1`;
const server=createApp(db).listen(port,'127.0.0.1',()=>console.log(`AI Engineering Prep → http://127.0.0.1:${port}`));
const stop=()=>{server.close(()=>void db.$disconnect().then(()=>process.exit(0)));};
process.on('SIGINT',stop);process.on('SIGTERM',stop);
