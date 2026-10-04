import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_STORE_ID,STORES,getStore,storeIdFromSearch,launchUrlForStore} from '../stores.js';
test('店舗切替はTattooを既定値にし未知のIDを拒否',()=>{assert.equal(DEFAULT_STORE_ID,'tattoo');assert.equal(storeIdFromSearch(''),'tattoo');assert.equal(storeIdFromSearch('?store=spa'),'spa');assert.equal(storeIdFromSearch('?store=unknown'),'tattoo');assert.equal(getStore('unknown').id,'tattoo');});
test('Tattooだけ接続済みでSpaはAPI承認待ち',()=>{assert.equal(STORES.tattoo.status,'ready');assert.match(launchUrlForStore('tattoo'),/^https:\/\/script\.google\.com\/macros\/s\/AKfy.+\/exec\?store=tattoo$/);assert.equal(STORES.spa.status,'pending-api');assert.equal(launchUrlForStore('spa'),'');});
