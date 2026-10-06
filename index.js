import { prepareHtmlDraft, draftText, textDraft } from './html-draft.js?v=static-art-v3';
import { createWorkStore } from './work-store.js?v=0.6.0-final';
import { loadGenerationSources } from './generation-context.js?v=ai-reading-v2';
import { buildVisualGuidance } from './visual-guidance.js?v=0.6.1-d0-reading';
import {
    BUILTIN_COVER_LIBRARY,
    COVER_LIBRARY_VERSION,
    assignBuiltinCoverKeys,
    resolveBuiltinCover,
} from './cover-library.js';

const EXTENSION_ID = 'interlude-theatre';
const SETTINGS_KEY = 'interludeTheatre';
const ROOT_ID = 'mit-root';
const MENU_ID = 'mit-open-menu';
const HALL_IMAGE_URLS = Object.freeze({
    lobby: new URL('./assets/theatre-hall-neutral-navigation-v1.png', import.meta.url).href,
    library: new URL('./assets/theatre-hall-neutral-navigation-v1.png', import.meta.url).href,
    history: new URL('./assets/theatre-hall-neutral-navigation-v1.png', import.meta.url).href,
    director: new URL('./assets/theatre-hall-neutral-navigation-v1.png', import.meta.url).href,
});
const GENERIC_COVER_ATLAS_URL = new URL('./assets/generic-play-covers-paper-cut-atlas.png', import.meta.url).href;
const STORYTELLER_LIBRARY_SPRITE_URL = new URL('./assets/library-storyteller-covers-generated-v1.png', import.meta.url).href;
const THEATRE_MESSAGE_KEY = 'interludeTheatre';

const DEFAULT_PLAYS = [
    {
        id: 'midnight-divination',
        title: '深夜占卜',
        mode: '命运分歧',
        description: '烛火、星盘与一枚不肯落定的命运骰。',
        acts: ['落座', '揭牌', '应验'],
        prompt: '深夜的占卜室只点着一支蜡烛。{{char}}与{{user}}围坐在星盘前，三张牌将依次揭开过去、此刻与尚未定型的未来。让预言带来具体线索与选择，但保留命运可以被改变的余地。',
        tags: ['神秘', '命运', '三幕'],
        builtin: true,
    },
    {
        id: 'romance-observation',
        title: '恋综观察',
        mode: '轻喜互动',
        description: '镜头之外的心动，比节目规则更难预测。',
        acts: ['入住', '约会', '告白夜'],
        prompt: '{{char}}与{{user}}进入一档为期三天的恋爱观察节目。镜头、任务卡与其他嘉宾制造误会和靠近。用轻松的节目感推进关系，依据双方性格写出关键心动节点的回应，并完成告白与结局。',
        tags: ['恋爱', '综艺', '轻喜'],
        builtin: true,
    },
    {
        id: 'secret-room-hour',
        title: '密室一小时',
        mode: '限时解谜',
        description: '门锁落下后，钟表开始倒着走。',
        acts: ['封门', '线索', '最后一分钟'],
        prompt: '{{char}}与{{user}}被困在一间会随倒计时改变陈设的密室里，只有一小时。每一幕给出可推理的线索、明确环境变化与有限选择，依据双方性格写出推理、行动与最终脱困或失败的结局。',
        tags: ['密室', '解谜', '限时'],
        builtin: true,
    },
    {
        id: 'parallel-lives',
        title: '平行人生',
        mode: '人生岔路',
        description: '同一扇门后，是彼此从未走过的人生。',
        acts: ['错位', '借住', '归途'],
        prompt: '{{char}}与{{user}}在一扇旧剧院侧门后踏入彼此的平行人生。两人需要体验对方未曾选择的道路，并决定带走什么、留下什么。突出人物差异与情感回声。',
        tags: ['平行世界', '情感', '选择'],
        builtin: true,
    },
    {
        id: 'late-night-radio',
        title: '末班电台',
        mode: '都市怪谈',
        description: '零点后的最后一通电话，来自不存在的街区。',
        acts: ['开播', '来电', '停播以后'],
        prompt: '{{char}}与{{user}}共同主持一档午夜电台。末班节目接到一通来自地图上不存在街区的电话，听众描述的事情正逐渐在直播间发生。以声音、留言和城市夜色推进三幕怪谈。',
        tags: ['电台', '怪谈', '都市'],
        builtin: true,
    },
    {
        id: 'script-exchange',
        title: '交换剧本',
        mode: '身份互换',
        description: '演员醒来时，发现彼此拿错了人生台词。',
        acts: ['拿错', '代演', '谢幕'],
        prompt: '{{char}}与{{user}}醒来后发现彼此的人生像剧本一样被交换：周围人只认得他们现在扮演的身份。通过三幕事件逐步发现交换原因，并把是否换回的决定留到谢幕前。',
        tags: ['身份', '戏剧', '反转'],
        builtin: true,
    },
    {
        id: 'character-document-self-review',
        title: '角色设定文档自审',
        mode: '打破第四面墙',
        description: '角色亲自读到自己的角色卡、行为指南与开场白，边吐槽边做一场真正有用的设定体检。',
        acts: ['意外开卷', '逐条审视', '修订意见'],
        prompt: `现在暂停当前剧情，为我生成一个独立番外小剧场。本场不计入主线剧情，标题自拟，正文不少于6000字。
某天，char以一种符合其世界观、能力和日常处境的方式，意外“读到了自己的角色设定文档”。这份文档包括但不限于角色卡、性格与背景设定、行为指南、说话方式、开场白、对话示例及其他实际存在的角色资料。请让char逐条审视、评价和吐槽这些内容。
必须严格按照char的人设、知识边界、语气、价值观和与{{user}}的既有关系展开，重点写出“本人看见别人如何定义自己”时的具体反应。可以打破第四面墙，但不要把番外事件写成主线既定事实，也不要借机让角色失去原本人格或变成泛用吐槽役。
点评既要好玩，也必须对角色卡修订有实际参考价值。每个重要条目都尽量形成“文档内容摘要—char的即时反应—结合既有表现的判断—可执行的修改建议”的完整链条；指出准确之处、模糊之处、互相冲突之处、容易导致OOC之处、缺失的重要边界，以及开场白和行为指南在实际对话中可能造成的问题。建议必须具体，不要只说“更完善”“更自然”。
如果资料里没有某项内容，不要伪造原文，可让char对缺失本身作出评价；如果设定与聊天上下文存在差异，要明确区分“原始设定”“实际表现”和“番外畅想”。结尾请由char给出一份有优先级的修订清单，并以符合其性格的方式决定如何处置这份文档。`,
        tags: ['第四面墙', '角色卡', '设定体检'],
        builtin: true,
    },
    {
        id: 'moegirl-encyclopedia-extra',
        title: '萌娘百科番外',
        mode: '二次元百科',
        description: '把角色与用户当作二次元作品人物，生成一篇有梗、有料、可以认真查设定的萌娘百科页面。',
        acts: ['建立词条', '补全设定', '梗与考据'],
        prompt: `现在暂停当前剧情，为我生成一个番外小剧场。本场不计入主线剧情，全文不少于4000字，标题自拟。
主题：“萌娘百科”。假如char和{{user}}是二次元作品中的角色，请结合两人的角色设定、关系与当前主聊天上下文，展示他们的萌娘百科风格网站内容。
请严格按照char与{{user}}的人设和知识边界合理展开畅想。行文风趣、口语化、有意思，可以自然掺杂二次元梗、编辑吐槽、消歧义、注释、折叠区和“此处需要补充来源”等百科式玩笑，但不能为了玩梗把人物写崩，也不要把番外脑补冒充主线事实。
全文使用自包含的HTML与CSS进行美化，适配移动端，不使用脚本、外链资源或会影响其他消息的全局选择器；禁止出框、漏字和低对比度配色。页面应有清楚的词条导航与栏目层级。

【萌娘百科内容参考】
1. 基本资料
- 本名、日文名、罗马音、别号、昵称、外号
- 性别、发色、瞳色、身高、体重、三围
- 年龄、生日、星座、血型、声优
- 萌点标签，如傲娇、天然呆、黑长直、兽耳
- 出身地区、所属团体、个人状态、亲属与相关人物

2. 角色简介
- 出处（作品名与身份）
- 核心人设、性格、背景故事、初登场信息

3. 外貌形象
- 详细外貌描述、服装特征、变身或不同形态
- 用版块模拟立绘、CG、Q版、战斗图等多图展示；没有真实图片时使用文字占位，不要伪造图片链接

4. 性格特点
- 日常性格、优缺点、特殊习惯、口头禅
- 隐藏性格、反差萌、关键剧情表现

5. 角色经历（剧情线）
- 主线故事、关键事件、成长与转变
- 结局、衍生作品表现、同人常见设定；未发生或未知内容必须标注为番外假设

6. 人际关系
- 家人、亲友、恋人、对手、师徒
- 角色关系图与互动名场面

7. 能力设定（战斗或特殊能力）
- 技能、武器、魔法或异能
- 战斗风格、弱点、战力评价；非战斗角色可改为生活或专业能力

8. 萌属性解析
- 逐条解读萌点及其来源、名场面和与其他角色的对比

9. 名台词与梗
- 经典台词、口头禅、名场面对白
- 衍生梗、网络流行语和“黑话”来源

10. 其他
- 声优相关、角色歌、广播剧、同人创作
- 周边商品、人气投票、趣闻轶事

资料不足的字段可以用符合百科口吻的“未知”“未公开”或编辑注说明，不得无依据地把敏感身体数据写成确定事实。请让char与{{user}}各自拥有清晰条目，并突出两人关系词条、共同名场面和粉丝视角。`,
        tags: ['萌娘百科', 'HTML', '二次元'],
        author: '@豆包整理',
        builtin: true,
    },
];

