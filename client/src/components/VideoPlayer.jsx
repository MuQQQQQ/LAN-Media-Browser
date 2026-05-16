import { useEffect, useRef } from 'react';
import Artplayer from 'artplayer';

export default function VideoPlayer({ item, url }) {
    const containerRef = useRef(null);

    const artRef = useRef(null);

    useEffect(() => {
        if (!containerRef.current) return;

        const art = new Artplayer({
            container: containerRef.current,

            url: url,

            playsInline: true,

            autoplay: false,

            autoSize: true,

            fullscreen: true,

            fullscreenWeb: true,

            setting: true,

            playbackRate: true,

            fastForward: true,

            pip: true,

            mutex: true,

            backdrop: false,

            miniProgressBar: true,

            autoMini: true,

            controls: [
                {
                    position: 'left',
                    html: '▶',
                    click: function () {
                        art.toggle();
                    },
                },
            ],
        });

        artRef.current = art;

        return () => {
            art.destroy(false);
        };
    }, [item]);

    return (
        <div
            className="stream-video-player"
            ref={containerRef}
        />
    );
}