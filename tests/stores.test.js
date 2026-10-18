import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_STORE_ID,STORES,getStore,storeIdFromSearch,launchUrlForStore,initialStoreId} from '../stores.js';
test('店舗切替はTattooを既定値にし未知のIDを拒否',()=>{assert.equal(DEFAULT_STORE_ID,'tattoo');assert.equal(storeIdFromSearch(''),'tattoo');assert.equal(storeIdFromSearch('?store=spa'),'spa');assert.equal(storeIdFromSearch('?store=unknown'),'tattoo');assert.equal(getStore('unknown').id,'tattoo');});
test('両店舗は別々の専用GASへ接続する',()=>{assert.equal(STORES.tattoo.status,'ready');assert.match(launchUrlForStore('tattoo'),/^https:\/\/script\.google\.com\/macros\/s\/AKfy.+\/exec\?store=tattoo$/);assert.equal(STORES.spa.status,'ready');assert.match(launchUrlForStore('spa'),/^https:\/\/script\.google\.com\/macros\/s\/AKfy.+\/exec\?store=spa$/);assert.notEqual(STORES.spa.launchUrl,STORES.tattoo.launchUrl);});

test('GAS画面はiframeのURLや既定店舗に依存せず実行元の店舗を選ぶ',()=>{assert.equal(initialStoreId('','spa'),'spa');assert.equal(initialStoreId('?store=tattoo','spa'),'spa');assert.equal(initialStoreId('?store=spa','tattoo'),'tattoo');assert.equal(initialStoreId('?store=spa'),'spa');});
