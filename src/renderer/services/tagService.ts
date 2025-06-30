import { FileTag } from '../types';
import { v4 as uuidv4 } from 'uuid';

// IPC channel for working with tags
export const TAG_CHANNEL = {
  LOAD_TAGS: 'load-tags',
  SAVE_TAGS: 'save-tags',
  ADD_TAG: 'add-tag',
  REMOVE_TAG: 'remove-tag',
  UPDATE_TAG: 'update-tag',
  GET_FILE_TAGS: 'get-file-tags',
  ADD_PATH_TO_TAG: 'add-path-to-tag',
  REMOVE_PATH_FROM_TAG: 'remove-path-from-tag',
};

// Function to create a new tag
export const createTag = (
  name: string,
  color: string,
  targetType: 'file' | 'folder' | 'both' = 'both',
  paths: string[] = []
): FileTag => {
  return {
    id: uuidv4(),
    name,
    color,
    targetType,
    paths,
  };
};

// Load tags using IPC
export const loadTags = async (): Promise<FileTag[]> => {
  try {
    return await window.electron.ipcRenderer.invoke(TAG_CHANNEL.LOAD_TAGS);
  } catch (error) {
    console.error('Error loading tags:', error);
    return [];
  }
};

// Save tags using IPC
export const saveTags = async (tags: FileTag[]): Promise<void> => {
  try {
    await window.electron.ipcRenderer.invoke(TAG_CHANNEL.SAVE_TAGS, tags);
  } catch (error) {
    console.error('Error saving tags:', error);
  }
};

// Add a new tag
export const addTag = async (tag: FileTag): Promise<FileTag> => {
  try {
    return await window.electron.ipcRenderer.invoke(TAG_CHANNEL.ADD_TAG, tag);
  } catch (error) {
    console.error('Error adding tag:', error);
    throw error;
  }
};

// Update an existing tag
export const updateTag = async (tag: FileTag): Promise<FileTag> => {
  try {
    return await window.electron.ipcRenderer.invoke(TAG_CHANNEL.UPDATE_TAG, tag);
  } catch (error) {
    console.error('Error updating tag:', error);
    throw error;
  }
};

// Remove a tag
export const removeTag = async (tagId: string): Promise<void> => {
  try {
    await window.electron.ipcRenderer.invoke(TAG_CHANNEL.REMOVE_TAG, tagId);
  } catch (error) {
    console.error('Error removing tag:', error);
    throw error;
  }
};

// Get tags for a specific file or folder
export const getTagsForPath = async (path: string): Promise<FileTag[]> => {
  try {
    return await window.electron.ipcRenderer.invoke(TAG_CHANNEL.GET_FILE_TAGS, path);
  } catch (error) {
    console.error('Error getting tags for path:', error);
    return [];
  }
};

// Add path to tag
export const addPathToTag = async (tagId: string, path: string): Promise<FileTag> => {
  try {
    return await window.electron.ipcRenderer.invoke(TAG_CHANNEL.ADD_PATH_TO_TAG, { tagId, path });
  } catch (error) {
    console.error('Error adding path to tag:', error);
    throw error;
  }
};

// Remove path from tag
export const removePathFromTag = async (tagId: string, path: string): Promise<FileTag> => {
  try {
    return await window.electron.ipcRenderer.invoke(TAG_CHANNEL.REMOVE_PATH_FROM_TAG, { tagId, path });
  } catch (error) {
    console.error('Error removing path from tag:', error);
    throw error;
  }
};
