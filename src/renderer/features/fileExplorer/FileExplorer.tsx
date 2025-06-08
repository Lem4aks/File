import React, { useState, useEffect, useCallback } from 'react';
import { Icon } from '@blueprintjs/core';
import { IconNames } from '@blueprintjs/icons';
import FilePanel from '../../components/FilePanel';
import Sidebar from '../../components/Sidebar';
import CreateFolderDialog from '../../components/CreateFolderDialog';
import TagDialog from '../../components/TagDialog';
import TagSelectionDialog from '../../components/TagSelectionDialog';
import { useFilePanel } from '../../hooks/useFilePanel';
import fileService from '../../services/fileService';
import useTheme from '../../hooks/useTheme';
import * as tagService from '../../services/tagService';
import { Shortcut, ActivePage, FileTag, FileItem } from '../../types';
import { getFolderNameFromPath } from '../../utils/fileUtils';
import type { DiskInfo } from '../../services/fileService';

const FileExplorer: React.FC = () => {
  const [platform, setPlatform] = useState<string>('');
  const [pathSeparator, setPathSeparator] = useState<string>('');
  const [isPlatformInitialized, setIsPlatformInitialized] = useState<boolean>(false);

  const { isDarkTheme, toggleTheme } = useTheme();

  const [isBookMode, setIsBookMode] = useState<boolean>(false);
  const [activePage, setActivePage] = useState<ActivePage>('left');
  
  const [leftSearchTerm, setLeftSearchTerm] = useState('');
  const [rightSearchTerm, setRightSearchTerm] = useState('');

  const left = useFilePanel({ pathSeparator, platform });
  const right = useFilePanel({ pathSeparator, platform });

  const [shortcuts, setShortcuts] = useState<Shortcut[]>([]);
  const [availableDisks, setAvailableDisks] = useState<string[] | DiskInfo[]>([]);
  const [hoveredShortcutIndex, setHoveredShortcutIndex] = useState<number | null>(null);
  const [hoveredDiskIndex, setHoveredDiskIndex] = useState<number | null>(null);

  const [isCreateFolderDialogOpen, setIsCreateFolderDialogOpen] = useState<boolean>(false);
  const [newFolderName, setNewFolderName] = useState<string>('');

  const [isTagDialogOpen, setIsTagDialogOpen] = useState<boolean>(false);
  const [tagToEdit, setTagToEdit] = useState<FileTag | undefined>(undefined);
  const [selectedFilePaths, setSelectedFilePaths] = useState<string[]>([]);

  const [isTagSelectionDialogOpen, setIsTagSelectionDialogOpen] = useState<boolean>(false);

  const loadTagFiles = useCallback(async (tag: FileTag, isLeft: boolean) => {
    if (!tag.paths || tag.paths.length === 0) {
      if (isLeft) {
        left.setFiles([]);
      } else {
        right.setFiles([]);
      }
      return;
    }
    
    try {
      const filePromises = tag.paths.map(async (filePath) => {
        try {
          const fileName = filePath.split(pathSeparator).pop() || '';
        
          let isDirectory = false;
          
          try {
            const fileStats = await window.electron.ipcRenderer.invoke('get-file-stats', filePath);
            
            if (fileStats && fileStats.isDirectory) {
              isDirectory = true;
            } else {
              isDirectory = false;
            }
          } catch (error) {
            console.error(`Error checking if path is directory: ${filePath}`, error);
            isDirectory = false;
          }
          
          return {
            name: fileName,
            isDirectory,
            size: 0, 
            date: new Date(),
            originalPath: filePath, 
          };
        } catch (error) {
          console.error(`Error processing file ${filePath}:`, error);
          return null;
        }
      });
      
      const results = await Promise.all(filePromises);
      const validFiles = results.filter((file) => file !== null) as FileItem[];
      
      validFiles.sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
      });
      
      if (isLeft) {
        left.setFiles(validFiles);
      } else {
        right.setFiles(validFiles);
      }
    } catch (error) {
      console.error('Error loading tag files:', error);
      if (isLeft) {
        left.setFiles([]);
      } else {
        right.setFiles([]);
      }
    }
  }, [left, right, pathSeparator]);

  const loadTagFilesById = useCallback(async (tagId: string, isLeft: boolean) => {
    try {
      const tags = await tagService.loadTags();
      const tag = tags.find((t) => t.id === tagId);
      if (tag) {
        await loadTagFiles(tag, isLeft);
      } else {
        console.error(`Тег с ID ${tagId} не найден`);
        if (isLeft) {
          left.setFiles([]);
        } else {
          right.setFiles([]);
        }
      }
    } catch (error) {
      console.error('Ошибка при загрузке тега:', error);
      if (isLeft) {
        left.setFiles([]);
      } else {
        right.setFiles([]);
      }
    }
  }, [loadTagFiles, left, right]);

  const fetchFiles = useCallback(async (isLeft: boolean) => {
    try {
      const panel = isLeft ? left : right;
      const currentTab = panel.currentTab;
      
      if (currentTab?.isTagMode && currentTab?.tagId) {
        if (currentTab.tagId) {
          await loadTagFilesById(currentTab.tagId, isLeft);
        }
        return;
      }
      
      const path = currentTab?.currentPath;
      
      if (path) {
        let files = await fileService.getFiles(path);
        
        files = files.sort((a, b) => {
          if (a.isDirectory && !b.isDirectory) return -1;
          if (!a.isDirectory && b.isDirectory) return 1;
          
          return a.name.localeCompare(b.name);
        });
        
        if (isLeft) {
          left.setFiles(files);
        } else {
          right.setFiles(files);
        }
      }
    } catch (error) {
      console.error(
        `Error fetching files for ${isLeft ? 'left' : 'right'} panel:`,
        error
      );
    }
  }, [left, right, loadTagFilesById]);

  const getShortcuts = useCallback(async () => {
    if (!pathSeparator) {
      return [];
    }
    
    try {
      const userHome = await window.electron.ipcRenderer.invoke('get-user-home');
      return [
        { name: 'Documents', path: `${userHome}${pathSeparator}Documents` },
        { name: 'Downloads', path: `${userHome}${pathSeparator}Downloads` },
        { name: 'Desktop', path: `${userHome}${pathSeparator}Desktop` },
      ];
    } catch (error) {
      console.error('Error fetching shortcuts:', error);
      return [];
    }
  }, [pathSeparator]);

  useEffect(() => {
    const initialize = async () => {
      try {
        const platformInfo = await fileService.getPlatform();
        setPlatform(platformInfo);
        setPathSeparator(platformInfo === 'win32' ? '\\' : '/');
        
        setIsPlatformInitialized(true);
        
        const disks = await fileService.getAvailableDisks();
        setAvailableDisks(disks);
        
        window.electron.ipcRenderer.on('create-folder-dialog', () => {
          console.log('Received create-folder-dialog event from main process');
          setIsCreateFolderDialogOpen(true);
        });
      } catch (error) {
        console.error('Error initializing file explorer:', error);
      }
    };
    
    initialize();
    
    return () => {
      window.electron.ipcRenderer.off('create-folder-dialog', () => {});
    };
  }, []);

  useEffect(() => {
    if (isPlatformInitialized && pathSeparator) {
      const loadShortcuts = async () => {
        try {
          const initialShortcuts = await getShortcuts();
          setShortcuts(initialShortcuts);
        } catch (error) {
          console.error('Error loading shortcuts:', error);
        }
      };
      
      loadShortcuts();
    }
  }, [isPlatformInitialized, pathSeparator, getShortcuts]);

  useEffect(() => {
    if (isPlatformInitialized && availableDisks.length > 0) {
      if (left.tabs.length === 0) {
        left.addTab();
        fetchFiles(true);
      }
      
      if (isBookMode && right.tabs.length === 0) {
        right.addTab();
        fetchFiles(false);
      }
    }
  }, [
    isPlatformInitialized,
    availableDisks,
    platform,
    isBookMode,
    fetchFiles,
    left.tabs.length,
    right.tabs.length
  ]);

  useEffect(() => {
    if (left.currentTab) {
      fetchFiles(true);
    }
  }, [left.refreshTrigger, left.currentTab?.currentPath, fetchFiles]);

  useEffect(() => {
    if (right.currentTab) {
      fetchFiles(false);
    }
  }, [right.refreshTrigger, right.currentTab?.currentPath, fetchFiles]);

  const handleParentClick = async (isLeft: boolean) => {
    const panel = isLeft ? left : right;
    const { currentTab, setPathWithHistory, updateTab } = panel;
    const currentPath = currentTab?.currentPath || '';
    
    if (currentTab?.isTagMode) {
      const updatedTab = {
        ...currentTab,
        isTagMode: false,
        tagId: undefined,
        tagColor: undefined,
      };
      updateTab(updatedTab);
    }

    try {
      const parentPath = await fileService.getParentDirectory(currentPath);
      setPathWithHistory(parentPath);
    } catch (error) {
      console.error('Error getting parent directory:', error);
    }
  };

  const handleFileClick = (
    isLeft: boolean,
    e: React.MouseEvent,
    index: number,
    filePath: string
  ) => {
    const panel = isLeft ? left : right;

    if (e.shiftKey) {
      const anchor = panel.anchorIndex !== null ? panel.anchorIndex : index;
      const start = Math.min(anchor, index);
      const end = Math.max(anchor, index);
      const files = panel.files;
      const currentPath = panel.currentTab?.currentPath || '';

      const range = files
        .slice(start, end + 1)
        .map(file => `${currentPath}${pathSeparator}${file.name}`);

      if (isLeft) {
        left.setSelectedFiles(range);
        left.setSelectedFileIndex(index);
      } else {
        right.setSelectedFiles(range);
        right.setSelectedFileIndex(index);
      }
    } else if (e.ctrlKey) {
      if (isLeft) {
        left.setSelectedFiles(prev =>
          prev.includes(filePath)
            ? prev.filter(p => p !== filePath)
            : [...prev, filePath]
        );
        left.setAnchorIndex(index);
        left.setSelectedFileIndex(index);
      } else {
        right.setSelectedFiles(prev =>
          prev.includes(filePath)
            ? prev.filter(p => p !== filePath)
            : [...prev, filePath]
        );
        right.setAnchorIndex(index);
        right.setSelectedFileIndex(index);
      }
    } else {
      if (isLeft) {
        left.setSelectedFiles([filePath]);
        left.setAnchorIndex(index);
        left.setSelectedFileIndex(index);
      } else {
        right.setSelectedFiles([filePath]);
        right.setAnchorIndex(index);
        right.setSelectedFileIndex(index);
      }
    }
  };

  const handleFolderClick = (
    folderName: string,
    isLeft: boolean,
    index: number,
  ) => {
    if (isLeft) {
      const currentPath = left.currentTab?.currentPath || '';
      const sep = currentPath.endsWith(pathSeparator) ? '' : pathSeparator;
      const newPath = `${currentPath}${sep}${folderName}`;
      if (isBookMode) {
        left.setSelectedFileIndex(null);
        left.setDselectedFileIndex(null);
        right.setHoveredFileIndex(index);
      } else {
        left.setSelectedFileIndex(null);
      }
      left.setPathWithHistory(newPath);
    } else {
      const currentPath = right.currentTab?.currentPath || '';
      const sep = currentPath.endsWith(pathSeparator) ? '' : pathSeparator;
      const newPath = `${currentPath}${sep}${folderName}`;
      if (isBookMode) {
        right.setSelectedFileIndex(null);
        right.setDselectedFileIndex(null);
        left.setHoveredFileIndex(index);
      } else {
        right.setSelectedFileIndex(null);
      }
      right.setPathWithHistory(newPath);
    }
  };

  const handleFileOpen = async (filePath: string) => {
    try {
      const response = await fileService.openFile(filePath);
      if (!response.success) {
        console.error('Error opening file:', response.error);
      }
    } catch (error) {
      console.error('Failed to open file:', error);
    }
  };

  const handleDiskSelect = async (disk: string | DiskInfo, isLeft: boolean) => {
    const panel = isLeft ? left : right;
    const { currentTab, setPathWithHistory, updateTab, setFiles } = panel;
    
    let formattedDisk: string;
    if (typeof disk === 'string') {
      formattedDisk = disk.endsWith(pathSeparator)
        ? disk
        : `${disk}${pathSeparator}`;
    } else {
      formattedDisk = disk.mount;
    }
    
    if (currentTab) {
      const updatedTab = {
        ...currentTab,
        isTagMode: false,
        tagId: undefined,
        tagColor: undefined,
        name: getFolderNameFromPath(formattedDisk, pathSeparator), 
      };
      updateTab(updatedTab);
      
      if (formattedDisk === currentTab.currentPath) {
        try {
          setFiles([]);
          const filesData = await fileService.getFiles(formattedDisk);
          setFiles(filesData);
        } catch (error) {
          console.error(`Ошибка загрузки файлов диска ${formattedDisk}:`, error);
          setFiles([]);
        }
        return; 
      }
    }
    
    setPathWithHistory(formattedDisk);
  };

  const handleShortcutClick = async (shortcutPath: string, isLeft: boolean) => {
    const panel = isLeft ? left : right;
    const { currentTab, setPathWithHistory, updateTab, setFiles } = panel;
    
    if (currentTab) {
      const updatedTab = {
        ...currentTab,
        isTagMode: false,
        tagId: undefined,
        tagColor: undefined,
        name: getFolderNameFromPath(shortcutPath, pathSeparator), 
      };
      updateTab(updatedTab);
      
      if (shortcutPath === currentTab.currentPath) {
        try {
          setFiles([]);
          const filesData = await fileService.getFiles(shortcutPath);
          setFiles(filesData);
        } catch (error) {
          console.error(`Ошибка загрузки файлов ярлыка ${shortcutPath}:`, error);
          setFiles([]);
        }
        return; 
      }
    }
    
    setPathWithHistory(shortcutPath);
  };

  const handleContextMenu = (e: React.MouseEvent, filePath?: string) => {
    e.preventDefault();

    const isLeft = activePage === 'left';
    const currentFolderPath = isLeft
      ? left.currentTab?.currentPath || ''
      : right.currentTab?.currentPath || '';

    const selectedFiles = isLeft ? left.selectedFiles : right.selectedFiles;

    const isFileSelected = filePath && selectedFiles.includes(filePath);

    const filesToSend = filePath
      ? (isFileSelected ? selectedFiles : [filePath])
      : selectedFiles;

    window.electron.ipcRenderer.send('show-context-menu', {
      x: e.clientX,
      y: e.clientY,
      filePaths: filesToSend,
      targetPath: currentFolderPath,
    });
  };

  const handleCreateFolder = async (isLeft: boolean) => {
    if (!newFolderName.trim()) {
      return;
    }

    try {
      const panel = isLeft ? left : right;
      const currentPath = panel.currentTab?.currentPath || '';
      const folderPath = currentPath ? `${currentPath}${pathSeparator}${newFolderName}` : '';

      if (!folderPath) {
        console.error('Invalid folder path');
        return;
      }
        
      const success = await fileService.createFolder(
        currentPath || '',
        newFolderName.trim()
      );
      if (success) {
        setNewFolderName('');
        setIsCreateFolderDialogOpen(false);

        if (isLeft) {
          left.refreshFiles();
        } else {
          right.refreshFiles();
        }
      } else {
        console.error('Failed to create folder');
      }
    } catch (error) {
      console.error('Error creating folder:', error);
    }
  };

  const removeTagFromFiles = async (tagId: string, filePaths: string[]) => {
    if (!filePaths || filePaths.length === 0 || !tagId) {
      console.error('Missing paths or tagId for tag removal');
      return;
    }

    try {
      for (const filePath of filePaths) {
        await window.electron.ipcRenderer.invoke(
          tagService.TAG_CHANNEL.REMOVE_PATH_FROM_TAG,
          { tagId, path: filePath }
        );
        console.log(`Удален тег с ID ${tagId} из файла ${filePath}`);
      }

      const isLeft = activePage === 'left';
      const panel = isLeft ? left : right;
      
      if (panel.currentTab?.isTagMode) {
        const updatedTab = {
          ...panel.currentTab,
          isTagMode: false,
          tagId: undefined,
          tagColor: undefined
        };
        panel.updateTab(updatedTab);

        if (panel.currentTab?.history?.length > 0) {
          const lastNonTagPath = panel.currentTab.history[panel.currentTab.currentIndex - 1];
          if (lastNonTagPath) {
            panel.setPathWithHistory(lastNonTagPath);
          } else {
            await fetchFiles(isLeft);
          }
        } else {
          await fetchFiles(isLeft);
        }
      } else {
        await fetchFiles(isLeft);
      }
      
    } catch (error) {
      console.error('Error removing tag from files:', error);
    }
  };

  const handleAddTagClick = () => {
    const selectedFiles = 
      activePage === 'left' ? left.selectedFiles
      : right.selectedFiles;

    const currentTab = activePage === 'left' ? left.currentTab : right.currentTab;

    if (selectedFiles && selectedFiles.length > 0) {
      if (currentTab?.isTagMode) {
        removeTagFromFiles(currentTab.tagId, selectedFiles);
      } else {
        setSelectedFilePaths(selectedFiles);
        setIsTagSelectionDialogOpen(true);
      }
    }
  };

  const applyTagToFile = async (tag: FileTag) => {
    if (!selectedFilePaths || selectedFilePaths.length === 0) {
      console.error('No files selected for tag');
      return;
    }

    try {
      for (const filePath of selectedFilePaths) {
        await window.electron.ipcRenderer.invoke(
          tagService.TAG_CHANNEL.ADD_PATH_TO_TAG,
          { tagId: tag.id, path: filePath }
        );

        console.log(`Добавлен тег ${tag.name} к файлу ${filePath}`);
      }

      await fetchFiles(activePage === 'left');
      setSelectedFilePaths([]); 
    } catch (error) {
      console.error('Error adding tag to files:', error);
    }
  };

  const handleTagSave = async (tag: FileTag) => {
    if (selectedFilePaths && selectedFilePaths.length > 0) {
      await applyTagToFile(tag);
    }
    setIsTagDialogOpen(false);
  };

  const handleApplyTag = (tag: FileTag) => {
    applyTagToFile(tag);
    handleTagSelectionDialogClose();
  };

  const handleFileDoubleClick = async (isLeft: boolean, index: number) => {
    const panel = isLeft ? left : right;
    const { files, currentTab, updateTab, setPathWithHistory } = panel;
    const selectedFile = files[index];
    const isTagMode = currentTab?.isTagMode;
    
    if (isTagMode && currentTab && selectedFile.originalPath) {
      const { originalPath } = selectedFile;

      const updatedTab = {
        ...currentTab,
        isTagMode: false,
        tagId: undefined,
        tagColor: undefined,
      };
      updateTab(updatedTab);

      if (selectedFile.isDirectory) {
        setPathWithHistory(originalPath + pathSeparator);
      } else {
        const parentPath = [
          ...originalPath.split(pathSeparator).slice(0, -1),
          '',
        ].join(pathSeparator);
        setPathWithHistory(parentPath);
        
        try {
          await window.electron.ipcRenderer.invoke('open-file', originalPath);
        } catch (error) {
          console.error('Error opening file:', error);
        }
      }
    } else {
      const handleDirectory = () => {
        const newPath = `${currentTab?.currentPath}${selectedFile.name}${pathSeparator}`;
        setPathWithHistory(newPath);
      };

      const handleFile = async () => {
        try {
          const filePath = `${currentTab?.currentPath}${selectedFile.name}`;
          await window.electron.ipcRenderer.invoke('open-file', filePath);
        } catch (error) {
          console.error('Error opening file:', error);
        }
      };

      if (selectedFile.isDirectory) {
        handleDirectory();
      } else {
        handleFile();
      }
    }
  };

  const handleTagDialogClose = () => {
    setIsTagDialogOpen(false);
    setTagToEdit(undefined);
  };

  const handleTagSelectionDialogClose = () => {
    setIsTagSelectionDialogOpen(false);
    setSelectedFilePaths([]); 
  };

  const handleCreateNewTag = () => {
    setIsTagSelectionDialogOpen(false);
    setTagToEdit(undefined);
    setIsTagDialogOpen(true);
  };
  
  const handleTagClick = async (tag: FileTag) => {
    if (!tag.paths || tag.paths.length === 0) {
      alert(`Тег "${tag.name}" пуст. Добавьте файлы в тег, чтобы перейти к нему.`);
      return;
    }
    
    const panel = activePage === 'left' ? left : right;
    
    if (!panel.currentTabId) {
      panel.addTab();
    }
    
    if (panel.currentTab) {
      const updatedTab = {
        ...panel.currentTab,
        name: tag.name,
        isTagMode: true,
        tagId: tag.id,
        tagColor: tag.color,
      };
      
      if (activePage === 'left') {
        left.updateTab(updatedTab);
        await loadTagFiles(tag, true);
      } else {
        right.updateTab(updatedTab);
        await loadTagFiles(tag, false);
      }
    }
  };

  const handleTabSelect = async (tabId: number, isLeft: boolean) => {
    const panel = isLeft ? left : right;
    const selectedTab = panel.tabs.find((tab) => tab.id === tabId);
    
    if (!selectedTab) {
      console.error(`Вкладка с ID ${tabId} не найдена`);
      return;
    }
    
    if (isLeft) {
      left.setCurrentTabId(tabId);
    } else {
      right.setCurrentTabId(tabId);
    }
    
    if (isLeft) {
      left.setFiles([]);
    } else {
      right.setFiles([]);
    }

    if (selectedTab.isTagMode && selectedTab.tagId) {
      await loadTagFilesById(selectedTab.tagId, isLeft);
    } else if (selectedTab.currentPath) {
      try {
        const filesData = await fileService.getFiles(selectedTab.currentPath);
        if (isLeft) {
          left.setFiles(filesData);
        } else {
          right.setFiles(filesData);
        }
      } catch (error) {
        console.error(`Ошибка загрузки файлов для пути ${selectedTab.currentPath}:`, error);
        if (isLeft) {
          left.setFiles([]);
        } else {
          right.setFiles([]);
        }
      }
    }
  };

  const toggleBookMode = (newBookMode: boolean) => {
    setIsBookMode(newBookMode);
    if (!newBookMode) {
      setActivePage('left');
    } else if (right.tabs.length === 0) {
      right.addTab();
    }
  };

  const getIconForShortcut = (name: string) => {
    switch (name.toLowerCase()) {
      case 'downloads':
        return IconNames.DOWNLOAD;
      case 'documents':
        return IconNames.PROJECTS;
      case 'pictures':
        return IconNames.MEDIA;
      case 'music':
        return IconNames.MUSIC;
      case 'videos':
        return IconNames.MOBILE_VIDEO;
      default:
        return IconNames.FOLDER_CLOSE;
    }
  };

  const filterFilesBySearch = (files: { name: string; isDirectory: boolean }[], searchTerm: string) => {
    if (!searchTerm.trim()) return files;

    const lowerSearchTerm = searchTerm.toLowerCase();
    return files.filter(file => file.name.toLowerCase().includes(lowerSearchTerm));
  };

  const renderLeftPanel = () => (
    <FilePanel
      files={filterFilesBySearch(left.files, leftSearchTerm)}
      tabs={left.tabs}
      currentTabId={left.currentTabId}
      currentTab={left.currentTab}
      isDarkTheme={isDarkTheme}
      selectedFiles={left.selectedFiles}
      hoveredFileIndex={left.hoveredFileIndex}
      selectedFileIndex={left.selectedFileIndex}
      dselectedFileIndex={left.dselectedFileIndex}
      anchorIndex={left.anchorIndex}
      isActivePanel={!isBookMode || activePage === 'left'}
      isLeftPanel
      pathSeparator={pathSeparator}
      onCreateFolderClick={() => setIsCreateFolderDialogOpen(true)}
      onAddTagClick={handleAddTagClick}
      onTabSelect={(tabId) => handleTabSelect(tabId, true)}
      onTabClose={left.removeTab}
      onAddTab={left.addTab}
      onBackClick={left.handleBackClick}
      onForwardClick={left.handleForwardClick}
      onParentClick={() => handleParentClick(true)}
      onRefreshClick={left.refreshFiles}
      onPathChange={left.setPathWithHistory}
      onEnterClick={() => fetchFiles(true)}
      onFileClick={(e, index, filePath) => handleFileClick(true, e, index, filePath)}
      onFileDoubleClick={(index) => handleFileDoubleClick(true, index)}
      onFolderOpen={(name, index) => handleFolderClick(name, true, index)}
      onFileOpen={handleFileOpen}
      onContextMenu={handleContextMenu}
      setHoveredFileIndex={left.setHoveredFileIndex}
      onSearch={setLeftSearchTerm}
      searchTerm={leftSearchTerm}
    />
  );
  
  const renderRightPanel = () => (
    <FilePanel
      files={filterFilesBySearch(right.files, rightSearchTerm)}
      tabs={right.tabs}
      currentTabId={right.currentTabId}
      currentTab={right.currentTab}
      isDarkTheme={isDarkTheme}
      selectedFiles={right.selectedFiles}
      hoveredFileIndex={right.hoveredFileIndex}
      selectedFileIndex={right.selectedFileIndex}
      dselectedFileIndex={right.dselectedFileIndex}
      anchorIndex={right.anchorIndex}
      isActivePanel={activePage === 'right'}
      isLeftPanel={false}
      pathSeparator={pathSeparator}
      onCreateFolderClick={() => setIsCreateFolderDialogOpen(true)}
      onAddTagClick={handleAddTagClick}
      onTabSelect={(tabId) => handleTabSelect(tabId, false)}
      onTabClose={right.removeTab}
      onAddTab={right.addTab}
      onBackClick={right.handleBackClick}
      onForwardClick={right.handleForwardClick}
      onParentClick={() => handleParentClick(false)}
      onRefreshClick={right.refreshFiles}
      onPathChange={right.setPathWithHistory}
      onEnterClick={() => fetchFiles(false)}
      onFileClick={(e, index, filePath) => handleFileClick(false, e, index, filePath)}
      onFileDoubleClick={(index) => handleFileDoubleClick(false, index)}
      onFolderOpen={(name, index) => handleFolderClick(name, false, index)}
      onFileOpen={handleFileOpen}
      onContextMenu={handleContextMenu}
      setHoveredFileIndex={right.setHoveredFileIndex}
      onSearch={setRightSearchTerm}
      searchTerm={rightSearchTerm}
    />
  );

  return (
    <div className={`Expl ${isDarkTheme ? 'dark-theme' : 'light-theme'}`}>
      <div className="Header">
        <div className="logo">
          <h1>Explorer</h1>
        </div>
        <div className="HeaderB">
          <button className="NOB" onClick={() => toggleBookMode(!isBookMode)}>
            {isBookMode ? (
              <Icon
                icon={IconNames.WIDGET_FOOTER}
                color={isDarkTheme ? '#d9dde0' : undefined}
              />
            ) : (
              <Icon
                icon={IconNames.MANUAL}
                color={isDarkTheme ? '#d9dde0' : undefined}
              />
            )}
          </button>
          <button className="NOB" onClick={toggleTheme}>
            {isDarkTheme ? (
              <Icon icon={IconNames.FLASH} color="#d9dde0" />
            ) : (
              <Icon icon={IconNames.MOON} />
            )}
          </button>
        </div>
      </div>
      <div className="Content">
        <Sidebar
          shortcuts={shortcuts}
          availableDisks={availableDisks}
          activePath={activePage === 'left' ? left.currentTab?.currentPath || '' : right.currentTab?.currentPath || ''}
          isDarkTheme={isDarkTheme}
          hoveredShortcutIndex={hoveredShortcutIndex}
          hoveredDiskIndex={hoveredDiskIndex}
          onShortcutClick={(path) => handleShortcutClick(path, activePage === 'left')}
          onDiskSelect={(disk) => handleDiskSelect(disk, activePage === 'left')}
          setHoveredShortcutIndex={setHoveredShortcutIndex}
          setHoveredDiskIndex={setHoveredDiskIndex}
          getIconForShortcut={getIconForShortcut}
          onTagClick={handleTagClick}
        />
        {isBookMode ? (
          <div className="BookView">
            <div
              className={`Main1 ${activePage === 'left' ? 'active' : ''}`}
              onClick={() => setActivePage('left')}
            >
              {renderLeftPanel()}
            </div>
            <div
              className={`Main2 ${activePage === 'right' ? 'active' : ''}`}
              onClick={() => setActivePage('right')}
            >
              {renderRightPanel()}
            </div>
          </div>
        ) : (
          <div className="SingleView">{renderLeftPanel()}</div>
        )}
      </div>
      
      <CreateFolderDialog
        isOpen={isCreateFolderDialogOpen}
        folderName={newFolderName}
        onFolderNameChange={setNewFolderName}
        onCancel={() => setIsCreateFolderDialogOpen(false)}
        onCreate={() => handleCreateFolder(activePage === 'left')}
      />
      
      <TagDialog
        isOpen={isTagDialogOpen}
        onClose={handleTagDialogClose}
        onSave={handleTagSave}
        tag={tagToEdit}
      />
      
      <TagSelectionDialog
        isOpen={isTagSelectionDialogOpen}
        onClose={handleTagSelectionDialogClose}
        onApplyTag={handleApplyTag}
        onCreateNewTag={handleCreateNewTag}
        selectedFilePaths={selectedFilePaths}
      />
    </div>
  );
};

export default FileExplorer;
