// Retain model-drawn static artwork without SVG links, scripts or embedded HTML.
const SVG_NS = 'http://www.w3.org/2000/svg';
const SVG_ELEMENTS = new Set('svg g path rect circle ellipse line polyline polygon defs lineargradient radialgradient stop clippath mask pattern text tspan title desc'.split(' '));
const SVG_ATTRIBUTES = new Set('id class role aria-hidden aria-label viewbox preserveaspectratio width height x y x1 y1 x2 y2 cx cy r rx ry d points fill fill-opacity fill-rule stroke stroke-width stroke-opacity stroke-linecap stroke-linejoin stroke-dasharray stroke-dashoffset stroke-miterlimit opacity transform offset stop-color stop-opacity gradientunits gradienttransform spreadmethod patternunits patterncontentunits patterntransform clippathunits maskunits maskcontentunits clip-path mask font-size font-family font-weight text-anchor dominant-baseline dx dy rotate textlength lengthadjust'.split(' '));
function retainStaticSvg(doc) {
    for (const svg of doc.querySelectorAll('svg')) {
        for (const node of [svg, ...svg.querySelectorAll('*')]) {
            if (node.namespaceURI !== SVG_NS || !SVG_ELEMENTS.has(node.localName.toLowerCase())) { node.remove(); continue; }
            for (const attr of [...node.attributes]) {
                if (attr.name === 'xmlns' && attr.value === SVG_NS) continue;
                if (attr.namespaceURI || !SVG_ATTRIBUTES.has(attr.name.toLowerCase())
                    || (/url\s*\(/i.test(attr.value) && !/^url\(\s*#[\w-]+\s*\)$/i.test(attr.value))) node.removeAttribute(attr.name);
            }
        }
    }
}

// Generated documents stay isolated from SillyTavern and work offline when downloaded.
export function prepareHtmlDraft(output, title = '无名剧场') {
    const raw = String(output || '').trim().replace(/^```(?:html)?\s*/i, '').replace(/\s*```$/, '');
    if (!raw) throw new Error('模型没有返回演出内容');
    if (/<html\b/i.test(raw) && !/<\/html\s*>/i.test(raw)) {
        throw new Error('模型返回的页面尚未写完，请提高输出上限后重试；已有故事已保留');
    }
    const doc = new DOMParser().parseFromString(raw, 'text/html');
    doc.querySelectorAll('script,iframe,object,embed,base,meta,link,form,input,button,textarea,select,math').forEach(node => node.remove());
    retainStaticSvg(doc);
    for (const node of doc.querySelectorAll('*')) {
        for (const attr of [...node.attributes]) {
            if (/^on/i.test(attr.name) || ['srcdoc', 'href', 'action', 'formaction', 'srcset', 'ping', 'target', 'download', 'autofocus'].includes(attr.name)) node.removeAttribute(attr.name);
            if (attr.name === 'src' && !/^data:image\/(png|jpeg|gif|webp);base64,/i.test(attr.value)) node.removeAttribute('src');
        }
        // Scrollbars are hidden below; keep the artwork's complete borders and rules.
        node.style.setProperty('text-decoration', 'none', 'important');
    }
    const csp = doc.createElement('meta');
    csp.httpEquiv = 'Content-Security-Policy';
    csp.content = "default-src 'none'; script-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src 'none'; connect-src 'none'; base-uri 'none'; form-action 'none'";
    doc.head.prepend(csp);
    const charset = doc.createElement('meta'); charset.setAttribute('charset', 'utf-8'); doc.head.prepend(charset);
    const viewport = doc.createElement('meta'); viewport.name = 'viewport'; viewport.content = 'width=device-width, initial-scale=1'; doc.head.append(viewport);
    doc.title = title;
    const style = doc.createElement('style');
    style.dataset.theatreBase = 'true';
    // Zero-specificity defaults precede the model's CSS, so the document owns its design.
    style.textContent = `:where(html){color-scheme:light;background:#fff}:where(body){margin:0;min-height:100vh;background:#fff;color:#263028;font:18px/1.8 system-ui,sans-serif;overflow-wrap:anywhere}:where(*,*::before,*::after){box-sizing:border-box}*,*::before,*::after{text-decoration:none!important;scrollbar-width:none!important}*::-webkit-scrollbar{display:none!important;width:0!important;height:0!important}:where(img,svg){max-width:100%}:where(pre){white-space:pre-wrap}@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:none!important}}`;
    doc.querySelectorAll('style[data-theatre-base]').forEach(node => node.remove());
    doc.head.insertBefore(style, doc.head.querySelector('style'));
    if (!doc.body.textContent.trim() && !doc.body.querySelector('img')) throw new Error('返回内容没有可预览的正文');
    return '<!doctype html>\n' + doc.documentElement.outerHTML;
}

export function draftText(html) {
    const doc = new DOMParser().parseFromString(html || '', 'text/html');
    doc.querySelectorAll('style,script,[data-theatre-title]').forEach(node => node.remove());
    doc.querySelectorAll('br').forEach(node => node.replaceWith('\n'));
    doc.querySelectorAll('p,div,section,article,h1,h2,h3,h4,li,blockquote,details,tr').forEach(node => node.append('\n\n'));
    return doc.body.textContent.replace(/\n[\t ]+/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

export function textDraft(text, title) {
    const doc = document.implementation.createHTMLDocument(title);
    const style = doc.createElement('style');
    style.textContent = 'body{max-width:800px;margin:auto;padding:clamp(20px,5vw,48px);background:#fffaf0;color:#454b3e;font:18px/1.95 system-ui,sans-serif}h1{font-size:clamp(24px,5vw,32px)}';
    doc.head.append(style);
    const heading = doc.createElement('h1'); heading.textContent = title; heading.dataset.theatreTitle = 'true'; doc.body.append(heading);
    for (const paragraph of text.split(/\n\s*\n/)) {
        const p = doc.createElement('p'); p.style.whiteSpace = 'pre-wrap'; p.textContent = paragraph; doc.body.append(p);
    }
    return prepareHtmlDraft(doc.documentElement.outerHTML, title);
}
