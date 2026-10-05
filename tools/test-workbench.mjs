import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
const require = createRequire(`${process.argv[2] || process.cwd()}/package.json`);
const { JSDOM } = require('jsdom');
const { indexedDB } = require('fake-indexeddb');
const dom = new JSDOM('<div id="extensionsMenu"></div><div id="leftSendForm"></div>', { url: 'https://test.invalid/' });
let active, writes = 0, readback = true;
const prompts = [], persisted = new Map();
const sandbox = { window: dom.window, document: dom.window.document, DOMParser: dom.window.DOMParser, Image:dom.window.Image,
    URL, console: { ...console, error() {} }, structuredClone, indexedDB, setTimeout, clearTimeout,
    SillyTavern: { getContext: () => active },
    fetch: async (_url,options) => ({ok:true,json:async()=> readback ? persisted.get(JSON.parse(options.body).file_name || JSON.parse(options.body).id) || [] : []}),
    MutationObserver: dom.window.MutationObserver, requestAnimationFrame: callback => callback(),
    BUILTIN_COVER_LIBRARY: [], COVER_LIBRARY_VERSION: 2, assignBuiltinCoverKeys() {}, resolveBuiltinCover() {},
};
sandbox.window.SillyTavern = sandbox.SillyTavern;
vm.createContext(sandbox);
const root = new URL('../', import.meta.url);
const helpers = ['html-draft.js','work-store.js','generation-context.js','visual-guidance.js'].map(file=>fs.readFileSync(new URL(file,root),'utf8').replace(/export (async )?function/g,'$1function')).join('\n');
const source = fs.readFileSync(new URL('index.js', root), 'utf8')
    .replace(/import[\s\S]*?from\s+'[^']+';/g, '')
    .replaceAll('import.meta.url', JSON.stringify(new URL('index.js', root).href))
    .replace(/export \{[^}]+\};/, '');
