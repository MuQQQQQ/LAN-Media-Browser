export const imageExtensions = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.avif', '.svg']);
export const videoExtensions = new Set(['.mp4', '.webm', '.ogg', '.mov', '.m4v', '.mkv']);

export function getMediaType(ext) {
    const normalized = ext.toLowerCase();
    if (imageExtensions.has(normalized)) return 'image';
    if (videoExtensions.has(normalized)) return 'video';
    return null;
}