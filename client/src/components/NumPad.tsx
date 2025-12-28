import React from 'react';
import { motion } from 'framer-motion';
import { Delete } from 'lucide-react';

interface NumPadProps {
  onNumberClick: (num: string) => void;
  onDelete: () => void;
  // onConfirm removed as it's now external
  extraContent?: React.ReactNode;
  // Optional confirmLabel for backward compatibility if needed, but not used in new layout
  confirmLabel?: string;
  onConfirm?: () => void; // Keep prop definition to avoid TS errors if parent passes it, but we won't use it in render if we want external button
}

export const NumPad: React.FC<NumPadProps> = ({ onNumberClick, onDelete, extraContent }) => {
  return (
    <div className="numpad-wrapper">
      <div className="numpad-grid">
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
      </div>

      {/* Сюда вставляем строку с доп. опциями */}
      {extraContent}
    </div>
  );
};
