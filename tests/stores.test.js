import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_STORE_ID,STORES,getStore,storeIdFromSearch,launchUrlForStore,initialStoreId} from '../stores.js';
test('店舗切替はSpaを既定値にし未知のIDを拒否',()=>{assert.equal(DEFAULT_STORE_ID,'spa');assert.equal(storeIdFromSearch(''),'spa');assert.equal(storeIdFromSearch('?store=spa'),'spa');assert.equal(storeIdFromSearch('?store=unknown'),'spa');assert.equal(getStore('unknown').id,'spa');});
test('両店舗は一つの管理画面に接続し選択店舗だけを渡す',()=>{assert.equal(STORES.tattoo.status,'ready');assert.match(launchUrlForStore('tattoo'),/^https:\/\/script\.google\.com\/macros\/s\/AKfy.+\/exec\?store=tattoo$/);assert.equal(STORES.spa.status,'ready');assert.match(launchUrlForStore('spa'),/^https:\/\/script\.google\.com\/macros\/s\/AKfy.+\/exec\?store=spa$/);assert.equal(new URL(launchUrlForStore('spa')).pathname,new URL(launchUrlForStore('tattoo')).pathname);});

test('共通入口はスパを既定とし明示選択を尊重、単独スパ入口はスパに固定',()=>{assert.equal(initialStoreId('','spa'),'spa');assert.equal(initialStoreId('?store=tattoo','spa'),'spa');assert.equal(initialStoreId('?store=spa','tattoo'),'spa');assert.equal(initialStoreId('?store=spa'),'spa');});

test('共通入口の初期表示はスパ、明示指定時はタトゥー',()=>{assert.equal(initialStoreId('','tattoo'),'spa');assert.equal(initialStoreId('?store=tattoo','tattoo'),'tattoo');});
