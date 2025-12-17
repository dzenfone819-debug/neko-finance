import { 
  ShoppingBasket, Coffee, Car, Bus, Home, Zap, RefreshCcw, Divide,
  Armchair, Shirt, Gamepad2, PiggyBank, Briefcase, Gift, Percent, Wallet,
  Package, Plane, Utensils, Film, Smartphone, Pill, GraduationCap,
  Music, Heart, Star, Sun, Moon, Cloud, Umbrella, 
  Book, Camera, Headphones, Watch, Key, Lock, Unlock, 
  MapPin, Navigation, Anchor, Bike, Train, Truck, 
  DollarSign, Euro, CreditCard, Landmark, Calculator,
  Smile, Frown, Meh, ThumbsUp, ThumbsDown,
  User, Users, Baby, Accessibility, Activity,
  Archive, ArrowRightLeft, Award, BarChart, Battery,
  Bell, Bluetooth, BookOpen, Bookmark, Box,
  Calendar, Cast, Check, CheckCircle, ChevronRight,
  Clipboard, Clock, CloudRain, Code, Compass,
  Copy, Cpu, Crop, Crosshair, Database,
  Disc, Droplet, Edit, Eye, Feather,
  File, FileText, Filter, Flag, Folder,
  Globe, Grid, HardDrive, Hash, Image,
  Inbox, Info, Layers, Layout, LifeBuoy,
  Link, List, Loader, LogIn, LogOut,
  Mail, Map, Maximize, Menu, MessageCircle,
  MessageSquare, Mic, Minimize, Monitor, MoreHorizontal,
  MoreVertical, MousePointer, Move, Music2, Network,
  Octagon, Paperclip, Pause, PenTool, Phone,
  PieChart, Play, PlayCircle, Plus, PlusCircle,
  Power, Printer, Radio, RotateCcw, RotateCw,
  Save, Scissors, Search, Send, Server,
  Settings, Share, Share2, Shield, ShoppingBag,
  ShoppingCart, Shuffle, Sidebar, SkipBack, SkipForward,
  Slash, Sliders, Speaker, Square, StopCircle,
  Tablet, Tag, Target, Terminal, Thermometer,
  ToggleLeft, ToggleRight, Trash, Trash2,
  Trello, TrendingDown, TrendingUp, Triangle, Truck as TruckIcon,
  Tv, Twitter, Type, Umbrella as UmbrellaIcon, Underline,
  Upload, UploadCloud, UserCheck, UserMinus, UserPlus,
  UserX, Video, VideoOff, Voicemail, Volume,
  Volume1, Volume2, VolumeX, Wifi, WifiOff,
  Wind, X, XCircle, XOctagon, XSquare,
  Youtube, ZapOff, ZoomIn, ZoomOut
} from 'lucide-react'

// --- НОВЫЙ СПИСОК ИКОНОК ---
export const ALL_ICONS = [
  // Emojis
  '🐷', '🏠', '✈️', '🚗', '💍', '🎓', '💻', '🎮', '📱', '⌚',
  '🍔', '🍕', '🍣', '🍷', '🍺', '☕', '⚽', '🏀', '🎾', '🎿',
  '🏖️', '🏔️', '⛺', '🎨', '🎭', '🎪', '🎰', '🐶', '🐱', '🦄',
  '💰', '💵', '💳', '💎', '🎁', '🛒', '🛍️', '💊', '🩺', '📚',
  // Lucide Icons (names matches imports)
  'ShoppingBasket', 'Coffee', 'Car', 'Bus', 'Home', 'Zap', 'RefreshCcw', 'Divide',
  'Armchair', 'Shirt', 'Gamepad2', 'PiggyBank', 'Briefcase', 'Gift', 'Percent', 'Wallet',
  'Package', 'Plane', 'Utensils', 'Film', 'Smartphone', 'Pill', 'GraduationCap',
  'Music', 'Heart', 'Star', 'Sun', 'Moon', 'Cloud', 'Umbrella',
  'Book', 'Camera', 'Headphones', 'Watch', 'Key', 'Lock',
  'MapPin', 'Navigation', 'Anchor', 'Bike', 'Train', 'Truck',
  'DollarSign', 'CreditCard', 'Landmark', 'Calculator',
  'Smile', 'User', 'Users', 'Baby', 'Activity',
  'ArrowRightLeft', 'Award', 'BarChart', 'Battery', 'Bell',
  'Calendar', 'CheckCircle', 'Clock', 'Code', 'Database',
  'Edit', 'Eye', 'FileText', 'Filter', 'Flag', 'Folder',
  'Globe', 'Image', 'Inbox', 'Layers', 'Link', 'List',
  'Mail', 'Map', 'MessageCircle', 'Mic', 'Monitor',
  'Music2', 'Paperclip', 'Phone', 'PieChart', 'Play',
  'Power', 'Printer', 'Save', 'Search', 'Send', 'Settings',
  'Share2', 'Shield', 'ShoppingBag', 'ShoppingCart',
  'Tablet', 'Tag', 'Target', 'Terminal', 'Trash2',
  'TrendingUp', 'Tv', 'Video', 'Volume2', 'Wifi', 'ZapOff'
];

