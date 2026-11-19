// The '@portal/runtime' module that compiled widgets import through the registry.
import { Link, useNavigate } from './navigation';
import { usePortal, usePortalLocation } from './contexts';
import { Region, RegionPortal, useComponent } from './widgets';

export const RUNTIME_ABI = '0.1.0';

export { Link, useNavigate, usePortal, usePortalLocation, Region, RegionPortal, useComponent };
