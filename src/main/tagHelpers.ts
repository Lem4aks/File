import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';
import { FileTag } from '../renderer/types';

// Функция для интеллектуального сравнения путей
// Обрабатывает разные форматы путей, учитывает буквы дисков
const arePathsEquivalent = (path1: string, path2: string): boolean => {
  const normalized1 = path1
    .replace(/\\/g, '/')
    .replace(/\/{2,}/g, '/')
    .toLowerCase();
  const normalized2 = path2
    .replace(/\\/g, '/')
    .replace(/\/{2,}/g, '/')
    .toLowerCase();
  
  // Удаляем букву диска и двоеточие, чтобы сравнивать только пути
  const pathOnly1 = normalized1.replace(/^[a-z]:\//i, '');
  const pathOnly2 = normalized2.replace(/^[a-z]:\//i, '');
  
  // Удаляем завершающие слеши для сравнения путей
  const clean1 = pathOnly1.replace(/\/$/, '');
  const clean2 = pathOnly2.replace(/\/$/, '');
  
  // Файлы с тем же именем
  const fileName1 = normalized1.split('/').pop() || '';
  const fileName2 = normalized2.split('/').pop() || '';
  
  // Разбиваем пути на части для сравнения директорий
  const parts1 = clean1.split('/').filter(Boolean);
  const parts2 = clean2.split('/').filter(Boolean);
  
  // Проверяем совпадение последнего элемента пути
  const lastPart1 = parts1[parts1.length - 1] || '';
  const lastPart2 = parts2[parts2.length - 1] || '';
  
  console.log(`Сравниваем ${path1} и ${path2}`);
  console.log(`Нормализованные: ${clean1} и ${clean2}`);
  console.log(`Последние части: ${lastPart1} и ${lastPart2}`);
  
  // Если имена файлов совпадают и это не директории, то рассматриваем их как совпадающие
  if (fileName1 === fileName2 && fileName1.includes('.')) {
    console.log(`Совпадение по имени файла: ${fileName1}`);
    return true;
  }
  
  // Если последние элементы пути совпадают (для директорий)
  if (lastPart1 === lastPart2 && lastPart1 && !lastPart1.includes('.')) {
    console.log(`Совпадение по последней части пути: ${lastPart1}`);
    
    // Проверяем, есть ли один путь внутри другого
    if (clean1.includes(clean2) || clean2.includes(clean1)) {
      console.log('Один путь вложен в другой');
      return true;
    }
    
    // Если части пути имеют больше одного элемента, ищем общие части
    if (parts1.length > 1 && parts2.length > 1) {
      const commonSegments = parts1.filter((part) => parts2.includes(part));
      if (commonSegments.length > 0) {
        console.log(`Найдены общие сегменты: ${commonSegments.join(', ')}`);
        return true;
      }
    }
  }
  
  // Точное совпадение полного пути
  const exactMatch = normalized1 === normalized2 || clean1 === clean2;
  if (exactMatch) {
    console.log('Точное совпадение путей');
  }
  return exactMatch;
};

// In-memory cache for tags
let tagsCache: FileTag[] | null = null;
let isTagsCacheInitialized = false;

// Нормализация пути для хранения
const normalizePathForStorage = (inputPath: string): string => {
  return inputPath.replace(/\\\\/g, '\\').replace(/\/{2,}/g, '/');
};

// Путь к файлу с тегами
const getTagsFilePath = () => {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'tags.json');
};

// Загрузка тегов из файла
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

// Инициализация кэша тегов
export const initTagsCache = (): void => {
  if (!isTagsCacheInitialized) {
    tagsCache = loadTagsFromFile();
    isTagsCacheInitialized = true;
    console.log('Tags cache initialized with', tagsCache.length, 'tags');
  }
};

// Получение тегов (из кэша или загрузка при первом обращении)
export const loadTags = (): FileTag[] => {
  if (!isTagsCacheInitialized) {
    initTagsCache();
  }
  
  // Если кэш еще не инициализирован, загрузим теги из файла
  if (!tagsCache) {
    const loadedTags = loadTagsFromFile();
    // Нормализуем пути в тегах после загрузки
    loadedTags.forEach((tag: FileTag) => {
      tag.paths = tag.paths.map((p: string) => normalizePathForStorage(p));
    });
    tagsCache = loadedTags;
  }
  
  return tagsCache || [];
};

// Принудительное обновление кэша (может использоваться, если файл тегов изменился извне)
export const refreshTagsCache = (): FileTag[] => {
  isTagsCacheInitialized = false;
  tagsCache = null;
  return loadTags();
};

// Сохранение тегов в файл и обновление кэша
export const saveTags = (tags: FileTag[]): boolean => {
  try {
    const filePath = getTagsFilePath();
    
    // Создаем копию тегов для сериализации
    const tagsToSave = JSON.parse(JSON.stringify(tags));
    
    // Нормализуем пути в тегах перед сохранением
    tagsToSave.forEach((tag: FileTag) => {
      tag.paths = tag.paths.map((p: string) => normalizePathForStorage(p));
    });
    
    // Записываем в файл
    fs.writeFileSync(filePath, JSON.stringify(tagsToSave, null, 2), 'utf-8');
    
    // Обновляем кэш
    tagsCache = [...tags];
    isTagsCacheInitialized = true;
    return true;
  } catch (error) {
    console.error('Error saving tags:', error);
    return false;
  }
};

// Добавление нового тега
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

// Обновление существующего тега
export const updateTag = (updatedTag: FileTag): FileTag | null => {
  try {
    const tags = loadTags();
    const tagIndex = tags.findIndex((tag) => tag.id === updatedTag.id);
    
    if (tagIndex !== -1) {
      tags[tagIndex] = updatedTag;
      saveTags(tags); // Это также обновит кэш
      return updatedTag;
    }
    
    return null;
  } catch (error) {
    console.error('Error updating tag:', error);
    return null;
  }
};

// Удаление тега
export const removeTag = (tagId: string): boolean => {
  try {
    const tags = loadTags();
    const filteredTags = tags.filter((tag) => tag.id !== tagId);
    
    if (filteredTags.length !== tags.length) {
      saveTags(filteredTags); // Это также обновит кэш
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error removing tag:', error);
    return false;
  }
};

// Получение тегов для указанного пути
export const getTagsForPath = (targetPath: string): FileTag[] => {
  try {
    const tags = loadTags();
    return tags.filter((tag: FileTag) => 
      tag.paths.some((p: string) => {
        const exactMatch = arePathsEquivalent(p, targetPath);
        
        const normalizedP = p
          .replace(/\\/g, '/')
          .toLowerCase();
        const normalizedTarget = targetPath
          .replace(/\\/g, '/')
          .toLowerCase();
        const isSubdirectory = normalizedTarget.startsWith(normalizedP + '/');
        
        return exactMatch || isSubdirectory;
      }),
    );
  } catch (error) {
    console.error('Error getting tags for path:', error);
    return [];
  }
};

// Добавление пути к тегу
export const addPathToTag = (
  tagId: string,
  targetPath: string
): FileTag | null => {
  try {
    const normalizedPath = normalizePathForStorage(targetPath);
    console.log(`Нормализованный путь для сохранения: ${normalizedPath}`);
    
    const tags = loadTags();
    const tagIndex = tags.findIndex((tag) => tag.id === tagId);
    
    if (tagIndex !== -1) {
      const pathExists = tags[tagIndex].paths.some((existingPath) => 
        arePathsEquivalent(existingPath, normalizedPath)
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

// Удаление пути из тега
export const removePathFromTag = (
  tagId: string,
  pathToRemove: string
): FileTag | null => {
  try {
    const normalizedPath = normalizePathForStorage(pathToRemove);
    console.log(`Нормализованный путь для удаления: ${normalizedPath}`);
    
    const tags = loadTags();
    const tagIndex = tags.findIndex((tag) => tag.id === tagId);
    
    if (tagIndex !== -1) {
      console.log(`Удаляем путь ${normalizedPath} из тега ${tagId}`);
      const beforeCount = tags[tagIndex].paths.length;
      tags[tagIndex].paths = tags[tagIndex].paths.filter((existingPath: string) => {
        const isEquivalent = !arePathsEquivalent(
          existingPath,
          normalizedPath
        );
        if (!isEquivalent) {
          console.log(
            `Найдено совпадение: ${existingPath} совпадает с ${normalizedPath}`
          );
        }
        return isEquivalent;
      });
      
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
