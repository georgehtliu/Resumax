/**
 * Icon component wrapper for lucide-react icons
 * Provides consistent icon sizing and styling
 */
import React from 'react';
import {
  Sparkles,
  Save,
  ClipboardList,
  Eye,
  FileText,
  RefreshCw,
  Plus,
  Edit,
  Trash2,
  Search,
  Star,
  Lightbulb,
  Users,
  Bot,
  Target,
  BarChart,
  Zap,
  Lock,
  Mail,
  Key,
  Briefcase,
  GraduationCap,
  Folder,
  Laptop,
  Link2,
  Upload,
  Download,
  Check,
  X,
  AlertTriangle,
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react';

const iconMap = {
  sparkles: Sparkles,
  save: Save,
  clipboard: ClipboardList,
  eye: Eye,
  file: FileText,
  refresh: RefreshCw,
  plus: Plus,
  edit: Edit,
  trash: Trash2,
  search: Search,
  star: Star,
  lightbulb: Lightbulb,
  users: Users,
  bot: Bot,
  target: Target,
  chart: BarChart,
  zap: Zap,
  lock: Lock,
  mail: Mail,
  key: Key,
  briefcase: Briefcase,
  graduation: GraduationCap,
  folder: Folder,
  laptop: Laptop,
  link: Link2,
  upload: Upload,
  download: Download,
  check: Check,
  x: X,
  warning: AlertTriangle,
  loader: Loader2,
  checkCircle: CheckCircle,
  xCircle: XCircle,
  alert: AlertCircle,
};

export function Icon({ name, size = 20, className = '', strokeWidth = 2, ...props }) {
  const IconComponent = iconMap[name];
  
  if (!IconComponent) {
    console.warn(`Icon "${name}" not found`);
    return null;
  }

  return (
    <IconComponent
      size={size}
      strokeWidth={strokeWidth}
      className={className}
      {...props}
    />
  );
}

export default Icon;

