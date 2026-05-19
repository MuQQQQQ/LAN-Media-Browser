export const defaultTagSettings = { displayMode: 'expanded', sortMode: 'alphabetical' };

export function loadTagSettings() {
    try { return { ...defaultTagSettings, ...JSON.parse(localStorage.getItem('tagSettings') || '{}') }; }
    catch { return defaultTagSettings; }
}

export function saveTagSettings(settings) {
    localStorage.setItem('tagSettings', JSON.stringify(settings));
}