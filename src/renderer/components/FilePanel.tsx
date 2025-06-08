import React, { useState } from 'react';
import { FileItem as FileItemType } from '../types';
import FileItem from './FileItem';
import TabBar from './TabBar';
import PanelNavigation from './PanelNavigation';

interface FilePanelProps {
  files: FileItemType[];
  tabs: any[];
  currentTabId: number | null;
  currentTab: any;
  isDarkTheme: boolean;
  selectedFiles: string[];
  hoveredFileIndex: number | null;
  selectedFileIndex: number | null;
  dselectedFileIndex: number | null;
  anchorIndex: number | null;
  isActivePanel: boolean;
  isLeftPanel: boolean;
  pathSeparator: string;
  onTabSelect: (tabId: number) => void;
  onTabClose: (tabId: number) => void;
  onAddTab: () => void;
  onBackClick: () => void;
  onForwardClick: () => void;
  onParentClick: () => void;
  onRefreshClick: () => void;
  onPathChange: (path: string) => void;
  onEnterClick: () => void;
  onFileClick: (e: React.MouseEvent, index: number, filePath: string) => void;
  onFolderOpen: (folderName: string, index: number) => void;
  onFileOpen: (filePath: string) => void;
  onContextMenu: (e: React.MouseEvent, filePath?: string) => void;
  setHoveredFileIndex: (index: number | null) => void;
  onCreateFolderClick?: () => void;
  onAddTagClick?: () => void;
  onSearch?: (searchTerm: string) => void;
  searchTerm?: string;
  onFileDoubleClick?: (index: number) => void;
}

const FilePanel: React.FC<FilePanelProps> = ({
  files,
  tabs,
  currentTabId,
  currentTab,
  isDarkTheme,
  selectedFiles,
  hoveredFileIndex,
  selectedFileIndex,
  dselectedFileIndex,
  anchorIndex,
  isActivePanel,
  isLeftPanel,
  pathSeparator,
  onTabSelect,
  onTabClose,
  onAddTab,
  onBackClick,
  onForwardClick,
  onParentClick,
  onRefreshClick,
  onPathChange,
  onEnterClick,
  onFileClick,
  onFolderOpen,
  onFileOpen,
  onContextMenu,
  setHoveredFileIndex,
  onCreateFolderClick,
  onAddTagClick,
  onSearch,
  searchTerm,
  onFileDoubleClick,
}) => {
  const [inputPath, setInputPath] = useState(currentTab?.currentPath || '');
  
  // Получение полного пути выбранного файла для отображения в панели навигации в режиме тегов
  const getSelectedFilePath = () => {
    if (currentTab?.isTagMode && selectedFileIndex !== null && files[selectedFileIndex]) {
      return files[selectedFileIndex].originalPath || ''; // Возвращаем полный путь в режиме тегов
    }
    return ''; // Если не в режиме тегов или нет выбранного файла, возвращаем пустую строку
  };

  const handlePathChange = (path: string) => {
    setInputPath(path);
    onPathChange(path);
  };

  const handleDoubleClick = (isDirectory: boolean, name: string, index: number) => {
    // Если передан внешний обработчик двойного клика, используем его
    if (onFileDoubleClick) {
      onFileDoubleClick(index);
      return;
    }
    
    // Стандартное поведение при двойном клике
    if (isDirectory) {
      onFolderOpen(name, index);
    } else {
      const currentPath = currentTab?.currentPath || '';
      const filePath = `${currentPath}${pathSeparator}${name}`;
      onFileOpen(filePath);
    }
  };

  return (
    <div className={`Main ${isLeftPanel ? 'left' : 'right'}-page ${isActivePanel ? 'active' : ''}`}>
      <TabBar
        tabs={tabs}
        currentTabId={currentTabId}
        isDarkTheme={isDarkTheme}
        onTabSelect={onTabSelect}
        onTabClose={onTabClose}
        onAddTab={onAddTab}
      />
      <PanelNavigation
        currentTab={currentTab}
        isDarkTheme={isDarkTheme}
        onBackClick={onBackClick}
        onForwardClick={onForwardClick}
        onParentClick={onParentClick}
        onRefreshClick={onRefreshClick}
        onPathChange={handlePathChange}
        onEnterClick={onEnterClick}
        onCreateFolderClick={onCreateFolderClick}
        onAddTagClick={onAddTagClick}
        isAddTagEnabled={selectedFiles.length > 0} // Теперь кнопка активна, если выбран хотя бы один файл
        onSearch={onSearch}
        searchTerm={searchTerm}
        isTagMode={currentTab?.isTagMode}
        path={getSelectedFilePath()} // Передаем полный путь выбранного файла
      />
      <div className="Sort">
        <p>Name</p>
        <p>Data</p>
        <p>Size</p>
      </div>
      <div className="Folder" onContextMenu={(e) => onContextMenu(e)}>
        {files.map((file, index) => {
          const currentPath = currentTab?.currentPath || '';
          const filePath = `${currentPath}${pathSeparator}${file.name}`;
          
          return (
            <FileItem
              key={index}
              file={file}
              index={index}
              isSelected={selectedFiles.includes(filePath)}
              isHovered={hoveredFileIndex === index}
              isDselected={dselectedFileIndex === index}
              isActivePanel={isActivePanel}
              isDarkTheme={isDarkTheme}
              currentPath={currentPath}
              pathSeparator={pathSeparator}
              onMouseEnter={setHoveredFileIndex}
              onMouseLeave={() => setHoveredFileIndex(null)}
              onClick={onFileClick}
              onDoubleClick={handleDoubleClick}
              onContextMenu={onContextMenu}
            />
          );
        })}
      </div>
    </div>
  );
};

export default FilePanel;
