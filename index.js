import { prepareHtmlDraft } from './html-draft.js';
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
    lobby: new URL('./assets/theatre-hall-cream-candidate-v1.png', import.meta.url).href,
    library: new URL('./assets/theatre-hall-cream-candidate-v1.png', import.meta.url).href,
    history: new URL('./assets/theatre-hall-cream-candidate-v1.png', import.meta.url).href,
    director: new URL('./assets/theatre-hall-cream-candidate-v1.png', import.meta.url).href,
});
const GENERIC_COVER_ATLAS_URL = new URL('./assets/generic-play-covers-paper-cut-atlas.png', import.meta.url).href;
const STORYTELLER_LIBRARY_SPRITE_URL = new URL('./assets/library-storyteller-covers-generated-v1.png', import.meta.url).href;
const THEATRE_MESSAGE_KEY = 'interludeTheatre';
const BEAUTIFICATION_PROFILES = Object.freeze({
    static: [
        '采用克制、清晰的静态舞台排版。标题、正文和链接均用无下划线样式，层级通过留白、字号和字重表达，标题下方保持自然留白。',
        '以标题、场景提示、正文和自然分幕组织内容，装饰服务于阅读，不堆叠无意义符号。',
        '篇幅以完整讲清本场为准，通常约 800—1500 字；保持移动端易读和文字、背景高对比。',
        '若剧目自身另有明确篇幅或排版要求，以剧目要求为准。',
    ].join('\n'),
    dynamic: [
        '采用更华丽、富有动态舞台感的呈现，允许更丰富的灯光、幕布、转场、音效提示与视觉层次。标题、正文和链接均用无下划线样式，层级通过留白、字号和字重表达，标题下方保持自然留白。',
        '正文可以更长，通常约 1600—3000 字；每一幕都要有明确场景变化、人物动作、对白推进和情绪回声。',
        '若使用 HTML/CSS，美化必须限制在本条消息内部，适配移动端，不出框、不漏字，不使用脚本、外链资源或影响酒馆其他消息的全局选择器。',
        '动态效果必须尊重 prefers-reduced-motion；文字与背景保持高对比，动画不能妨碍阅读或遮挡交互。',
        '若剧目自身另有明确篇幅或排版要求，以剧目要求为准。',
    ].join('\n'),
});

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
    mode: '沉浸叙事',
    directorNote: '',
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
        prompt: prompt.slice(0, 12000),
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
        return Object.values(parsed.entries)
            .filter((entry) => entry && typeof entry === 'object' && String(entry.content || '').trim())
            .map((entry) => ({
                id: `worldbook-${entry.uid ?? crypto.randomUUID()}`,
                sourceId: entry.uid ?? '',
                title: entry.comment || `未命名剧目 ${entry.uid ?? ''}`,
                prompt: entry.content,
                mode: '世界书小剧场',
                description: '从 SillyTavern 世界书剧目簿导入。',
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
        };
        hostSettings[SETTINGS_KEY] = settings;
        saveSettings = () => context.saveSettingsDebounced?.();
    } else {
        settings = clone(DEFAULT_SETTINGS);
        saveSettings = () => localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
        try {
            const local = JSON.parse(localStorage.getItem(SETTINGS_KEY) || 'null');
            if (local) settings = { ...settings, ...local };
        } catch { /* keep defaults */ }
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
    const root = document.getElementById(ROOT_ID);
    if (!root) return;
    const visiblePlays = getVisiblePlays();
    if (!visiblePlays.some((play) => play.id === settings.selectedId)) settings.selectedId = visiblePlays[0]?.id || null;
    const current = selectedPlay();
    const currentTitle = root.querySelector('.mit-current-title');
    currentTitle.textContent = current ? `已选：${current.title}` : '尚未选剧';
    const programGrid = root.querySelector('#mit-program-grid');
    if (programGrid) {
        programGrid.innerHTML = visiblePlays.length ? visiblePlays.map((play) => `
            <div class="mit-card-slot ${play.id === settings.selectedId ? 'is-selected' : ''}">
                <button class="mit-card-hotspot ${play.id === settings.selectedId ? 'is-selected' : ''}" type="button" data-play-id="${escapeHtml(play.id)}" aria-pressed="${play.id === settings.selectedId}" aria-label="选择剧目：${escapeHtml(play.title)}" title="${escapeHtml(`${play.title}｜${play.description}`)}">
                    <span class="mit-card-cover" data-cover-play-id="${escapeHtml(play.id)}" role="img"></span>
                    <span class="mit-card-label">${escapeHtml(play.title)}</span>
                    ${play.id === settings.selectedId ? '<span class="mit-selected-stamp" aria-hidden="true">已选</span>' : ''}
                </button>
            </div>`).join('') : '<div class="mit-program-empty">当前没有收藏的剧目，请到第二页剧目库收藏。</div>';
        programGrid.querySelectorAll('[data-cover-play-id]').forEach((element) => applyCover(element, playById(element.dataset.coverPlayId)));
    }
    root.querySelectorAll('.mit-program-toolbar [data-filter]').forEach((button) => {
        button.classList.toggle('is-active', button.dataset.filter === settings.lobbyFilter);
    });
    const sort = root.querySelector('#mit-lobby-sort');
    if (sort) sort.value = settings.lobbySort;
    const count = root.querySelector('.mit-program-count');
    if (count) count.textContent = `${visiblePlays.length} 部`;

    saveSettings();
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

function createRoot() {
    const root = document.createElement('div');
    root.id = ROOT_ID;
    root.className = 'mit-overlay';
    root.innerHTML = `
        <div class="mit-backdrop" data-action="close"></div>
        <section class="mit-theatre" role="dialog" aria-modal="true" aria-label="无名剧场">
            <div class="mit-stage">
                <img class="mit-hall-art" src="${HALL_IMAGE_URLS.lobby}" alt="奶油色童话纸雕剧场大厅，左侧鼠尾草绿导航与横向展开的长节目单纸页">
                <button class="mit-close" type="button" data-action="close" aria-label="关闭无名剧场">×</button>
                <button class="mit-nav mit-nav-lobby" type="button" data-view="lobby" aria-label="剧场大厅"></button>
                <button class="mit-nav mit-nav-library" type="button" data-view="library" aria-label="剧目库"></button>
                <button class="mit-nav mit-nav-history" type="button" data-view="history" aria-label="演出记录"></button>
                <button class="mit-nav mit-nav-director" type="button" data-view="director" aria-label="导演室"></button>
                <section class="mit-program-panel" aria-label="今晚的节目单">
                    <header class="mit-program-heading">
                        <h2>今晚的节目单</h2>
                        <div class="mit-selection-summary"><div class="mit-current-title" aria-live="polite"></div><small>再点已选卡片，查看或修改描述</small></div>
                    </header>
                    <div class="mit-program-toolbar">
                        <div class="mit-filter-group" role="group" aria-label="剧目筛选">
                            <button type="button" data-action="set-filter" data-filter="all">全部</button>
                            <button type="button" data-action="set-filter" data-filter="favorites">只看收藏</button>
                        </div>
                        <select id="mit-lobby-sort" aria-label="剧目排序">
                            <option value="latest">最新</option>
                            <option value="most-used">使用最多</option>
                        </select>
                        <span class="mit-program-count"></span>
                    </div>
                    <div class="mit-program-scroll"><div id="mit-program-grid" class="mit-program-grid"></div></div>
                    <div class="mit-lobby-actions">
                        <button class="mit-random" type="button" data-action="random" aria-label="随机抽取当前筛选中的一个剧目">随机抽取</button>
                        <button class="mit-start" type="button" data-action="confirm-start" aria-label="拉开帷幕">拉开帷幕</button>
                    </div>
                </section>
                <div class="mit-sheet-host" aria-live="polite"></div>
                <div class="mit-toast" role="status"></div>
            </div>
        </section>`;
    document.body.append(root);
    Object.values(HALL_IMAGE_URLS).forEach((url) => {
        const image = new Image();
        image.src = url;
    });
    bindRootEvents(root);
    renderLobbyState();
    setCurrentView('lobby');
    requestAnimationFrame(() => root.classList.add('is-open'));
    return root;
}

function openTheatre() {
    const existing = document.getElementById(ROOT_ID);
    if (existing) {
        existing.classList.add('is-open');
        return;
    }
    hydrateSettings();
    createRoot();
    keydownHandler = (event) => {
        if (event.key !== 'Escape') return;
        const host = document.querySelector(`#${ROOT_ID} .mit-sheet-host`);
        if (host?.hasChildNodes()) setView('lobby');
        else closeTheatre();
    };
    document.addEventListener('keydown', keydownHandler);
}

function closeTheatre() {
    const root = document.getElementById(ROOT_ID);
    if (!root) return;
    root.classList.remove('is-open');
    setTimeout(() => root.remove(), 180);
    if (keydownHandler) document.removeEventListener('keydown', keydownHandler);
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
    const hallArt = root.querySelector('.mit-hall-art');
    if (hallArt && HALL_IMAGE_URLS[view]) hallArt.src = HALL_IMAGE_URLS[view];
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
    if (view === 'lobby') {
        closeSheet();
        setCurrentView('lobby');
        renderLobbyState();
        return;
    }
    if (view === 'library') return showLibrary();
    if (view === 'history') return showHistory();
    if (view === 'director') return showDirector();
}

function showSheet(view, title, body, className = '') {
    document.getElementById(ROOT_ID)?.classList.add('has-sheet');
    const host = document.querySelector(`#${ROOT_ID} .mit-sheet-host`);
    setCurrentView(view);
    host.innerHTML = `
        <section class="mit-sheet ${className}" aria-label="${escapeHtml(title)}">
            <header><h2>${escapeHtml(title)}</h2></header>
            <div class="mit-sheet-body">${body}</div>
        </section>`;
    host.querySelector('button, input, select, textarea')?.focus();
}

function showLibrary() {
    const list = settings.library.map((play) => {
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
                    <button class="mit-add-lobby-button" type="button" data-action="select-play" data-play-id="${escapeHtml(play.id)}">选择上演</button>
                    ${play.builtin ? '' : `<button class="is-danger" type="button" data-action="delete-play" data-play-id="${escapeHtml(play.id)}">删除</button>`}
                </div>
            </article>`;
    }).join('');

    showSheet('library', '剧目库', `
        <div class="mit-library-toolbar">
            <div><strong>${settings.library.length}</strong> 个剧目 · <strong>${settings.favoriteIds.length}</strong> 个收藏</div>
            <div class="mit-library-tools"><input id="mit-library-search" type="search" placeholder="搜剧名或 @作者"><label class="mit-import-button">导入剧目簿<input id="mit-import-file" type="file" accept="application/json,.json" multiple></label></div>
        </div>
        <p class="mit-help">这里负责导入和管理剧目。选择文件后会先显示只读预览，确认收录后才进入第一页的完整剧目列表。</p>
        <div class="mit-library-list">${list}</div>
    `, 'mit-library-sheet');
    document.querySelectorAll(`#${ROOT_ID} .mit-library-cover[data-cover-play-id]`).forEach((element) => {
        applyCover(element, playById(element.dataset.coverPlayId));
    });
}

function showHistory() {
    const rows = settings.history.length ? settings.history.map((entry) => `
        <article class="mit-history-item">
            <div><strong>${escapeHtml(entry.title)}</strong><span>${escapeHtml(entry.protagonist || '当前角色')} · ${escapeHtml(entry.mode)}</span></div>
            <time>${escapeHtml(new Date(entry.startedAt).toLocaleString())}</time>
            ${entry.html ? `<button type="button" data-action="view-draft" data-entry-id="${escapeHtml(entry.id)}">查看 HTML</button>` : ''}
            <button type="button" data-action="replay" data-play-id="${escapeHtml(entry.playId)}">再次上演</button>
        </article>
    `).join('') : '<div class="mit-empty">还没有演出记录。第一次拉开帷幕后会出现在这里。</div>';
    showSheet('history', '演出记录', `<div class="mit-history-list">${rows}</div>`, 'mit-history-sheet');
}

function showDraft(entry) {
    if (!entry?.html) return toast('这份记录没有保存 HTML，请重新制作', 'error');
    showSheet('history', entry.title, `
        <p class="mit-draft-note">${escapeHtml(entry.protagonist)} · ${escapeHtml(new Date(entry.startedAt).toLocaleString())} · ${entry.continueContext ? '已读取开演时的聊天上下文' : '独立番外'} · 未发送到聊天</p>
        <iframe class="mit-draft-frame" title="演出 HTML 预览" sandbox="" referrerpolicy="no-referrer"></iframe>
        <div class="mit-confirm-actions"><button type="button" data-action="replay" data-play-id="${escapeHtml(entry.playId)}">读取最新上下文再制作</button><button type="button" class="mit-primary" data-action="download-draft" data-entry-id="${escapeHtml(entry.id)}">下载 HTML</button></div>
    `, 'mit-draft-sheet');
    document.querySelector(`#${ROOT_ID} .mit-draft-frame`).srcdoc = prepareHtmlDraft(entry.html, entry.title);
}

function showDirector() {
    const context = getContext();
    const suggested = settings.protagonist || context?.name2 || '';
    showSheet('director', '导演室', `
        <form id="mit-director-form" class="mit-director-form">
            <label>当前主演<input name="protagonist" maxlength="60" value="${escapeHtml(suggested)}" placeholder="默认使用当前角色"></label>
            <label>演出模式<select name="mode">
                ${['沉浸叙事', '轻喜互动', '悬疑调查', '情感慢燃', '高速冲突', '舞台剧腔调'].map((mode) => `<option ${settings.mode === mode ? 'selected' : ''}>${mode}</option>`).join('')}
            </select></label>
            <label>导演备注<textarea name="directorNote" maxlength="1000" rows="5" placeholder="例如：更多对白、控制在三幕内、结尾留选择……">${escapeHtml(settings.directorNote)}</textarea></label>
            <fieldset class="mit-beautification-settings">
                <legend>聊天承接</legend>
                <label class="mit-checkbox-row"><input name="continueContext" type="checkbox" ${settings.continueContext ? 'checked' : ''}> 承接当前聊天</label>
                <p>开启时读取最近主聊天的关系、情绪和事件背景；关闭时只读取角色卡与 Persona，作为独立番外开演。</p>
            </fieldset>
            <fieldset class="mit-beautification-settings">
                <legend>默认美化提示词</legend>
                <label class="mit-checkbox-row"><input name="beautificationEnabled" type="checkbox" ${settings.beautificationEnabled ? 'checked' : ''}> 开演时启用默认美化</label>
                <label>默认档位<select name="beautificationMode">
                    <option value="static" ${settings.beautificationMode === 'static' ? 'selected' : ''}>静态 · 简洁克制</option>
                    <option value="dynamic" ${settings.beautificationMode === 'dynamic' ? 'selected' : ''}>动态 · 更长、更华丽、约束更多</option>
                </select></label>
                <p>关闭后只使用剧目自带的提示词；开演确认页仍可临时切换本次档位。</p>
            </fieldset>
            <p>读取主聊天时会排除历史小剧场消息；两种方式都会一次写完完整番外，人物言行依据角色卡与 Persona。</p>
            <button class="mit-primary" type="submit">保存导演设置</button>
        </form>
    `, 'mit-director-sheet');
}

function showStartConfirmation() {
    const play = selectedPlay();
    if (!play) return toast('请先从剧目库选择一个剧目', 'error');
    const context = getContext();
    const protagonist = settings.protagonist || context?.name2 || '当前角色';
    showSheet('lobby', '今晚开演', `
        <div class="mit-confirm-play">
            <div class="mit-confirm-ticket">✦ 今晚，你是故事的主角 ✦</div>
            <h3>${escapeHtml(play.title)}</h3>
            <p>${escapeHtml(play.description)}</p>
            <dl><div><dt>✧ 特邀主演</dt><dd>${escapeHtml(protagonist)}</dd></div><div><dt>✧ 演出方式</dt><dd>${escapeHtml(settings.mode || play.mode)}</dd></div></dl>
            <div class="mit-run-options">
                <label class="mit-run-context"><input id="mit-run-context" type="checkbox" ${settings.continueContext ? 'checked' : ''}> 承接当前聊天</label>
                <label class="mit-run-beautification">本次美化<select id="mit-run-beautification">
                    <option value="off" ${settings.beautificationEnabled ? '' : 'selected'}>简洁 HTML</option>
                    <option value="static" ${settings.beautificationEnabled && settings.beautificationMode === 'static' ? 'selected' : ''}>静态</option>
                    <option value="dynamic" ${settings.beautificationEnabled && settings.beautificationMode === 'dynamic' ? 'selected' : ''}>动态</option>
                </select></label>
            </div>
            <div class="mit-confirm-actions"><button type="button" data-action="close-sheet">再看看</button><button class="mit-primary" type="button" data-action="start">确认拉开帷幕</button></div>
        </div>
    `, 'mit-confirm-sheet');
}

function showPlayDetails() {
    const play = selectedPlay();
    if (!play) return;
    showSheet('lobby', '剧目手记', `
        <div class="mit-play-details">
            <span class="mit-detail-cover" data-cover-play-id="${escapeHtml(play.id)}" role="img"></span>
            <div class="mit-detail-copy"><span class="mit-detail-kicker">故事，从这里开始</span><h3>${escapeHtml(play.title)}</h3>
            <label for="mit-play-description">剧目描述</label>
            <textarea id="mit-play-description" rows="5" maxlength="6000">${escapeHtml(play.description)}</textarea>
            <p>保存后，大厅、剧目库和开演页会显示这份描述。</p></div>
            <div class="mit-confirm-actions"><button type="button" data-action="close-sheet">取消</button><button type="button" class="mit-primary" data-action="save-description" data-play-id="${escapeHtml(play.id)}">保存描述</button></div>
        </div>`, 'mit-detail-sheet');
    const cover = document.querySelector(`#${ROOT_ID} .mit-detail-cover`);
    if (cover) applyCover(cover, play);
}

function buildOpeningCue(play, beautificationMode = settings.beautificationEnabled ? settings.beautificationMode : 'off', continueContext = settings.continueContext, context = getContext()) {
    const protagonist = settings.protagonist || context?.name2 || '{{char}}';
    const acts = play.acts?.length ? play.acts.join(' / ') : '开幕 / 转折 / 谢幕';
    const beautification = beautificationMode === 'off' ? '' : `\n默认美化要求：\n${BEAUTIFICATION_PROFILES[beautificationMode]}`;
    const contextRule = continueContext
        ? '承接当前聊天：结合最近主线中的人物关系、情绪与已知事件，但不要把本场新增事件宣布为主线既定事实。'
        : '独立番外：不延续最近主线事件，只保持角色设定、Persona 与既有人物关系一致。';
    return `[无名剧场 · ${play.title}]\n请开始一场独立于主线的小剧场。\n主演：${protagonist}\n演出模式：${settings.mode || play.mode}\n上下文方式：${contextRule}\n三幕结构：${acts}\n剧目设定：${play.prompt}\n用户编辑的剧目描述（具体情节以这份描述为准）：${play.description}\n导演备注：${settings.directorNote || '保持画面感与角色一致性。'}${beautification}\n演出规则：从第一幕的可感知场景直接开演；保持角色身份、关系与说话方式一致；依据角色卡、Persona 与已有关系描写双方的行动、心理和台词；一次写完开端、发展、转折与明确结局，在本次输出中完成所有选择与事件收束；不要复述本条指令；本场内容不改变主线事实。\n输出完整 HTML 文档，包含正文与内嵌 CSS，不要 Markdown 代码围栏或解释。适配手机，奶油纸色与鼠尾草绿，保留清晰留白。所有文字、标题、链接均无下划线或底部装饰线。仅用 HTML/CSS，可用 details/summary 展开细节；动态档位使用 CSS 动画并尊重减少动态设置。不要脚本、表单、外部资源或链接。内容将在独立预览中展示，不发送到聊天。`;
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

function buildCharacterSystemPrompt(context, continueContext = settings.continueContext) {
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
        '你正在 SillyTavern 中为当前角色与用户演出一次独立番外小剧场。',
        continueContext
            ? '只把提供的主聊天快照当作人物关系、说话习惯与主线背景；不要续写或引用任何历史小剧场。'
            : '本次不提供主聊天快照；只依据角色卡、Persona 与剧目要求演出独立番外。',
        '本次任务是一次完成的完整番外故事：写出开端、发展、转折和明确结局；依据角色卡与 Persona 合理描写双方言行，并在故事内部完成选择。此完成方式优先于剧目、角色卡或聊天中要求等待用户回复、分轮互动的写作方式。严格保持人物一致性，本场新增事件仅属于番外。',
        ...sections,
    ].join('\n\n').slice(0, 24000);
}

function buildGenerationMessages(context, play, beautificationMode, continueContext = settings.continueContext, reservedCharacters = 0) {
    const mainChat = continueContext ? filterMainChatMessages(context.chat) : [];
    const cue = context.substituteParams(buildOpeningCue(play, beautificationMode, continueContext, context));
    const totalCharacterBudget = Math.max(18000, Math.min(90000, Math.max(0, Number(context.maxContext || 0) - 4096) * 3));
    const maxCharacters = Math.max(4000, totalCharacterBudget - reservedCharacters - cue.length);
    const selected = [];
    let usedCharacters = 0;
    for (let index = mainChat.length - 1; index >= 0; index -= 1) {
        const message = mainChat[index];
        const speaker = String(message.name || (message.is_user ? context.name1 : context.name2) || '').trim();
        let content = `${speaker ? `${speaker}：` : ''}${String(message.mes || '').trim()}`;
        if (!content || (selected.length && usedCharacters + content.length > maxCharacters)) break;
        if (!selected.length && content.length > maxCharacters) content = content.slice(-maxCharacters);
        usedCharacters += content.length;
        selected.unshift({
            role: message.is_system ? 'system' : (message.is_user ? 'user' : 'assistant'),
            content,
        });
    }
    selected.push({ role: 'user', content: cue });
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

async function startPerformance(play = selectedPlay(), beautificationMode = settings.beautificationEnabled ? settings.beautificationMode : 'off', continueContext = settings.continueContext) {
    if (!play || generationInFlight) return;
    const context = getContext();
    if (!context?.generateRaw || !context?.getCharacterCardFields || !context?.substituteParams) {
        toast('当前酒馆缺少小剧场所需的独立生成或上下文读取能力', 'error');
        return;
    }
    if (!context.chatId && !context.groupId) return toast('请先打开一个角色或群聊', 'error');

    const protagonist = settings.protagonist || context?.name2 || '当前角色';
    const runId = globalThis.crypto?.randomUUID?.() || `show-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const startedAt = new Date().toISOString();
    const startButton = document.querySelector(`#${ROOT_ID} [data-action="start"]`);
    generationInFlight = true;
    if (startButton) {
        startButton.disabled = true;
        startButton.textContent = '正在开演…';
    }
    toast(continueContext ? '正在读取主聊天并准备舞台…' : '正在准备独立番外舞台…');

    try {
        const systemPrompt = buildCharacterSystemPrompt(context, continueContext);
        const output = await context.generateRaw({
            prompt: buildGenerationMessages(context, play, beautificationMode, continueContext, systemPrompt.length),
            systemPrompt,
            trimNames: false,
        });
        const html = prepareHtmlDraft(output, play.title);

        play.usageCount = Number(play.usageCount || 0) + 1;
        play.lastUsedAt = startedAt;
        play.usedBy ??= {};
        for (const name of currentParticipantNames(context)) play.usedBy[name] = Number(play.usedBy[name] || 0) + 1;
        settings.history.unshift({
            id: runId,
            html,
            playId: play.id,
            title: play.title,
            protagonist,
            participants: currentParticipantNames(context),
            mode: settings.mode || play.mode,
            continueContext,
            beautificationMode,
            chatId: context.chatId || '',
            startedAt,
        });
        settings.history = settings.history.slice(0, 100);
        // Bound persisted draft storage; older metadata remains available.
        let draftCharacters = 0;
        for (const entry of settings.history) {
            draftCharacters += entry.html?.length || 0;
            if (draftCharacters > 2000000) delete entry.html;
        }
        saveSettings();
        if (document.getElementById(ROOT_ID)?.classList.contains('is-open')) showDraft(settings.history[0]);
        toast(`《${play.title}》已存入演出记录，聊天未发送`, 'success');
    } catch (error) {
        console.error(`[${EXTENSION_ID}] failed to start performance`, error);
        toast(`开演失败：${error?.message || '未知错误'}`, 'error');
        if (startButton) {
            startButton.disabled = false;
            startButton.textContent = '确认拉开帷幕';
        }
    } finally {
        generationInFlight = false;
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
    const rows = pendingImport.plays.map((play) => `
        <article class="mit-import-preview-item">
            <strong>${escapeHtml(play.title)}</strong>
            <span>${escapeHtml(play.author)} · ${escapeHtml(play.mode)}</span>
            <p>${escapeHtml(play.description)}</p>
        </article>`).join('');
    const warnings = pendingImport.errors.length
        ? `<div class="mit-import-warnings">${pendingImport.errors.map(escapeHtml).join('<br>')}</div>`
        : '';
    showSheet('library', '导入预览', `
        <p class="mit-help">下面只是预览，目前尚未写入剧目库。宏切换会修改本次待导入内容，确认收录后才保存。</p>
        <div class="mit-import-macro-tools">
            <div><strong>角色写法</strong><span>char：${macroCounts.plain} 个</span><span>{{char}}：${macroCounts.tavern} 个</span><span>{{user}} 保持不变</span></div>
            <button type="button" data-action="toggle-import-macros" data-target-style="${macroTarget}" ${macroCounts.plain + macroCounts.tavern ? '' : 'disabled'}>${macroCounts.plain + macroCounts.tavern ? macroButtonLabel : '未检测到角色写法'}</button>
        </div>
        ${warnings}
        <div class="mit-import-preview-list">${rows}</div>
        <div class="mit-confirm-actions">
            <button type="button" data-action="cancel-import">取消</button>
            <button class="mit-primary" type="button" data-action="confirm-import">确认收录 ${pendingImport.plays.length} 个剧目</button>
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
    for (const incoming of pendingImport.plays) {
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

function handleAction(action, target) {
    if (action === 'view-draft') return showDraft(settings.history.find(entry => entry.id === target.dataset.entryId));
    if (action === 'download-draft') {
        const entry = settings.history.find(entry => entry.id === target.dataset.entryId);
        if (!entry?.html) return;
        const url = URL.createObjectURL(new Blob([prepareHtmlDraft(entry.html, entry.title)], { type: 'text/html;charset=utf-8' }));
        const link = document.createElement('a');
        link.href = url; link.download = `${entry.title.replace(/[<>:"/\\|?*]/g, '_')}.html`;
        link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
        return;
    }
    if (action === 'close') return closeTheatre();
    if (action === 'close-sheet') return setView('lobby');
    if (action === 'random') {
        const choices = getVisiblePlays();
        if (!choices.length) return toast('当前筛选下没有可抽取的剧目', 'error');
        const play = choices[Math.floor(Math.random() * choices.length)];
        settings.selectedId = play.id;
        saveSettings();
        renderLobbyState();
        return toast(`今晚抽到《${play.title}》`, 'success');
    }
    if (action === 'save-description') {
        const play = playById(target.dataset.playId);
        const field = document.getElementById('mit-play-description');
        if (!play || !field) return;
        const description = field.value.trim();
        if (!description) return toast('写一点剧目描述再保存吧', 'info');
        play.description = description;
        saveSettings();
        renderLobbyState();
        closeSheet();
        return toast('剧目描述已保存', 'success');
    }
    if (action === 'confirm-start') return showStartConfirmation();
    if (action === 'start') {
        const runMode = document.querySelector(`#${ROOT_ID} #mit-run-beautification`)?.value || 'off';
        const continueContext = document.querySelector(`#${ROOT_ID} #mit-run-context`)?.checked ?? settings.continueContext;
        return startPerformance(selectedPlay(), ['static', 'dynamic'].includes(runMode) ? runMode : 'off', continueContext);
    }
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
        setView('lobby');
        return toast(`已选择《${play.title}》，可拉开帷幕`);
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
    if (action === 'replay') {
        const play = playById(target.dataset.playId);
        if (!play) return toast('这个剧目已经不在剧目库中', 'error');
        settings.selectedId = play.id;
        saveSettings();
        setView('lobby');
        return toast(`已选择《${play.title}》，可以再次拉开帷幕`, 'success');
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
            if (play && settings.selectedId === play.id) return showPlayDetails();
            if (play) settings.selectedId = play.id;
            saveSettings();
            renderLobbyState();
            if (!play) toast('当前筛选下这里没有剧目', 'info');
            else toast(`已选择《${play.title}》，再点一次查看详情`);
            return;
        }

        const actionTarget = event.target.closest('[data-action]');
        if (actionTarget) handleAction(actionTarget.dataset.action, actionTarget);
    });

    root.addEventListener('change', (event) => {
        if (event.target.id === 'mit-import-file') prepareImportFiles([...event.target.files]);
        if (event.target.id === 'mit-lobby-sort') {
            settings.lobbySort = event.target.value === 'most-used' ? 'most-used' : 'latest';
            saveSettings();
            renderLobbyState();
        }
    });

    root.addEventListener('input', (event) => {
        if (event.target.id !== 'mit-library-search') return;
        const query = event.target.value.trim().toLowerCase();
        root.querySelectorAll('.mit-library-item').forEach((item) => {
            item.hidden = Boolean(query && !item.dataset.search.includes(query));
        });
    });

    root.addEventListener('submit', (event) => {
        if (event.target.id !== 'mit-director-form') return;
        event.preventDefault();
        const data = new FormData(event.target);
        settings.protagonist = String(data.get('protagonist') || '').trim();
        settings.mode = String(data.get('mode') || '沉浸叙事');
        settings.directorNote = String(data.get('directorNote') || '').trim();
        settings.continueContext = data.get('continueContext') === 'on';
        settings.beautificationEnabled = data.get('beautificationEnabled') === 'on';
        settings.beautificationMode = data.get('beautificationMode') === 'dynamic' ? 'dynamic' : 'static';
        saveSettings();
        setView('lobby');
        toast('导演设置已保存', 'success');
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
