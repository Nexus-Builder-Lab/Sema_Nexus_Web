import {
  AlertTriangle,
  BarChart3,
  Bell,
  Bot,
  ChevronDown,
  ChevronLeft,
  ClipboardList,
  FileSearch,
  FileText,
  FolderOpen,
  GitCompare,
  Globe,
  Home,
  Maximize2,
  Inbox,
  LayoutDashboard,
  Layers,
  LogOut,
  Map as MapIcon,
  Menu,
  Search,
  ShieldCheck,
  Sprout,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Users,
  Network,
  X,
} from 'lucide-react';

// Ícones Lucide (mesma família do protótipo), importados individualmente.
const ICONS = {
  home: Home,
  globe: Globe,
  expand: Maximize2,
  dashboard: LayoutDashboard,
  map: MapIcon,
  indicators: BarChart3,
  clipboard: ClipboardList,
  file: FileText,
  folder: FolderOpen,
  compare: GitCompare,
  assistant: Bot,
  audit: ShieldCheck,
  users: Users,
  team: Network,
  menu: Menu,
  chevronLeft: ChevronLeft,
  chevronDown: ChevronDown,
  bell: Bell,
  logout: LogOut,
  alert: AlertTriangle,
  inbox: Inbox,
  close: X,
  search: Search,
  layers: Layers,
  leaf: Sprout,
  report: FileSearch,
  sortAsc: ArrowUp,
  sortDesc: ArrowDown,
  sort: ArrowUpDown,
};

export default function Icon({ name, className = '', title, size = 18 }) {
  const Cmp = ICONS[name] || AlertTriangle;
  return (
    <Cmp
      className={`nx-icon ${className}`.trim()}
      size={size}
      strokeWidth={2}
      aria-hidden={title ? undefined : 'true'}
      role={title ? 'img' : undefined}
      aria-label={title}
      focusable="false"
    />
  );
}
