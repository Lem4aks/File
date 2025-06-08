import React, { useState } from 'react';
import { Button, FormGroup, InputGroup } from '@blueprintjs/core';
import { FileTag } from '../types';
import * as tagService from '../services/tagService';

interface TagDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (tag: FileTag) => void;
  tag?: FileTag;
}

const TagDialog: React.FC<TagDialogProps> = ({
  isOpen,
  onClose,
  onSave,
  tag,
}) => {
  const [name, setName] = useState(tag?.name || '');
  const [color, setColor] = useState(tag?.color || '#FF6B6B');
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Название тега не может быть пустым');
      return;
    }

    try {
      const newTag = tag
        ? { ...tag, name, color }
        : tagService.createTag(name, color);
      
      onSave(newTag);
      resetForm();
      onClose();
    } catch (err) {
      console.error('Error saving tag:', err);
      setError('Произошла ошибка при сохранении тега');
    }
  };

  const resetForm = () => {
    setName('');
    setColor('#FF6B6B');
    setError('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-dialog tag-dialog">
        <h3>{tag ? 'Редактировать тег' : 'Создать новый тег'}</h3>
        {error && <div className="error-message">{error}</div>}
        <div className="dialog-content">
          <FormGroup label="Название" labelFor="tag-name">
            <InputGroup
              id="tag-name"
              placeholder="Введите название тега"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </FormGroup>
          
          <FormGroup label="Цвет" labelFor="tag-color">
            <div className="color-picker-container">
              <input
                type="color"
                id="tag-color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="color-input"
              />
              <span
                className="color-preview"
                style={{ backgroundColor: color }}
              />
              <span className="color-value">{color}</span>
            </div>
          </FormGroup>
        </div>
        <div className="dialog-buttons">
          <Button onClick={handleClose}>Отмена</Button>
          <Button intent="primary" onClick={handleSave}>
            {tag ? 'Сохранить' : 'Создать'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TagDialog;
