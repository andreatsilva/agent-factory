import assert from 'node:assert/strict';
export const marketFixture=`<div class="game_cell has_cover"><div class="game_title"><a href="https://example.itch.io/pixel-one">Pixel Editor One</a><div class="price_value">$19.99</div></div><div class="game_text">Sprite and pixel drawing software</div></div><div class="game_cell has_cover"><div class="game_title"><a href="https://example.itch.io/sprite-two">Sprite Tool Two</a><div class="price_value">$15</div></div><div class="game_text">Pixel workflow utility</div></div><div class="game_cell has_cover"><div class="game_title"><a href="https://example.itch.io/other">Video Player</a><div class="price_value">$5</div></div><div class="game_text">Video software</div></div>`;
export function upstream(){
 const state={calls:[],offline:false,networkDown:false,paid:false,amount:2000,product:null,block:false,loaded:[],badAI:false,badCoder:false,reject:false};
 state.fetch=async(url,init={})=>{
  state.calls.push({url,...init});const reply=x=>new Response(JSON.stringify(x),{status:200});
  if(url.includes('11434')){
   if(state.offline)throw Error('offline');
   if(url.endsWith('/tags'))return reply({models:[{name:'qwen3:8b'},{name:'qwen2.5-coder:7b'}]});
   if(url.endsWith('/ps'))return reply({models:state.loaded.map(name=>({name}))});
   const body=JSON.parse(init.body);if(!body.prompt){state.loaded=state.loaded.filter(m=>m!==body.model);return reply({done:true});}
   if(state.block)await new Promise((resolve,reject)=>init.signal.addEventListener('abort',()=>reject(Error('paused')),{once:true}));
   if(body.format)return reply({prompt_eval_count:400,eval_count:120,response:state.badAI||(state.badCoder&&body.model.includes('coder'))?'not json':JSON.stringify(body.model.includes('coder')?{steps:['Open the included workbench in a modern browser.','Load your own licensed sprite image using the import control.','Set frame width, height, margin and spacing in whole pixels.','Export the selected frame as PNG and all coordinates as JSON.','Extract and export the palette, then complete the release checklist.']}:{approved:!state.reject,reason:state.reject?'Insufficient differentiation for the proposed price.':'A focused original offline utility fits the observed paid format.',neo_score:state.reject?35:82})});
   return reply({response:'NEO LOCAL AI READY'});
  }
  if(url.includes('itch.io')){if(state.networkDown)throw Error('network down');return new Response(url.endsWith('/robots.txt')?'User-agent: *\nDisallow: /search':marketFixture);}
  if(url.includes('algolia')){if(state.networkDown)throw Error('network down');return reply({hits:[{title:'Sprite sheet tool pain points',url:'https://example.org/sprites',objectID:'123',points:99,num_comments:12},{title:'<img src=x onerror=alert(1)> pixel workflow',url:'https://example.org/pixels',objectID:'124',points:50,num_comments:3}]});}
  if(url.endsWith('checkout/sessions')){const b=new URLSearchParams(init.body);assert.equal(b.get('line_items[0][price_data][unit_amount]'),'2000');assert.equal(b.get('line_items[0][price_data][currency]'),'eur');state.product=b.get('metadata[product_id]');return reply({id:'cs_test_fixture',url:state.checkoutUrl||'https://checkout.stripe.com/test-fixture'});}
  if(url.includes('checkout/sessions/'))return reply({payment_status:state.paid?'paid':'unpaid',amount_total:state.amount,currency:'eur',metadata:{product_id:state.product},customer_details:{email:'buyer@example.org'}});
  throw Error('Unexpected upstream '+url);
 };return state;
}
