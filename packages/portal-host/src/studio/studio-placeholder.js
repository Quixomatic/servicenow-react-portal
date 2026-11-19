import React from 'react';

// Shown while the Studio chunk loads (mode = studio), or if it fails to load. Plain inline
// styles: it lives in the main bundle and must not depend on the Studio stylesheet.
export default function StudioPlaceholder({ loading, error }) {
	return (
		<div
			style={{
				height: '60vh',
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'center',
				justifyContent: 'center',
				gap: 8,
				background: '#1e1e1e',
				color: '#cccccc',
				font: '13px system-ui, sans-serif'
			}}
			data-rps-placeholder=""
		>
			<div style={{ fontSize: 18 }}>Portal Studio</div>
			{loading ? <div style={{ opacity: 0.7 }}>Loading the editor…</div> : null}
			{error ? <div style={{ color: '#f14c4c', maxWidth: 560, textAlign: 'center' }}>Studio failed to load: {String((error && error.message) || error)}</div> : null}
		</div>
	);
}