// --- НОВЫЙ СПИСОК ЦВЕТОВ ---
// Подобранные цвета, которые читаются и с черным и с белым текстом (Medium Tones)
export const ALL_COLORS = [
  '#FF6B6B', // Salmon Red
  '#4ECDC4', // Medium Turquoise
  '#45B7D1', // Cyan Blue
  '#FFA07A', // Light Salmon
  '#98D8AA', // Pale Green
  '#FFBE0B', // Amber
  '#FB5607', // Orange Red
  '#FF006E', // Pink
  '#8338EC', // Purple
  '#3A86FF', // Blue
  '#2EC4B6', // Tiffany Blue
  '#E71D36', // Red
  '#FF9F1C', // Orange
  '#F15BB5', // Pink
  '#9B5DE5', // Purple
  '#00BBF9', // Light Blue
  '#00F5D4', // Mint
  '#F94144', // Red Orange
  '#F3722C', // Orange
  '#F8961E', // Yellow Orange
  '#F9C74F', // Maize
  '#90BE6D', // Pistachio
  '#43AA8B', // Jungle Green
  '#577590', // Queen Blue
  '#CDB4DB', // Lavender
  '#FFC8DD', // Pink
  '#FFAFCC', // Pink
  '#BDE0FE', // Light Blue
  '#A2D2FF', // Baby Blue
  '#8ECAE6', // Light Blue
  '#219EBC', // Blue Green
  '#FFB703', // Honey
  '#FB8500', // Orange
  '#606C38', // Dark Olive
  '#283618', // Dark Green
  '#DDA15E', // Earth
  '#BC6C25', // Brown
  '#6D6875', // Gray Purple
  '#B5838D', // English Lavender
  '#E5989B', // Melon
  '#F4ACB7', // Pink
  '#E29578', // Terracotta
  '#006D77', // Teal
  '#83C5BE', // Alice Blue
  '#EDF6F9', // White Smoke (Caution: Light) -> Removed or kept? User wanted contrast. 
  // Replacing very light with darker variants
  '#A8DADC', // Powder Blue
  '#457B9D', // Celadon Blue
  '#1D3557', // Prussian Blue
  '#E63946', // Red
];

