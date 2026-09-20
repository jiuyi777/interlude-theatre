// Generated documents stay isolated from SillyTavern and work offline when downloaded.
export function prepareHtmlDraft(output, title = '无名剧场') {
    const raw = String(output || '').trim().replace(/^```(?:html)?\s*/i, '').replace(/\s*```$/, '');
    if (!raw) throw new Error('模型没有返回演出内容');
    if (raw.length > 300000) throw new Error('生成内容过长，请缩短篇幅后重试');
    const doc = new DOMParser().parseFromString(raw, 'text/html');
    doc.querySelectorAll('script,iframe,object,embed,base,meta,link,form,input,button,textarea,select,svg,math').forEach(node => node.remove());
    for (const node of doc.querySelectorAll('*')) {
        for (const attr of [...node.attributes]) {
            if (/^on/i.test(attr.name) || ['srcdoc', 'href', 'action', 'formaction', 'srcset', 'ping', 'target', 'download', 'autofocus'].includes(attr.name)) node.removeAttribute(attr.name);
            if (attr.name === 'src' && !/^data:image\/(png|jpeg|gif|webp);base64,/i.test(attr.value)) node.removeAttribute('src');
        }
        // Respect the user's typography rule, including model inline !important styles.
        node.style.setProperty('text-decoration', 'none', 'important');
        node.style.setProperty('border-bottom', '0', 'important');
    }
    const csp = doc.createElement('meta');
    csp.httpEquiv = 'Content-Security-Policy';
    csp.content = "default-src 'none'; script-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src 'none'; connect-src 'none'; base-uri 'none'; form-action 'none'";
    doc.head.prepend(csp);
    const charset = doc.createElement('meta'); charset.charset = 'utf-8'; doc.head.prepend(charset);
    const viewport = doc.createElement('meta'); viewport.name = 'viewport'; viewport.content = 'width=device-width, initial-scale=1'; doc.head.append(viewport);
    doc.title = title;
    const style = doc.createElement('style');
    style.textContent = `html{color-scheme:light}body{margin:0;padding:24px;background:#fffaf0;color:#454b3e;font:16px/1.85 system-ui,sans-serif;overflow-wrap:anywhere}*,*::before,*::after{text-decoration:none!important;border-bottom:0!important;box-sizing:border-box}img{max-width:100%}pre{white-space:pre-wrap} @media(prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:none!important}}`;
    doc.head.append(style);
    if (!doc.body.textContent.trim() && !doc.body.querySelector('img')) throw new Error('返回内容没有可预览的正文');
    return '<!doctype html>\n' + doc.documentElement.outerHTML;
}
