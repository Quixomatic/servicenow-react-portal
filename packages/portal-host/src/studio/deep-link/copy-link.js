// Copy link: the title-bar button (every activity). Ctrl+Alt+L and the editor / explorer context
// menus call copyStudioLink() directly.
import React from 'react';
import { Link2 } from 'lucide-react';
import { copyStudioLink } from './controller';

export function CopyLinkButton() {
    return (
        <button
            className="rps-tbtn"
            title="Copy link to this location (Ctrl+Alt+L)"
            onClick={() => copyStudioLink()}
            data-rps-copy-link=""
        >
            <Link2 size={15} />
        </button>
    );
}

export { copyStudioLink };
