import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {execFileSync} from 'node:child_process';
test('GAS startup uses a classic script after all editor elements exist',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'hours-build-'));
 try{
  execFileSync(process.execPath,['scripts/build-gas.mjs',dir]);
  const html=fs.readFileSync(path.join(dir,'SpecialHoursUI.html'),'utf8');
  assert.doesNotMatch(html,/<script[^>]*(?:type="module"|src=)/);
  const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  assert.equal(scripts.length,1);
  assert.ok(scripts[0].index>html.indexOf('id="apply-confirm"'));
  assert.ok(scripts[0].index<html.indexOf('</body>'));
  new vm.Script(scripts[0][1]);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
