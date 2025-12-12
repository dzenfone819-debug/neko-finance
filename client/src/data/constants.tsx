import { 
  Coffee, Car, Gamepad2, Zap, 
  Home, Bus, RefreshCcw, Divide, Armchair, Shirt, PiggyBank, ShoppingBasket,
  Briefcase, Gift, Percent, Wallet, Package, Plane, Utensils, Film, Smartphone, Pill, GraduationCap
} from 'lucide-react'

// Функция для получения иконки по имени
export const getIconByName = (iconName: string, size: number = 20) => {
  const icons: Record<string, any> = {
    ShoppingBasket, Coffee, Car, Bus, Home, Zap, RefreshCcw, Divide,
    Armchair, Shirt, Gamepad2, PiggyBank, Briefcase, Gift, Percent, Wallet,
    Package, Plane, Utensils, Film, Smartphone, Pill, GraduationCap
  };
  
  const IconComponent = icons[iconName];
  // Если нашли компонент - возвращаем его, если нет - проверяем, может это эмодзи
  if (IconComponent) {
    return <IconComponent size={size} />;
  }
  // Если это не компонент и длина 1-2 символа (эмодзи), возвращаем как есть
  if (iconName && iconName.length <= 4) {
    return iconName;
  }
  // В остальных случаях - дефолтная иконка
  return <Package size={size} />;
};

// Палитра
export const COLORS = [
  '#FFADAD', '#FFD6A5', '#FDFFB6', '#CAFFBF', '#9BF6FF', 
  '#A0C4FF', '#BDB2FF', '#FFC6FF', '#FFFFFC', '#E4C1F9', 
  '#D0F4DE', '#A9DEF9'
];

// Категории РАСХОДОВ
export const EXPENSE_CATEGORIES = [
  { id: 'groceries', name: 'Еда', icon: <ShoppingBasket size={20} />, color: '#CAFFBF' },
  { id: 'food', name: 'Кафе', icon: <Coffee size={20} />, color: '#FFADAD' },
  { id: 'transport', name: 'Трансп.', icon: <Car size={20} />, color: '#A0C4FF' },
  { id: 'commute', name: 'Проезд', icon: <Bus size={20} />, color: '#9BF6FF' },
  { id: 'mortgage', name: 'Ипотека', icon: <Home size={20} />, color: '#BDB2FF' },
  { id: 'bills', name: 'КУ', icon: <Zap size={20} />, color: '#FDFFB6' },
  { id: 'subs', name: 'Подписки', icon: <RefreshCcw size={20} />, color: '#E4C1F9' },
  { id: 'split', name: 'Сплит', icon: <Divide size={20} />, color: '#FFC6FF' },
  { id: 'home', name: 'Дом', icon: <Armchair size={20} />, color: '#FFD6A5' },
  { id: 'personal', name: 'Себе', icon: <Shirt size={20} />, color: '#D0F4DE' },
  { id: 'fun', name: 'Развл.', icon: <Gamepad2 size={20} />, color: '#A9DEF9' },
  { id: 'reserve', name: 'Резерв', icon: <PiggyBank size={20} />, color: '#FFFFFC' },
];

// Категории ДОХОДОВ
export const INCOME_CATEGORIES = [
  { id: 'salary', name: 'Зарплата', icon: <Briefcase size={20} />, color: '#4ADE80' }, 
  { id: 'gift', name: 'Подарок', icon: <Gift size={20} />, color: '#F472B6' },
  { id: 'cashback', name: 'Кешбэк', icon: <Percent size={20} />, color: '#60A5FA' },
  { id: 'other_income', name: 'Другое', icon: <Wallet size={20} />, color: '#FACC15' },
];

// --- ВОТ ЭТО ИСПРАВЛЕНИЕ ---
// Мы говорим: "Если кто-то просит просто CATEGORIES, дай им Расходы"
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