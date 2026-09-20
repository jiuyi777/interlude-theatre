import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
// Run with: node tools/test-html-drafts.mjs <directory containing installed jsdom>
const require = createRequire(`${process.argv[2] || process.cwd()}/package.json`);
const { JSDOM } = require('jsdom');
const dom = new JSDOM('<div id="extensionsMenu"></div>', { url: 'https://test.invalid/' });
let active;
let writes = 0;
const prompts = [];
const sandbox = { window: dom.window, document: dom.window.document, DOMParser: dom.window.DOMParser,
    URL, console: { ...console, error() {} }, structuredClone, setTimeout, clearTimeout,
    SillyTavern: { getContext: () => active },
    MutationObserver: dom.window.MutationObserver, requestAnimationFrame: callback => callback(),
    BUILTIN_COVER_LIBRARY: [], COVER_LIBRARY_VERSION: 2, assignBuiltinCoverKeys() {}, resolveBuiltinCover() {},
};
sandbox.window.SillyTavern = sandbox.SillyTavern;
vm.createContext(sandbox);
const root = new URL('../', import.meta.url);
const helper = fs.readFileSync(new URL('html-draft.js', root), 'utf8').replace('export function', 'function');
let source = fs.readFileSync(new URL('index.js', root), 'utf8')
    .replace(/import[\s\S]*?from\s+'[^']+';/g, '')
    .replaceAll('import.meta.url', JSON.stringify(new URL('index.js', root).href))
    .replace(/export \{[^}]+\};/, '');
vm.runInContext(helper + '\n' + source, sandbox);
const context = (name, text) => ({
    name1: '用户', name2: name, chatId: name, chat: [{ is_user: true, mes: text }],
    extensionSettings: {}, saveSettingsDebounced() {}, getCharacterCardFields: () => ({ description: name }),
    substituteParams: text => text.replaceAll('{{char}}', name).replaceAll('{{user}}', '用户'),
    generateRaw: async args => { prompts.push(args); return '<h1 style="text-decoration:underline!important">番外</h1><p>正文</p>'; },
    saveReply() { writes++; throw Error('Unexpected chat write'); }, saveChat() { writes++; throw Error('Unexpected chat save'); },
});
active = context('角色甲', '旧聊天内容');
vm.runInContext('settings = clone(DEFAULT_SETTINGS)', sandbox);
await vm.runInContext("startPerformance({id:'test',title:'测试',description:'编辑后的情节',prompt:'剧目设定'}, 'static', true)", sandbox);
active = context('角色乙', '新的上下文');
await vm.runInContext("startPerformance({id:'test',title:'测试',description:'编辑后的情节',prompt:'剧目设定'}, 'dynamic', true)", sandbox);
assert.equal(writes, 0);
assert.equal(active.chat.length, 1);
assert.match(JSON.stringify(prompts[0]), /旧聊天内容/);
assert.match(JSON.stringify(prompts[1]), /新的上下文/);
assert.doesNotMatch(JSON.stringify(prompts[1]), /旧聊天内容/);
assert.match(JSON.stringify(prompts[1]), /编辑后的情节/);
assert.match(prompts[1].systemPrompt, /一次完成的完整番外故事/);
assert.match(prompts[1].systemPrompt, /此完成方式优先于剧目、角色卡或聊天/);
assert.match(prompts[1].prompt.at(-1).content, /明确结局/);
assert.doesNotMatch(prompts[1].prompt.at(-1).content, /需要.*选择时自然停下等待/);
assert.equal(vm.runInContext('settings.history.length', sandbox), 2);
assert.equal(vm.runInContext('settings.history[0].chatId', sandbox), '角色乙');
const before = vm.runInContext('settings.history.length', sandbox);
active.generateRaw = async () => '';
await vm.runInContext("startPerformance({id:'test',title:'空响应',prompt:'test'}, 'static', true)", sandbox);
assert.equal(vm.runInContext('settings.history.length', sandbox), before);
assert.equal(vm.runInContext('generationInFlight', sandbox), false);
const safe = vm.runInContext(`prepareHtmlDraft('<script>alert(1)</script><a href="https://example.com" onclick="evil()" style="text-decoration:underline!important">正文</a><iframe src="https://example.com"></iframe>')`, sandbox);
const cleaned = new JSDOM(safe).window.document;
assert.equal(cleaned.querySelector('script,iframe,[onclick],[href]'), null);
assert.equal(cleaned.querySelector('a').style.textDecoration, 'none');
assert.match(cleaned.querySelector('meta[http-equiv]').content, /default-src 'none'/);
console.log('PASS: fresh context, edited description, zero chat writes, saved drafts, empty response recovery, isolated HTML and no underline.');
