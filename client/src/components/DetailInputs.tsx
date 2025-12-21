import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import { Camera, StickyNote, Tag, X } from 'lucide-react';

interface DetailInputsProps {
  note: string;
  setNote: (val: string) => void;
  tags: string;
  setTags: (val: string) => void;
  photo: File | null;
  setPhoto: (file: File | null) => void;
}

export const DetailInputs: React.FC<DetailInputsProps> = ({
  note, setNote,
  tags, setTags,
  photo, setPhoto
}) => {
  const [activeInput, setActiveInput] = React.useState<'none' | 'note' | 'tags'>('none');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setPhoto(e.target.files[0]);
    }
  };

  return (
    <div className="detail-inputs-container">
      {/* Active Input Area */}
      {activeInput !== 'none' && (
        <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            className="active-input-wrapper"
        >
            {activeInput === 'note' && (
                <input
                    type="text"
                    placeholder="Добавить заметку..."
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="detail-text-input"
                    autoFocus
                />
            )}
            {activeInput === 'tags' && (
                <input
                    type="text"
                    placeholder="Теги (через запятую)..."
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    className="detail-text-input"
                    autoFocus
                />
            )}
            <button className="close-input-btn" onClick={() => setActiveInput('none')}>
                <X size={16} />
            </button>
        </motion.div>
      )}

      {/* Buttons Row */}
      <div className="detail-buttons-row">
        <motion.button
            whileTap={{ scale: 0.95 }}
            className={`detail-btn ${activeInput === 'note' || note ? 'active' : ''}`}
            onClick={() => setActiveInput(activeInput === 'note' ? 'none' : 'note')}
        >
            <StickyNote size={18} />
            {note && <span className="indicator-dot" />}
        </motion.button>

        <motion.button
            whileTap={{ scale: 0.95 }}
            className={`detail-btn ${activeInput === 'tags' || tags ? 'active' : ''}`}
            onClick={() => setActiveInput(activeInput === 'tags' ? 'none' : 'tags')}
        >
            <Tag size={18} />
            {tags && <span className="indicator-dot" />}
        </motion.button>

        <motion.button
            whileTap={{ scale: 0.95 }}
            className={`detail-btn ${photo ? 'active' : ''}`}
            onClick={() => fileInputRef.current?.click()}
        >
            <Camera size={18} />
            {photo && <span className="indicator-dot" />}
        </motion.button>

        <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            accept="image/*"
            onChange={handleFileChange}
        />

        {photo && (
            <div className="photo-preview">
                <span>📷 1</span>
                <button onClick={(e) => { e.stopPropagation(); setPhoto(null); }}>
                    <X size={12} />
                </button>
            </div>
        )}
      </div>
    </div>
  );
};
