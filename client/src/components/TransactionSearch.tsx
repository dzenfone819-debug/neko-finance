import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search } from 'lucide-react';

interface CategoryItem { id: string; name: string }

interface TransactionSearchProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyFilters: (filters: FilterState) => void;
  categories: CategoryItem[];
}

export interface FilterState {
  searchAmount: string;
  selectedCategory: string;
  period: 'day' | 'week' | 'month' | 'all';
}

const TransactionSearch = ({ isOpen, onClose, onApplyFilters, categories }: TransactionSearchProps) => {
  const [searchAmount, setSearchAmount] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [period, setPeriod] = useState<'day' | 'week' | 'month' | 'all'>('all');

  const handleApply = () => {
    onApplyFilters({
      searchAmount,
      selectedCategory,
      period,
    });
    onClose();
  };

  const handleReset = () => {
    setSearchAmount('');
    setSelectedCategory('');
    setPeriod('all');
    onApplyFilters({
      searchAmount: '',
      selectedCategory: '',
      period: 'all',
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="search-panel"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            <div className="search-header">
              <h3>🔍 Поиск и фильтры</h3>
              <button className="close-btn" onClick={onClose}>
                <X size={24} />
              </button>
            </div>

            <div className="search-content">
              <div className="filter-section">
                <label>💰 Сумма</label>
                <div className="amount-search">
                  <Search size={18} className="search-icon" />
                  <input
                    type="number"
                    placeholder="Введите сумму"
                    value={searchAmount}
                    onChange={(e) => setSearchAmount(e.target.value)}
                  />
                </div>
              </div>

              <div className="filter-section">
                <label>🏷️ Категория</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                >
                  <option value="">Все категории</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="filter-section">
                <label>📅 Период</label>
                <div className="period-buttons">
                  <button
                    className={`period-btn ${period === 'day' ? 'active' : ''}`}
                    onClick={() => setPeriod('day')}
                  >
                    День
                  </button>
                  <button
                    className={`period-btn ${period === 'week' ? 'active' : ''}`}
                    onClick={() => setPeriod('week')}
                  >
                    Неделя
                  </button>
                  <button
                    className={`period-btn ${period === 'month' ? 'active' : ''}`}
                    onClick={() => setPeriod('month')}
                  >
                    Месяц
                  </button>
                  <button
                    className={`period-btn ${period === 'all' ? 'active' : ''}`}
                    onClick={() => setPeriod('all')}
                  >
                    Всё время
                  </button>
                </div>
              </div>
            </div>

            <div className="search-actions">
              <button className="reset-btn" onClick={handleReset}>
                Сбросить
              </button>
              <button className="apply-btn" onClick={handleApply}>
                Применить
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default TransactionSearch;
