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

const getFilenameFromPath = (filePath: string): string => {
  if (filePath.includes('\\')) {
    const parts = filePath.split('\\');
    return parts[parts.length - 1];
  }

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
      setError('Error loading tags');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyTag = () => {
    if (!selectedTagId) {
      setError('Select a tag');
      return;
    }

    const selectedTag = tags.find(tag => tag.id === selectedTagId);
    if (selectedTag) {
      onApplyTag(selectedTag);
    }
  };

  const handleCreateNewTag = () => {
    onCreateNewTag();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-dialog tag-selection-dialog">
        <h3>Select a tag for files</h3>
        {selectedFilePaths && selectedFilePaths.length > 0 && (
          <div className="selected-file-info">
            <strong>Files ({selectedFilePaths.length}): </strong>
            <span className="file-path">
              {selectedFilePaths.length === 1 
                ? getFilenameFromPath(selectedFilePaths[0])
                : `${selectedFilePaths.length} file(s) selected`} 
            </span>
          </div>
        )}
        
        {error && <div className="error-message">{error}</div>}
        
        <div className="dialog-content">
          {isLoading ? (
            <div className="loading-message">Loading tags...</div>
          ) : tags.length === 0 ? (
            <div className="empty-message">No available tags</div>
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
          <Button onClick={onClose}>Cancel</Button>
          <Button onClick={handleCreateNewTag}>Create new tag</Button>
          <Button 
            intent="primary" 
            onClick={handleApplyTag}
            disabled={!selectedTagId || isLoading}
          >
            Apply tag
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TagSelectionDialog;
