import { 
  Coffee, Car, Gamepad2, Zap, 
  Home, Bus, RefreshCcw, Divide, Armchair, Shirt, PiggyBank, ShoppingBasket 
} from 'lucide-react'

// Палитра
export const COLORS = [
  '#FFADAD', '#FFD6A5', '#FDFFB6', '#CAFFBF', '#9BF6FF', 
  '#A0C4FF', '#BDB2FF', '#FFC6FF', '#FFFFFC', '#E4C1F9', 
  '#D0F4DE', '#A9DEF9'
];

// Категории
export const CATEGORIES = [
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

export const getCategoryName = (id: string) => {
  const cat = CATEGORIES.find(c => c.id === id);
  return cat ? cat.name : (id === 'general' ? 'Разное' : id);
}