import { useState } from 'react';
import { motion } from 'framer-motion';
import { Download, FileSpreadsheet, FileText } from 'lucide-react';
import * as XLSX from 'xlsx';
import { getCategoryName } from '../data/constants';

interface Transaction {
  id: number;
  amount: number;
  category: string;
  date: string;
  type: 'expense' | 'income';
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  currentMonth: Date;
}

export const ExportModal: React.FC<Props> = ({ isOpen, onClose, transactions, currentMonth }) => {
  const [exportFormat, setExportFormat] = useState<'csv' | 'excel'>('excel');
  const [exportPeriod, setExportPeriod] = useState<'month' | 'all'>('month');

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getFilteredTransactions = () => {
    if (exportPeriod === 'month') {
      return transactions.filter(t => {
        const date = new Date(t.date);
        return date.getMonth() === currentMonth.getMonth() &&
               date.getFullYear() === currentMonth.getFullYear();
      });
    }
    return transactions;
  };

  const generateCSV = () => {
    const filtered = getFilteredTransactions();
    
    // Заголовки
    const headers = ['Дата', 'Тип', 'Категория', 'Сумма'];
    const rows = filtered.map(t => [
      formatDate(t.date),
      t.type === 'expense' ? 'Расход' : 'Доход',
      getCategoryName(t.category),
      t.amount
    ]);

    // Формирование CSV
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    // Скачивание
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `neko-finance-${exportPeriod === 'month' ? 'месяц' : 'все'}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const generateExcel = () => {
    const filtered = getFilteredTransactions();

    // Подготовка данных
    const data = filtered.map(t => ({
      'Дата': formatDate(t.date),
      'Тип': t.type === 'expense' ? 'Расход' : 'Доход',
      'Категория': getCategoryName(t.category),
      'Сумма': t.amount
    }));

    // Создание workbook и worksheet
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Транзакции');

    // Ширина колонок
    ws['!cols'] = [
      { wch: 20 }, // Дата
      { wch: 10 }, // Тип
      { wch: 20 }, // Категория
      { wch: 12 }  // Сумма
    ];

    // Скачивание
    XLSX.writeFile(wb, `neko-finance-${exportPeriod === 'month' ? 'месяц' : 'все'}.xlsx`);
  };

  const handleExport = () => {
    if (exportFormat === 'csv') {
      generateCSV();
    } else {
      generateExcel();
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <motion.div
        className="modal-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}
      />
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        style={{
          position: 'fixed',
          top: '50%',
          left: '20px',
          right: '20px',
          background: 'linear-gradient(135deg, #FFF 0%, #FFF5F8 100%)',
          borderRadius: 24,
          padding: 30,
          maxWidth: 400,
          zIndex: 1001,
          boxShadow: '0 20px 60px rgba(107, 76, 117, 0.3)',
          border: '2px solid rgba(254, 200, 216, 0.3)',
          boxSizing: 'border-box',
          margin: '0 auto',
          transform: 'translateY(-50%)'
        }}
      >
        <h2 style={{
          textAlign: 'center',
          marginBottom: 24,
          background: 'linear-gradient(135deg, #D291BC 0%, #FEC8D8 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          fontSize: 22,
          fontWeight: 'bold'
        }}>
          📥 Экспорт данных
        </h2>

        {/* Выбор формата */}
        <div style={{ marginBottom: 24 }}>
          <label style={{
            display: 'block',
            fontSize: 14,
            fontWeight: 700,
            color: '#6B4C75',
            marginBottom: 12
          }}>
            Формат файла
          </label>
          <div style={{ display: 'flex', gap: 12 }}>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setExportFormat('excel')}
              style={{
                flex: 1,
                padding: '12px 16px',
                borderRadius: 14,
                border: '2px solid',
                borderColor: exportFormat === 'excel' ? '#D291BC' : '#F0F0F0',
                background: exportFormat === 'excel'
                  ? 'linear-gradient(135deg, #FEC8D8 0%, #D291BC 100%)'
                  : 'white',
                color: exportFormat === 'excel' ? 'white' : '#6B4C75',
                fontWeight: 'bold',
                fontSize: 14,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                transition: 'all 0.2s'
              }}
            >
              <FileSpreadsheet size={18} />
              Excel
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setExportFormat('csv')}
              style={{
                flex: 1,
                padding: '12px 16px',
                borderRadius: 14,
                border: '2px solid',
                borderColor: exportFormat === 'csv' ? '#D291BC' : '#F0F0F0',
                background: exportFormat === 'csv'
                  ? 'linear-gradient(135deg, #FEC8D8 0%, #D291BC 100%)'
                  : 'white',
                color: exportFormat === 'csv' ? 'white' : '#6B4C75',
                fontWeight: 'bold',
                fontSize: 14,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                transition: 'all 0.2s'
              }}
            >
              <FileText size={18} />
              CSV
            </motion.button>
          </div>
        </div>

        {/* Выбор периода */}
        <div style={{ marginBottom: 24 }}>
          <label style={{
            display: 'block',
            fontSize: 14,
            fontWeight: 700,
            color: '#6B4C75',
            marginBottom: 12
          }}>
            Период
          </label>
          <div style={{ display: 'flex', gap: 12 }}>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setExportPeriod('month')}
              style={{
                flex: 1,
                padding: '12px 16px',
                borderRadius: 14,
                border: '2px solid',
                borderColor: exportPeriod === 'month' ? '#D291BC' : '#F0F0F0',
                background: exportPeriod === 'month'
                  ? 'linear-gradient(135deg, #FEC8D8 0%, #D291BC 100%)'
                  : 'white',
                color: exportPeriod === 'month' ? 'white' : '#6B4C75',
                fontWeight: 'bold',
                fontSize: 14,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              Текущий месяц
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setExportPeriod('all')}
              style={{
                flex: 1,
                padding: '12px 16px',
                borderRadius: 14,
                border: '2px solid',
                borderColor: exportPeriod === 'all' ? '#D291BC' : '#F0F0F0',
                background: exportPeriod === 'all'
                  ? 'linear-gradient(135deg, #FEC8D8 0%, #D291BC 100%)'
                  : 'white',
                color: exportPeriod === 'all' ? 'white' : '#6B4C75',
                fontWeight: 'bold',
                fontSize: 14,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              Всё время
            </motion.button>
          </div>
        </div>

        {/* Кнопки действий */}
        <div style={{ display: 'flex', gap: 12 }}>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onClose}
            style={{
              flex: 1,
              padding: '14px',
              borderRadius: 14,
              border: '2px solid #F0F0F0',
              background: 'white',
              color: '#6B4C75',
              fontWeight: 'bold',
              fontSize: 16,
              cursor: 'pointer'
            }}
          >
            Отмена
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleExport}
            style={{
              flex: 1,
              padding: '14px',
              borderRadius: 14,
              border: 'none',
              background: 'linear-gradient(135deg, #FEC8D8 0%, #D291BC 100%)',
              color: 'white',
              fontWeight: 'bold',
              fontSize: 16,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              boxShadow: '0 4px 16px rgba(210, 145, 188, 0.3)'
            }}
          >
            <Download size={18} />
            Экспорт
          </motion.button>
        </div>
      </motion.div>
    </>
  );
};
