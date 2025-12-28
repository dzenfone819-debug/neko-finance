import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Camera, Hash, FileText } from 'lucide-react';
import { uploadFile, fetchTags } from '../api/nekoApi';
import WebApp from '@twa-dev/sdk';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  note: string;
  setNote: (note: string) => void;
  tags: string[];
  setTags: (tags: string[]) => void;
  photos: string[];
  setPhotos: (photos: string[]) => void;
}

export const TransactionDetailsInput: React.FC<Props> = ({
  isOpen, onClose, note, setNote, tags, setTags, photos, setPhotos
}) => {
  const [tagInput, setTagInput] = useState('');
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Load popular tags
    fetchTags().then(setAllTags).catch(console.error);
  }, []);

  const handleTagInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTagInput(val);

    if (val.startsWith('#') || val.length > 0) {
      const search = val.replace(/^#/, '').toLowerCase();
      setSuggestedTags(allTags.filter(t => t.toLowerCase().includes(search)).slice(0, 5));
    } else {
      setSuggestedTags([]);
    }
  };

  const addTag = (tag: string) => {
    if (!tags.includes(tag)) {
      setTags([...tags, tag]);
    }
    setTagInput('');
    setSuggestedTags([]);
  };

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput) {
      addTag(tagInput.replace(/^#/, ''));
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      if (photos.length >= 3) {
        WebApp.HapticFeedback.notificationOccurred('error');
        return;
      }

      const file = e.target.files[0];
      try {
        WebApp.HapticFeedback.impactOccurred('light');
        const urls = await uploadFile(file); // Should implement this in API
        if (urls && urls.length > 0) {
           setPhotos([...photos, ...urls]);
        }
      } catch (err) {
        console.error(err);
        WebApp.HapticFeedback.notificationOccurred('error');
      }
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          style={{ overflow: 'hidden', width: '100%' }}
        >
          <div style={{
            background: 'var(--bg-input)',
            borderRadius: 16,
            padding: 16,
            marginBottom: 10,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            position: 'relative'
          }}>
            {/* Close button */}
            <button
                onClick={onClose}
                style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    padding: 4
                }}
            >
                <X size={16} />
            </button>

            {/* Note Input */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', paddingRight: 24 }}>
              <FileText size={18} style={{ color: 'var(--text-secondary)', marginTop: 2 }} />
              <textarea
                value={note}
                onChange={(e) => {
                    setNote(e.target.value);
                    e.target.style.height = 'auto';
                    e.target.style.height = e.target.scrollHeight + 'px';
                }}
                placeholder="Заметка..."
                rows={1}
                style={{
                  width: '100%',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-main)',
                  fontSize: 14,
                  resize: 'none',
                  fontFamily: 'inherit',
                  outline: 'none',
                  minHeight: 24
                }}
              />
            </div>

            <div style={{ height: 1, background: 'var(--border-color)' }} />

            {/* Tags Input */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <Hash size={18} style={{ color: 'var(--text-secondary)' }} />
                {tags.map(tag => (
                  <span key={tag} style={{
                    background: 'var(--primary)',
                    color: '#fff',
                    borderRadius: 12,
                    padding: '2px 8px',
                    fontSize: 12,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4
                  }}>
                    #{tag}
                    <X size={12} onClick={() => setTags(tags.filter(t => t !== tag))} style={{ cursor: 'pointer' }} />
                  </span>
                ))}
                <input
                  type="text"
                  value={tagInput}
                  onChange={handleTagInput}
                  onKeyDown={handleTagKeyDown}
                  placeholder={tags.length === 0 ? "Теги (например #продукты)" : ""}
                  style={{
                    flex: 1,
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-main)',
                    fontSize: 14,
                    outline: 'none',
                    minWidth: 100
                  }}
                />
              </div>

              {/* Suggestions */}
              {suggestedTags.length > 0 && (
                 <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
                    {suggestedTags.map(tag => (
                        <button
                            key={tag}
                            onClick={() => addTag(tag)}
                            style={{
                                background: 'var(--bg-card)',
                                border: '1px solid var(--border-color)',
                                borderRadius: 12,
                                padding: '4px 8px',
                                fontSize: 12,
                                color: 'var(--text-secondary)',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap'
                            }}
                        >
                            #{tag}
                        </button>
                    ))}
                 </div>
              )}
            </div>

            <div style={{ height: 1, background: 'var(--border-color)' }} />

            {/* Photos */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        color: 'var(--text-secondary)',
                        fontSize: 14,
                        cursor: 'pointer'
                    }}
                >
                    <Camera size={18} />
                    <span>{photos.length}/3</span>
                </div>
                <input
                    type="file"
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    accept="image/*"
                    onChange={handleFileSelect}
                />

                <div style={{ display: 'flex', gap: 8, overflowX: 'auto' }}>
                    {photos.map((url, i) => (
                        <div key={i} style={{ position: 'relative', width: 40, height: 40, flexShrink: 0 }}>
                            <img src={url} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }} />
                            <button
                                onClick={() => removePhoto(i)}
                                style={{
                                    position: 'absolute',
                                    top: -4,
                                    right: -4,
                                    background: 'var(--bg-card)',
                                    borderRadius: '50%',
                                    width: 16,
                                    height: 16,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    border: 'none',
                                    padding: 0,
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                                }}
                            >
                                <X size={10} color="var(--text-main)" />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