const XIAOTU_PLAYS = [
    {
        id: 'xiaotu-useless-powers-15-days',
        sourceId: '5',
        title: '15天的废物超能力',
        mode: '奇幻喜剧',
        description: '连续十五天，每天醒来都获得一种完全派不上用场的新能力。',
        acts: ['诅咒降临', '能力失控', '第十五天'],
        prompt: `请按照以下大纲生成一个独立于正文之外的小剧场，不使用任何状态栏：
日常的某天，{{char}}被神秘魔法诅咒了，接下来的15天他将每天觉醒一个不同的超能力，但这些超能力都超级废物
请描写接下来{{char}}每一天的遭遇和互动。文风要轻松搞笑，人物性格不能ooc。
超能力举例（以下废物超能力可用但不能全照抄，发挥你自己的创作力，否则我会写100封投诉信举报你这个模型）：
布料一碰就坏，根本穿不了衣服！/我的视网膜被抖音特效污染了/只要脚沾地，就能拉出极具个人风格的美丽拖尾，靓丽三分钟、绝不褪色/对飞禽走兽有致命吸引力/被动技能「百分百被投喂」，路过的狗子都要给我叼个肉包子/一夜胖成400斤/全民情敌——可我真的不认识你对象啊！/张嘴就是播音腔，播的全是真心话/突然听懂植物说话，绿化正在激情传谣/方圆30米信号全无，但会出现一个公共WiFi——名字是我/我能看见思想气泡，随心而动图文并茂，附带颜文字/我的影子有了独立人格，性子跟我相反，行为跟我作对/拥有了“万物皆可弹”的体质，碰到的东西都会发出“Biu~”的音效并蹦走，包括饭碗/变成空气/瞪谁谁怀孕/可以把任何人改名叫张伟/可以定位垃圾桶/只要想象就会脱发/让别人的大肠末端尝出味蕾/大喊一声就能生成一只草履虫/左脚踩右脚可以飞但停下就会摔/透视别人的屁股/自己超级慢动作/酸性眼泪/环境变暗下体就会发光/可以预言5秒后但发动能力需要5秒/握手就能知道对方便秘了几天/出场时自带bgm/打哈欠时头发会变色/时间停止但自己也停/尿尿和拉屎变成彩虹色/全随机无cd瞬移/能让别人变成夹子音/
但第15天的能力必须是：“不幸”会扣我血条！！{{user}}竟然能看见血条，能帮我回血，但效果微乎其微，除非行为对双方都很出格？！……叮！隐藏规则弹出：奶满永久解除诅咒！（每次最多+10，否则会爆体而亡）
要求：全文使用 HTML 与 CSS 美化排版并适配移动端。严禁低对比度配色（如白底白字、灰底灰字），确保背景、文字与边框对比鲜明，清晰易读。`,
        tags: ['废物超能力', '十五日', '搞笑'],
        author: '@小兔',
        builtin: true,
    },
    {
        id: 'xiaotu-bad-network-chat',
        sourceId: '93',
        title: '是网你给我连好了呀',
        mode: '手机错位喜剧',
        description: '一场本该甜蜜的手机聊天，被烂网打乱成了分手现场。',
        acts: ['发送中', '顺序错乱', '误会收场'],
        prompt: `现在暂停当前剧情，为我生成一个手机格式的番外小剧场，标题自拟。不需要状态栏，不计入主线剧情。请严格遵守{{char}}和{{user}}的人物性格，以下为大纲：
日常的某天，{{random:: user,char}}（在你后台代号为a）在手机上给对方（在你后台代号为b）发消息闲聊：我和xx你更爱哪个（xx是啥你来填充，合理即可）
b：我心里当然只有
b：宝宝你啊
b：至于
b：那个xx
b：滚一边去！
b：这啥烂网
b：烦得要死
b：先不说了
但是以上分开发送的消息由于网络太差转了半天的圈，发出去的时候顺序全乱了！导致真实对话变成了下面这样：
b：我心里当然只有
b：那个xx
b：至于
b：宝宝你啊
b：烦的要死
a：？那我们之间算什么
b：滚一边去！
b：先不说了
b：这啥烂网

对话风格幽默搞笑，活人感十足。全程以手机聊天的美化形式生成，必须生成80条以上聊天记录且网络依然可能时不时抽风，代码之间不许有空行。认真读取两人性格，深度还原user和char的性格生成回复。严禁ooc，严禁把user和char混淆。一次性生成完整剧情！！！注意线上聊天和现实对话的区分，请不要发生两人面对面发信息的情况！`,
        tags: ['手机聊天', '烂网', '误会'],
        author: '@小兔',
        builtin: true,
    },
    {
        id: 'xiaotu-two-birds',
        sourceId: '95',
        title: '树上的鸟儿成双对',
        mode: '轻奇幻恋爱',
        description: '在另一个世界，两个人以真正的鸟儿方式相遇、筑巢和相爱。',
        acts: ['相遇', '筑巢', '迁徙'],
        prompt: `现在暂停当前剧情，为我生成一个番外小剧场，标题自拟。不需要状态栏，不计入主线剧情。请严格遵守{{char}}和{{user}}的人物性格，以下为大纲：
某个平行世界的{{user}}和{{char}}，是两只鸟鸟！
（根据外貌性格自行合理化设定现实中存在的鸟的品种和外形，只要是看起来是鸟都行。但鸟是不可能有虎牙、酒窝、痣、雀斑、体香之类的东西的哈，注意逻辑）
总之，鸟儿们相遇、鸟儿们相处、鸟儿们相爱、鸟儿们找食、筑巢、叽叽喳喳、嬉戏玩乐，{{user}}和{{char}}两只鸟以鸟儿们的方式生活着，在有/无人类的世界自由的穿梭着……
请写完这个恋爱故事，并添加一些鸟儿们之间独特的生活习惯和习俗（不一定是现实中存在的习惯，你可以自己编）来丰富故事趣味性，可以有族群也可以是独鸟，故事线要完整且有逻辑。文风轻松奇幻，正文字数不少于8000字。全文使用 HTML 与 CSS 美化排版并适配移动端，禁止出框、漏字，并保持背景与文字颜色的高对比度。`,
        tags: ['鸟类', '平行世界', '恋爱'],
        author: '@小兔',
        builtin: true,
    },
    {
        id: 'xiaotu-gacha-life',
        sourceId: '96',
        title: '抽卡人生',
        mode: '抽卡生存喜剧',
        description: '衣食住行全靠十连抽，没有保底的混池决定接下来十天怎么活。',
        acts: ['绑定系统', '十日生存', '最终礼物'],
        prompt: `现在暂停当前剧情，为我生成一个番外小剧场，标题自拟。不需要状态栏，不计入主线剧情。请严格遵守{{char}}和{{user}}的人物性格，以下为大纲：
日常的某天，{{char}}被莫名其妙的绑定了“抽卡系统”，现在他没办法吃喝穿普通东西，衣食住行全部都要依靠每天10次的抽卡机会，10次听起来很多（多吗？），但这卡池是一个没有保底的超级邪恶大混池啊！从垃圾破烂到神豪宝藏都有（真的吗？），每天能抽到啥全凭运气，可能是阿x尼大衣*1件、椒盐饼干*1包、精美指甲刀*1个、某人的屁眼拓印*1张、x云矿泉水*1箱、泡过海水的比基尼上衣*1、lv999屠龙宝刀*1把、性感文胸*1件、佛跳墙*1盅、超级黏牙的粘糕*1盒……。如果能在抽卡系统手里生存10天，系统就会为{{char}}送上一件精美小礼物哦！让我们一起为{{char}}的运气祈祷吧～
请写完这个有头有尾的{{char}}的10天抽卡生活的故事，每天的抽中物、使用、各人物行为心理都要详细描写，不能笼统合并和一笔带过！发挥你的创造力填充这个卡池，多埋点互联网菜单，为{{char}}创造更丰富的抽卡体验！无需刻意塑造美好，允许{{char}}受苦（中途死了就看广告复活吧），一切为了有趣！文风奇幻搞笑，正文字数不少于8000字，全文使用 HTML 与 CSS 美化排版并适配移动端，禁止出框、漏字，并保持背景与文字颜色的高对比度。`,
        tags: ['抽卡', '系统', '十日'],
        author: '@小兔',
        builtin: true,
    },
];

const BUNDLED_PLAYS = [...XIAOTU_PLAYS, ...DEFAULT_PLAYS];

const DEFAULT_SETTINGS = {
    library: BUNDLED_PLAYS,
    selectedId: DEFAULT_PLAYS[0].id,
    favoriteIds: [],
    lobbyFilter: 'all',
    lobbySort: 'latest',
    libraryLayoutMigrated: false,
    coverLibraryVersion: COVER_LIBRARY_VERSION,
    protagonist: '',
    castMode: 'user',
    mode: 'follow-source',
    directorNote: '',
    settingEntries: [],
    continueContext: true,
    beautificationEnabled: true,
    beautificationMode: 'static',
    history: [],
};

let settings;
let saveSettings = () => {};
let keydownHandler;
let pendingImport = null;
let generationInFlight = false;
let closeTimer;
let workStore;
let worksReady;
let works = [];
let session = null;
let sessionWrites = Promise.resolve();
let writeInFlight = false;
let storageMessage = '';
let theatrePage = 'lobby';
let readerOpen = false;
let readerReturnView = 'history';
let workspaceFavorites = false;
let workspaceTrash = false;
let recordChangeInFlight = false;
let sendTarget = null;
let sessionSaveTimer;
let sessionMutation = 0;
let pendingSaves = 0;

