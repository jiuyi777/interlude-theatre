export const COVER_LIBRARY_VERSION = 2;

const LEGACY_THEME_IDS = Object.freeze([
    'moon', 'window', 'curtain', 'forest', 'lamp', 'letter',
    'candle', 'station', 'sea', 'garden', 'clock', 'city',
]);

const LEGACY_PALETTE_IDS = Object.freeze(['wine', 'midnight', 'forest', 'umber', 'plum']);

const COLORCARD_THEME_IDS = Object.freeze([
    'compass', 'moth', 'gramophone', 'carousel', 'telescope', 'staircase',
    'chess', 'camera', 'umbrella', 'whale', 'botanical', 'violin',
]);

const COLORCARD_PALETTE_IDS = Object.freeze([
    'dunhuang', 'retro-lilac', 'retro-mint', 'retro-olive', 'retro-rose', 'spring-violet',
    'summer-sunset', 'orange-blue', 'peach-night', 'fog-black', 'charcoal-red', 'winter-blue',
]);

function buildEntries(themeIds, paletteIds, directory) {
    return themeIds.flatMap((themeId) => paletteIds.map((paletteId) => {
        const coverKey = `${themeId}:${paletteId}`;
        return Object.freeze({
            coverKey,
            url: new URL(`./assets/${directory}/${themeId}-${paletteId}.svg`, import.meta.url).href,
        });
    }));
}

export const BUILTIN_COVER_LIBRARY = Object.freeze([
    ...buildEntries(LEGACY_THEME_IDS, LEGACY_PALETTE_IDS, 'covers'),
    ...buildEntries(COLORCARD_THEME_IDS, COLORCARD_PALETTE_IDS, 'covers-colorcard'),
]);

const COVER_BY_KEY = new Map(BUILTIN_COVER_LIBRARY.map((entry) => [entry.coverKey, entry]));

function stableHash(value) {
    let hash = 2166136261;
    for (const char of String(value || '')) {
        hash ^= char.codePointAt(0);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
}

export function isBuiltinCoverKey(coverKey) {
    return COVER_BY_KEY.has(String(coverKey || ''));
}

export function resolveBuiltinCover(coverKey) {
    const entry = COVER_BY_KEY.get(String(coverKey || ''));
    if (!entry) return null;
    return { url: entry.url, size: 'cover', position: 'center' };
}

export function assignBuiltinCoverKeys(plays) {
    const usedKeys = new Set(
        plays
            .filter((play) => !play.cover && isBuiltinCoverKey(play.coverKey))
            .map((play) => play.coverKey),
    );
    let changed = false;

    for (const play of plays) {
        if (play.cover || isBuiltinCoverKey(play.coverKey)) continue;
        const startIndex = stableHash(play.id || play.title) % BUILTIN_COVER_LIBRARY.length;
        let selectedIndex = startIndex;
        for (let offset = 0; offset < BUILTIN_COVER_LIBRARY.length; offset += 1) {
            const candidateIndex = (startIndex + offset) % BUILTIN_COVER_LIBRARY.length;
            if (!usedKeys.has(BUILTIN_COVER_LIBRARY[candidateIndex].coverKey)) {
                selectedIndex = candidateIndex;
                break;
            }
        }
        play.coverKey = BUILTIN_COVER_LIBRARY[selectedIndex].coverKey;
        usedKeys.add(play.coverKey);
        changed = true;
    }

    return changed;
}
