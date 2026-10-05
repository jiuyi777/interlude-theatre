// Host contract: SillyTavern 1.14.0, fbf789fa7480fafe0275b2f79e4384e77ae689a7.
// st-context.js exposes prompt settings; world-info.js owns selected books/loading.
export function enabledPresetMessages(context) {
    if (context.mainApi && context.mainApi !== 'openai') {
        const system = context.powerUserSettings?.sysprompt;
        return system?.enabled && system.content ? [{ role: 'system', content: system.content }] : [];
    }
    const preset = context.chatCompletionSettings || {};
    const orders = preset.prompt_order || [];
    // The host's global Prompt Manager uses dummy character 100001.
    const order = orders.find(item => String(item.character_id) === '100001')
        || orders.find(item => String(item.character_id) === String(context.characterId));
    return (order?.order || []).filter(item => item.enabled).flatMap(item => {
        const prompt = preset.prompts?.find(p => p.identifier === item.identifier);
        if (!prompt || prompt.marker || !prompt.content?.trim()) return [];
        if (prompt.injection_trigger?.length && !prompt.injection_trigger.includes('quiet')) return [];
        return [{ role: ['system', 'user', 'assistant'].includes(prompt.role) ? prompt.role : 'system', content: prompt.content }];
    });
}

export async function readWorldBookContext(context, host) {
    const names = new Set(host.selected_world_info || []);
    const group = context.groups?.find(item => String(item.id) === String(context.groupId));
    const members = new Set(group?.members || []);
    const characters = context.groupId
        ? (context.characters || []).filter(item => members.has(item.avatar))
        : [context.characters?.[context.characterId]].filter(Boolean);
    for (const character of characters) {
        if (character.data?.extensions?.world) names.add(character.data.extensions.world);
        const filename = String(character.avatar || '').replace(/\.[^.]+$/, '');
        const linked = host.world_info?.charLore?.find(item => item.name === filename);
        for (const name of linked?.extraBooks || []) names.add(name);
    }
    if (context.chatMetadata?.world_info) names.add(context.chatMetadata.world_info);
    if (context.powerUserSettings?.persona_description_lorebook) names.add(context.powerUserSettings.persona_description_lorebook);
    const sections = [];
    for (const name of names) {
        const book = await host.loadWorldInfo(name);
        if (!book?.entries) throw new Error(`世界书「${name}」读取失败，请重试；本次没有省略资料后继续发送`);
        for (const entry of Object.values(book.entries)) {
            if (entry.disable || entry.enabled === false || !String(entry.content || '').trim()) continue;
            sections.push(`【世界书：${name} / ${entry.comment || entry.uid || '条目'}】\n${entry.content}`);
        }
    }
    return sections.join('\n\n');
}

export async function loadGenerationSources(context, worldInfoHost = null) {
    const messages = enabledPresetMessages(context);
    // Local preview has no mainApi and no host worldbook store. Tests can supply a fixture.
    if (context.mainApi || worldInfoHost) {
        const host = worldInfoHost || await import('/scripts/world-info.js');
        const worlds = await readWorldBookContext(context, host);
        if (worlds) messages.push({ role: 'system', content: worlds });
    }
    for (const prompt of Object.values(context.extensionPrompts || {})) {
        if (Number(prompt.position) === -1 || !prompt.value?.trim()) continue;
        if (typeof prompt.filter === 'function' && !await prompt.filter()) continue;
        messages.push({ role: ['system', 'user', 'assistant'][prompt.role ?? 0] || 'system', content: prompt.value });
    }
    return messages;
}
