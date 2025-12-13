import React from 'react';
import { motion } from 'framer-motion';
import { Delete } from 'lucide-react'; // Иконка стирания

interface NumPadProps {
  onNumberClick: (num: string) => void;
  onDelete: () => void;
  onConfirm: () => void;
}

export const NumPad: React.FC<NumPadProps> = ({ onNumberClick, onDelete, onConfirm }) => {
  const buttons = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0'];

  return (
    <div className="numpad-grid">
      {/* Цифры */}
      {buttons.map((btn) => (
        <motion.button
          key={btn}
          className="numpad-btn"
          whileTap={{ scale: 0.9, backgroundColor: "rgba(0,0,0,0.05)" }}
          onClick={() => onNumberClick(btn)}
        >
          {btn}
        </motion.button>
      ))}

      {/* Кнопка стирания */}
      <motion.button
        className="numpad-btn delete-btn"
        whileTap={{ scale: 0.9, backgroundColor: "#FFDFD3" }}
        onClick={onDelete}
      >
        <Delete size={28} color="#6B4C75" />
      </motion.button>

      {/* Кнопка подтверждения (на всю ширину внизу) */}
      <motion.button
        className="numpad-confirm"
        whileTap={{ scale: 0.95 }}
        onClick={onConfirm}
      >
        Внести💵
      </motion.button>
    </div>
  );
};