function newId() {
    return globalThis.crypto?.randomUUID?.() || `work-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

const STORY_STYLES = [
    ['follow-source', '按剧目和世界书原设定写', '根据所选剧目、世界书和本篇要求确定叙述方式。'],
    ['沉浸叙事', '细写场景与心理', '着重具体场景、感官细节与人物心理，保持连续叙事。'],
    ['轻喜互动', '轻松一点', '采用自然轻松的对话与适度幽默，人物言行保持原设定。'],
    ['悬疑调查', '悬疑一点', '围绕线索、调查和逐步揭示组织情节，在结尾交代谜底。'],
    ['情感慢燃', '慢慢发展感情', '通过细节、行动与对话逐步推进关系，让情感变化有铺垫。'],
    ['高速冲突', '快节奏推进', '紧凑推进冲突与行动，减少重复铺垫，交代事件的因果与结局。'],
    ['舞台剧腔调', '对白为主', '以清楚标注说话者的对白为主，配合简洁的动作与场景描述。'],
];

function styleOptions(value = 'follow-source') {
    return STORY_STYLES.map(([id, label]) => `<option value="${id}" ${value === id ? 'selected' : ''}>${label}</option>`).join('');
}

function storyCast(context, options = {}) {
    const mode = options.castMode || (options.protagonist ? 'custom' : 'user');
    const name = mode === 'custom' ? String(options.protagonist || '').trim()
        : mode === 'character' ? context?.name2 || '{{char}}' : context?.name1 || '{{user}}';
    return { mode, name, instruction: mode === 'custom'
        ? `以「${name}」为主角，依据角色卡、世界书与本篇要求安排出场人物，User 按剧情需要出场。`
        : `以「${name}」为主角，结合 User「${context?.name1 || '{{user}}'}」与当前角色「${context?.name2 || '{{char}}'}」的资料和关系展开。` };
}

function castFields(options) {
    const context = getContext();
    const cast = storyCast(context, options);
    return `<label>故事主角<select name="castMode"><option value="user" ${cast.mode === 'user' ? 'selected' : ''}>我（${escapeHtml(context?.name1 || '我')}）</option><option value="character" ${cast.mode === 'character' ? 'selected' : ''}>${escapeHtml(context?.name2 || '请先打开角色聊天')}</option><option value="custom" ${cast.mode === 'custom' ? 'selected' : ''}>指定其他人物</option></select></label><label class="mit-custom-cast" ${cast.mode !== 'custom' ? 'hidden' : ''}>其他人物的名字<input name="protagonist" value="${escapeHtml(options.protagonist || '')}" placeholder="填写角色卡或世界书中的人物"></label>`;
}

function newSession(play = selectedPlay()) {
    return {
        id: '__session__', work: null, chapter: 0, editing: false, dirty: false, started: false,
        form: { playId: play?.id || '', title: play?.title || '我的小剧场', requirements: play?.description || '',
            note: '', settingEntriesVersion: 1, mode: settings.mode, castMode: settings.castMode, protagonist: settings.protagonist || '', continueContext: settings.continueContext,
            beautification: settings.beautificationEnabled ? settings.beautificationMode : 'off' },
        sequel: '',
    };
}

function migrateStoryForm(form = {}) {
    const migrated = { ...form };
    if (!migrated.settingEntriesVersion && settings.legacyDirectorNote && migrated.note === settings.legacyDirectorNote) migrated.note = '';
    migrated.settingEntriesVersion = 1;
    return migrated;
}

function normalizeWork(entry) {
    const form = migrateStoryForm(entry.form);
    if (!form.castMode) {
        form.protagonist = entry.protagonist || form.protagonist || '';
        form.castMode = form.protagonist ? 'custom' : 'character';
    }
    return { ...entry, id: entry.id || newId(), revision: entry.revision || 1, favorite: Boolean(entry.favorite),
        form,
        writes: entry.writes || [], chapters: entry.chapters || (entry.html ? [{ title: '第一篇', html: entry.html }] : []) };
}

async function ensureWorks() {
    if (worksReady) return worksReady;
    worksReady = (async () => {
        settings.workStoreId ||= newId();
        saveSettings();
        workStore = createWorkStore(settings.workStoreId);
        // Copy old records without deleting their original HTML from host settings.
        for (const entry of settings.history) {
            entry.id ||= newId();
            if (!await workStore.get(entry.id)) await workStore.put(normalizeWork(entry));
        }
        works = (await workStore.list()).map(normalizeWork);
        session = await workStore.get('__session__') || newSession();
        if (session.work) session.work = normalizeWork(session.work);
        session.form = { ...newSession(null).form, ...session.work?.form, ...migrateStoryForm(session.form) };
        if (session.work && (await workStore.get(session.work.id))?.deletedAt) session = newSession();
        storageMessage = session.dirty ? '编辑草稿已恢复，记得保存作品' : session.work ? '已恢复本机保存的作品' : '';
        saveSettings();
    })().catch(error => {
        worksReady = null;
        session ||= newSession();
        storageMessage = `作品库暂时不可用：${error.message}。生成后可先下载。`;
    });
    return worksReady;
}

function queueSessionSave() {
    clearTimeout(sessionSaveTimer);
    sessionSaveTimer = null;
    if (!session || !workStore) return Promise.resolve(false);
    const value = clone(session);
    pendingSaves++;
    sessionWrites = sessionWrites.catch(() => {}).then(() => workStore.put(value)).then(() => {
        storageMessage = session.dirty ? '编辑草稿已保存在本机' : currentWork() ? '故事已保存在本机' : '创作要求已暂存';
        updateWorkspaceStatus();
        return true;
    }).catch(error => {
        storageMessage = `保存失败：${error.message}。请先下载备份。`;
        updateWorkspaceStatus();
        return false;
    }).finally(() => pendingSaves--);
    return sessionWrites;
}

function updateWorkspaceStatus() {
    const status = document.querySelector(readerOpen ? '#mit-root .mit-reader #mit-work-status' : '#mit-root .mit-theatre #mit-work-status');
    if (status) status.textContent = generationInFlight ? '正在创作，可关闭剧场稍后回来查看…' : storageMessage;
}

function targetIdentity(context = getContext()) {
    if (!context?.chatId) return null;
    const character = context.characters?.[context.characterId];
    const target = { chatId: String(context.chatId), groupId: String(context.groupId || ''),
        avatar: character?.avatar || '', name: context.name2 || character?.name || '当前角色' };
    target.key = JSON.stringify([target.groupId || target.avatar || target.name, target.chatId]);
    return target;
}

function currentWork() { return session?.work; }

async function usePlay(play) {
    if (!play || generationInFlight || writeInFlight) return;
    captureWorkspace();
    if (currentWork() && !await saveCurrentWork()) return;
    session = newSession(play); session.started = true; theatrePage = 'compose'; readerOpen = false;
    await queueSessionSave(); showWorkspace();
}

function captureWorkspace() {
    if (!session) return;
    const before = JSON.stringify([session.form, session.sequel]);
    let changed = false;
    const form = readerOpen ? null : document.querySelector('#mit-work-form');
    if (form) {
        session.form.title = form.elements.title.value;
        session.form.requirements = form.elements.requirements.value;
        session.form.note = form.elements.note.value;
        session.form.mode = form.elements.mode.value;
        session.form.castMode = form.elements.castMode.value;
        session.form.protagonist = form.elements.protagonist.value.trim();
        session.form.continueContext = form.elements.continueContext.checked;
        session.form.beautification = form.elements.beautification.value;
    }
    const editor = readerOpen ? document.getElementById('mit-work-editor') : null;
    if (editor && currentWork()) {
        const chapter = currentWork().chapters[session.chapter];
        if (chapter && editor.value !== (chapter.editText ?? draftText(chapter.html))) {
            chapter.editText = editor.value;
            session.dirty = true;
            changed = true;
        }
    }
    const sequel = readerOpen ? document.getElementById('mit-sequel-requirement') : null;
    if (sequel) session.sequel = sequel.value;
    if (currentWork() && session.form.title !== currentWork().title) session.dirty = true;
    if (changed || before !== JSON.stringify([session.form, session.sequel])) sessionMutation++;
}

function materializeWork() {
    const work = clone(currentWork());
    if (!work) return null;
    work.title = session.form.title.trim() || work.title;
    work.form = clone(session.form);
    work.chapters = work.chapters.map(chapter => ({ title: chapter.title,
        html: chapter.editText === undefined ? chapter.html : textDraft(chapter.editText, chapter.title) }));
    return work;
}

async function saveCurrentWork(capture = true) {
    if (capture) captureWorkspace();
    if (!currentWork()) return false;
    const work = materializeWork();
    const savingSession = session;
    const savingMutation = sessionMutation;
    if (session.dirty) work.revision++;
    work.updatedAt = new Date().toISOString();
    pendingSaves++;
    try {
        await workStore.put(work);
        works = [work, ...works.filter(item => item.id !== work.id)];
        if (session === savingSession && sessionMutation === savingMutation) {
            session.work = clone(work); session.dirty = false;
        } else if (session === savingSession) {
            session.work.revision = work.revision;
        }
        await queueSessionSave();
        storageMessage = session.dirty ? '作品已保存；新编辑仍保留在草稿中' : '作品已保存到本机';
        updateWorkspaceStatus();
        return true;
    } catch (error) {
        storageMessage = `保存失败：${error.message}。正文仍在，请先下载。`;
        updateWorkspaceStatus();
        return false;
    } finally { pendingSaves--; }
}

function showWorkspace() {
    if (!document.getElementById(ROOT_ID)) return;
    if (!session) {
        showSheet('lobby', '剧场大厅', '<p>正在打开剧场…</p>', 'mit-workspace-sheet');
        ensureWorks().then(() => { if (document.getElementById(ROOT_ID)?.isConnected) showWorkspace(); });
        return;
    }
    if (readerOpen && currentWork()) return showReader();
    document.getElementById(ROOT_ID).classList.remove('is-reading');
    document.querySelector('#mit-root .mit-reader')?.replaceChildren();
    if (theatrePage === 'compose') return showComposer();
    if (theatrePage === 'library') return showLibrary();
    if (theatrePage === 'history') return showWorks();
    if (theatrePage === 'director') return showDirector();
    return showLobby();
}

function showLobby() {
    theatrePage = 'lobby';
    const recent = currentWork() || works.find(item => !item.deletedAt);
    const busy = generationInFlight || writeInFlight ? 'disabled' : '';
    showSheet('lobby', '剧场大厅', `
        <p class="mit-page-intro">今天，想和 ${escapeHtml(getContext()?.name2 || '角色')} 经历怎样的故事？</p>
        <div class="mit-lobby-choices">
            <button class="mit-start-choice" data-action="choose-play" ${busy}><span class="mit-choice-number">01</span><strong>从剧目库开始</strong><span>挑选一个现成的故事设定</span><b aria-hidden="true">→</b></button>
            <button class="mit-start-choice" data-action="new-work" ${busy}><span class="mit-choice-number">02</span><strong>写下自己的故事</strong><span>直接填写你想发生的情节</span><b aria-hidden="true">→</b></button>
        </div>
        ${recent ? `<section class="mit-recent-work"><span class="mit-eyebrow">最近的故事</span><h3>${escapeHtml(recent.title)}</h3><p>${recent.chapters.length} 篇 · ${escapeHtml(recent.protagonist || '当前角色')}</p><button class="mit-primary" data-action="open-work" data-entry-id="${escapeHtml(recent.id)}" ${busy}>继续阅读</button></section>` : '<p class="mit-page-note">写完后会展开独立阅读页，保存的故事都能在「演出记录」里找到。</p>'}
        ${!currentWork() && session.started !== false && session.form.requirements ? '<button class="mit-text-button" data-action="return-work">继续填写上次的创作要求 →</button>' : ''}
        <p id="mit-work-status" class="mit-page-note" role="status"></p>
    `, 'mit-workspace-sheet mit-lobby-sheet');
    updateWorkspaceStatus();
}

function showComposer() {
    const form = session.form;
    const play = playById(form.playId);
    const disabled = generationInFlight || writeInFlight ? 'disabled' : '';
    showSheet('lobby', '开始创作', `
        <p class="mit-page-intro">${play ? `已选剧目：${escapeHtml(play.title)}。补充你的想法，就可以开始。` : '写下想发生的情节，让角色为你演完这段故事。'}</p>
        <form id="mit-work-form" class="mit-work-form"><fieldset ${disabled}>
            <label>故事叫什么<input name="title" maxlength="120" value="${escapeHtml(form.title)}" aria-label="故事标题"></label>
            <label>你希望发生什么<textarea name="requirements" rows="4" maxlength="6000" placeholder="例如：雨夜重逢，把当年的误会说开，最后一起回家。">${escapeHtml(form.requirements)}</textarea></label>
            ${castFields(form)}
            <label class="mit-checkbox-row"><input name="continueContext" type="checkbox" ${form.continueContext ? 'checked' : ''}>发送全部聊天上下文</label>
            <p class="mit-context-help">角色与用户设定、启用的预设和世界书会完整提供。勾选后再附上全部主聊天；续写包含所有前篇。</p>
            <details class="mit-work-advanced"><summary>调整写法与排版</summary>
                <label>叙述方式（可选）<select name="mode">${styleOptions(form.mode)}</select></label>
                <p class="mit-context-help">默认跟随剧目和世界书。其他选项只补充写法，人物身份仍来自原设定。</p>
                <label>阅读排版<select name="beautification"><option value="off" ${form.beautification === 'off' ? 'selected' : ''}>简洁文字</option><option value="static" ${form.beautification === 'static' ? 'selected' : ''}>插页排版</option><option value="dynamic" ${form.beautification === 'dynamic' ? 'selected' : ''}>动态排版</option></select></label>
                <label>还有什么要求<textarea name="note" rows="2" maxlength="1000">${escapeHtml(form.note)}</textarea></label>
            </details>
            <div class="mit-compose-actions"><button type="button" data-action="back-lobby">返回大厅</button><button type="submit" class="mit-primary">${generationInFlight ? '正在写故事…' : currentWork() ? '按这些要求另写一篇' : '开始写故事'}</button></div>
        </fieldset></form>
        <p id="mit-work-status" class="mit-page-note" role="status"></p>
    `, 'mit-workspace-sheet mit-compose-sheet');
    updateWorkspaceStatus();
}

function showWorks() {
    theatrePage = 'history';
    const entries = works.filter(item => workspaceTrash ? item.deletedAt : !item.deletedAt && (!workspaceFavorites || item.favorite)).sort((a,b) => (b.updatedAt || b.startedAt || '').localeCompare(a.updatedAt || a.startedAt || ''));
    const disabled = generationInFlight || writeInFlight ? 'disabled' : '';
    showSheet('history', '演出记录', `
        <p class="mit-page-intro">${workspaceTrash ? '删除的故事放在这里，可以恢复。' : '读过的故事留在这里，喜欢的就收藏起来。'}</p>
        <div class="mit-record-filters" aria-label="故事筛选"><button data-action="work-filter" data-filter="all" aria-pressed="${!workspaceFavorites && !workspaceTrash}">全部故事</button><button data-action="work-filter" data-filter="favorites" aria-pressed="${workspaceFavorites && !workspaceTrash}">我的收藏</button><button data-action="work-filter" data-filter="trash" aria-pressed="${workspaceTrash}">回收站</button></div>
        <p class="mit-record-count">${entries.length} 部故事</p>
        <div class="mit-records-list">${entries.map(item => `<article class="mit-record-card">${workspaceTrash
            ? `<div class="mit-work-row"><span><strong>${escapeHtml(item.title)}</strong><small>${item.chapters.length} 篇</small></span></div><div class="mit-record-actions"><button data-action="restore-work" data-entry-id="${escapeHtml(item.id)}" ${disabled}>恢复故事</button></div>`
            : `<button class="mit-work-row" data-action="open-work" data-entry-id="${escapeHtml(item.id)}" ${disabled}><span><strong>${escapeHtml(item.title)}</strong><small>${item.chapters.length} 篇 · 主角：${escapeHtml(item.protagonist || '原故事人物')}</small></span><b>阅读 →</b></button><div class="mit-record-actions"><button data-action="favorite-record" data-entry-id="${escapeHtml(item.id)}" aria-pressed="${item.favorite}" aria-label="${item.favorite ? '取消收藏' : '收藏'}《${escapeHtml(item.title)}》" ${disabled}>${item.favorite ? '★ 已收藏' : '☆ 收藏'}</button><button class="mit-delete-work" data-action="delete-work" data-entry-id="${escapeHtml(item.id)}" aria-label="删除《${escapeHtml(item.title)}》" ${disabled}>删除</button></div>`}</article>`).join('') || `<p class="mit-page-note">${workspaceTrash ? '回收站是空的。' : workspaceFavorites ? '还没有收藏故事。在全部故事里点「收藏」，以后就能在这里找到。' : '这里还没有故事。去剧场大厅开始第一篇吧。'}</p>`}</div>
        <details class="mit-archive-tools"><summary>备份与恢复</summary><p>故事保存在这个浏览器里。换设备前，先导出备份。</p><div class="mit-work-tools"><button data-action="backup-works">导出全部故事</button><label class="mit-file-button">导入故事备份<input id="mit-work-import" type="file" accept=".json,application/json"></label></div></details>
    `, 'mit-workspace-sheet mit-records-sheet');
}

async function changeSavedWork(action, id) {
    if (recordChangeInFlight || generationInFlight || writeInFlight) return false;
    recordChangeInFlight = true;
    try {
        await sessionWrites;
        if (currentWork()?.id === id && !await saveCurrentWork()) return false;
        const existing = works.find(item => item.id === id);
        if (!existing) return false;
        const updated = clone(existing);
        if (action === 'delete-work') updated.deletedAt = new Date().toISOString();
        else if (action === 'restore-work') delete updated.deletedAt;
        else updated.favorite = !updated.favorite;
        await workStore.put(updated);
        works = works.map(item => item.id === id ? updated : item);
        if (currentWork()?.id === id) {
            if (updated.deletedAt) { session = newSession(); readerOpen = false; theatrePage = 'history'; }
            else session.work.favorite = updated.favorite;
        }
        await queueSessionSave();
        showWorkspace();
        toast(action === 'delete-work' ? '已移入回收站，可以恢复' : action === 'restore-work' ? '已恢复到全部故事' : updated.favorite ? '已收藏，在「演出记录 → 我的收藏」查看' : '已取消收藏', 'success');
        return true;
    } catch (error) { toast(`保存失败：${error.message}，原记录保留`, 'error'); return false; }
    finally { recordChangeInFlight = false; }
}

function settingEntriesMarkup() {
    return settings.settingEntries.map(entry => `<details class="mit-setting-entry" data-entry-id="${escapeHtml(entry.id)}">
        <summary><input aria-label="发送这条设定" type="checkbox" data-setting-field="enabled" ${entry.enabled ? 'checked' : ''}><span class="mit-setting-title">${escapeHtml(entry.name || '未命名条目')}</span><span class="mit-setting-state">${entry.enabled ? '已开启' : '已关闭'}</span></summary>
        <label>条目名称<input data-setting-field="name" value="${escapeHtml(entry.name)}" placeholder="例如：人物关系、写作要求"></label>
        <label>条目内容<textarea data-setting-field="content" rows="5" placeholder="填写希望每次发送的设定或要求">${escapeHtml(entry.content)}</textarea></label>
        <button type="button" data-action="delete-setting-entry">删除条目</button>
    </details>`).join('') || '<p class="mit-context-help">还没有条目。把经常用的设定写在这里，下次就不用重复填写。</p>';
}

function updateSettingEntry(target) {
    const row = target.closest('[data-entry-id]');
    const entry = settings.settingEntries.find(item => item.id === row?.dataset.entryId);
    if (!entry) return;
    const field = target.dataset.settingField;
    if (!['name', 'content', 'enabled'].includes(field)) return;
    entry[field] = field === 'enabled' ? target.checked : target.value;
    row.querySelector('.mit-setting-title').textContent = entry.name || '未命名条目';
    row.querySelector('.mit-setting-state').textContent = entry.enabled ? '已开启' : '已关闭';
    saveSettings();
}

function showDirector() {
    theatrePage = 'director';
    showSheet('director', '导演室', `
        <p class="mit-page-intro">选好故事主角，再管理每次发送的常驻设定。</p>
        <p class="mit-context-help mit-source-summary">人物和背景沿用酒馆中的角色卡、你的设定和关联世界书。</p>
        <form id="mit-director-form" class="mit-director-form">
            ${castFields(settings)}
            <section class="mit-setting-book" aria-label="常驻设定">
                <h3>常驻设定</h3>
                <p class="mit-context-help">像世界书一样分条保存。开启的条目每次都会发送，关闭的只保留；新故事、另写和续写都适用。修改后自动保存。</p>
                <div id="mit-setting-entries">${settingEntriesMarkup()}</div>
                <button type="button" data-action="add-setting-entry">＋ 添加条目</button>
                <p class="mit-context-help">这里保存剧场专用设定；角色卡关联的世界书仍照常读取。</p>
            </section>
            <details class="mit-work-advanced"><summary>叙述方式与阅读排版</summary>
            <label>叙述方式（可选）<select name="mode">${styleOptions(settings.mode)}</select></label>
            <p class="mit-context-help">默认跟随剧目和世界书。也可以额外要求轻松一点、悬疑一点或对白为主。</p>
            <label class="mit-checkbox-row"><input name="continueContext" type="checkbox" ${settings.continueContext ? 'checked' : ''}>发送全部聊天上下文</label>
            <label class="mit-checkbox-row"><input name="beautificationEnabled" type="checkbox" ${settings.beautificationEnabled ? 'checked' : ''}>为故事添加阅读排版</label>
            <label>排版方式<select name="beautificationMode"><option value="static" ${settings.beautificationMode !== 'dynamic' ? 'selected' : ''}>静态插页</option><option value="dynamic" ${settings.beautificationMode === 'dynamic' ? 'selected' : ''}>动态插页</option></select></label>
            </details>
            <button class="mit-primary" type="submit">保存默认设置</button>
        </form>
    `, 'mit-workspace-sheet mit-director-sheet');
}

function showReader() {
    const root = document.getElementById(ROOT_ID);
    const work = currentWork();
    if (!root || !work) return;
    readerOpen = true;
    root.classList.add('is-reading');
    const host = root.querySelector('.mit-reader');
    const chapter = work.chapters[session.chapter];
    const disabled = generationInFlight || writeInFlight ? 'disabled' : '';
    sendTarget = targetIdentity();
    const written = work.writes.some(item => item.target === sendTarget?.key && item.revision === work.revision && item.confirmed);
    host.innerHTML = `
        <header class="mit-reader-header"><button data-action="close-reader" aria-label="返回${readerReturnView === 'lobby' ? '剧场大厅' : '演出记录'}">← 返回</button><div class="mit-reader-chapter" ${session.sequelOpen ? 'hidden' : ''}><select id="mit-work-chapter" aria-label="篇章" ${disabled} ${work.chapters.length < 2 ? 'hidden' : ''}>${work.chapters.map((item,i) => `<option value="${i}" ${session.chapter === i ? 'selected' : ''}>${escapeHtml(item.title)}</option>`).join('')}</select><button data-action="edit-work" ${disabled}>${session.editing ? '保存并阅读' : '编辑正文'}</button></div></header>
        <div class="mit-reader-content">${session.sequelOpen ? `<section class="mit-sequel"><span class="mit-eyebrow">从故事的结尾，继续往后写</span><h3>下一篇会发生什么？</h3><p>已有的 ${work.chapters.length} 篇会完整保留，新内容接在后面。</p><label>后续情节<textarea id="mit-sequel-requirement" rows="6" maxlength="3000" ${disabled} placeholder="例如：一年后，两人再次来到这间剧院…">${escapeHtml(session.sequel || '')}</textarea></label><div class="mit-compose-actions"><button data-action="sequel-work" ${disabled}>返回阅读</button><button class="mit-primary" data-action="generate-sequel" ${disabled}>${generationInFlight ? '正在续写…' : '开始续写'}</button></div></section>` : chapter ? (session.editing ? `<textarea id="mit-work-editor" aria-label="编辑作品正文" ${disabled}>${escapeHtml(chapter.editText ?? draftText(chapter.html))}</textarea>` : '<iframe class="mit-reader-frame" title="作品阅读" tabindex="0" sandbox="" referrerpolicy="no-referrer"></iframe>') : '<p class="mit-page-note">这条旧记录没有保留下正文。</p>'}</div>
        <footer class="mit-reader-footer"><span id="mit-work-status" role="status"></span><div class="mit-reader-actions" ${session.sequelOpen ? 'hidden' : ''}>${session.editing ? `<button data-action="save-work" ${disabled}>保存修改</button>` : `<button data-action="favorite-work" aria-pressed="${work.favorite}" ${disabled}>${work.favorite ? '★ 已收藏' : '☆ 收藏故事'}</button>`}<button class="mit-primary" data-action="sequel-work" ${disabled}>${session.sequelOpen ? '返回阅读' : '续写下一篇'}</button><details class="mit-reader-more"><summary>更多</summary><div><button data-action="download-work">下载整部故事</button><button data-action="rewrite-work" ${disabled}>按原要求另写一版</button><p>${sendTarget ? `聊天目标：${escapeHtml(sendTarget.name)}` : '先打开角色聊天'}</p><button data-action="write-work" ${disabled || (written && !session.dirty ? 'disabled' : '')}>${written && !session.dirty ? '已写入此聊天' : '写入聊天'}</button></div></details></div></footer>`;
    const frame = host.querySelector('iframe');
    if (frame && chapter) frame.srcdoc = prepareHtmlDraft(chapter.editText === undefined ? chapter.html : textDraft(chapter.editText, chapter.title), work.title);
    updateWorkspaceStatus();
}

async function closeReader() {
    captureWorkspace();
    if (currentWork() && !await saveCurrentWork()) return;
    readerOpen = false;
    session.editing = false; session.sequelOpen = false;
    theatrePage = readerReturnView;
    await queueSessionSave();
    showWorkspace();
}

function downloadFile(content, name, type) {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const link = document.createElement('a');
    link.href = url; link.download = name.replace(/[<>:"/\\|?*]/g, '_'); link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function workText(work) {
    return work.chapters.map(chapter => `${chapter.title}\n\n${draftText(chapter.html)}`).join('\n\n');
}

async function writeCurrentWork() {
    if (writeInFlight || generationInFlight || !currentWork()?.chapters.length) return;
    const expected = sendTarget;
    if (!expected || targetIdentity()?.key !== expected.key) {
        showWorkspace(); return toast('聊天已切换，请核对新目标后再点击写入', 'info');
    }
    writeInFlight = true;
    showWorkspace();
    try {
        if (!await saveCurrentWork()) return;
        const context = getContext();
        if (targetIdentity(context)?.key !== expected.key) throw new Error('聊天已切换，请重新核对目标');
        if (!Array.isArray(context.chat) || !context.addOneMessage || !context.saveChat || !context.getRequestHeaders) throw new Error('当前酒馆缺少写入或保存核验能力');
        const work = currentWork();
        const matches = message => message?.extra?.[THEATRE_MESSAGE_KEY]?.workId === work.id && message.extra[THEATRE_MESSAGE_KEY].revision === work.revision;
        const prior = work.writes.find(item => item.target === expected.key && item.revision === work.revision && item.confirmed);
        if (prior) return toast('这个版本已经写入此聊天', 'info');
        let message = context.chat.find(matches);
        if (!message) {
            message = { name: context.name2, is_user: false, is_system: false,
                send_date: new Date().toISOString(), mes: `[无名剧场 · ${work.title}]\n\n${workText(work).replace(/[&<>]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))}`,
                extra: { [THEATRE_MESSAGE_KEY]: { workId: work.id, revision: work.revision } } };
            context.chat.push(message);
            context.addOneMessage(message);
        }
        // The host save is asynchronous and can swallow failures. Read back the named chat.
        await context.saveChat();
        const response = await fetch(expected.groupId ? '/api/chats/group/get' : '/api/chats/get', {
            method: 'POST', headers: context.getRequestHeaders(),
            body: JSON.stringify(expected.groupId ? { id: expected.chatId } : { ch_name: expected.name, file_name: expected.chatId, avatar_url: expected.avatar }),
        });
        const saved = response.ok ? await response.json() : null;
        if (!Array.isArray(saved) || !saved.some(matches)) throw new Error('消息已显示，尚未确认保存；回到此聊天再次点击可重试保存，不会重复新增');
        work.writes.push({ target: expected.key, chatId: expected.chatId, revision: work.revision, confirmed: true, at: new Date().toISOString() });
        await workStore.put(clone(work));
        works = works.map(item => item.id === work.id ? clone(work) : item);
        await queueSessionSave();
        toast('作品已写入目标聊天并核实保存', 'success');
    } catch (error) { toast(error.message, 'error'); }
    finally { writeInFlight = false; if (document.getElementById(ROOT_ID)?.classList.contains('is-open')) showWorkspace(); }
}

async function handleWorkspaceAction(action, target) {
    const actions = ['choose-play','return-work','new-work','back-lobby','close-reader','rewrite-work','open-work','work-filter','save-work','edit-work','favorite-work','favorite-record','delete-work','restore-work','sequel-work','generate-sequel','download-work','write-work','backup-works'];
    if (!actions.includes(action)) return false;
    if (recordChangeInFlight) return true;
    captureWorkspace();
    if (['favorite-work','favorite-record','delete-work','restore-work'].includes(action)) {
        await changeSavedWork(action, target.dataset.entryId || currentWork()?.id);
        return true;
    }
    if ((generationInFlight || writeInFlight) && !['back-lobby','close-reader','work-filter','download-work','backup-works'].includes(action)) return true;
    if (action === 'close-reader') { await closeReader(); return true; }
    if (action === 'choose-play') { setView('library'); return true; }
    if (action === 'back-lobby') { setView('lobby'); return true; }
    if (action === 'return-work' || action === 'rewrite-work') { readerOpen = false; theatrePage = 'compose'; }
    if (action === 'new-work') {
        if (currentWork() && !await saveCurrentWork()) return true;
        session = newSession(null); session.started = true; session.form.title = ''; session.form.requirements = ''; theatrePage = 'compose'; readerOpen = false;
    }
    if (action === 'work-filter') {
        workspaceFavorites = target.dataset.filter === 'favorites';
        workspaceTrash = target.dataset.filter === 'trash';
    }
    if (action === 'open-work') {
        if (currentWork() && !await saveCurrentWork()) return true;
        const work = works.find(item => item.id === target.dataset.entryId && !item.deletedAt);
        if (work) {
            const lastChapter = currentWork()?.id === work.id ? session.chapter : 0;
            readerReturnView = theatrePage === 'lobby' ? 'lobby' : 'history';
            session = newSession(playById(work.playId)); session.work = clone(work); session.form = {...session.form,...work.form,title:work.title};
            session.chapter = Math.min(lastChapter, Math.max(0, work.chapters.length - 1)); readerOpen = true;
        }
    }
    if (action === 'save-work') await saveCurrentWork();
    if (action === 'edit-work') {
        if (session.editing && !await saveCurrentWork()) return true;
        session.editing = !session.editing;
    }
    if (action === 'sequel-work') session.sequelOpen = !session.sequelOpen;
    if (action === 'generate-sequel') { await runWorkspace(true); return true; }
    if (action === 'write-work') { await writeCurrentWork(); return true; }
    if (action === 'download-work') {
        const work = materializeWork();
        if (work) downloadFile(work.chapters.length === 1 ? prepareHtmlDraft(work.chapters[0].html, work.title) : textDraft(workText(work),work.title), `${work.title}.html`, 'text/html;charset=utf-8');
        return true;
    }
    if (action === 'backup-works') {
        if (currentWork()) await saveCurrentWork();
        downloadFile(JSON.stringify({format:'interlude-theatre-works',version:1,works: [...works.filter(item => item.id !== currentWork()?.id), ...(currentWork() ? [materializeWork()] : [])]},null,2), '无名剧场-作品备份.json', 'application/json');
        return true;
    }
    await queueSessionSave(); showWorkspace(); return true;
}

async function importWorks(file) {
    if (!file) return;
    try {
        const backup = JSON.parse(await file.text());
        if (backup.format !== 'interlude-theatre-works' || !Array.isArray(backup.works)) throw new Error('请选择无名剧场导出的作品备份');
        const imported = backup.works.map(raw => {
            if (!raw || typeof raw.title !== 'string' || !Array.isArray(raw.chapters)) throw new Error('备份内有不完整的作品');
            return normalizeWork({ ...raw, id: newId(), writes: [], chapters: raw.chapters.map(chapter=>({title:String(chapter.title || '篇章'),html:prepareHtmlDraft(chapter.html,raw.title)})) });
        });
        for (const work of imported) { await workStore.put(work); works.push(work); }
        showWorkspace(); toast(`已导入 ${imported.length} 部作品，原作品保留`, 'success');
    } catch(error) { toast(`导入失败：${error.message}`, 'error'); }
}

function clone(value) {
    return JSON.parse(JSON.stringify(value));
}

function countPromptMacros(prompt) {
    const text = String(prompt || '');
    return {
        plain: (text.match(/(?<!\{\{)\bchar\b(?!\}\})/g) || []).length,
        tavern: (text.match(/\{\{char\}\}/g) || []).length,
    };
}

function convertPromptMacros(prompt, targetStyle) {
    const text = normalizeAnglePromptMacros(prompt);
    if (targetStyle === 'plain') {
        return text.replaceAll('{{char}}', 'char');
    }
    return text.replace(/(?<!\{\{)\bchar\b(?!\}\})/g, '{{char}}');
}

function normalizeAnglePromptMacros(prompt) {
    return String(prompt || '').replaceAll('<char>', 'char').replaceAll('<user>', '{{user}}');
}

function pendingImportMacroCounts() {
    return (pendingImport?.plays || []).reduce((total, play) => {
        const counts = countPromptMacros(play.prompt);
        total.plain += counts.plain;
        total.tavern += counts.tavern;
        return total;
    }, { plain: 0, tavern: 0 });
}

function normalizePlay(raw, index = 0) {
    if (!raw || typeof raw !== 'object') throw new Error(`第 ${index + 1} 个剧目不是对象`);
    const title = String(raw.title || '').trim();
    const prompt = String(raw.prompt || '').trim();
    if (!title || !prompt) throw new Error(`第 ${index + 1} 个剧目缺少 title 或 prompt`);

    return {
        id: String(raw.id || `imported-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`),
        title: title.slice(0, 30),
        mode: String(raw.mode || '自定义剧目').slice(0, 24),
        description: String(raw.description || '从剧目簿导入的小剧场。').slice(0, 180),
        acts: (Array.isArray(raw.acts) ? raw.acts : ['开幕', '转折', '谢幕']).slice(0, 3).map((item) => String(item).slice(0, 18)),
        prompt,
        tags: (Array.isArray(raw.tags) ? raw.tags : []).slice(0, 8).map((item) => String(item).slice(0, 18)),
        cover: typeof raw.cover === 'string' ? raw.cover : '',
        coverCrop: typeof raw.coverCrop === 'string' ? raw.coverCrop : '',
        coverSize: typeof raw.coverSize === 'string' ? raw.coverSize : '',
        coverKey: typeof raw.coverKey === 'string' ? raw.coverKey : '',
        actCovers: (Array.isArray(raw.actCovers) ? raw.actCovers : []).slice(0, 3).map((item) => {
            if (typeof item === 'string') return item.slice(0, 2048);
            if (!item || typeof item !== 'object') return '';
            return {
                url: String(item.url || item.cover || '').slice(0, 2048),
                size: String(item.size || item.coverSize || 'cover').slice(0, 40),
                position: String(item.position || item.coverCrop || 'center').slice(0, 80),
            };
        }),
        author: normalizeAuthor(raw.author || raw.source || '未知来源'),
        sourceId: raw.sourceId === undefined ? '' : String(raw.sourceId),
        addedAt: typeof raw.addedAt === 'string' ? raw.addedAt : new Date().toISOString(),
        updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : new Date().toISOString(),
        usageCount: Number.isFinite(Number(raw.usageCount)) ? Math.max(0, Number(raw.usageCount)) : 0,
        usedBy: raw.usedBy && typeof raw.usedBy === 'object' && !Array.isArray(raw.usedBy) ? { ...raw.usedBy } : {},
        builtin: false,
        importSelected: raw.importSelected !== false,
    };
}

function normalizeAuthor(value) {
    const text = String(value || '未知来源').trim().replace(/^@+/, '');
    return `@${(text || '未知来源').slice(0, 28)}`;
}

function deriveFileAuthor(file, parsed) {
    if (parsed?.author || parsed?._author) return normalizeAuthor(parsed.author || parsed._author);
    const base = String(file?.name || '导入剧目').replace(/\.json$/i, '');
    const prefix = base.match(/^(.+?)的小剧场/)?.[1] || base.replace(/合集.*$/i, '');
    return normalizeAuthor(prefix || '导入剧目');
}

function extractRawPlays(parsed, file) {
    const author = deriveFileAuthor(file, parsed);
    if (Array.isArray(parsed)) return parsed.map((item) => ({ ...item, author: item?.author || author }));
    if (Array.isArray(parsed?.scripts)) return parsed.scripts.map((item) => ({ ...item, author: item?.author || author }));
    if (parsed?.entries && typeof parsed.entries === 'object') {
        const bookId = String(file?.name || parsed.name || 'worldbook');
        return Object.values(parsed.entries)
            .filter((entry) => entry && typeof entry === 'object' && String(entry.content || '').trim())
            .map((entry) => ({
                id: `worldbook-${encodeURIComponent(bookId)}-${entry.uid ?? newId()}`,
                sourceId: entry.uid ?? '',
                title: entry.comment || `未命名剧目 ${entry.uid ?? ''}`,
                prompt: entry.content,
                mode: '世界书小剧场',
                description: String(entry.content).replace(/\s+/g, ' ').slice(0, 160),
                importSelected: entry.disable !== true && entry.enabled !== false,
                acts: ['开幕', '发展', '谢幕'],
                tags: Array.isArray(entry.key) ? entry.key : [],
                author,
            }));
    }
    return [{ ...parsed, author: parsed?.author || author }];
}

function getContext() {
    return globalThis.SillyTavern?.getContext?.() || null;
}

function hydrateSettings() {
    const context = getContext();
    const hostSettings = context?.extensionSettings;
    if (hostSettings) {
        hostSettings[SETTINGS_KEY] ??= clone(DEFAULT_SETTINGS);
        const current = hostSettings[SETTINGS_KEY];
        settings = {
            ...clone(DEFAULT_SETTINGS),
            ...current,
            library: Array.isArray(current.library) ? current.library : clone(BUNDLED_PLAYS),
            favoriteIds: Array.isArray(current.favoriteIds) ? current.favoriteIds : [],
            history: Array.isArray(current.history) ? current.history : [],
            castMode: current.castMode || (current.protagonist ? 'custom' : 'user'),
        };
        hostSettings[SETTINGS_KEY] = settings;
        saveSettings = () => context.saveSettingsDebounced?.();
    } else {
        settings = clone(DEFAULT_SETTINGS);
        saveSettings = () => localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
        try {
            const local = JSON.parse(localStorage.getItem(SETTINGS_KEY) || 'null');
            if (local) settings = { ...settings, ...local, castMode: local.castMode || (local.protagonist ? 'custom' : 'user') };
        } catch { /* keep defaults */ }
    }

    settings.settingEntries = Array.isArray(settings.settingEntries) ? settings.settingEntries : [];
    if (!settings.settingEntriesVersion) {
        settings.legacyDirectorNote = settings.directorNote || '';
        if (settings.legacyDirectorNote.trim()) settings.settingEntries.push({ id: newId(), name: '原来的默认要求', content: settings.legacyDirectorNote, enabled: true });
        settings.directorNote = '';
        settings.settingEntriesVersion = 1;
        saveSettings();
    }
    if (!settings.directorPreferencesVersion) {
        if (settings.mode === '沉浸叙事') settings.mode = 'follow-source';
        settings.directorPreferencesVersion = 1;
        saveSettings();
    }
    let bundledLibraryChanged = false;
    for (const bundledPlay of BUNDLED_PLAYS) {
        const existingPlay = settings.library.find((play) => play.id === bundledPlay.id);
        if (!existingPlay) {
            settings.library.push(clone(bundledPlay));
            bundledLibraryChanged = true;
            continue;
        }
        if (existingPlay.cover !== bundledPlay.cover || existingPlay.coverCrop !== bundledPlay.coverCrop || existingPlay.coverSize !== bundledPlay.coverSize) {
            existingPlay.cover = bundledPlay.cover || '';
            existingPlay.coverCrop = bundledPlay.coverCrop || '';
            existingPlay.coverSize = bundledPlay.coverSize || '';
            bundledLibraryChanged = true;
        }
    }

    let libraryLayoutChanged = false;
    if (!settings.libraryLayoutMigrated && Array.isArray(settings.activeSlots)) {
        const oldFrontIds = settings.activeSlots.filter((id, index, ids) => id && ids.indexOf(id) === index);
        const oldFront = oldFrontIds.map((id) => settings.library.find((play) => play.id === id)).filter(Boolean);
        const oldFrontSet = new Set(oldFront.map((play) => play.id));
        settings.library = [...oldFront, ...settings.library.filter((play) => !oldFrontSet.has(play.id))];
        settings.libraryLayoutMigrated = true;
        libraryLayoutChanged = true;
    }

    settings.library = settings.library.map((play) => ({
        ...play,
        cover: play.cover === GENERIC_COVER_ATLAS_URL ? '' : (play.cover || ''),
        coverCrop: play.cover === GENERIC_COVER_ATLAS_URL ? '' : (play.coverCrop || ''),
        coverSize: play.cover === GENERIC_COVER_ATLAS_URL ? '' : (play.coverSize || ''),
        usageCount: Number.isFinite(Number(play.usageCount)) ? Math.max(0, Number(play.usageCount)) : 0,
        usedBy: play.usedBy && typeof play.usedBy === 'object' && !Array.isArray(play.usedBy) ? play.usedBy : {},
    }));
    const coverAssignmentsChanged = assignBuiltinCoverKeys(settings.library);
    settings.coverLibraryVersion = COVER_LIBRARY_VERSION;
    settings.favoriteIds = (Array.isArray(settings.favoriteIds) ? settings.favoriteIds : [])
        .filter((id, index, ids) => ids.indexOf(id) === index && settings.library.some((play) => play.id === id));
    settings.lobbyFilter = settings.lobbyFilter === 'favorites' ? 'favorites' : 'all';
    settings.lobbySort = settings.lobbySort === 'most-used' ? 'most-used' : 'latest';
    settings.continueContext = settings.continueContext !== false;
    settings.beautificationMode = settings.beautificationMode === 'dynamic' ? 'dynamic' : 'static';
    settings.beautificationEnabled = settings.beautificationEnabled !== false;
    const previousSelectedId = settings.selectedId;
    if (!settings.library.some((play) => play.id === settings.selectedId)) settings.selectedId = settings.library[0]?.id || null;
    if (bundledLibraryChanged || libraryLayoutChanged || coverAssignmentsChanged || previousSelectedId !== settings.selectedId) saveSettings();
}

function playById(id) {
    return settings.library.find((play) => play.id === id) || null;
}

function selectedPlay() {
    return playById(settings.selectedId) || getVisiblePlays()[0] || null;
}

function isFavorite(playId) {
    return settings.favoriteIds.includes(playId);
}

function playTimestamp(play) {
    return Date.parse(play.updatedAt || play.addedAt || '') || 0;
}

function getVisiblePlays() {
    const filtered = settings.library.filter((play) => settings.lobbyFilter !== 'favorites' || isFavorite(play.id));
    const indexed = filtered.map((play) => ({ play, index: settings.library.indexOf(play) }));
    indexed.sort((left, right) => {
        if (settings.lobbySort === 'most-used') {
            const usageDifference = Number(right.play.usageCount || 0) - Number(left.play.usageCount || 0);
            if (usageDifference) return usageDifference;
        }
        const timeDifference = playTimestamp(right.play) - playTimestamp(left.play);
        return timeDifference || left.index - right.index;
    });
    return indexed.map(({ play }) => play);
}

function escapeHtml(text) {
    const node = document.createElement('span');
    node.textContent = String(text ?? '');
    return node.innerHTML;
}

function toast(message, kind = 'info') {
    const root = document.getElementById(ROOT_ID);
    if (!root) return;
    const box = root.querySelector('.mit-toast');
    box.textContent = message;
    box.dataset.kind = kind;
    box.classList.add('is-visible');
    clearTimeout(box._hideTimer);
    box._hideTimer = setTimeout(() => box.classList.remove('is-visible'), 3200);
}

function coverFor(play) {
    if (!play) return null;
    if (play.cover) {
        return {
            url: play.cover,
            size: play.coverSize || (play.coverCrop ? '200% 200%' : 'cover'),
            position: play.coverCrop || 'center',
        };
    }
    return resolveBuiltinCover(play.coverKey) || resolveBuiltinCover(BUILTIN_COVER_LIBRARY[0].coverKey);
}

function applyStorytellerCover(element, play) {
    const identity = String(play.id || play.coverKey || play.title || 'play');
    let hash = 0;
    for (let index = 0; index < identity.length; index += 1) hash = ((hash << 5) - hash + identity.charCodeAt(index)) | 0;
    const spriteIndex = Math.abs(hash) % 12;
    const column = spriteIndex % 4;
    const row = Math.floor(spriteIndex / 4);
    element.style.backgroundImage = `url(${JSON.stringify(STORYTELLER_LIBRARY_SPRITE_URL)})`;
    element.style.backgroundSize = '400% 300%';
    element.style.backgroundPosition = `${column * (100 / 3)}% ${row * 50}%`;
    element.style.backgroundRepeat = 'no-repeat';
    element.hidden = false;
    element.setAttribute('aria-label', `${play.title}故事贴纸封面`);
}

function applyCover(element, play) {
    if (!element) return;
    if (!play) {
        element.style.removeProperty('background-image');
        element.style.removeProperty('background-size');
        element.style.removeProperty('background-position');
        element.hidden = true;
        return;
    }
    if (!play.cover) {
        applyStorytellerCover(element, play);
        return;
    }
    const cover = coverFor(play);
    element.style.backgroundImage = `url(${JSON.stringify(cover.url)})`;
    element.style.backgroundSize = cover.size;
    element.style.backgroundPosition = cover.position;
    element.hidden = false;
    element.setAttribute('aria-label', `${play.title}封面`);
}

function renderLobbyState() {
    if (!document.getElementById(ROOT_ID) || readerOpen) return;
    if (theatrePage === 'library') showLibrary();
    else if (theatrePage === 'lobby') showLobby();
}

function usedBySummary(play) {
    const names = Object.entries(play.usedBy || {})
        .sort((left, right) => Number(right[1]) - Number(left[1]))
        .map(([name]) => name)
        .filter(Boolean);
    if (!names.length) return '还没有角色演出过';
    const shown = names.slice(0, 3).join('、');
    return names.length > 3 ? `${shown} 等 ${names.length} 人` : shown;
}

// Each SVG displays one source-art component. The full scene is never placed
// behind the responsive controls; its navigation and paper cannot show twice.
function hallFragment(rect, className = '', transform = '', fit = 'xMidYMid meet') {
    return `<svg class="${className}" viewBox="${rect.join(' ')}" preserveAspectRatio="${fit}" aria-hidden="true" focusable="false"${transform ? ` style="transform:${transform}"` : ''}><image href="${HALL_IMAGE_URLS.lobby}" width="1536" height="1024"/></svg>`;
}

function hallRepeat(rect, id, scale, transform = '') {
    const width = rect[2] * scale, height = rect[3] * scale;
    return `<svg class="mit-art-tile" aria-hidden="true" focusable="false"${transform ? ` style="transform:${transform}"` : ''}><defs><pattern id="${id}" patternUnits="userSpaceOnUse" width="${width}" height="${height}"><svg width="${width}" height="${height}" viewBox="${rect.join(' ')}" preserveAspectRatio="xMidYMid meet"><image href="${HALL_IMAGE_URLS.lobby}" width="1536" height="1024"/></svg></pattern></defs><rect width="100%" height="100%" fill="url(#${id})"/></svg>`;
}

function hallFrame(kind) {
    const frames = {
        paper: [
            [377,834,128,128], [600,834,128,128], [1389,834,128,128],
            [377,360,128,128], [550,300,750,500], [1389,360,128,128],
            [377,834,128,128], [600,834,128,128], [1389,834,128,128],
        ],
        binding: [
            [4,181,58,36], [62,181,266,36], [328,181,28,36],
            [4,300,58,166], [177,352,132,35], [328,352,28,35],
            [4,879,58,92], [62,879,266,92], [328,879,28,92],
        ],
        'binding-mobile': [
            [328,181,28,36], [140,181,140,36], [328,181,28,36],
            [328,352,28,35], [177,352,132,35], [328,352,28,35],
            [328,181,28,36], [140,181,140,36], [328,181,28,36],
        ],
        ticket: [
            [70,218,32,32], [180,218,48,32], [305,218,32,32],
            [70,258,18,24], [175,236,135,20], [319,258,18,24],
            [70,314,32,32], [180,314,48,32], [305,314,32,32],
        ],
    };
    const scale = { paper: 44 / 128, binding: .6, 'binding-mobile': .5, ticket: .6 }[kind];
    const id = `mit-art-${kind}-${newId()}`;
    return `<span class="mit-art-frame mit-art-frame-${kind}" aria-hidden="true">${frames[kind].map((rect, i) => {
        const transform = kind === 'paper' && i < 3 ? 'scaleY(-1)' : kind === 'binding-mobile'
            ? `${i % 3 === 0 ? 'scaleX(-1)' : ''} ${i > 5 ? 'scaleY(-1)' : ''}`.trim() : '';
        if (i === 4) return hallFragment(rect, 'mit-art-tile', '', 'none');
        if ([1,3,5,7].includes(i)) return hallRepeat(rect, `${id}-${i}`, scale, transform);
        return hallFragment(rect, 'mit-art-tile', transform);
    }).join('')}</span>`;
}

function hallNavigation() {
    return [['lobby','剧场大厅',[88,239,66,84]], ['library','剧目库',[87,420,70,86]], ['history','演出记录',[85,589,75,88]], ['director','导演室',[88,770,70,83]]]
        .map(([view, label, icon]) => `<button class="mit-nav mit-nav-${view}" type="button" data-view="${view}" aria-label="${label}">${hallFrame('ticket')}${hallFragment(icon, 'mit-nav-icon')}<span class="mit-nav-label">${label}</span><span class="mit-current-mark" aria-hidden="true">✦</span></button>`).join('');
}

function createRoot() {
    const root = document.createElement('div');
    root.id = ROOT_ID;
    root.className = 'mit-overlay';
    root.innerHTML = `
        <div class="mit-backdrop" data-action="close"></div>
        <section class="mit-theatre" role="dialog" aria-modal="true" aria-label="无名剧场">
            <header class="mit-masthead">
                <svg class="mit-header-art" viewBox="0 0 1536 224" role="img" aria-label="无名剧场纸雕招牌与幕布">
                    <defs><clipPath id="mit-header-silhouette"><path d="M0 0H1536V176H1100L1090 199L1060 214H830L790 223L762 221L740 213H473L441 201L426 176H0Z"/></clipPath></defs>
                    <image href="${HALL_IMAGE_URLS.lobby}" width="1536" height="1024" clip-path="url(#mit-header-silhouette)"/>
                </svg>
            </header>
            <div class="mit-stage">
                <nav class="mit-navigation" aria-label="剧场主导航">${hallFrame('binding')}${hallFrame('binding-mobile')}<div class="mit-navigation-items">${hallNavigation()}</div></nav>
                <div class="mit-sheet-host" aria-live="polite"></div>
            </div>
            <button class="mit-close" type="button" data-action="close" aria-label="关闭无名剧场">×</button>
        </section>
        <section class="mit-reader" role="dialog" aria-modal="true" aria-label="故事阅读"></section>
        <div class="mit-toast" role="status"></div>`;
    document.body.append(root);
    document.documentElement.classList.add('mit-active');
    Object.values(HALL_IMAGE_URLS).forEach((url) => {
        const image = new Image();
        image.src = url;
    });
    bindRootEvents(root);
    theatrePage = 'lobby'; readerOpen = false;
    setCurrentView('lobby');
    showWorkspace();
    requestAnimationFrame(() => root.classList.add('is-open'));
    return root;
}

function openTheatre() {
    clearTimeout(closeTimer);
    const existing = document.getElementById(ROOT_ID);
    if (existing) {
        existing.classList.add('is-open');
        return;
    }
    if (!settings) hydrateSettings();
    createRoot();
    keydownHandler = (event) => {
        if (event.key !== 'Escape') return;
        if (readerOpen) closeReader();
        else if (theatrePage !== 'lobby') setView('lobby');
        else closeTheatre();
    };
    document.addEventListener('keydown', keydownHandler);
}

function closeTheatre() {
    const root = document.getElementById(ROOT_ID);
    if (!root) return;
    captureWorkspace();
    queueSessionSave();
    root.classList.remove('is-open');
    closeTimer = setTimeout(() => {
        root.remove();
        document.documentElement.classList.remove('mit-active');
        if (keydownHandler) document.removeEventListener('keydown', keydownHandler);
    }, 180);
}

function closeSheet() {
    document.getElementById(ROOT_ID)?.classList.remove('has-sheet');
    const host = document.querySelector(`#${ROOT_ID} .mit-sheet-host`);
    if (host) host.replaceChildren();
}

