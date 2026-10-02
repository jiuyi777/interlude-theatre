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
const helpers = ['html-draft.js','work-store.js'].map(file=>fs.readFileSync(new URL(file,root),'utf8').replaceAll('export function','function')).join('\n');
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
assert.match(prompts[1].systemPrompt, /一次完成的完整番外故事/);
assert.match(prompts[1].prompt.at(-1).content, /明确结局/);
assert.equal(run('works.length'), 2);
assert.equal(run('session.work.chatId'), '角色乙');
const before = run('works.length');
active.generateRaw = async () => '';
await run("startPerformance({id:'test',title:'空响应',prompt:'test'}, 'static', true)");
assert.equal(run('works.length'), before);
assert.equal(run('generationInFlight'), false);
const safe = run(`prepareHtmlDraft('<script>alert(1)</script><a href="https://example.com" onclick="evil()" style="text-decoration:underline!important">正文</a><iframe src="https://example.com"></iframe>')`);
const cleaned = new JSDOM(safe).window.document;
assert.equal(cleaned.querySelector('script,iframe,[onclick],[href]'), null);
assert.equal(cleaned.querySelector('a').style.textDecoration, 'none');
assert.match(cleaned.querySelector('style').textContent,/scrollbar-width:none!important/);
assert.match(cleaned.querySelector('style').textContent,/\*::-webkit-scrollbar/);
assert.match(cleaned.querySelector('meta[http-equiv]').content, /default-src 'none'/);
assert.equal(cleaned.querySelector('meta[charset]').getAttribute('charset'),'utf-8');
assert.equal(new JSDOM(run(`prepareHtmlDraft(${JSON.stringify(safe)})`)).window.document.querySelectorAll('style[data-theatre-base]').length,1);
assert.equal(run("draftText(textDraft('编辑后的第一段。\\n\\n第二段结局。','第一篇'))"),'编辑后的第一段。\n\n第二段结局。');

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
run('closeTheatre()');
console.log('PASS: generation isolation, fresh context, full-story contract, HTML isolation/no lines, IDB edit/favourite/reload, append-only sequel, explicit write/readback/dedup/target check, capacity preservation, storage failure recovery and fast reopen.');
