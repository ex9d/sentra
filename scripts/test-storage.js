const { storageService } = require('../out/main/StorageService-BdIw7GLz.js');
console.log('[TEST] storage path', storageService.path);
console.log('[TEST] initial accounts', storageService.getAccounts());
storageService.setAccounts([{id:'1',userId:'1',cookie:'',displayName:'Test'}]);
console.log('[TEST] after set', storageService.getAccounts());
const fs = require('fs');
console.log('[TEST] file content', fs.readFileSync(storageService.path,'utf-8'));
process.exit(0);