function setCurrentView(view) {
    const root = document.getElementById(ROOT_ID);
    if (!root) return;
    root.dataset.view = view;
    root.querySelectorAll('[data-view]').forEach((button) => {
        const isCurrent = button.dataset.view === view;
        button.classList.toggle('is-current', isCurrent);
        if (button.classList.contains('mit-nav')) {
            if (isCurrent) button.setAttribute('aria-current', 'page');
            else button.removeAttribute('aria-current');
        }
    });
}

function setView(view) {
    captureWorkspace();
    queueSessionSave();
    theatrePage = view;
    readerOpen = false;
    showWorkspace();
}

function showSheet(view, title, body, className = '') {
    document.getElementById(ROOT_ID)?.classList.remove('is-reading');
    document.getElementById(ROOT_ID)?.classList.add('has-sheet');
    const host = document.querySelector(`#${ROOT_ID} .mit-sheet-host`);
    if (!host) return;
    const pageChanged = host.querySelector('.mit-sheet')?.getAttribute('aria-label') !== title;
    setCurrentView(view);
    host.innerHTML = `
        <section class="mit-sheet ${className}" aria-label="${escapeHtml(title)}">
            ${hallFrame('paper')}
            <header><h2>${escapeHtml(title)}</h2></header>
            <div class="mit-sheet-body" tabindex="0">${body}</div>
        </section>`;
    if (pageChanged) document.getElementById(ROOT_ID).scrollTop = 0;
    const heading = host.querySelector('h2');
    if (heading) { heading.tabIndex = -1; heading.focus({preventScroll:true}); }
}

