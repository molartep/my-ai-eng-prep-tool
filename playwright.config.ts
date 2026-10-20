import path from 'node:path';
import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'./tests/browser',timeout:30000,fullyParallel:false,workers:1,use:{baseURL:'http://127.0.0.1:3000',headless:true,launchOptions:{executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'},viewport:{width:1440,height:1100},screenshot:'only-on-failure'},webServer:{command:'node scripts/start.mjs',url:'http://127.0.0.1:3000/api/health',reuseExistingServer:false,env:{DATABASE_URL:`file:${path.resolve('data/e2e.db')}`},timeout:60000}});
