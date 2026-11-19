import { useEffect, useState } from 'react';

/** Height from the element's top edge to the bottom of the visible viewport (min 320px). */
export function useAvailableHeight(el) {
	const [height, setHeight] = useState('100dvh');
	useEffect(() => {
		if (!el) return undefined;
		let frame = 0;
		const measure = () => {
			cancelAnimationFrame(frame);
			frame = requestAnimationFrame(() => {
				const top = Math.max(0, el.getBoundingClientRect().top + (window.scrollY || 0));
				const viewport = window.visualViewport ? window.visualViewport.height : window.innerHeight;
				setHeight(Math.max(320, Math.floor(viewport - top)) + 'px');
			});
		};
		measure();
		window.addEventListener('resize', measure);
		const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
		if (ro) ro.observe(document.documentElement);
		return () => {
			cancelAnimationFrame(frame);
			window.removeEventListener('resize', measure);
			if (ro) ro.disconnect();
		};
	}, [el]);
	return height;
}
