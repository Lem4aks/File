import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';
import { FileTag } from '../renderer/types';

const arePathsEquivalent = (path1: string, path2: string): boolean => {
  const normalized1 = path1
    .replace(/\\/g, '/')
    .replace(/\/{2,}/g, '/')
    .toLowerCase();
  const normalized2 = path2
    .replace(/\\/g, '/')
    .replace(/\/{2,}/g, '/')
    .toLowerCase();

  const pathOnly1 = normalized1.replace(/^[a-z]:\//i, '');
  const pathOnly2 = normalized2.replace(/^[a-z]:\//i, '');

  const clean1 = pathOnly1.replace(/\/$/, '');
  const clean2 = pathOnly2.replace(/\/$/, '');

  const fileName1 = normalized1.split('/').pop() || '';
  const fileName2 = normalized2.split('/').pop() || '';

  const parts1 = clean1.split('/').filter(Boolean);
  const parts2 = clean2.split('/').filter(Boolean);

  const lastPart1 = parts1[parts1.length - 1] || '';
  const lastPart2 = parts2[parts2.length - 1] || '';

  console.log(`Сравниваем ${path1} и ${path2}`);
  console.log(`Нормализованные: ${clean1} и ${clean2}`);
  console.log(`Последние части: ${lastPart1} и ${lastPart2}`);

  if (fileName1 === fileName2 && fileName1.includes('.')) {
    console.log(`Совпадение по имени файла: ${fileName1}`);
    return true;
  }

  if (lastPart1 === lastPart2 && lastPart1 && !lastPart1.includes('.')) {
    console.log(`Совпадение по последней части пути: ${lastPart1}`);

    if (clean1.includes(clean2) || clean2.includes(clean1)) {
      console.log('Один путь вложен в другой');
      return true;
    }

    if (parts1.length > 1 && parts2.length > 1) {
      const commonSegments = parts1.filter((part) => parts2.includes(part));
      if (commonSegments.length > 0) {
        console.log(`Найдены общие сегменты: ${commonSegments.join(', ')}`);
        return true;
      }
    }
  }

  const exactMatch = normalized1 === normalized2 || clean1 === clean2;
  if (exactMatch) {
    console.log('Точное совпадение путей');
  }
  return exactMatch;
};

let tagsCache: FileTag[] | null = null;
let isTagsCacheInitialized = false;

const normalizePathForStorage = (inputPath: string): string => {
  return inputPath.replace(/\\\\/g, '\\').replace(/\/{2,}/g, '/');
};

const getTagsFilePath = () => {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'tags.json');
};

const loadTagsFromFile = (): FileTag[] => {
  try {
    const filePath = getTagsFilePath();
    console.log('Loading tags from:', filePath);
    if (!fs.existsSync(filePath)) {
      console.log('Tags file does not exist, creating empty file');
      fs.writeFileSync(filePath, JSON.stringify([], null, 2), 'utf-8');
      return [];
    }

    const tagsData = fs.readFileSync(filePath, 'utf-8');
    console.log('Raw tags data:', tagsData);
    const parsedData = JSON.parse(tagsData);

    if (!Array.isArray(parsedData)) {
      console.error('Tags data is not an array, resetting to empty array');
      fs.writeFileSync(filePath, JSON.stringify([], null, 2), 'utf-8');
      return [];
    }

    console.log('Successfully loaded tags:', parsedData.length);
    return parsedData;
  } catch (error) {
    console.error('Error loading tags:', error);
    try {
      const filePath = getTagsFilePath();
      console.log('Recreating tags file due to error');
      fs.writeFileSync(filePath, JSON.stringify([], null, 2), 'utf-8');
    } catch (writeError) {
      console.error('Error recreating tags file:', writeError);
    }

    return [];
  }
};

export const initTagsCache = (): void => {
  if (!isTagsCacheInitialized) {
    tagsCache = loadTagsFromFile();
    isTagsCacheInitialized = true;
    console.log('Tags cache initialized with', tagsCache.length, 'tags');
  }
};

export const loadTags = (): FileTag[] => {
  if (!isTagsCacheInitialized) {
    initTagsCache();
  }

  if (!tagsCache) {
    const loadedTags = loadTagsFromFile();
    loadedTags.forEach((tag: FileTag) => {
      tag.paths = tag.paths.map((p: string) => normalizePathForStorage(p));
    });
    tagsCache = loadedTags;
  }

  return tagsCache || [];
};

export const refreshTagsCache = (): FileTag[] => {
  isTagsCacheInitialized = false;
  tagsCache = null;
  return loadTags();
};

export const saveTags = (tags: FileTag[]): boolean => {
  try {
    const filePath = getTagsFilePath();

    const tagsToSave = JSON.parse(JSON.stringify(tags));

    tagsToSave.forEach((tag: FileTag) => {
      tag.paths = tag.paths.map((p: string) => normalizePathForStorage(p));
    });

    fs.writeFileSync(filePath, JSON.stringify(tagsToSave, null, 2), 'utf-8');

    tagsCache = [...tags];
    isTagsCacheInitialized = true;
    return true;
  } catch (error) {
    console.error('Error saving tags:', error);
    return false;
  }
};

export const addTag = (tag: FileTag): FileTag | null => {
  try {
    const tags = loadTags();
    if (!Array.isArray(tags)) {
      console.error('Error in addTag: tags is not an array', typeof tags);
      return null;
    }
    console.log('Adding new tag:', tag.name);
    tags.push(tag);
    saveTags(tags); // Это также обновит кэш
    return tag;
  } catch (error) {
    console.error('Error adding tag:', error);
    return null;
  }
};

export const updateTag = (updatedTag: FileTag): FileTag | null => {
  try {
    const tags = loadTags();
    const tagIndex = tags.findIndex((tag) => tag.id === updatedTag.id);

    if (tagIndex !== -1) {
      tags[tagIndex] = updatedTag;
      saveTags(tags);
      return updatedTag;
    }

    return null;
  } catch (error) {
    console.error('Error updating tag:', error);
    return null;
  }
};

export const removeTag = (tagId: string): boolean => {
  try {
    const tags = loadTags();
    const filteredTags = tags.filter((tag) => tag.id !== tagId);

    if (filteredTags.length !== tags.length) {
      saveTags(filteredTags);
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error removing tag:', error);
    return false;
  }
};

export const getTagsForPath = (targetPath: string): FileTag[] => {
  try {
    const tags = loadTags();
    return tags.filter((tag: FileTag) =>
      tag.paths.some((p: string) => {
        const exactMatch = arePathsEquivalent(p, targetPath);

        const normalizedP = p.replace(/\\/g, '/').toLowerCase();
        const normalizedTarget = targetPath.replace(/\\/g, '/').toLowerCase();
        const isSubdirectory = normalizedTarget.startsWith(`${normalizedP}/`);

        return exactMatch || isSubdirectory;
      }),
    );
  } catch (error) {
    console.error('Error getting tags for path:', error);
    return [];
  }
};

export const addPathToTag = (
  tagId: string,
  targetPath: string,
): FileTag | null => {
  try {
    const normalizedPath = normalizePathForStorage(targetPath);
    console.log(`Нормализованный путь для сохранения: ${normalizedPath}`);

    const tags = loadTags();
    const tagIndex = tags.findIndex((tag) => tag.id === tagId);

    if (tagIndex !== -1) {
      const pathExists = tags[tagIndex].paths.some((existingPath) =>
        arePathsEquivalent(existingPath, normalizedPath),
      );

      if (!pathExists) {
        tags[tagIndex].paths.push(normalizedPath);
        saveTags(tags);
      }

      return tags[tagIndex];
    }

    return null;
  } catch (error) {
    console.error('Error adding path to tag:', error);
    return null;
  }
};

export const removePathFromTag = (
  tagId: string,
  pathToRemove: string,
): FileTag | null => {
  try {
    const normalizedPath = normalizePathForStorage(pathToRemove);
    console.log(`Нормализованный путь для удаления: ${normalizedPath}`);

    const tags = loadTags();
    const tagIndex = tags.findIndex((tag) => tag.id === tagId);

    if (tagIndex !== -1) {
      console.log(`Удаляем путь ${normalizedPath} из тега ${tagId}`);
      const beforeCount = tags[tagIndex].paths.length;
      tags[tagIndex].paths = tags[tagIndex].paths.filter(
        (existingPath: string) => {
          const isEquivalent = !arePathsEquivalent(
            existingPath,
            normalizedPath,
          );
          if (!isEquivalent) {
            console.log(
              `Найдено совпадение: ${existingPath} совпадает с ${normalizedPath}`,
            );
          }
          return isEquivalent;
        },
      );

      const afterCount = tags[tagIndex].paths.length;
      console.log(`Удалено ${beforeCount - afterCount} путей`);

      saveTags(tags);
      return tags[tagIndex];
    }

    return null;
  } catch (error) {
    console.error('Error removing path from tag:', error);
    return null;
  }
};
