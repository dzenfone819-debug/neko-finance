import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Hash, Image, X, Camera, Tag as TagIcon, StickyNote } from 'lucide-react';
import { uploadFile } from '../../api/nekoApi';
import WebApp from '@twa-dev/sdk';

interface TransactionExtrasProps {
  note: string;
  setNote: (n: string) => void;
  tags: string[];
  setTags: (t: string[]) => void;
  photos: string[];
  setPhotos: (p: string[]) => void;
  existingTags: string[]; // For autosuggest
}

export const TransactionExtras: React.FC<TransactionExtrasProps> = ({
  note, setNote, tags, setTags, photos, setPhotos, existingTags
}) => {
  const [activeTab, setActiveTab] = useState<'none' | 'note' | 'tags'>('none');
  const [tagInput, setTagInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const noteInputRef = useRef<HTMLTextAreaElement>(null);
  const tagInputRef = useRef<HTMLInputElement>(null);

  const toggleTab = (tab: 'note' | 'tags') => {
    WebApp.HapticFeedback.impactOccurred('light');
    setActiveTab(activeTab === tab ? 'none' : tab);
  };

  const handlePhotoClick = () => {
    WebApp.HapticFeedback.impactOccurred('light');
    if (photos.length >= 3) {
      WebApp.HapticFeedback.notificationOccurred('warning');
      return;
    }
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      try {
        WebApp.HapticFeedback.notificationOccurred('success');
        const res = await uploadFile(file);
        setPhotos([...photos, res.url]);
      } catch (err) {
        console.error(err);
        WebApp.HapticFeedback.notificationOccurred('error');
      }
    }
    // Reset value to allow selecting same file again
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removePhoto = (index: number) => {
    WebApp.HapticFeedback.impactOccurred('medium');
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const addTag = (tag: string) => {
    const trimmed = tag.trim().replace(/^#/, '');
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setTagInput('');
      WebApp.HapticFeedback.impactOccurred('light');
    }
  };

  const removeTag = (tag: string) => {
    WebApp.HapticFeedback.impactOccurred('light');
    setTags(tags.filter(t => t !== tag));
  };

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      addTag(tagInput);
    }
  };

  useEffect(() => {
    if (activeTab === 'note') noteInputRef.current?.focus();
    if (activeTab === 'tags') tagInputRef.current?.focus();
  }, [activeTab]);

  // Suggested tags filter
  const suggestedTags = existingTags
    .filter(t => t.toLowerCase().includes(tagInput.toLowerCase()) && !tags.includes(t))
    .slice(0, 5);

  const hasContent = note || tags.length > 0 || photos.length > 0;

  return (
    <div className="transaction-extras">
      {/* Mini Indicators if collapsed */}
      {activeTab === 'none' && hasContent && (
        <div className="extras-preview" onClick={() => setActiveTab('note')}>
           {note && <div className="preview-chip note-chip"><StickyNote size={10} /> <span>{note}</span></div>}
           {tags.length > 0 && <div className="preview-chip tag-chip"><Hash size={10} /> <span>{tags.join(', ')}</span></div>}
           {photos.length > 0 && <div className="preview-chip photo-chip"><Image size={10} /> <span>{photos.length}</span></div>}
        </div>
      )}

      {/* Toolbar */}
      <div className="extras-toolbar">
        <button
          className={`extra-btn ${activeTab === 'note' || note ? 'active' : ''}`}
          onClick={() => toggleTab('note')}
        >
          {note ? <StickyNote size={16} /> : <Plus size={16} />}
          <span>Заметка</span>
        </button>
        <div className="separator">•</div>
        <button
          className={`extra-btn ${activeTab === 'tags' || tags.length > 0 ? 'active' : ''}`}
          onClick={() => toggleTab('tags')}
        >
          {tags.length > 0 ? <TagIcon size={16} /> : <Plus size={16} />}
          <span>Теги</span>
        </button>
        <div className="separator">•</div>
        <button
          className={`extra-btn ${photos.length > 0 ? 'active' : ''}`}
          onClick={handlePhotoClick}
        >
          {photos.length > 0 ? <div className="photo-badge">{photos.length}</div> : <Camera size={16} />}
          <span>Фото</span>
        </button>
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: 'none' }}
          accept="image/*"
          onChange={handleFileChange}
        />
      </div>

      {/* Expanded Content */}
      <AnimatePresence>
        {activeTab === 'note' && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="extras-content"
          >
            <textarea
              ref={noteInputRef}
              className="extras-input note-textarea"
              placeholder="Добавить заметку..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={1}
              style={{ minHeight: '38px', height: 'auto' }}
              onInput={(e) => {
                e.currentTarget.style.height = 'auto';
                e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px';
              }}
            />
          </motion.div>
        )}

        {activeTab === 'tags' && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="extras-content"
          >
            <div className="tags-container">
              {tags.map(tag => (
                <span key={tag} className="tag-chip-item">
                  #{tag}
                  <button onClick={() => removeTag(tag)}><X size={12} /></button>
                </span>
              ))}
              <div className="tag-input-wrapper">
                 <Hash size={14} className="tag-hash" />
                 <input
                  ref={tagInputRef}
                  className="extras-input tag-text-input"
                  placeholder="тег..."
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                />
              </div>
            </div>
            {suggestedTags.length > 0 && (
              <div className="tags-suggestions">
                {suggestedTags.map(tag => (
                  <button key={tag} onClick={() => addTag(tag)} className="suggestion-chip">
                    #{tag}
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Photos Preview (Always visible if exists) */}
      {photos.length > 0 && (
        <div className="photos-preview-strip">
          {photos.map((url, i) => (
            <div key={i} className="photo-thumbnail">
              <img src={url} alt="receipt" />
              <button className="remove-photo" onClick={() => removePhoto(i)}><X size={12} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
