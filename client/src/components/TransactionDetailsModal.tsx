import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Camera, X, Loader2 } from 'lucide-react';
import { Modal } from './Modal';
import * as api from '../api/nekoApi';

interface TransactionDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (note: string, tags: string[], photos: string[]) => void;
  initialNote?: string;
  initialTags?: string[];
  initialPhotos?: string[];
  userId: number | null;
}

export const TransactionDetailsModal: React.FC<TransactionDetailsModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialNote = '',
  initialTags = [],
  initialPhotos = [],
  userId
}) => {
  const [note, setNote] = useState(initialNote);
  const [tags, setTags] = useState<string[]>(initialTags);
  const [photos, setPhotos] = useState<string[]>(initialPhotos);
  const [tagInput, setTagInput] = useState('');
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const [popularTags, setPopularTags] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      setNote(initialNote);
      setTags(initialTags);
      setPhotos(initialPhotos);
      loadPopularTags();
    }
  }, [isOpen, initialNote, initialTags, initialPhotos]);

  useEffect(() => {
      // Auto-resize textarea
      if (textAreaRef.current) {
          textAreaRef.current.style.height = 'auto';
          textAreaRef.current.style.height = textAreaRef.current.scrollHeight + 'px';
      }
  }, [note]);

  const loadPopularTags = async () => {
      if (userId) {
          try {
              const tags = await api.fetchPopularTags(userId);
              setPopularTags(tags);
          } catch (e) {
              console.error(e);
          }
      }
  }

  const handleTagInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTagInput(val);

    if (val.trim()) {
        const query = val.startsWith('#') ? val.slice(1).toLowerCase() : val.toLowerCase();
        setSuggestedTags(popularTags.filter(t => t.toLowerCase().includes(query) && !tags.includes(t)));
    } else {
        setSuggestedTags([]);
    }
  };

  const handleAddTag = (tag: string) => {
      const cleanTag = tag.startsWith('#') ? tag.slice(1) : tag;
      if (cleanTag && !tags.includes(cleanTag)) {
          setTags([...tags, cleanTag]);
      }
      setTagInput('');
      setSuggestedTags([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && tagInput) {
          e.preventDefault();
          handleAddTag(tagInput);
      }
      if (e.key === 'Backspace' && !tagInput && tags.length > 0) {
          setTags(tags.slice(0, -1));
      }
  };

  const handleRemoveTag = (tagToRemove: string) => {
      setTags(tags.filter(t => t !== tagToRemove));
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
          const files = Array.from(e.target.files);
          // Limit to 3 photos total
          const remainingSlots = 3 - photos.length;
          if (remainingSlots <= 0) return;

          const filesToUpload = files.slice(0, remainingSlots);

          setIsUploading(true);
          try {
              const uploadPromises = filesToUpload.map(file => api.uploadFile(file));
              const uploadedUrls = await Promise.all(uploadPromises);
              setPhotos([...photos, ...uploadedUrls]);
          } catch (err) {
              console.error("Upload failed", err);
              // Maybe show toast error
          } finally {
              setIsUploading(false);
              // Clear input
              if (fileInputRef.current) fileInputRef.current.value = '';
          }
      }
  };

  const handleRemovePhoto = (index: number) => {
      setPhotos(photos.filter((_, i) => i !== index));
  };

  const handleSave = () => {
      onSave(note, tags, photos);
      onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Детали транзакции">
      <div className="tx-details-modal">
        {/* NOTE SECTION */}
        <div className="section">
            <div className="section-title">Заметка</div>
            <textarea
                ref={textAreaRef}
                className="note-input"
                placeholder="Добавьте комментарий..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={1}
            />
        </div>

        {/* TAGS SECTION */}
        <div className="section">
            <div className="section-title">Теги</div>
            <div className="tags-input-container">
                {tags.map(tag => (
                    <span key={tag} className="tag-chip">
                        #{tag}
                        <button onClick={() => handleRemoveTag(tag)} className="tag-remove"><X size={12} /></button>
                    </span>
                ))}
                <input
                    type="text"
                    className="tag-input-field"
                    placeholder={tags.length === 0 ? "Добавить тег (#еда)" : "..."}
                    value={tagInput}
                    onChange={handleTagInput}
                    onKeyDown={handleKeyDown}
                />
            </div>

            {/* SUGGESTIONS */}
            {(suggestedTags.length > 0 || (tagInput === '' && popularTags.length > 0)) && (
                <div className="tags-suggestions">
                    <div className="suggestions-label">
                        {tagInput ? 'Найдено:' : 'Популярные:'}
                    </div>
                    <div className="suggestions-list">
                        {(tagInput ? suggestedTags : popularTags).slice(0, 10).map(tag => (
                            <button
                                key={tag}
                                className={`suggestion-chip ${tags.includes(tag) ? 'active' : ''}`}
                                onClick={() => handleAddTag(tag)}
                                disabled={tags.includes(tag)}
                            >
                                #{tag}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>

        {/* PHOTOS SECTION */}
        <div className="section">
            <div className="section-title">
                Фото <span className="counter">{photos.length}/3</span>
            </div>
            <div className="photos-grid">
                {photos.map((url, index) => (
                    <div key={index} className="photo-preview">
                        <img src={url} alt={`Photo ${index + 1}`} />
                        <button className="photo-remove" onClick={() => handleRemovePhoto(index)}>
                            <X size={14} />
                        </button>
                    </div>
                ))}

                {photos.length < 3 && (
                    <button
                        className="add-photo-btn"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                    >
                        {isUploading ? <Loader2 className="animate-spin" size={24} /> : <Camera size={24} />}
                        <span className="add-photo-text">Добавить</span>
                    </button>
                )}
            </div>
            <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept="image/*"
                multiple
                onChange={handleFileSelect}
            />
        </div>

        <motion.button
            className="save-details-btn"
            whileTap={{ scale: 0.95 }}
            onClick={handleSave}
        >
            Готово
        </motion.button>
      </div>

      <style>{`
        .tx-details-modal {
            padding: 0 4px;
        }
        .section {
            margin-bottom: 24px;
        }
        .section-title {
            font-size: 14px;
            font-weight: 600;
            color: var(--text-secondary);
            margin-bottom: 8px;
            display: flex;
            justify-content: space-between;
        }
        .note-input {
            width: 100%;
            background: var(--bg-input);
            border: 2px solid var(--border-color);
            border-radius: 12px;
            padding: 12px;
            font-family: inherit;
            font-size: 16px;
            color: var(--text-main);
            resize: none;
            outline: none;
            transition: border-color 0.2s;
            box-sizing: border-box;
            min-height: 48px;
            overflow: hidden;
        }
        .note-input:focus {
            border-color: var(--primary);
        }

        .tags-input-container {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            background: var(--bg-input);
            border: 2px solid var(--border-color);
            border-radius: 12px;
            padding: 10px;
            min-height: 48px;
            align-items: center;
        }
        .tag-chip {
            background: var(--primary);
            color: white;
            padding: 4px 10px;
            border-radius: 16px;
            font-size: 13px;
            display: flex;
            align-items: center;
            gap: 6px;
        }
        .tag-remove {
            background: rgba(255,255,255,0.2);
            border: none;
            border-radius: 50%;
            width: 18px;
            height: 18px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            cursor: pointer;
            padding: 0;
        }
        .tag-input-field {
            border: none;
            background: transparent;
            font-size: 15px;
            color: var(--text-main);
            flex: 1;
            min-width: 100px;
            outline: none;
        }

        .tags-suggestions {
            margin-top: 10px;
        }
        .suggestions-label {
            font-size: 12px;
            color: var(--text-secondary);
            margin-bottom: 6px;
        }
        .suggestions-list {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
        }
        .suggestion-chip {
            background: var(--bg-card);
            border: 1px solid var(--border-color);
            color: var(--text-secondary);
            padding: 4px 10px;
            border-radius: 14px;
            font-size: 12px;
            cursor: pointer;
            transition: all 0.2s;
        }
        .suggestion-chip:active {
            transform: scale(0.95);
        }

        .photos-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
        }
        .photo-preview {
            aspect-ratio: 1;
            border-radius: 12px;
            overflow: hidden;
            position: relative;
            background: #000;
        }
        .photo-preview img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        .photo-remove {
            position: absolute;
            top: 5px;
            right: 5px;
            background: rgba(0,0,0,0.5);
            color: white;
            border: none;
            border-radius: 50%;
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
        }
        .add-photo-btn {
            aspect-ratio: 1;
            border-radius: 12px;
            border: 2px dashed var(--border-color);
            background: var(--bg-input);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            color: var(--text-secondary);
            cursor: pointer;
            gap: 4px;
        }
        .add-photo-text {
            font-size: 11px;
        }

        .save-details-btn {
            width: 100%;
            background: linear-gradient(135deg, var(--primary) 0%, #D291BC 100%);
            color: white;
            border: none;
            border-radius: 14px;
            padding: 14px;
            font-size: 16px;
            font-weight: bold;
            margin-top: 10px;
            cursor: pointer;
            box-shadow: 0 4px 12px var(--shadow-color);
        }
      `}</style>
    </Modal>
  );
};
