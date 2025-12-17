import React from 'react';
import { motion } from 'framer-motion';
import { ALL_ICONS, getIconByName } from '../data/constants';

interface IconPickerProps {
  selectedIcon: string;
  onSelectIcon: (icon: string) => void;
}

export const IconPicker: React.FC<IconPickerProps> = ({ selectedIcon, onSelectIcon }) => {
  return (
    <div>
      <label className="picker-label">Иконка</label>
      <div className="picker-grid">
        {ALL_ICONS.map((icon) => (
          <motion.div
            key={icon}
            whileTap={{ scale: 0.9 }}
            onClick={() => onSelectIcon(icon)}
            className={`picker-item ${selectedIcon === icon ? 'selected' : ''}`}
            style={{
              background: selectedIcon === icon ? 'var(--bg-card)' : 'transparent',
              borderColor: selectedIcon === icon ? 'var(--primary)' : 'transparent'
            }}
          >
            {getIconByName(icon, 24)}
          </motion.div>
        ))}
      </div>
    </div>
  );
};
