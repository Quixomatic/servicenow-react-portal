// components:icon: every lucide icon by name (<Icon name="layout-dashboard" />).
// Names are lucide kebab-case; PascalCase and lucide's own aliases work too.
// - A curated set (below) is bundled and renders instantly.
// - Any other name loads the full lucide sprite once (GET /api/x_312987_portal/rp/icons/lucide,
//   ~420 KB JSON, cached in memory, in localStorage per lucide version, and by the browser via
//   ETag) and renders from it. While it loads, an empty box of the same size holds the space.
// - Unknown names (or a failed load) render the fallback: a neutral circle by default,
//   `fallback={false}` renders nothing, or pass any element (e.g. a letter tile).
// Menu data (navigation icons) stores these names. The curated set is additive.
import * as React from "react"
import {
  House,
  LayoutDashboard,
  LayoutGrid,
  Inbox,
  List,
  ListChecks,
  FileText,
  Files,
  Folder,
  Settings,
  Users,
  User,
  ShoppingCart,
  ShoppingBag,
  Package,
  Ticket,
  LifeBuoy,
  CircleHelp,
  Info,
  Bell,
  Search,
  Calendar,
  Clock,
  ChartColumn,
  ChartLine,
  ChartPie,
  Activity,
  BookOpen,
  Briefcase,
  Building2,
  CreditCard,
  Database,
  Server,
  Shield,
  ShieldCheck,
  Star,
  Heart,
  Mail,
  MessageSquare,
  Phone,
  MapPin,
  Globe,
  Link,
  ExternalLink,
  Wrench,
  Bug,
  Zap,
  Sparkles,
  Rocket,
  Flag,
  Tag,
  Layers,
  Monitor,
  Laptop,
  Smartphone,
  ClipboardList,
  FlaskConical,
  CircleAlert,
  TriangleAlert,
  Check,
  X,
  Plus,
  Minus,
  ChevronRight,
  ChevronDown,
  ChevronsUpDown,
  LogOut,
  Sun,
  Moon,
  PanelLeft,
  Menu,
  Ellipsis,
  TextCursorInput,
  Columns3,
  Blocks,
  Store,
  Receipt,
  Gauge,
  Kanban,
  SquareCheck,
  Circle,
  Headset,
  Tv,
  Clapperboard,
  Truck,
  Wallet,
  Lock,
  KeyRound,
  Cpu,
  Network,
  Workflow,
} from "lucide-react"

