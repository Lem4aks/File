import React, { useState, useEffect } from 'react';
import { Icon, Button } from '@blueprintjs/core';
import { IconNames } from '@blueprintjs/icons';
import { Shortcut, FileTag } from '../types';
import * as tagService from '../services/tagService';
import TagDialog from './TagDialog';

import type { DiskInfo } from '../services/fileService';

interface SidebarProps {
  shortcuts: Shortcut[];
  availableDisks: string[] | DiskInfo[];
  activePath: string;
  isDarkTheme: boolean;
  hoveredShortcutIndex: number | null;
  hoveredDiskIndex: number | null;
  onShortcutClick: (path: string) => void;
  onDiskSelect: (disk: string) => void;
  setHoveredShortcutIndex: (index: number | null) => void;
  setHoveredDiskIndex: (index: number | null) => void;
  getIconForShortcut: (name: string) => any;
  onTagClick?: (tag: FileTag) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  shortcuts,
  availableDisks,
  activePath,
  isDarkTheme,
  hoveredShortcutIndex,
  hoveredDiskIndex,
  onShortcutClick,
  onDiskSelect,
  setHoveredShortcutIndex,
  setHoveredDiskIndex,
  getIconForShortcut,
  onTagClick,
}) => {
  const [tags, setTags] = useState<FileTag[]>([]);
  const [hoveredTagIndex, setHoveredTagIndex] = useState<number | null>(null);
  const [isTagsLoading, setIsTagsLoading] = useState<boolean>(true);
  const [isTagDialogOpen, setIsTagDialogOpen] = useState<boolean>(false);
  const [tagToEdit, setTagToEdit] = useState<FileTag | undefined>(undefined);
  const fetchTags = async () => {
    setIsTagsLoading(true);
    try {
      const loadedTags = await tagService.loadTags();
      setTags(loadedTags);
    } catch (error) {
      console.error('Error loading tags:', error);
    } finally {
      setIsTagsLoading(false);
    }
  };
  
  useEffect(() => {
    fetchTags();
    
    const tagsUpdatedHandler = () => {
      fetchTags();
    };
    
    window.electron.ipcRenderer.on(
      'tags-updated',
      tagsUpdatedHandler,
    );
    return () => {
      window.electron.ipcRenderer.removeListener('tags-updated', tagsUpdatedHandler);
    };
  }, []);
  
  const handleTagSave = async (tag: FileTag) => {
    try {
      if (tagToEdit) {
        const updatedTag = await tagService.updateTag(tag);
        setTags(prevTags => {
          const tagsArray = Array.isArray(prevTags) ? prevTags : [];
          return tagsArray.map(t => t.id === updatedTag.id ? updatedTag : t);
        });
      } else {
        const newTag = await tagService.addTag(tag);
        setTags(prevTags => {
          const tagsArray = Array.isArray(prevTags) ? prevTags : [];
          return [...tagsArray, newTag];
        });
      }
    } catch (error) {
      console.error('Error saving tag:', error);
    }
  };
  
  // Open dialog to create or edit tag
  const openTagDialog = (tag?: FileTag) => {
    setTagToEdit(tag);
    setIsTagDialogOpen(true);
  };
  
  // Close dialog
  const closeTagDialog = () => {
    setIsTagDialogOpen(false);
    setTagToEdit(undefined);
  };
  // Function to handle tag click
  const handleTagClick = (tag: FileTag | null) => {
    if (!tag) {
      if (onTagClick) onTagClick(null);
      return;
    }
    if (onTagClick) onTagClick(tag);
  };


  // Function to handle tag deletion
  const handleDeleteTag = async (tag: FileTag) => {
    if (!tag?.id) return;
    if (window.confirm(`Are you sure you want to delete the tag "${tag.name}"?`)) {
      try {
        await tagService.removeTag(tag.id);
        fetchTags();
        if (onTagClick) onTagClick(null); // Deselect if deleted
      } catch (error) {
        console.error('Error deleting tag:', error);
      }
    }
  };


  return (
    <div className="left">
      <ul>
        <li>Short</li>
        {shortcuts.map((shortcut, index) => {
          const normalizedActivePath = activePath.replace(/\\+$/, '');
          const normalizedShortcutPath = shortcut.path.replace(/\\+$/, '');
          return (
            <li
              key={index}
              className={`quick-access-item ${
                normalizedActivePath === normalizedShortcutPath
                  ? 'active'
                  : ''
              } ${hoveredShortcutIndex === index ? 'hovered' : ''}`}
              onClick={() => onShortcutClick(shortcut.path)}
              onMouseEnter={() => setHoveredShortcutIndex(index)}
              onMouseLeave={() => setHoveredShortcutIndex(null)}
              style={{
                display:'flex'
              }}
            >
              <Icon
                icon={getIconForShortcut(shortcut.name)}
                style={{ marginRight: '8px' }}
                color={isDarkTheme ? '#d9dde0' : undefined}
              />
              {shortcut.name}
            </li>
          );
        })}
        <li>Disk</li>
        {availableDisks.length > 0 ? (
          (availableDisks as (string | DiskInfo)[]).map((disk, index) => {
            let display;
            let value;
            if (typeof disk === 'string') {
              display = disk;
              value = disk;
            } else {
              display = disk.device;
              value = disk.mount;
            }
            return (
              <li
                key={display}
                className={`disk-item ${hoveredDiskIndex === index ? 'hovered' : ''}`}
                onClick={() => onDiskSelect(value)}
                onMouseEnter={() => setHoveredDiskIndex(index)}
                onMouseLeave={() => setHoveredDiskIndex(null)}
                style={{
                  display:'flex'
                }}
              >
                <Icon
                  icon={IconNames.INBOX}
                  color={isDarkTheme ? '#d9dde0' : undefined}
                  style={{ marginRight: '6px' }}
                />
                {display}
              </li>
            );
          })
        ) : (
          <p>No drives found</p>
        )}
        <li className="section-header">
          <span>Tags</span>
          <Button
            minimal
            small
            icon={IconNames.PLUS}
            onClick={() => openTagDialog()}
            title="Add new tag"
          />
        </li>
        {isTagsLoading ? (
          <li>Loading tags...</li>
        ) : tags.length > 0 ? (
          tags.filter(tag => tag !== null).map((tag, index) => (
            <li
              key={tag?.id || index}
              className={`tag-item ${hoveredTagIndex === index ? 'hovered' : ''}`}
              onClick={() => handleTagClick(tag)}
              onMouseEnter={() => setHoveredTagIndex(index)}
              onMouseLeave={() => setHoveredTagIndex(null)}
            >
              <div
                className="tag-color"
                style={{ backgroundColor: tag?.color || '#cccccc' }}
              />
              <span className="tag-name">{tag?.name || 'Unnamed tag'}</span>
              <span className="tag-count">{tag?.paths?.length || 0}</span>
              <button
                className="delete-tag-btn"
                title="Delete tag"
                onClick={e => {
                  e.stopPropagation();
                  handleDeleteTag(tag);
                }}
                style={{ marginLeft: 6, background: 'none', border: 'none', cursor: 'pointer', color: '#c00', display: 'inline-flex', alignItems: 'center' }}
                aria-label="Delete tag"
              >
                {IconNames && IconNames.TRASH ? (
                  <Icon icon={IconNames.TRASH} iconSize={14} />
                ) : (
                  <span role="img" aria-label="Delete">🗑️</span>
                )}
              </button>
            </li>
          ))
        ) : (
          <li className="empty-item">No tags created</li>
        )}
      </ul>
      
      <TagDialog
        isOpen={isTagDialogOpen}
        onClose={closeTagDialog}
        onSave={handleTagSave}
        tag={tagToEdit}
      />
    </div>
  );
};

export default Sidebar;
