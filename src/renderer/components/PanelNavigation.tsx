import React from 'react';
import { Icon } from '@blueprintjs/core';
import { IconNames } from '@blueprintjs/icons';
import { PanelTab } from '../types';

interface PanelNavigationProps {
  currentTab: PanelTab | undefined;
  isDarkTheme: boolean;
  onBackClick: () => void;
  onForwardClick: () => void;
  onParentClick: () => void;
  onRefreshClick: () => void;
  onPathChange: (path: string) => void;
  onEnterClick: () => void;
  onCreateFolderClick?: () => void;
  onAddTagClick?: () => void;
  isAddTagEnabled?: boolean;
  onSearch?: (searchTerm: string) => void;
  searchTerm?: string;
  isTagMode?: boolean;
  isLeftPanel?: boolean;
  path?: string;
}

const PanelNavigation: React.FC<PanelNavigationProps> = ({
  currentTab,
  isDarkTheme,
  onBackClick,
  onForwardClick,
  onParentClick,
  onRefreshClick,
  onPathChange,
  onEnterClick,
  onCreateFolderClick,
  onAddTagClick,
  isAddTagEnabled = false,
  onSearch,
  searchTerm,
  isTagMode = false,
  isLeftPanel,
  path,
}) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onEnterClick();
    }
  };

  return (
    <div className="User">
        <button
          type="button"
          onClick={onBackClick}
          disabled={isTagMode || !currentTab || currentTab.currentIndex === 0}
          title={isTagMode ? 'Навигация недоступна в режиме тегов' : 'Назад'}
        >
          <Icon
            icon={IconNames.CHEVRON_LEFT}
            color={isDarkTheme ? '#d9dde0' : undefined}
          />
        </button>
        <button
          type="button"
          onClick={onForwardClick}
          disabled={
            isTagMode ||
            !currentTab ||
            currentTab.currentIndex === currentTab.history.length - 1
          }
          title={isTagMode ? 'Навигация недоступна в режиме тегов' : 'Вперед'}
        >
          <Icon
            icon={IconNames.CHEVRON_RIGHT}
            color={isDarkTheme ? '#d9dde0' : undefined}
          />
        </button>
        <button 
          type="button" 
          onClick={onParentClick}
          disabled={isTagMode || (!currentTab?.currentPath || currentTab.currentPath.endsWith(':\\'))}
          title={isTagMode ? 'Навигация недоступна в режиме тегов' : currentTab?.currentPath && currentTab.currentPath.endsWith(':\\') ? 'Нет родительской директории' : 'Вверх'}
        >
          <Icon
            icon={IconNames.CHEVRON_UP}
            color={isDarkTheme ? '#d9dde0' : undefined}
          />
        </button>
        <button type="button" onClick={onCreateFolderClick}>
          <Icon
            icon={IconNames.FOLDER_NEW}
            color={isDarkTheme ? '#d9dde0' : undefined}
          />
        </button>
        <button
          type="button"
          onClick={onAddTagClick}
          disabled={!isAddTagEnabled}
          title={isTagMode
            ? isAddTagEnabled
              ? `Удалить тег "${currentTab?.name}" с выбранных элементов`
              : 'Выберите один или несколько файлов для удаления тега'
            : isAddTagEnabled
              ? 'Добавить тег к выбранным элементам'
              : 'Выберите один или несколько файлов или папок'
          }
        >
          <Icon
            icon={isTagMode ? IconNames.DISABLE : IconNames.TAG}
            color={
              isDarkTheme
                ? isAddTagEnabled ? '#d9dde0' : '#5c7080'
                : isAddTagEnabled ? undefined : '#99a0a5'
            }
          />
        </button>
      <div className="Path">
        <input
          placeholder="Path"
          className={`Input ${isTagMode ? 'tag-mode' : ''}`}
          value={isTagMode 
            ? (path 
                ? path // Если есть выбранный файл, показываем его полный путь
                : currentTab 
                  ? `Тег: ${currentTab.name}` // Если нет выбранного файла, показываем имя тега
                  : '') 
            : (path || currentTab?.currentPath || '')}
          onChange={(e) => !isTagMode && onPathChange(e.target.value)}
          onKeyDown={(e) => !isTagMode && handleKeyDown(e)}
          readOnly={isTagMode}
          title={isTagMode ? 'В режиме тегов путь показывается, но редактировать его нельзя' : ''}
        />
        <button className="NOBS" onClick={onRefreshClick}>
          <Icon
            icon={IconNames.REPEAT}
            color={isDarkTheme ? '#d9dde0' : undefined}
          />
        </button>
      </div>
      
      <div className="Search">
        <input
          placeholder="Search in folder"
          className="Input SearchInput"
          value={searchTerm || ''}
          onChange={(e) => onSearch && onSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Escape' && onSearch && onSearch('')}
        />
        <button className="NOBS" onClick={() => onSearch && onSearch('')}>
          {searchTerm ? (
            <Icon
              icon={IconNames.CROSS}
              color={isDarkTheme ? '#d9dde0' : undefined}
            />
          ) : (
            <Icon
              icon={IconNames.SEARCH}
              color={isDarkTheme ? '#d9dde0' : undefined}
            />
          )}
        </button>
      </div>
    </div>
  );
};

export default PanelNavigation;
