import React, { useState, useRef, useEffect } from 'react';
import { Plus, Hash, X, Camera, Tag as TagIcon, StickyNote } from 'lucide-react';
import { Modal } from '../Modal';
import WebApp from '@twa-dev/sdk';

interface TransactionExtrasProps {
  note: string;
  setNote: (n: string) => void;
  tags: string[];
  setTags: (t: string[]) => void;
  photos: string[];
  setPhotos: (p: string[]) => void;
  existingTags: string[]; // For autosuggest
  showPhotosPreview?: boolean;
  pendingFiles?: File[];
  setPendingFiles?: (f: File[]) => void;
  pendingPreviews?: string[];
  setPendingPreviews?: (p: string[]) => void;
}

export const TransactionExtras: React.FC<TransactionExtrasProps> = ({
  note, setNote, tags, setTags, photos, setPhotos, existingTags,
  showPhotosPreview = true,
  pendingFiles = [], setPendingFiles = () => {}, pendingPreviews = [], setPendingPreviews = () => {}
}) => {
  const [activeModal, setActiveModal] = useState<'none' | 'note' | 'tags' | 'photos'>('none');
  const [tagInput, setTagInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const noteInputRef = useRef<HTMLTextAreaElement>(null);
  const tagInputRef = useRef<HTMLInputElement>(null);
  const [replaceTarget, setReplaceTarget] = useState<null | { kind: 'pending' | 'uploaded', index: number }>(null);

  const openModal = (modal: 'note' | 'tags' | 'photos') => {
    WebApp.HapticFeedback.impactOccurred('light');
    setActiveModal(modal);
  };

  const handlePhotoClick = () => {
    WebApp.HapticFeedback.impactOccurred('light');
    const totalCount = photos.length + pendingPreviews.length;
    if (totalCount === 0) {
      // no photos yet -> open file picker
      fileInputRef.current?.click();
      return;
    }
    // if there are photos (uploaded or pending) open photos modal
    openModal('photos');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const totalCount = photos.length + pendingPreviews.length;
      if (totalCount >= 2) {
        WebApp.HapticFeedback.notificationOccurred('warning');
      } else if (replaceTarget) {
        // Replacement flow
        try {
          WebApp.HapticFeedback.notificationOccurred('success');
          if (replaceTarget.kind === 'pending') {
            const idx = replaceTarget.index;
            const newFiles = [...pendingFiles];
            const newPreviews = [...pendingPreviews];
            // revoke old preview
            if (newPreviews[idx]) URL.revokeObjectURL(newPreviews[idx]);
            newFiles[idx] = file;
            const preview = URL.createObjectURL(file);
            newPreviews[idx] = preview;
            setPendingFiles(newFiles);
            setPendingPreviews(newPreviews);
          } else if (replaceTarget.kind === 'uploaded') {
            const idx = replaceTarget.index;
            // remove uploaded URL and add new pending file instead
            const newPhotos = photos.filter((_, i) => i !== idx);
            setPhotos(newPhotos);
            setPendingFiles([...pendingFiles, file]);
            const preview = URL.createObjectURL(file);
            setPendingPreviews([...pendingPreviews, preview]);
          }
        } catch (err) {
          console.error(err);
          WebApp.HapticFeedback.notificationOccurred('error');
        } finally {
          setReplaceTarget(null);
        }
      } else {
        // Do NOT upload immediately. Store pending file and add preview.
        try {
          WebApp.HapticFeedback.notificationOccurred('success');
          setPendingFiles([...pendingFiles, file]);
          const preview = URL.createObjectURL(file);
          setPendingPreviews([...pendingPreviews, preview]);
        } catch (err) {
          console.error(err);
          WebApp.HapticFeedback.notificationOccurred('error');
        }
      }
    }
    // Reset value to allow selecting same file again
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removePhoto = (index: number) => {
    WebApp.HapticFeedback.impactOccurred('medium');
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const removePendingFile = (index: number) => {
    WebApp.HapticFeedback.impactOccurred('medium');
    const newFiles = pendingFiles.filter((_, i) => i !== index);
    const newPreviews = pendingPreviews.filter((_, i) => i !== index);
    // revoke object URL
    if (pendingPreviews[index]) URL.revokeObjectURL(pendingPreviews[index]);
    setPendingFiles(newFiles);
    setPendingPreviews(newPreviews);
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
    if (activeModal === 'note') noteInputRef.current?.focus();
    if (activeModal === 'tags') tagInputRef.current?.focus();
  }, [activeModal]);

  // Suggested tags filter
  const suggestedTags = existingTags
    .filter(t => t.toLowerCase().includes(tagInput.toLowerCase()) && !tags.includes(t))
    .slice(0, 5);

  return (
    <div className="transaction-extras">
      {/* Top collapsed preview removed (to save space) */}

      {/* Toolbar */}
      <div className="extras-toolbar">
        <button 
          className={`extra-btn ${activeModal === 'note' || note ? 'active' : ''}`}
          onClick={() => openModal('note')}
        >
          {note ? <StickyNote size={16} /> : <Plus size={16} />} 
          <span>Заметка</span>
        </button>
        <div className="separator">•</div>
        <button 
          className={`extra-btn ${activeModal === 'tags' || tags.length > 0 ? 'active' : ''}`}
          onClick={() => openModal('tags')}
        >
          {tags.length > 0 ? <TagIcon size={16} /> : <Plus size={16} />} 
          <span>Теги</span>
        </button>
        <div className="separator">•</div>
        <button 
          className={`extra-btn ${(photos.length > 0 || pendingPreviews.length > 0) ? 'active' : ''}`}
          onClick={handlePhotoClick}
        >
          {(photos.length > 0 || pendingPreviews.length > 0) ? <div className="photo-badge">{photos.length + pendingPreviews.length}</div> : <Camera size={16} />}
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
      {/* Modals for note, tags and photos */}
      <Modal variant="center" isOpen={activeModal === 'note'} onClose={() => setActiveModal('none')} title="Заметка">
        <div style={{ padding: 12 }}>
          <textarea
            ref={noteInputRef}
            className="extras-input note-textarea"
            placeholder="Добавить заметку..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={4}
            style={{ width: '100%', minHeight: 120, resize: 'vertical' }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
            <button className="btn" onClick={() => setActiveModal('none')}>Готово</button>
          </div>
        </div>
      </Modal>

      <Modal variant="center" isOpen={activeModal === 'tags'} onClose={() => setActiveModal('none')} title="Теги">
        <div style={{ padding: 12 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {tags.map(tag => (
              <span key={tag} className="tag-chip-item">
                #{tag}
                <button onClick={() => removeTag(tag)}><X size={12} /></button>
              </span>
            ))}
          </div>
          <div className="tag-input-wrapper" style={{ marginTop: 12 }}>
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
          {suggestedTags.length > 0 && (
            <div className="tags-suggestions" style={{ marginTop: 8 }}>
              {suggestedTags.map(tag => (
                <button key={tag} onClick={() => addTag(tag)} className="suggestion-chip">
                  #{tag}
                </button>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
            <button className="btn" onClick={() => { if (tagInput.trim()) addTag(tagInput); setActiveModal('none'); }}>Готово</button>
          </div>
        </div>
      </Modal>

      {/* photos handled inline via file input and preview strip */}

      <Modal variant="center" isOpen={activeModal === 'photos'} onClose={() => setActiveModal('none')} title="Фото">
        <div style={{ padding: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>Максимум 2 фото. Нажмите "Добавить фото" чтобы прикрепить.</div>
            {pendingPreviews.map((url, i) => (
              <div key={`modal-pending-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <img src={url} style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8 }} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn" onClick={() => removePendingFile(i)}>Удалить</button>
                  <button className="btn" onClick={() => { setReplaceTarget({ kind: 'pending', index: i }); setActiveModal('none'); fileInputRef.current?.click(); }}>Заменить</button>
                </div>
              </div>
            ))}

            {photos.map((url, i) => (
              <div key={`modal-uploaded-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <img src={url} style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8 }} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn" onClick={() => removePhoto(i)}>Удалить</button>
                  <button className="btn" onClick={() => { setReplaceTarget({ kind: 'uploaded', index: i }); setActiveModal('none'); fileInputRef.current?.click(); }}>Заменить</button>
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
            {(photos.length + pendingPreviews.length) < 2 && (
              <button className="btn" onClick={() => { setReplaceTarget(null); setActiveModal('none'); fileInputRef.current?.click(); }}>Добавить фото</button>
            )}
            <button className="btn" onClick={() => setActiveModal('none')}>Готово</button>
          </div>
        </div>
      </Modal>

      {/* Photos Preview (visible if enabled) */}
      {showPhotosPreview && (
        <div className="photos-preview-strip">
          {pendingPreviews.map((url, i) => (
            <div key={`pending-${i}`} className="photo-thumbnail">
              <img src={url} alt="pending" />
              <button className="remove-photo" onClick={() => removePendingFile(i)}><X size={12} /></button>
            </div>
          ))}

          {photos.map((url, i) => (
            <div key={`uploaded-${i}`} className="photo-thumbnail">
              <img src={url} alt="receipt" />
              <button className="remove-photo" onClick={() => removePhoto(i)}><X size={12} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
