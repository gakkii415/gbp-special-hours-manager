import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
test('GAS buildは店舗ごとのbackend IDを埋め込む',()=>{for(const store of ['tattoo','spa']){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'gbp-hours-'));execFileSync(process.execPath,['scripts/build-gas.mjs',dir,store]);const html=fs.readFileSync(path.join(dir,'SpecialHoursUI.html'),'utf8');assert.match(html,new RegExp(`__GBP_BACKEND_STORE_ID__=${JSON.stringify(store)}`));assert.match(html,/data-store="tattoo"/);assert.match(html,/data-store="spa"/);}});
