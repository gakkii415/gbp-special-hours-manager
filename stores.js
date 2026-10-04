export const DEFAULT_STORE_ID='tattoo';
export const STORES=Object.freeze({
 tattoo:Object.freeze({id:'tattoo',label:'Tattoo',name:'Mea Tattoo Studio',launchUrl:'https://script.google.com/macros/s/AKfycbwCKYr82MK3MoKCfh34WYqY_308QZEaWy10tCmgV6fBz9odMo8r7hm6iaXgVRBBzpTg2g/exec',status:'ready'}),
 spa:Object.freeze({id:'spa',label:'Spa',name:'Spa Ease Kyoto',launchUrl:'',status:'pending-api'})
});
export function getStore(id){return STORES[id]||STORES[DEFAULT_STORE_ID];}
export function storeIdFromSearch(search=''){const id=new URLSearchParams(search).get('store');return Object.hasOwn(STORES,id)?id:DEFAULT_STORE_ID;}
export function launchUrlForStore(id){
 const store=getStore(id);if(!store.launchUrl)return '';
 try{const url=new URL(store.launchUrl);if(url.protocol!=='https:'||url.hostname!=='script.google.com'||!/^\/macros\/s\/AKfy[A-Za-z0-9_-]+\/exec$/.test(url.pathname))return '';url.searchParams.set('store',store.id);return url.toString();}catch{return '';}
}