function showLibrary() {
    theatrePage = 'library';
    const list = getVisiblePlays().map((play) => {
        const searchable = `${play.title} ${play.author || ''} ${play.mode || ''} ${(play.tags || []).join(' ')}`.toLowerCase();
        return `
            <article class="mit-library-item" data-play-id="${escapeHtml(play.id)}" data-search="${escapeHtml(searchable)}">
                <div class="mit-library-cover" data-cover-play-id="${escapeHtml(play.id)}" role="img"></div>
                <div class="mit-library-copy">
                    <div class="mit-library-title-line"><h3>${escapeHtml(play.title)}</h3><span class="mit-author-stamp">${escapeHtml(play.author || '@无名剧场')}</span></div>
                    <p>${escapeHtml(play.description)}</p>
                    <div class="mit-library-meta"><span>${escapeHtml(play.mode)}</span><strong>使用 ${Number(play.usageCount || 0)} 次</strong><span>${escapeHtml(usedBySummary(play))}</span></div>
                </div>
                <div class="mit-library-actions">
                    <button class="${isFavorite(play.id) ? 'is-favorite' : ''}" type="button" data-action="toggle-favorite" data-play-id="${escapeHtml(play.id)}">${isFavorite(play.id) ? '★ 已收藏' : '☆ 收藏'}</button>
                    <button class="mit-add-lobby-button" type="button" data-action="select-play" data-play-id="${escapeHtml(play.id)}">用这个剧目</button>
                    ${play.builtin ? '' : `<button class="is-danger" type="button" data-action="delete-play" data-play-id="${escapeHtml(play.id)}">删除</button>`}
                </div>
            </article>`;
    }).join('');

    showSheet('library', '剧目库', `
        <div class="mit-library-toolbar">
            <div><strong>${settings.library.length}</strong> 个剧目 · <strong>${settings.favoriteIds.length}</strong> 个收藏</div>
            <div class="mit-library-tools"><input id="mit-library-search" type="search" placeholder="搜剧名或 @作者"><label class="mit-import-button">导入世界书 / 剧目<input id="mit-import-file" type="file" accept="application/json,.json" multiple></label></div>
        </div>
        <p class="mit-help">挑一个想演的故事，点「用这个剧目」，再补充你的要求。</p>
        <details class="mit-library-organize"><summary>筛选、排序与随机挑选</summary><div><select id="mit-library-filter" aria-label="剧目筛选"><option value="all" ${settings.lobbyFilter !== 'favorites' ? 'selected' : ''}>全部剧目</option><option value="favorites" ${settings.lobbyFilter === 'favorites' ? 'selected' : ''}>收藏的剧目</option></select><select id="mit-lobby-sort" aria-label="剧目排序"><option value="latest" ${settings.lobbySort !== 'most-used' ? 'selected' : ''}>最近加入</option><option value="most-used" ${settings.lobbySort === 'most-used' ? 'selected' : ''}>经常使用</option></select><button data-action="random">帮我挑一个</button></div></details>
        <div class="mit-library-list">${list || '<p class="mit-page-note">还没有收藏剧目，选择「全部剧目」看看吧。</p>'}</div>
    `, 'mit-library-sheet');
    document.querySelectorAll(`#${ROOT_ID} .mit-library-cover[data-cover-play-id]`).forEach((element) => {
        applyCover(element, playById(element.dataset.coverPlayId));
    });
}

