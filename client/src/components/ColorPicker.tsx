import React from 'react';
import { motion } from 'framer-motion';
import { ALL_COLORS } from '../data/constants';

interface ColorPickerProps {
  selectedColor: string;
  onSelectColor: (color: string) => void;
}

export const ColorPicker: React.FC<ColorPickerProps> = ({ selectedColor, onSelectColor }) => {
  return (
    <div>
      <label className="picker-label">Цвет</label>
      <div className="picker-grid">
        {ALL_COLORS.map((color) => (
          <motion.div
            key={color}
            whileTap={{ scale: 0.9 }}
            onClick={() => onSelectColor(color)}
            className={`picker-item ${selectedColor === color ? 'selected' : ''}`}
            style={{
              backgroundColor: color,
              border: selectedColor === color ? '3px solid var(--text-main)' : '2px solid transparent'
            }}
          />
        ))}
      </div>
    </div>
  );
};
