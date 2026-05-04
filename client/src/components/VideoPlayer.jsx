import { mediaUrl } from '../api.js';

export default function VideoPlayer({ file }) {
    return <video controls preload="metadata" playsInline src={mediaUrl(file.path)} />;
}