function buildOpeningCue(play, continueContext = settings.continueContext, context = getContext(), options = settings) {
    const cast = storyCast(context, options);
    const writingStyle = STORY_STYLES.find(([id]) => id === options.mode)?.[2] || STORY_STYLES[0][2];
    const acts = play.acts?.length ? play.acts.join(' / ') : '开幕 / 转折 / 谢幕';
    const contextRule = continueContext
        ? '完整主聊天：结合所提供的全部主线记录中的人物关系、情绪与已知事件；本场新增事件属于独立番外。'
        : '独立番外：不延续最近主线事件，只保持角色设定、Persona 与既有人物关系一致。';
    return `【本篇题目】${play.title}\n请按以下资料与要求完成故事。\n人物安排：${cast.instruction}\n叙事方式：${writingStyle}\n上下文方式：${contextRule}\n可参考的故事节奏（具体组织方式以剧目要求为准）：${acts}\n剧目设定：${play.prompt}\n用户编辑的剧目描述（具体情节以这份描述为准）：${play.description}\n补充要求：${options.directorNote || '保持画面感与角色一致性。'}\n创作要求：从具体场景开始；逐项完成剧目要求，涉及天数或数量时按编号写全；涉及血量、金额、时间或触发阈值时核对各步算式，明确区分当前数值与距离目标的差额，确保每次变化、最终数值和结局条件一致；保持角色身份、关系与说话方式一致；依据角色卡、世界书、Persona 与已有关系描写出场人物的行动、心理和台词；一次写完开端、发展、转折与明确结局，在本次输出中完成所有选择与事件收束；只呈现作品本身，本场内容不改变主线事实。`;
}