vm.runInContext(helpers + '\n' + source, sandbox);
const run = code => vm.runInContext(code,sandbox);
const context = (name, text) => ({
    name1: '用户', name2: name, characterId:0, characters:[{name,avatar:`${name}.png`}], chatId: name,
    chat: [{ is_user: true, mes: text }], extensionSettings: {}, saveSettingsDebounced() {},
    getCharacterCardFields: () => ({ description: name }),
    substituteParams: text => text.replaceAll('{{char}}', name).replaceAll('{{user}}', '用户'),
    generateRaw: async args => { prompts.push(args); return '<h1 style="text-decoration:underline!important">番外</h1><p>完整正文</p>'; },
    addOneMessage() { writes++; }, getRequestHeaders:()=>({'Content-Type':'application/json'}),
    async saveChat() { persisted.set(this.chatId,structuredClone(this.chat)); },
});
active = context('角色甲', '旧聊天内容');
run('settings = clone(DEFAULT_SETTINGS)');
await run("startPerformance({id:'test',title:'测试',description:'编辑后的情节',prompt:'剧目设定'}, 'static', true)");
active = context('角色乙', '新的上下文');
await run("startPerformance({id:'test',title:'测试乙',description:'编辑后的情节',prompt:'剧目设定'}, 'dynamic', true)");
assert.equal(writes, 0);
assert.equal(active.chat.length, 1);
assert.match(JSON.stringify(prompts[0]), /旧聊天内容/);
assert.match(JSON.stringify(prompts[1]), /新的上下文/);
assert.doesNotMatch(JSON.stringify(prompts[1]), /旧聊天内容/);
assert.match(JSON.stringify(prompts[1]), /编辑后的情节/);
assert.match(prompts[1].systemPrompt, /一次完成[^。]*明确结局/);
assert.match(prompts[1].prompt.at(-2).content, /明确结局/);
assert.equal(prompts[1].prompt.at(-2).role, 'user');
assert.equal(prompts[1].prompt.at(-1).role, 'system');
assert.match(prompts[1].prompt.at(-1).content, /最终阅读设计要求/);
assert.doesNotMatch(prompts[1].prompt.slice(0,-1).map(message=>message.content).join('\n'), /最终阅读设计要求/);
assert.equal(run('works.length'), 2);
assert.equal(run('session.work.chatId'), '角色乙');
const before = run('works.length');
active.generateRaw = async () => '';
await run("startPerformance({id:'test',title:'空响应',prompt:'test'}, 'static', true)");
assert.equal(run('works.length'), before);
assert.equal(run('generationInFlight'), false);
const safe = run(`prepareHtmlDraft('<script>alert(1)</script><a href="https://example.com" onclick="evil()" style="text-decoration:underline!important">正文</a><iframe src="https://example.com"></iframe>')`);
const cleaned = new JSDOM(safe).window.document;
assert.throws(()=>run(`prepareHtmlDraft('<!doctype html><html><body><p>输出到一半')`),/尚未写完/);
assert.equal(cleaned.querySelector('script,iframe,[onclick],[href]'), null);
assert.equal(cleaned.querySelector('a').style.textDecoration, 'none');
assert.match(cleaned.querySelector('style').textContent,/scrollbar-width:none!important/);
assert.match(cleaned.querySelector('style').textContent,/\*::-webkit-scrollbar/);
assert.match(cleaned.querySelector('meta[http-equiv]').content, /default-src 'none'/);
assert.equal(cleaned.querySelector('meta[charset]').getAttribute('charset'),'utf-8');
assert.equal(new JSDOM(run(`prepareHtmlDraft(${JSON.stringify(safe)})`)).window.document.querySelectorAll('style[data-theatre-base]').length,1);
const styled = new JSDOM(run(`prepareHtmlDraft('<html><head><style>body{background:#142333;color:#eee;padding:0;max-width:none}h1{font-size:34px}</style></head><body><h1>AI 排版</h1><p>正文</p></body></html>')`)).window.document;
assert.equal(styled.querySelectorAll('style')[0].dataset.theatreBase,'true');
assert.match(styled.querySelectorAll('style')[1].textContent,/background:#142333/);
assert.doesNotMatch(styled.querySelectorAll('style')[0].textContent,/max-width:860px|padding:clamp/);
// Keep static model artwork and complete frames through import and export.
const art = new JSDOM(run(`prepareHtmlDraft('<html><body><figure style="border:1px solid #777"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 80" onload="evil()"><defs><linearGradient id="metal"><stop offset="0" stop-color="#ddd"/></linearGradient></defs><rect width="120" height="80" fill="url(#metal)"/><path d="M0 0L50 20" stroke="#111"/><circle r="2" fill="url(https://example.com/track)"/><use href="https://example.com/remote.svg#x"/><image href="https://example.com/track"/><foreignObject><div>unsafe</div></foreignObject><animate attributeName="href"/><script>evil()</script></svg></figure><hr><p>故事结尾</p></body></html>')`)).window.document;
assert.equal(art.querySelector('figure').style.borderBottomWidth,'1px');
assert.equal(art.querySelector('svg').getAttribute('viewBox'),'0 0 120 80');
assert.equal(art.querySelector('rect').getAttribute('fill'),'url(#metal)');
assert.equal(art.querySelector('circle').hasAttribute('fill'),false);
assert.ok(art.querySelector('linearGradient stop') && art.querySelector('path') && art.querySelector('hr'));
assert.equal(art.querySelector('script,use,image,foreignObject,animate,[onload],[href]'),null);
assert.doesNotMatch(art.querySelector('style[data-theatre-base]').textContent,/border-bottom:0|hr\{display:none/);
assert.equal(run("draftText(textDraft('编辑后的第一段。\\n\\n第二段结局。','第一篇'))"),'编辑后的第一段。\n\n第二段结局。');

// Regression: old character/chat budgets silently removed the earliest context.
sandbox.longContext = {
    ...context('完整角色', '最早一条必须保留'), maxContext: 4096,
    getCharacterCardFields: () => ({description:'角色资料开头' + '设定'.repeat(16000) + '角色资料末尾'}),
    chat: [{is_user:true,mes:'最早一条必须保留'}, {is_user:false,mes:'长消息开头'+'剧情'.repeat(50000)+'长消息末尾'},
        {is_user:true,mes:'最新一条必须保留'}, {is_user:false,mes:'旧番外不能混入',extra:{interludeTheatre:{workId:'old'}}}],
};
const fullSystem = run('buildCharacterSystemPrompt(longContext,true)');
assert.ok(fullSystem.length > 24000);
assert.match(fullSystem,/角色资料末尾/);
const fullMessages = run("buildGenerationMessages(longContext,{title:'完整',prompt:'写完故事'},'static',true,{previousText:'前篇开头'+'前文'.repeat(50000)+'前篇末尾',sequel:'后续要求'})");
assert.equal(fullMessages.length,5);
assert.match(fullMessages[0].content,/最早一条必须保留/);
assert.ok(fullMessages[1].content.includes('长消息开头') && fullMessages[1].content.endsWith('长消息末尾'));
assert.match(fullMessages.at(-2).content,/前篇末尾/);
assert.equal(fullMessages.at(-1).role,'system');
assert.match(fullMessages.at(-1).content,/最终阅读设计要求/);
assert.doesNotMatch(JSON.stringify(fullMessages),/旧番外不能混入/);
assert.equal(run("buildGenerationMessages(longContext,{title:'独立',prompt:'故事'},'static',false).length"),2);
const plainMessages = run("buildGenerationMessages(longContext,{title:'独立',prompt:'故事'},'off',false)");
assert.equal(plainMessages.at(-1).role,'system');
assert.match(plainMessages.at(-1).content,/简洁文字排版/);
assert.match(plainMessages.at(-1).content,/HTML/);
assert.doesNotMatch(plainMessages.at(-1).content,/视觉母题/);
sandbox.sourceContext = {...context('完整角色','聊天'), chatMetadata:{world_info:'聊天书'},
    powerUserSettings:{persona_description_lorebook:'用户书'},
    characters:[{name:'完整角色',avatar:'角色.png',data:{extensions:{world:'角色书'}}}],
    chatCompletionSettings:{prompts:[{identifier:'on',role:'system',content:'启用预设末尾'}, {identifier:'off',content:'关闭预设'}, {identifier:'normal',content:'仅常规生成',injection_trigger:['normal']}],
        prompt_order:[{character_id:100001,order:[{identifier:'on',enabled:true},{identifier:'off',enabled:false},{identifier:'normal',enabled:true}]}]},
    extensionPrompts:{note:{position:1,role:0,value:'作者注释'},hidden:{position:-1,value:'隐藏注释'},filtered:{position:0,value:'过滤注释',filter:async()=>false}},
};
const loadedBooks=[];
sandbox.worldFixture = {selected_world_info:['全局书','角色书'],world_info:{charLore:[{name:'角色',extraBooks:['附加书']}]},
    loadWorldInfo:async name=>{loadedBooks.push(name);return {entries:{on:{uid:1,content:name+'完整内容末尾'},off:{disable:true,content:'关闭条目'}}};}};
const sources=await run('loadGenerationSources(sourceContext,worldFixture)');
assert.equal(new Set(loadedBooks).size,5);
assert.equal(loadedBooks.length,5);
assert.match(JSON.stringify(sources),/启用预设末尾/);
assert.match(JSON.stringify(sources),/作者注释/);
for(const name of ['全局书','角色书','附加书','聊天书','用户书']) assert.ok(JSON.stringify(sources).includes(name+'完整内容末尾'));
assert.doesNotMatch(JSON.stringify(sources),/关闭预设|仅常规生成|关闭条目|隐藏注释|过滤注释/);
sandbox.worldFixture.loadWorldInfo = async()=>null;
await assert.rejects(run('loadGenerationSources(sourceContext,worldFixture)'),/世界书.*读取失败/);

run("session.work.chapters[0].editText='用户编辑的故事结局'; session.dirty=true; session.work.favorite=true");
assert.equal(await run('saveCurrentWork(false)'),true);
assert.equal(run('session.work.revision'),2);
run('session=null; worksReady=null');
await run('ensureWorks()');
assert.match(run('session.work.chapters[0].html'),/用户编辑的故事结局/);
assert.equal(run('session.work.favorite'),true);
const originalHtml = run('session.work.chapters[0].html');
active.generateRaw = async args => {prompts.push(args);return '<p>后来，两人再次相遇，结束了新的冒险。</p>';};
await run("startPerformance({id:'test',title:session.work.title,prompt:'剧情'},'static',true,{previousWork:clone(session.work),sequel:'结局的一年后'})");
assert.equal(run('session.work.chapters.length'),2);
assert.equal(run('session.work.chapters[0].html'),originalHtml);
assert.match(JSON.stringify(prompts.at(-1)),/用户编辑的故事结局/);
assert.match(JSON.stringify(prompts.at(-1)),/结局的一年后/);
assert.equal(writes,0);
run('sendTarget=targetIdentity()');
await run('writeCurrentWork()');
await run('writeCurrentWork()');
assert.equal(writes,1);
assert.equal(active.chat.length,2);
assert.equal(run('session.work.writes.length'),1);
active = context('角色丙','另一聊天');
await run('writeCurrentWork()');
assert.equal(active.chat.length,1);
run('sendTarget=targetIdentity()');
readback=false;
await run('writeCurrentWork()');
assert.equal(active.chat.length,2);
readback=true;
await run('writeCurrentWork()');
assert.equal(active.chat.length,2);
assert.equal(run('session.work.writes.length'),2);

let finish;
active.generateRaw = args => {prompts.push(args);return new Promise(resolve=>finish=resolve);};
const pending=run("startPerformance({id:'test',title:'快照',prompt:'剧情'},'static',true,{mode:'沉浸叙事'})");
while(!finish) await new Promise(resolve=>setTimeout(resolve,1));
run("settings.mode='悬疑调查'");
finish('<p>快照故事结束。</p>'); await pending;
assert.equal(run('session.work.mode'),'沉浸叙事');
await run("Promise.all(Array.from({length:105},(_,i)=>workStore.put({id:'capacity-'+i,title:'容量',favorite:i===0,chapters:[{title:'正文',html:'x'.repeat(i<11?250000:10)}]})))");
assert.equal(await run("workStore.get('capacity-0').then(w=>w.chapters[0].html.length)"),250000);
assert.equal(await run("workStore.get('capacity-104').then(w=>w.chapters.length)"),1);
run("originalStore=workStore; workStore={...workStore,put:async()=>{throw Error('quota')}}; session.work.chapters[0].editText='仍可下载'; session.dirty=true");
assert.equal(await run('saveCurrentWork(false)'),false);
assert.equal(run('session.work.chapters[0].editText'),'仍可下载');
run('workStore=originalStore');
// Backup import is a copy: retain content/favourite, assign an independent identity.
const backup = run("JSON.stringify({format:'interlude-theatre-works',version:1,works:[materializeWork()]})");
sandbox.backupFile = {text:async()=>backup};
const ids = run('works.map(w=>w.id)');
await run('importWorks(backupFile)');
assert.equal(run('works.length'),ids.length+1);
assert.ok(!ids.includes(run('works.at(-1).id')));
assert.match(run('works.at(-1).chapters[0].html'),/仍可下载/);
assert.equal(run('works.at(-1).writes.length'),0);
run('openTheatre(); closeTheatre(); openTheatre()');
await new Promise(resolve=>setTimeout(resolve,220));
assert.ok(dom.window.document.getElementById('mit-root'));
const beforeNavigationWrites = writes;
for (const [view, title] of [['lobby','剧场大厅'],['library','剧目库'],['history','演出记录'],['director','导演室']]) {
    dom.window.document.querySelector(`.mit-nav[data-view="${view}"]`).click();
    assert.equal(dom.window.document.querySelector('.mit-nav[aria-current="page"]').dataset.view,view);
    assert.equal(dom.window.document.querySelector('.mit-sheet h2').textContent,title);
}
assert.equal(writes,beforeNavigationWrites);
await run("handleWorkspaceAction('open-work',{dataset:{entryId:works[0].id}})");
assert.ok(dom.window.document.getElementById('mit-root').classList.contains('is-reading'));
assert.ok(dom.window.document.querySelector('.mit-reader iframe[title="作品阅读"]'));
assert.equal(dom.window.document.querySelector('.mit-theatre iframe'),null);
await run('closeReader()');
assert.equal(dom.window.document.querySelector('.mit-sheet h2').textContent,'演出记录');
run('closeTheatre()');
console.log('PASS: full untruncated character/chat/sequel context, enabled preset/worldbook sources, AI-owned CSS, generation isolation, HTML isolation, persistence, sequel preservation, explicit chat writes and navigation.');
