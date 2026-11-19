// Portal content rendered inside Studio (designer canvas, component preview) must look as it does
// in the portal. Studio's chrome sets its own font (13px, line-height 1.4) and colour on .rps, so
// the content containers take the host element's computed text styles instead, plus the theme's
// foreground colour (what Tailwind's base sets on :host).
import { useLayoutEffect, useState } from 'react';

export function useHostTextStyle(root) {
	const [style, setStyle] = useState({ color: 'var(--foreground)' });
	useLayoutEffect(() => {
		const host = root && root.host;
		if (!host) return;
		const cs = getComputedStyle(host);
		setStyle({ fontFamily: cs.fontFamily, fontSize: cs.fontSize, lineHeight: cs.lineHeight, fontWeight: cs.fontWeight, letterSpacing: cs.letterSpacing, color: 'var(--foreground)' });
	}, [root]);
	return style;
}
