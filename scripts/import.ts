import {db} from '../server/db';
import {loadContent,importContent} from '../server/content';
try{console.log(await importContent(db,loadContent(process.argv[2])));}finally{await db.$disconnect();}
