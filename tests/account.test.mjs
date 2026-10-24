import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
const source = readFileSync(new URL('../app/(member)/profile/actions.js',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'').replaceAll('export async function','async function');
test('account deletion fails closed when the profile role cannot be read',async()=>{
  let deleted=false;
  const c=vm.createContext({LEVELS:[100],redirect(){throw Error('Unexpected redirect');},getServerSupabase:async()=>({auth:{getUser:async()=>({data:{user:{id:'member'}}})},from:()=>({select:()=>({eq:()=>({single:async()=>({data:null,error:{code:'42501'}})})})})}),getAdminSupabase:()=>{deleted=true;return{};}});
  vm.runInContext(source,c);const f=new FormData();f.set('confirm','DELETE');
  assert.ok((await c.deleteAccount(null,f)).message);assert.equal(deleted,false);
});
test('the chairman cannot delete their account before handing over',async()=>{
  let deleted=false;
  const c=vm.createContext({LEVELS:[100],redirect(){throw Error('Unexpected redirect');},getServerSupabase:async()=>({auth:{getUser:async()=>({data:{user:{id:'chair'}}})},from:()=>({select:()=>({eq:()=>({single:async()=>({data:{role:'chairman'},error:null})})})})}),getAdminSupabase:()=>{deleted=true;return{};}});
  vm.runInContext(source,c);const f=new FormData();f.set('confirm','DELETE');
  assert.match((await c.deleteAccount(null,f)).message,/Make someone else admin/);assert.equal(deleted,false);
});
