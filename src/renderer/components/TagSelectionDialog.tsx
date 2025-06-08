import React, { useState, useEffect } from 'react';
import { Button } from '@blueprintjs/core';
import { FileTag } from '../types';
import * as tagService from '../services/tagService';

interface TagSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyTag: (tag: FileTag) => void;
  onCreateNewTag: () => void;
  selectedFilePaths: string[];
}

// Helper function to get filename from a path (works for both Windows and Linux paths)
const getFilenameFromPath = (filePath: string): string => {
  // Handle Windows paths
  if (filePath.includes('\\')) {
    const parts = filePath.split('\\');
    return parts[parts.length - 1];
  }
  // Handle Linux/Unix paths
  const parts = filePath.split('/');
  return parts[parts.length - 1];
};

const TagSelectionDialog: React.FC<TagSelectionDialogProps> = ({
  isOpen,
  onClose,
  onApplyTag,
  onCreateNewTag,
  selectedFilePaths,
}) => {
  const [tags, setTags] = useState<FileTag[]>([]);
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  // Load available tags when the dialog opens
  useEffect(() => {
    if (isOpen) {
      loadAvailableTags();
    }
  }, [isOpen]);

  const loadAvailableTags = async () => {
    setIsLoading(true);
    setError('');
    try {
      const availableTags = await tagService.loadTags();
      setTags(availableTags);
      setSelectedTagId(null);
    } catch (err) {
      console.error('Error loading tags:', err);
      setError('Ошибка загрузки тегов');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyTag = () => {
    if (!selectedTagId) {
      setError('Выберите тег');
      return;
    }

    const selectedTag = tags.find(tag => tag.id === selectedTagId);
    if (selectedTag) {
      onApplyTag(selectedTag);
    }
  };

  const handleCreateNewTag = () => {
    // Use the provided callback to handle creating a new tag
    onCreateNewTag();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-dialog tag-selection-dialog">
        <h3>Выбрать тег для файлов</h3>
        {selectedFilePaths && selectedFilePaths.length > 0 && (
          <div className="selected-file-info">
            <strong>Файлы ({selectedFilePaths.length}): </strong>
            <span className="file-path">
              {selectedFilePaths.length === 1 
                ? getFilenameFromPath(selectedFilePaths[0])
                : `Выбрано ${selectedFilePaths.length} файл(ов)`}
            </span>
          </div>
        )}
        
        {error && <div className="error-message">{error}</div>}
        
        <div className="dialog-content">
          {isLoading ? (
            <div className="loading-message">Загрузка тегов...</div>
          ) : tags.length === 0 ? (
            <div className="empty-message">Нет доступных тегов</div>
          ) : (
            <div className="tags-list">
              {tags.map(tag => (
                <div 
                  key={tag.id}
                  className={`tag-item ${selectedTagId === tag.id ? 'selected' : ''}`}
                  onClick={() => setSelectedTagId(tag.id)}
                >
                  <span 
                    className="tag-color" 
                    style={{ backgroundColor: tag.color }} 
                  />
                  <span className="tag-name">{tag.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="dialog-buttons">
          <Button onClick={onClose}>Отмена</Button>
          <Button onClick={handleCreateNewTag}>Создать новый тег</Button>
          <Button 
            intent="primary" 
            onClick={handleApplyTag}
            disabled={!selectedTagId || isLoading}
          >
            Применить тег
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TagSelectionDialog;