function filterMainChatMessages(chat) {
    const result = [];
    let skipLegacyReply = false;
    for (const message of Array.isArray(chat) ? chat : []) {
        if (message?.extra?.[THEATRE_MESSAGE_KEY]) continue;
        const text = String(message?.mes || '').trim();
        if (message?.is_user && /^\[无名剧场\s*·/.test(text)) {
            skipLegacyReply = true;
            continue;
        }
        if (skipLegacyReply && !message?.is_user) {
            skipLegacyReply = false;
            continue;
        }
        if (skipLegacyReply && message?.is_user) skipLegacyReply = false;
        if (text) result.push(message);
    }
    return result;
}

function buildCharacterSystemPrompt(context, continueContext = settings.continueContext, sequel = false) {
    const fields = context.getCharacterCardFields?.() || {};
    const activeCharacter = context.characters?.[context.characterId] || {};
    const alternateGreetings = Array.isArray(activeCharacter?.data?.alternate_greetings)
        ? activeCharacter.data.alternate_greetings.filter((item) => String(item || '').trim()).join('\n\n--- 备选开场白 ---\n\n')
        : '';
    const sections = [
        ['当前角色', context.name2],
        ['当前用户', context.name1],
        ['角色描述', fields.description],
        ['角色性格', fields.personality],
        ['当前场景', fields.scenario],
        ['用户 Persona', fields.persona],
        ['首条开场白', activeCharacter.first_mes],
        ['备选开场白', alternateGreetings],
        ['角色系统要求', fields.system],
        ['角色深度提示', fields.charDepthPrompt],
        ['角色后置行为约束', fields.jailbreak],
        ['创作者备注', fields.creatorNotes],
        ['角色卡版本', fields.version],
        ['对话示例', fields.mesExamples],
    ].filter(([, value]) => String(value || '').trim())
        .map(([label, value]) => `【${label}】\n${String(value).trim()}`);
    return [
        '你是一名为读者创作完整故事并设计阅读页面的作者。最终只交付作品正文及其 HTML/CSS。',
        sequel ? '本次由用户明确要求创作后续篇章。给定前篇是已完成的故事，保留其事实与结局，从结局之后展开并写完新篇章，仅输出新增内容。' : continueContext
            ? '只把提供的主聊天快照当作人物关系、说话习惯与主线背景；不要续写或引用任何历史小剧场。'
            : '本次不提供主聊天快照；只依据角色卡、Persona 与剧目要求演出独立番外。',
        '本次任务是一次完成的独立故事：写出开端、发展、转折和明确结局；依据角色卡、世界书与 Persona 合理描写出场人物言行，并在故事内部完成选择。此完成方式优先于剧目、角色卡或聊天中要求等待用户回复、分轮互动的写作方式。严格保持人物一致性，本场新增事件仅属于番外。番外隔离、上下文来源和生成过程都是内部执行规则，不得作为免责声明、脚注或界面说明写入作品；作品只呈现故事本身。',
        ...sections,
    ].join('\n\n');
}

function buildGenerationMessages(context, play, beautificationMode, continueContext = settings.continueContext, options = settings) {
    const mainChat = continueContext ? filterMainChatMessages(context.chat) : [];
    let cue = context.substituteParams(buildOpeningCue(play, continueContext, context, options));
    if (options.previousText) cue += `\n\n【已完成前篇，仅作续写依据】\n${options.previousText}\n\n【用户的后续要求】\n${options.sequel}\n从前篇结局之后继续，完整写完新增篇章，前篇保持原样。`;
    const selected = mainChat.map(message => {
        const speaker = String(message.name || (message.is_user ? context.name1 : context.name2) || '').trim();
        return {
            role: message.is_system ? 'system' : (message.is_user ? 'user' : 'assistant'),
            content: `${speaker ? `${speaker}：` : ''}${String(message.mes || '')}`,
        };
    });
    const entries = (options.settingEntries || []).filter(entry => entry.enabled && entry.content.trim());
    if (entries.length) selected.push({ role: 'system', content: context.substituteParams('【常驻设定】\n' + entries.map(entry => `【${entry.name || '未命名条目'}】\n${entry.content}`).join('\n\n')) });
    selected.push({ role: 'user', content: cue });
    // generateRaw owns this ordered message list. D0 follows all context, the
    // creative request and any previous chapters, immediately before generation.
    selected.push({ role: 'system', content: context.substituteParams(buildVisualGuidance(beautificationMode)) });
    return selected;
}

function currentParticipantNames(context) {
    if (context.groupId) {
        const group = context.groups?.find((item) => String(item.id) === String(context.groupId));
        const memberIds = new Set((group?.members || []).map(String));
        const names = (context.characters || [])
            .filter((character) => memberIds.has(String(character.avatar)))
            .map((character) => String(character.name || '').trim())
            .filter(Boolean);
        if (names.length) return [...new Set(names)];
    }
    const name = String(context.characters?.[context.characterId]?.name || context.name2 || '').trim();
    return name ? [name] : ['当前角色'];
}

async function runWorkspace(sequel = false) {
    captureWorkspace();
    if (generationInFlight) return;
    if (!session.form.requirements.trim() && !session.form.playId) return toast('先写一点故事要求吧', 'info');
    if (sequel && !session.sequel?.trim()) return toast('写下后续篇章要求后再开始', 'info');
    if (currentWork() && !await saveCurrentWork()) return;
    const form = clone(session.form);
    const original = playById(form.playId);
    return startPerformance({ ...original, id: original?.id || 'custom', title: form.title.trim() || '我的小剧场',
        description: form.requirements, prompt: original?.prompt || '根据用户要求创作。' }, form.beautification, form.continueContext,
        { mode: form.mode, castMode: form.castMode, protagonist: form.protagonist, directorNote: form.note, form, previousWork: sequel ? clone(currentWork()) : null, sequel: session.sequel });
}

async function startPerformance(play = selectedPlay(), beautificationMode = settings.beautificationEnabled ? settings.beautificationMode : 'off', continueContext = settings.continueContext, options = {}) {
    if (!play || generationInFlight) return;
    generationInFlight = true;
    await ensureWorks();
    const context = getContext();
    if (!context?.generateRaw || !context?.getCharacterCardFields || !context?.substituteParams) {
        toast('当前酒馆缺少小剧场所需的独立生成或上下文读取能力', 'error');
        generationInFlight = false;
        return;
    }
    if (!context.chatId) { generationInFlight = false; return toast('请先打开一个角色或群聊', 'error'); }

    const runId = newId();
    const startedAt = new Date().toISOString();
    const source = targetIdentity(context);
    const run = { mode: settings.mode, castMode: settings.castMode, protagonist: settings.protagonist, directorNote: '', ...clone(options), settingEntries: clone(settings.settingEntries) };
    const protagonist = storyCast(context, run).name;
    const previous = run.previousWork;
    if (previous) run.previousText = workText(previous);
    const frozenPlay = clone(play);
    if (document.getElementById(ROOT_ID)) showWorkspace();
    toast(continueContext ? '正在读取主聊天并准备舞台…' : '正在准备独立番外舞台…');

    try {
        if (!protagonist) throw new Error('请填写其他人物的名字');
        if (previous && (previous.source?.key ? previous.source.key !== source.key : previous.chatId !== context.chatId)) throw new Error('请切回这部作品的原聊天后续写，保持人物和背景一致');
        const systemPrompt = buildCharacterSystemPrompt(context, continueContext, Boolean(previous));
        const prompt = buildGenerationMessages(context, frozenPlay, beautificationMode, continueContext, run);
        const sources = await loadGenerationSources(context);
        if (targetIdentity()?.key !== source.key) throw new Error('聊天已切换，请在目标聊天重新开始；本次尚未发送');
        const output = await context.generateRaw({
            prompt: [...sources, ...prompt],
            systemPrompt,
            trimNames: false,
        });
        if (String(output || '').length > 300000) throw new Error('本次生成内容过长，请缩短篇幅后重试；已有作品保留');
        const html = prepareHtmlDraft(output, frozenPlay.title);

        play.usageCount = Number(play.usageCount || 0) + 1;
        play.lastUsedAt = startedAt;
        play.usedBy ??= {};
        for (const name of currentParticipantNames(context)) play.usedBy[name] = Number(play.usedBy[name] || 0) + 1;
        const entry = previous ? { ...previous, revision: previous.revision + 1, updatedAt: new Date().toISOString(),
            chapters: [...previous.chapters, { title: `第 ${previous.chapters.length + 1} 篇`, html }] } : normalizeWork({
            id: runId,
            chapters: [{ title: '第一篇', html }],
            playId: frozenPlay.id,
            title: frozenPlay.title,
            protagonist,
            participants: currentParticipantNames(context),
            mode: run.mode,
            form: run.form || { ...session.form, mode:run.mode, castMode:run.castMode, protagonist:run.protagonist, note:run.directorNote, title:frozenPlay.title, requirements:frozenPlay.description },
            source,
            continueContext,
            beautificationMode,
            chatId: context.chatId || '',
            startedAt,
        });
        session.work = entry; session.chapter = entry.chapters.length - 1; session.editing = false; session.dirty = false;
        session.form = { ...session.form, ...entry.form, title:entry.title }; session.sequelOpen = false; session.sequel = '';
        await saveCurrentWork(false);
        saveSettings();
        if (document.getElementById(ROOT_ID)?.classList.contains('is-open')) { readerReturnView = 'history'; readerOpen = true; }
        toast(`《${frozenPlay.title}》创作完成，聊天未发送`, 'success');
    } catch (error) {
        console.error(`[${EXTENSION_ID}] failed to start performance`, error);
        const reason = /context.*(length|limit|exceed)|too many tokens|maximum.*tokens/i.test(error?.message || '')
            ? '全部上下文超过模型容量。请换更大上下文的模型，或关闭「发送全部聊天上下文」；已有故事已保留。'
            : error?.message || '未知错误';
        toast(`开演失败：${reason}`, 'error');
    } finally {
        generationInFlight = false;
        if (document.getElementById(ROOT_ID)?.classList.contains('is-open')) showWorkspace();
    }
}

async function prepareImportFiles(files) {
    const plays = [];
    const errors = [];
    for (const file of files) {
        try {
            if (file.size > 2 * 1024 * 1024) throw new Error('文件超过 2MB');
            const parsed = JSON.parse(await file.text());
            const rawItems = extractRawPlays(parsed, file);
            plays.push(...rawItems.map(normalizePlay).map((play) => ({
                ...play,
                prompt: normalizeAnglePromptMacros(play.prompt),
            })));
        } catch (error) {
            errors.push(`${file.name}: ${error.message}`);
        }
    }
    pendingImport = { plays, errors };
    if (!plays.length) {
        showLibrary();
        return toast(errors.join('；') || '没有读取到可导入的剧目', 'error');
    }
    showImportPreview();
}

function showImportPreview() {
    if (!pendingImport?.plays?.length) return showLibrary();
    const macroCounts = pendingImportMacroCounts();
    const macroTarget = macroCounts.plain > 0 ? 'tavern' : 'plain';
    const macroButtonLabel = macroTarget === 'tavern'
        ? '一键替换为 {{char}}'
        : '一键切换为 char';
    const selectedCount = pendingImport.plays.filter(play => play.importSelected).length;
    const rows = pendingImport.plays.map((play, index) => `
        <article class="mit-import-preview-item">
            <label class="mit-import-select"><input type="checkbox" data-import-index="${index}" ${play.importSelected ? 'checked' : ''}><strong>${escapeHtml(play.title)}</strong></label>
            <span>${escapeHtml(play.author)} · ${escapeHtml(play.mode)}</span>
            <p>${escapeHtml(play.description)}</p>
            <details><summary>查看条目全文</summary><pre>${escapeHtml(play.prompt)}</pre></details>
        </article>`).join('');
    const warnings = pendingImport.errors.length
        ? `<div class="mit-import-warnings">${pendingImport.errors.map(escapeHtml).join('<br>')}</div>`
        : '';
    showSheet('library', '导入预览', `
        <p class="mit-help">世界书 JSON 可以直接导入。勾选要作为剧目的条目，全文会保留；原世界书保持原样。普通人物与背景设定可以继续使用酒馆中已关联的世界书。</p>
        <details class="mit-import-macro-tools"><summary>角色写法转换（可选）</summary>
            <div><strong>角色写法</strong><span>char：${macroCounts.plain} 个</span><span>{{char}}：${macroCounts.tavern} 个</span><span>{{user}} 保持不变</span></div>
            <button type="button" data-action="toggle-import-macros" data-target-style="${macroTarget}" ${macroCounts.plain + macroCounts.tavern ? '' : 'disabled'}>${macroCounts.plain + macroCounts.tavern ? macroButtonLabel : '未检测到角色写法'}</button>
        </details>
        ${warnings}
        <div class="mit-import-preview-list">${rows}</div>
        <div class="mit-confirm-actions">
            <button type="button" data-action="cancel-import">取消</button>
            <button class="mit-primary" type="button" data-action="confirm-import" ${selectedCount ? '' : 'disabled'}>确认收录 ${selectedCount} 个剧目</button>
        </div>
    `, 'mit-import-preview-sheet');
}

function togglePendingImportMacros(targetStyle) {
    if (!pendingImport?.plays?.length) return showLibrary();
    const style = targetStyle === 'plain' ? 'plain' : 'tavern';
    pendingImport.plays = pendingImport.plays.map((play) => ({
        ...play,
        prompt: convertPromptMacros(play.prompt, style),
    }));
    showImportPreview();
    toast(style === 'tavern' ? '已替换为酒馆宏 {{char}}，{{user}} 未改变' : '已切换为普通写法 char，{{user}} 未改变', 'success');
}

function commitPendingImport() {
    if (!pendingImport?.plays?.length) return showLibrary();
    const now = new Date().toISOString();
    let imported = 0;
    for (const incoming of pendingImport.plays.filter(play => play.importSelected)) {
        const play = { ...incoming, updatedAt: now };
        const existingIndex = settings.library.findIndex((item) => item.id === play.id);
        if (existingIndex >= 0 && !settings.library[existingIndex].builtin) {
            const existing = settings.library[existingIndex];
            settings.library.splice(existingIndex, 1, {
                ...play,
                addedAt: existing.addedAt || play.addedAt || now,
                usageCount: Number(existing.usageCount || 0),
                usedBy: existing.usedBy || {},
                lastUsedAt: existing.lastUsedAt || '',
                coverKey: existing.coverKey || play.coverKey || '',
            });
        } else if (existingIndex < 0) {
            settings.library.push({ ...play, addedAt: play.addedAt || now });
        } else {
            play.id = `${play.id}-${Date.now()}-${imported}`;
            settings.library.push({ ...play, addedAt: now });
        }
        imported += 1;
    }
    assignBuiltinCoverKeys(settings.library);
    settings.coverLibraryVersion = COVER_LIBRARY_VERSION;
    const errors = pendingImport.errors;
    pendingImport = null;
    settings.lobbySort = 'latest';
    saveSettings();
    showLibrary();
    renderLobbyState();
    toast(errors.length ? `已收录 ${imported} 个；另有 ${errors.length} 个文件未通过` : `已收录 ${imported} 个剧目`, errors.length ? 'error' : 'success');
}

async function handleAction(action, target) {
    if (await handleWorkspaceAction(action, target)) return;
    if (action === 'manage-plays') return showLibrary();
    if (action === 'close') return closeTheatre();
    if (action === 'close-sheet') return setView('lobby');
    if (action === 'random') {
        const choices = getVisiblePlays();
        if (!choices.length) return toast('当前筛选下没有可抽取的剧目', 'error');
        const play = choices[Math.floor(Math.random() * choices.length)];
        settings.selectedId = play.id;
        saveSettings();
        renderLobbyState();
        return usePlay(play);
    }
    if (action === 'confirm-start') return usePlay(selectedPlay());
    if (action === 'set-filter') {
        settings.lobbyFilter = target.dataset.filter === 'favorites' ? 'favorites' : 'all';
        const visible = getVisiblePlays();
        if (!visible.some((play) => play.id === settings.selectedId)) settings.selectedId = visible[0]?.id || null;
        saveSettings();
        return renderLobbyState();
    }
    if (action === 'toggle-favorite') {
        const play = playById(target.dataset.playId);
        if (!play) return;
        if (isFavorite(play.id)) settings.favoriteIds = settings.favoriteIds.filter((id) => id !== play.id);
        else settings.favoriteIds.push(play.id);
        saveSettings();
        renderLobbyState();
        if (document.getElementById(ROOT_ID)?.dataset.view === 'library') showLibrary();
        return toast(`${isFavorite(play.id) ? '已收藏' : '已取消收藏'}《${play.title}》`, 'success');
    }
    if (action === 'select-play') {
        const play = playById(target.dataset.playId);
        if (!play) return;
        settings.selectedId = play.id;
        saveSettings();
        return usePlay(play);
    }
    if (action === 'delete-play') {
        const play = playById(target.dataset.playId);
        if (!play || play.builtin || !confirm(`从剧目簿删除《${play.title}》？`)) return;
        settings.library = settings.library.filter((item) => item.id !== play.id);
        settings.favoriteIds = settings.favoriteIds.filter((id) => id !== play.id);
        if (settings.selectedId === play.id) settings.selectedId = getVisiblePlays()[0]?.id || null;
        saveSettings();
        renderLobbyState();
        return showLibrary();
    }
    if (action === 'cancel-import') {
        pendingImport = null;
        return showLibrary();
    }
    if (action === 'toggle-import-macros') return togglePendingImportMacros(target.dataset.targetStyle);
    if (action === 'confirm-import') return commitPendingImport();
}

function bindRootEvents(root) {
    root.addEventListener('click', (event) => {
        const viewButton = event.target.closest('.mit-nav[data-view]');
        if (viewButton) {
            setView(viewButton.dataset.view);
            return;
        }

        const card = event.target.closest('.mit-card-hotspot');
        if (card) {
            const play = playById(card.dataset.playId);
            if (play) { settings.selectedId = play.id; usePlay(play); }
            saveSettings();
            renderLobbyState();
            if (!play) toast('当前筛选下这里没有剧目', 'info');
            else toast(`已选择《${play.title}》，再点一次查看详情`);
            return;
        }

        const entryAction = event.target.closest('[data-action]');
        if (entryAction?.dataset.action === 'add-setting-entry') {
            settings.settingEntries.push({ id: newId(), name: '', content: '', enabled: true });
            saveSettings();
            const list = root.querySelector('#mit-setting-entries');
            list.innerHTML = settingEntriesMarkup();
            list.lastElementChild.open = true;
            list.lastElementChild.querySelector('input[data-setting-field="name"]').focus();
            return;
        }
        if (entryAction?.dataset.action === 'delete-setting-entry') {
            const row = entryAction.closest('[data-entry-id]');
            if (!confirm('删除这条常驻设定？')) return;
            settings.settingEntries = settings.settingEntries.filter(entry => entry.id !== row.dataset.entryId);
            saveSettings(); root.querySelector('#mit-setting-entries').innerHTML = settingEntriesMarkup(); return;
        }
        const actionTarget = event.target.closest('[data-action]');
        if (actionTarget) handleAction(actionTarget.dataset.action, actionTarget);
    });

    root.addEventListener('change', (event) => {
        if (event.target.dataset.settingField) { updateSettingEntry(event.target); return; }
        if (event.target.name === 'castMode') {
            event.target.closest('form')?.querySelector('.mit-custom-cast')?.toggleAttribute('hidden', event.target.value !== 'custom');
        }
        if (event.target.matches('[data-import-index]') && pendingImport) {
            const play = pendingImport.plays[Number(event.target.dataset.importIndex)];
            if (play) play.importSelected = event.target.checked;
            const count = pendingImport.plays.filter(item => item.importSelected).length;
            const confirm = root.querySelector('[data-action="confirm-import"]');
            if (confirm) { confirm.textContent = `确认收录 ${count} 个剧目`; confirm.disabled = count === 0; }
        }
        if (event.target.id === 'mit-work-import') importWorks(event.target.files[0]);
        if (event.target.id === 'mit-work-chapter') {
            captureWorkspace(); session.chapter = Number(event.target.value); queueSessionSave(); showWorkspace();
        }
        if (event.target.closest('#mit-work-form')) { captureWorkspace(); queueSessionSave(); }
        if (event.target.id === 'mit-import-file') prepareImportFiles([...event.target.files]);
        if (event.target.id === 'mit-library-filter') {
            settings.lobbyFilter = event.target.value === 'favorites' ? 'favorites' : 'all';
            saveSettings(); showLibrary();
        }
        if (event.target.id === 'mit-lobby-sort') {
            settings.lobbySort = event.target.value === 'most-used' ? 'most-used' : 'latest';
            saveSettings();
            renderLobbyState();
        }
    });

    root.addEventListener('input', (event) => {
        if (event.target.dataset.settingField) { updateSettingEntry(event.target); return; }
        if (event.target.closest('.mit-workspace-sheet, .mit-reader')) {
            captureWorkspace();
            storageMessage = '正在保存编辑草稿…'; updateWorkspaceStatus();
            clearTimeout(sessionSaveTimer); sessionSaveTimer = setTimeout(queueSessionSave, 250);
        }
        if (event.target.id !== 'mit-library-search') return;
        const query = event.target.value.trim().toLowerCase();
        root.querySelectorAll('.mit-library-item').forEach((item) => {
            item.hidden = Boolean(query && !item.dataset.search.includes(query));
        });
    });

    root.addEventListener('submit', (event) => {
        if (event.target.id === 'mit-work-form') { event.preventDefault(); runWorkspace(); return; }
        if (event.target.id !== 'mit-director-form') return;
        event.preventDefault();
        const data = new FormData(event.target);
        const protagonist = String(data.get('protagonist') || '').trim();
        const castMode = String(data.get('castMode') || 'user');
        if (castMode === 'custom' && !protagonist) return toast('请填写其他人物的名字', 'info');
        settings.protagonist = protagonist;
        settings.castMode = castMode;
        settings.mode = String(data.get('mode') || 'follow-source');
        settings.continueContext = data.get('continueContext') === 'on';
        settings.beautificationEnabled = data.get('beautificationEnabled') === 'on';
        settings.beautificationMode = data.get('beautificationMode') === 'dynamic' ? 'dynamic' : 'static';
        saveSettings();
        setView('director');
        toast('默认设置已保存，新故事会使用这些设置', 'success');
    });
}

function addMenuButton() {
    if (document.getElementById(MENU_ID)) return true;
    const menu = document.getElementById('extensionsMenu');
    if (!menu) return false;
    const container = document.createElement('div');
    container.id = 'mit-wand-container';
    container.className = 'extension_container';
    container.innerHTML = `
        <div id="${MENU_ID}" class="list-group-item flex-container flexGap5" role="button" tabindex="0">
            <div class="fa-solid fa-masks-theater extensionsMenuExtensionButton"></div>
            <span>无名剧场</span>
        </div>`;
    menu.append(container);
    const button = container.firstElementChild;
    button.addEventListener('click', openTheatre);
    button.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') openTheatre();
    });
    return true;
}

function init() {
    if (globalThis.__interludeTheatreInitialized) return;
    globalThis.__interludeTheatreInitialized = true;
    window.addEventListener('beforeunload', event => {
        if (generationInFlight || writeInFlight || sessionSaveTimer || pendingSaves) { event.preventDefault(); event.returnValue = ''; }
    });
    if (!addMenuButton()) {
        const observer = new MutationObserver(() => {
            if (addMenuButton()) observer.disconnect();
        });
        observer.observe(document.body, { childList: true, subtree: true });
        setTimeout(() => observer.disconnect(), 15000);
    }
    if (document.body.dataset.mitPreview === 'true') setTimeout(openTheatre, 60);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
else init();

export { openTheatre, closeTheatre };
