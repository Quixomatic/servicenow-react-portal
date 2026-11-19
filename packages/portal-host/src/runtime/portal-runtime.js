// The '@portal/runtime' module that compiled widgets import through the registry.
// Exports are additive: widgets deployed on the instance depend on every name here.
import { Link, useNavigate } from './navigation';
import { usePortal, usePortalLocation, useLayoutInfo } from './contexts';
import { useSidebar } from './sidebar';
import { useNavigation } from './use-navigation';
import { usePortalContainer } from './overlay';
import { Region, RegionPortal, useBlock, useComponent } from './widgets';
import { useTheme } from './theme-mode';
import { Embed, useEmbeddedWidget, useGetWidget } from './embed';
import { useInViewOnce } from './in-view';
import {
	format,
	toast,
	useMessage,
	useMessages,
	usePortalUtils,
	useProperties,
	useProperty,
	useRecord,
	useServer,
	useTableQuery,
	useUser
} from './sp-utils';
import { useAmbChannel, useAmbStatus, useRecordWatch } from './record-watch';

export const RUNTIME_ABI = '0.2.0';

// useTheme() → { theme, setTheme, resolvedTheme, systemTheme, themes } (next-themes API).
const useThemeMode = () => useTheme();

export {
	Link,
	useNavigate,
	usePortal,
	usePortalLocation,
	Region,
	RegionPortal,
	useComponent,
	useBlock,
	useThemeMode as useTheme,
	useUser,
	useProperty,
	useProperties,
	useMessage,
	useMessages,
	usePortalUtils,
	useServer,
	useRecord,
	useTableQuery,
	toast,
	format,
	useSidebar,
	useNavigation,
	useLayoutInfo as useLayout,
	usePortalContainer,
	Embed,
	useEmbeddedWidget,
	useGetWidget,
	useInViewOnce,
	useRecordWatch,
	useAmbChannel,
	useAmbStatus
};

/** Names exported above, for Studio autocomplete. */
export const RUNTIME_EXPORTS = [
	'Link',
	'useNavigate',
	'usePortal',
	'usePortalLocation',
	'Region',
	'RegionPortal',
	'useComponent',
	'useBlock',
	'useTheme',
	'useUser',
	'useProperty',
	'useProperties',
	'useMessage',
	'useMessages',
	'usePortalUtils',
	'useServer',
	'useRecord',
	'useTableQuery',
	'toast',
	'format',
	'useSidebar',
	'useNavigation',
	'useLayout',
	'usePortalContainer',
	'Embed',
	'useEmbeddedWidget',
	'useGetWidget',
	'useInViewOnce',
	'useRecordWatch',
	'useAmbChannel',
	'useAmbStatus'
];
