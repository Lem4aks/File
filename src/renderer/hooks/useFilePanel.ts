import { useState, useCallback } from 'react';
import { PanelTab, FileItem } from '../types';
import { getFolderNameFromPath } from '../utils/fileUtils';

interface FilePanelHookProps {
  pathSeparator: string;
  platform: string;
}

// eslint-disable-next-line import/prefer-default-export
export const useFilePanel = ({
  pathSeparator,
  platform,
}: FilePanelHookProps) => {
  const [tabs, setTabs] = useState<PanelTab[]>([]);
  const [currentTabId, setCurrentTabId] = useState<number | null>(null);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [anchorIndex, setAnchorIndex] = useState<number | null>(null);
  const [hoveredFileIndex, setHoveredFileIndex] = useState<number | null>(null);
  const [selectedFileIndex, setSelectedFileIndex] = useState<number | null>(
    null,
  );
  const [dselectedFileIndex, setDselectedFileIndex] = useState<number | null>(
    null,
  );
  const [refreshTrigger, setRefreshTrigger] = useState<boolean>(false);

  const currentTab = tabs.find((tab) => tab.id === currentTabId);

  const addTab = useCallback(() => {
    const basePath =
      currentTab?.currentPath ||
      (platform === 'win32' ? `D:${pathSeparator}` : pathSeparator);
    const newId = Date.now();
    const newTab: PanelTab = {
      id: newId,
      name: getFolderNameFromPath(basePath, pathSeparator),
      history: [basePath],
      currentIndex: 0,
      currentPath: basePath,
    };
    setTabs((prev) => [...prev, newTab]);
    setCurrentTabId(newId);
  }, [currentTab, pathSeparator, platform]);

  const removeTab = useCallback(
    (tabId: number) => {
      setTabs((prev) => {
        const newTabs = prev.filter((t) => t.id !== tabId);
        if (currentTabId === tabId && newTabs.length > 0) {
          setCurrentTabId(newTabs[0].id);
        } else if (newTabs.length === 0) {
          setCurrentTabId(null);
        }
        return newTabs;
      });
    },
    [currentTabId],
  );

  const setPathWithHistory = useCallback(
    (newPath: string) => {
      let formattedPath = newPath;
      if (platform === 'win32') {
        formattedPath = /^[A-Za-z]:$/.test(newPath)
          ? `${newPath}${pathSeparator}`
          : newPath;
      }
      setTabs((prevTabs) =>
        prevTabs.map((tab) => {
          if (tab.id === currentTabId) {
            const newHistory = tab.history.slice(0, tab.currentIndex + 1);
            newHistory.push(formattedPath);
            return {
              ...tab,
              history: newHistory,
              currentIndex: tab.currentIndex + 1,
              currentPath: formattedPath,
              name: getFolderNameFromPath(formattedPath, pathSeparator),
            };
          }
          return tab;
        }),
      );
    },
    [currentTabId, pathSeparator, platform],
  );

  const handleBackClick = useCallback(() => {
    setTabs((prevTabs) =>
      prevTabs.map((tab) => {
        if (tab.id === currentTabId && tab.currentIndex > 0) {
          const newIndex = tab.currentIndex - 1;
          return {
            ...tab,
            currentIndex: newIndex,
            currentPath: tab.history[newIndex],
            name: getFolderNameFromPath(tab.history[newIndex], pathSeparator),
          };
        }
        return tab;
      }),
    );
  }, [currentTabId, pathSeparator]);

  const handleForwardClick = useCallback(() => {
    setTabs((prevTabs) =>
      prevTabs.map((tab) => {
        if (
          tab.id === currentTabId &&
          tab.currentIndex < tab.history.length - 1
        ) {
          const newIndex = tab.currentIndex + 1;
          return {
            ...tab,
            currentIndex: newIndex,
            currentPath: tab.history[newIndex],
            name: getFolderNameFromPath(tab.history[newIndex], pathSeparator),
          };
        }
        return tab;
      }),
    );
  }, [currentTabId, pathSeparator]);

  const refreshFiles = useCallback(() => {
    setRefreshTrigger((prev) => !prev);
  }, []);

  // Функция для обновления вкладки
  const updateTab = useCallback((updatedTab: PanelTab) => {
    setTabs((prevTabs) =>
      prevTabs.map((tab) => (tab.id === updatedTab.id ? updatedTab : tab)),
    );
  }, []);

  return {
    tabs,
    setTabs,
    currentTabId,
    setCurrentTabId,
    files,
    setFiles,
    currentTab,
    selectedFiles,
    setSelectedFiles,
    anchorIndex,
    setAnchorIndex,
    hoveredFileIndex,
    setHoveredFileIndex,
    selectedFileIndex,
    setSelectedFileIndex,
    dselectedFileIndex,
    setDselectedFileIndex,
    refreshTrigger,
    addTab,
    removeTab,
    setPathWithHistory,
    handleBackClick,
    handleForwardClick,
    refreshFiles,
    updateTab,
  };
};
