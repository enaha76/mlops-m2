import { 
  Briefcase, 
  User, 
  Heart, 
  GraduationCap, 
  CreditCard, 
  Home, 
  Smartphone, 
  Calendar, 
  History, 
  DollarSign,
  Clock,
  BarChart2,
  HelpCircle,
  Settings as SettingsIcon,
  Search,
  CheckCircle2,
  XCircle,
  RefreshCw,
  FileText,
  Upload,
  Download,
  Trash2,
  Menu,
  ChevronRight,
  TrendingUp,
  LayoutDashboard,
  Target
} from "lucide-react";

export const ICONS = {
  age: User,
  job: Briefcase,
  marital: Heart,
  education: GraduationCap,
  default: CreditCard,
  housing: Home,
  loan: DollarSign,
  contact: Smartphone,
  month: Calendar,
  poutcome: History,
  history: History,
  balance: DollarSign,
  day: Calendar,
  duration: Clock,
  campaign: Target,
  pdays: History,
  previous: History,
  dashboard: LayoutDashboard,
  predict: TrendingUp,
  batch: FileText,
  worklist: Target,
  status: BarChart2,
  help: HelpCircle,
  settings: SettingsIcon,
  search: Search,
  check: CheckCircle2,
  error: XCircle,
  refresh: RefreshCw,
  upload: Upload,
  download: Download,
  trash: Trash2,
  menu: Menu,
  chevron: ChevronRight
};

export const JOB_OPTIONS = [
  "admin.", "blue-collar", "entrepreneur", "housemaid", "management", 
  "retired", "self-employed", "services", "student", "technician", 
  "unemployed", "unknown"
];

export const MARITAL_OPTIONS = ["married", "single", "divorced"];
export const EDUCATION_OPTIONS = ["primary", "secondary", "tertiary", "unknown"];
export const YES_NO_OPTIONS = ["yes", "no"];
export const CONTACT_OPTIONS = ["cellular", "telephone", "unknown"];
export const MONTH_OPTIONS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
export const POUTCOME_OPTIONS = ["failure", "other", "success", "unknown"];

export const GLOSSARY = [
  {
    id: "age",
    title: "Age",
    description: "The age of the client in years. Higher age might correlate with more stability but different investment patterns.",
    example: "45",
    values: "Integer (18-100)"
  },
  {
    id: "job",
    title: "Job Profile",
    description: "The occupation of the client. Management and technical roles often have higher disposable income for deposits.",
    example: "technician",
    values: JOB_OPTIONS.join(", ")
  },
  {
    id: "balance",
    title: "Account Balance",
    description: "Average yearly balance, in euros. A key indicator of liquidity and ability to commit funds to a term deposit.",
    example: "2343",
    values: "Numeric"
  },
  {
    id: "duration",
    title: "Last Contact Duration",
    description: "Last contact duration, in seconds. Important: this attribute highly affects the output target (if duration=0 then y='no').",
    example: "120",
    values: "Numeric (seconds)"
  },
  {
    id: "poutcome",
    title: "Previous Campaign Outcome",
    description: "Outcome of the previous marketing campaign for this client. 'Success' is the strongest predictor for future subscription.",
    example: "success",
    values: POUTCOME_OPTIONS.join(", ")
  }
];