// Функция для получения иконки по имени
export const getIconByName = (iconName: string, size: number = 20) => {
  const icons: Record<string, any> = {
    ShoppingBasket, Coffee, Car, Bus, Home, Zap, RefreshCcw, Divide,
    Armchair, Shirt, Gamepad2, PiggyBank, Briefcase, Gift, Percent, Wallet,
    Package, Plane, Utensils, Film, Smartphone, Pill, GraduationCap,
    Music, Heart, Star, Sun, Moon, Cloud, Umbrella,
    Book, Camera, Headphones, Watch, Key, Lock, Unlock,
    MapPin, Navigation, Anchor, Bike, Train, Truck,
    DollarSign, Euro, CreditCard, Landmark, Calculator,
    Smile, Frown, Meh, ThumbsUp, ThumbsDown,
    User, Users, Baby, Accessibility, Activity,
    Archive, ArrowRightLeft, Award, BarChart, Battery,
    Bell, Bluetooth, BookOpen, Bookmark, Box,
    Calendar, Cast, Check, CheckCircle, ChevronRight,
    Clipboard, Clock, CloudRain, Code, Compass,
    Copy, Cpu, Crop, Crosshair, Database,
    Disc, Droplet, Edit, Eye, Feather,
    File, FileText, Filter, Flag, Folder,
    Globe, Grid, HardDrive, Hash, Image,
    Inbox, Info, Layers, Layout, LifeBuoy,
    Link, List, Loader, LogIn, LogOut,
    Mail, Map, Maximize, Menu, MessageCircle,
    MessageSquare, Mic, Minimize, Monitor, MoreHorizontal,
    MoreVertical, MousePointer, Move, Music2, Network,
    Octagon, Paperclip, Pause, PenTool, Phone,
    PieChart, Play, PlayCircle, Plus, PlusCircle,
    Power, Printer, Radio, RotateCcw, RotateCw,
    Save, Scissors, Search, Send, Server,
    Settings, Share, Share2, Shield, ShoppingBag,
    ShoppingCart, Shuffle, Sidebar, SkipBack, SkipForward,
    Slash, Sliders, Speaker, Square, StopCircle,
    Tablet, Tag, Target, Terminal, Thermometer,
    ToggleLeft, ToggleRight, Trash, Trash2,
    Trello, TrendingDown, TrendingUp, Triangle, TruckIcon,
    Tv, Twitter, Type, UmbrellaIcon, Underline,
    Upload, UploadCloud, UserCheck, UserMinus, UserPlus,
    UserX, Video, VideoOff, Voicemail, Volume,
    Volume1, Volume2, VolumeX, Wifi, WifiOff,
    Wind, X, XCircle, XOctagon, XSquare,
    Youtube, ZapOff, ZoomIn, ZoomOut
  };
  
  const IconComponent = icons[iconName];
  // Если нашли компонент - возвращаем его
  if (IconComponent) {
    return <IconComponent size={size} />;
  }
  
  // Если это не компонент, возвращаем как текст (эмодзи)
  // В React можно рендерить строку
  return <span style={{ fontSize: size, lineHeight: 1 }}>{iconName || '📦'}</span>;
};

// Палитра (оставляем для совместимости, но используем ALL_COLORS в новых пикерах)
export const COLORS = ALL_COLORS.slice(0, 12);

// Категории РАСХОДОВ
export const EXPENSE_CATEGORIES = [
  { id: 'groceries', name: 'Еда', icon: <ShoppingBasket size={20} />, color: '#90BE6D' },
  { id: 'food', name: 'Кафе', icon: <Coffee size={20} />, color: '#F94144' },
  { id: 'transport', name: 'Трансп.', icon: <Car size={20} />, color: '#4D908E' },
  { id: 'commute', name: 'Проезд', icon: <Bus size={20} />, color: '#43AA8B' },
  { id: 'mortgage', name: 'Ипотека', icon: <Home size={20} />, color: '#577590' },
  { id: 'bills', name: 'КУ', icon: <Zap size={20} />, color: '#F9C74F' },
  { id: 'subs', name: 'Подписки', icon: <RefreshCcw size={20} />, color: '#F3722C' },
  { id: 'split', name: 'Сплит', icon: <Divide size={20} />, color: '#F8961E' },
  { id: 'home', name: 'Дом', icon: <Armchair size={20} />, color: '#277DA1' },
  { id: 'personal', name: 'Себе', icon: <Shirt size={20} />, color: '#4ECDC4' },
  { id: 'fun', name: 'Развл.', icon: <Gamepad2 size={20} />, color: '#FF6B6B' },
  { id: 'reserve', name: 'Резерв', icon: <PiggyBank size={20} />, color: '#98D8AA' },
];

// Категории ДОХОДОВ
export const INCOME_CATEGORIES = [
  { id: 'salary', name: 'Зарплата', icon: <Briefcase size={20} />, color: '#4ADE80' }, 
  { id: 'gift', name: 'Подарок', icon: <Gift size={20} />, color: '#F472B6' },
  { id: 'cashback', name: 'Кешбэк', icon: <Percent size={20} />, color: '#60A5FA' },
  { id: 'other_income', name: 'Другое', icon: <Wallet size={20} />, color: '#FACC15' },
];

export const CATEGORIES = EXPENSE_CATEGORIES;

export const getCategoryName = (id: string) => {
  const all = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES];
  const cat = all.find(c => c.id === id);
  return cat ? cat.name : (id === 'general' ? 'Разное' : id);
}

export const getCategoryColor = (id: string) => {
  const all = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES];
  const cat = all.find(c => c.id === id);
  return cat ? cat.color : '#eee';
}