const icons = {
  "house": House,
  "layout-dashboard": LayoutDashboard,
  "layout-grid": LayoutGrid,
  "inbox": Inbox,
  "list": List,
  "list-checks": ListChecks,
  "file-text": FileText,
  "files": Files,
  "folder": Folder,
  "settings": Settings,
  "users": Users,
  "user": User,
  "shopping-cart": ShoppingCart,
  "shopping-bag": ShoppingBag,
  "package": Package,
  "ticket": Ticket,
  "life-buoy": LifeBuoy,
  "circle-help": CircleHelp,
  "info": Info,
  "bell": Bell,
  "search": Search,
  "calendar": Calendar,
  "clock": Clock,
  "chart-column": ChartColumn,
  "chart-line": ChartLine,
  "chart-pie": ChartPie,
  "activity": Activity,
  "book-open": BookOpen,
  "briefcase": Briefcase,
  "building-2": Building2,
  "credit-card": CreditCard,
  "database": Database,
  "server": Server,
  "shield": Shield,
  "shield-check": ShieldCheck,
  "star": Star,
  "heart": Heart,
  "mail": Mail,
  "message-square": MessageSquare,
  "phone": Phone,
  "map-pin": MapPin,
  "globe": Globe,
  "link": Link,
  "external-link": ExternalLink,
  "wrench": Wrench,
  "bug": Bug,
  "zap": Zap,
  "sparkles": Sparkles,
  "rocket": Rocket,
  "flag": Flag,
  "tag": Tag,
  "layers": Layers,
  "monitor": Monitor,
  "laptop": Laptop,
  "smartphone": Smartphone,
  "clipboard-list": ClipboardList,
  "flask-conical": FlaskConical,
  "circle-alert": CircleAlert,
  "triangle-alert": TriangleAlert,
  "check": Check,
  "x": X,
  "plus": Plus,
  "minus": Minus,
  "chevron-right": ChevronRight,
  "chevron-down": ChevronDown,
  "chevrons-up-down": ChevronsUpDown,
  "log-out": LogOut,
  "sun": Sun,
  "moon": Moon,
  "panel-left": PanelLeft,
  "menu": Menu,
  "ellipsis": Ellipsis,
  "text-cursor-input": TextCursorInput,
  "columns-3": Columns3,
  "blocks": Blocks,
  "store": Store,
  "receipt": Receipt,
  "gauge": Gauge,
  "kanban": Kanban,
  "square-check": SquareCheck,
  "circle": Circle,
  "headset": Headset,
  "tv": Tv,
  "clapperboard": Clapperboard,
  "truck": Truck,
  "wallet": Wallet,
  "lock": Lock,
  "key-round": KeyRound,
  "cpu": Cpu,
  "network": Network,
  "workflow": Workflow,
  // Aliases
  "home": House,
  "dashboard": LayoutDashboard,
  "help": CircleHelp,
  "chart": ChartColumn,
  "alert": TriangleAlert,
  "more": Ellipsis,
  "form": TextCursorInput,
  "catalog": Store,
  "building": Building2,
  "test": FlaskConical,
  "close": X,
}

const iconNames = Object.keys(icons)

function keyOf(name) {
  return String(name || "")
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/([A-Za-z])([0-9])/g, "$1-$2")
    .replace(/[\s_]+/g, "-")
    .toLowerCase()
}

/* ---------------- Full lucide sprite (lazy) ---------------- */

const SPRITE_URL = "/api/x_312987_portal/rp/icons/lucide"
const STORE_KEY = "rp-lucide-sprite"
// { status: 'idle' | 'loading' | 'ready' | 'error', icons: { name: markup } | null, aliases, version }
let sprite = { status: "idle", icons: null, aliases: {}, version: "" }
let spritePromise = null
const listeners = new Set()

function setSprite(next) {
  sprite = next
  listeners.forEach((l) => l())
}

function readStored() {
  try {
    const text = window.localStorage.getItem(STORE_KEY)
    const data = text ? JSON.parse(text) : null
    return data && data.icons ? data : null
  } catch (error) {
    return null
  }
}

function accept(data) {
  setSprite({ status: "ready", icons: data.icons || {}, aliases: data.aliases || {}, version: String(data.version || "") })
}

/** Load the full lucide set (once). Resolves to true when it's available. */
function loadIcons() {
  if (spritePromise) return spritePromise
  const stored = typeof window !== "undefined" ? readStored() : null
  if (stored) accept(stored) // instant; revalidated below (the ETag makes that a 304)
  else setSprite({ ...sprite, status: "loading" })
  const headers = { Accept: "application/json" }
  if (typeof window !== "undefined" && window.g_ck) headers["X-UserToken"] = window.g_ck
  spritePromise = fetch(SPRITE_URL, { credentials: "same-origin", headers })
    .then((response) => {
      if (!response.ok) throw new Error("HTTP " + response.status)
      return response.json()
    })
    .then((data) => {
      if (!data || !data.icons) throw new Error("not a sprite")
      if (!stored || stored.version !== data.version) {
        accept(data)
        try {
          window.localStorage.setItem(STORE_KEY, JSON.stringify(data))
        } catch (error) {
          /* quota / private mode: memory only */
        }
      }
      return true
    })
    .catch(() => {
      if (sprite.status !== "ready") setSprite({ ...sprite, status: "error" })
      return sprite.status === "ready"
    })
  return spritePromise
}

