import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {execFileSync,spawnSync} from 'node:child_process';
const script=resolve('.github/task-base.py');
test('CI keeps an explicit same-task baseline and rejects invalid trailers',()=>{
 const dir=mkdtempSync(join(tmpdir(),'hours-base-'));
 const git=(...args)=>execFileSync('git',args,{cwd:dir,encoding:'utf8'}).trim();
 const commit=message=>git('-c','user.name=Test','-c','user.email=test@example.invalid','commit','--allow-empty','-m',message);
 const run=()=>spawnSync('python3',[script],{cwd:dir,encoding:'utf8'});
 try {
  git('init','--quiet','-b','main');commit('base');const base=git('rev-parse','HEAD');
  commit('first change');assert.equal(run().stdout.trim(),base);
  commit('same task\n\nTask-Base: '+base);assert.equal(run().stdout.trim(),base);
  commit('bad\n\nTask-Base: latest');assert.notEqual(run().status,0);
  commit('bad\n\nTask-Base: '+base+'\nTask-Base: '+base);assert.notEqual(run().status,0);
  git('checkout','--orphan','unrelated');commit('unrelated');const unrelated=git('rev-parse','HEAD');
  git('checkout','main');commit('bad\n\nTask-Base: '+unrelated);assert.notEqual(run().status,0);
 } finally {rmSync(dir,{recursive:true,force:true});}
});
