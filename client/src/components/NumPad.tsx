import React from 'react';
import { motion } from 'framer-motion';
import { Delete, Plus } from 'lucide-react'; // Иконка стирания

interface NumPadProps {
  onNumberClick: (num: string) => void;
  onDelete: () => void;
  onConfirm: () => void;
  confirmLabel?: string;
  onOpenDetails?: () => void;
  hasDetails?: boolean;
}

export const NumPad: React.FC<NumPadProps> = ({
  onNumberClick,
  onDelete,
  onConfirm,
  confirmLabel = 'Внести💵',
  onOpenDetails,
  hasDetails = false
}) => {
  // Standard calculator layout
  // 7 8 9 ÷
  // 4 5 6 ×
  // 1 2 3 -
  // . 0 ⌫ +
  // = (confirm)

  return (
    <div className="numpad-grid">
      {/* 7 8 9 / */}
      {/* 4 5 6 * */}
      {/* 1 2 3 - */}
      {/* . 0 DEL + */}
      
      <motion.button className="numpad-btn" whileTap={{ scale: 0.9 }} onClick={() => onNumberClick('7')}>7</motion.button>
      <motion.button className="numpad-btn" whileTap={{ scale: 0.9 }} onClick={() => onNumberClick('8')}>8</motion.button>
      <motion.button className="numpad-btn" whileTap={{ scale: 0.9 }} onClick={() => onNumberClick('9')}>9</motion.button>
      <motion.button className="numpad-btn operator-btn" whileTap={{ scale: 0.9 }} onClick={() => onNumberClick('/')}>÷</motion.button>

      <motion.button className="numpad-btn" whileTap={{ scale: 0.9 }} onClick={() => onNumberClick('4')}>4</motion.button>
      <motion.button className="numpad-btn" whileTap={{ scale: 0.9 }} onClick={() => onNumberClick('5')}>5</motion.button>
      <motion.button className="numpad-btn" whileTap={{ scale: 0.9 }} onClick={() => onNumberClick('6')}>6</motion.button>
      <motion.button className="numpad-btn operator-btn" whileTap={{ scale: 0.9 }} onClick={() => onNumberClick('*')}>×</motion.button>

      <motion.button className="numpad-btn" whileTap={{ scale: 0.9 }} onClick={() => onNumberClick('1')}>1</motion.button>
      <motion.button className="numpad-btn" whileTap={{ scale: 0.9 }} onClick={() => onNumberClick('2')}>2</motion.button>
      <motion.button className="numpad-btn" whileTap={{ scale: 0.9 }} onClick={() => onNumberClick('3')}>3</motion.button>
      <motion.button className="numpad-btn operator-btn" whileTap={{ scale: 0.9 }} onClick={() => onNumberClick('-')}>−</motion.button>

      <motion.button className="numpad-btn" whileTap={{ scale: 0.9 }} onClick={() => onNumberClick('.')}>.</motion.button>
      <motion.button className="numpad-btn" whileTap={{ scale: 0.9 }} onClick={() => onNumberClick('0')}>0</motion.button>
      <motion.button className="numpad-btn delete-btn" whileTap={{ scale: 0.9 }} onClick={onDelete}><Delete size={24} /></motion.button>
      <motion.button className="numpad-btn operator-btn" whileTap={{ scale: 0.9 }} onClick={() => onNumberClick('+')}>+</motion.button>

      {/* Trigger Row: + Note • Tags • Photo */}
      {onOpenDetails && (
        <motion.button
            className="numpad-details-trigger"
            style={{ gridColumn: 'span 4' }}
            whileTap={{ scale: 0.98 }}
            onClick={onOpenDetails}
        >
            <div className={`details-content ${hasDetails ? 'has-details' : ''}`}>
                {hasDetails ? (
                   <>
                     <span className="details-active-indicator">✓</span>
                     <span className="details-text-active">Данные добавлены</span>
                   </>
                ) : (
                   <>
                     <span className="details-icon"><Plus size={14} strokeWidth={3} /></span>
                     <span className="details-text">Заметка • Теги • Фото</span>
                   </>
                )}
            </div>
        </motion.button>
      )}

      {/* Confirm Button usually spans bottom */}
      <motion.button
        className="numpad-confirm"
        style={{ gridColumn: 'span 4' }}
        whileTap={{ scale: 0.95 }}
        onClick={onConfirm}
      >
        {confirmLabel}
      </motion.button>
    </div>
  );
};