function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function spriteMarkup(key) {
  if (!sprite.icons) return null
  if (sprite.icons[key]) return sprite.icons[key]
  const alias = sprite.aliases[key]
  return alias && sprite.icons[alias] ? sprite.icons[alias] : null
}

function curatedOf(name) {
  if (!name) return null
  return icons[keyOf(name)] || icons[String(name).toLowerCase()] || null
}

/**
 * true / false once known (curated set, or the sprite has loaded); undefined while the sprite
 * hasn't loaded yet (await loadIcons() to find out).
 */
function hasIcon(name) {
  const key = keyOf(name)
  if (!key) return false
  if (curatedOf(name)) return true
  if (sprite.status === "ready") return !!spriteMarkup(key)
  if (sprite.status === "error") return false
  return undefined
}

/** Every lucide name once the sprite has loaded, else the curated names. */
function allIconNames() {
  return sprite.icons ? Object.keys(sprite.icons) : iconNames.slice()
}

function svgProps({ size = 24, color = "currentColor", strokeWidth = 2, absoluteStrokeWidth, className, ...rest }) {
  const width = absoluteStrokeWidth ? (Number(strokeWidth) * 24) / Number(size) : strokeWidth
  return {
    xmlns: "http://www.w3.org/2000/svg",
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: color,
    strokeWidth: width,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className: className,
    ...rest,
  }
}

function SpriteSvg({ markup, iconKey, className, ...props }) {
  // The markup is lucide's own path data served by React Portal's API (never user content).
  return <svg {...svgProps({ ...props, className: ["lucide", "lucide-" + iconKey, className].filter(Boolean).join(" ") })} dangerouslySetInnerHTML={{ __html: markup }} />
}

function getSnapshot() {
  return sprite
}

/** <Icon name="inbox" className? size? fallback? />: decorative (aria-hidden) unless `label` is given. */
function Icon({ name, label, fallback = true, ...props }) {
  const key = keyOf(name)
  const Curated = curatedOf(name)
  const state = React.useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  const needSprite = !!key && !Curated
  React.useEffect(() => {
    if (needSprite && state.status === "idle") loadIcons()
  }, [needSprite, state.status])
  const a11y = label ? { role: "img", "aria-label": label } : { "aria-hidden": true }
  if (Curated) return <Curated data-icon={key} {...a11y} {...props} />
  const markup = needSprite ? spriteMarkup(key) : null
  if (markup) return <SpriteSvg markup={markup} iconKey={key} data-icon={key} {...a11y} {...props} />
  if (needSprite && (state.status === "idle" || state.status === "loading")) {
    // Hold the space while the sprite loads (no layout shift, nothing drawn).
    return <svg {...svgProps({ ...props, className: ["lucide", props.className].filter(Boolean).join(" ") })} data-icon={key} data-icon-loading="" aria-hidden="true" />
  }
  if (fallback === false || fallback === null) return null
  if (fallback !== true) return fallback
  return <Circle data-icon={key || "circle"} data-icon-missing={key ? "" : undefined} {...a11y} {...props} />
}

const lazyComponents = {}

/**
 * The component for a name, or null. Curated names return lucide-react's component. Other names
 * return a sprite-backed component (it renders once the sprite has loaded); null once the sprite
 * is known not to have the name. Use hasIcon() / loadIcons() to know for sure.
 */
function getIcon(name) {
  if (!name) return null
  const curated = curatedOf(name)
  if (curated) return curated
  const key = keyOf(name)
  if (sprite.status === "ready" && !spriteMarkup(key)) return null
  if (sprite.status === "error") return null
  if (!lazyComponents[key]) {
    const Lazy = (props) => <Icon name={key} {...props} />
    Lazy.displayName = "LucideIcon(" + key + ")"
    lazyComponents[key] = Lazy
  }
  return lazyComponents[key]
}

export { Icon, getIcon, hasIcon, loadIcons, allIconNames, icons, iconNames }
