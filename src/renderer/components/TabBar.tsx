import React from 'react';
import { Icon } from '@blueprintjs/core';
import { IconNames } from '@blueprintjs/icons';
import { PanelTab } from '../types';

interface TabBarProps {
  tabs: PanelTab[];
  currentTabId: number | null;
  isDarkTheme: boolean;
  onTabSelect: (tabId: number) => void;
  onTabClose: (tabId: number) => void;
  onAddTab: () => void;
}

const TabBar: React.FC<TabBarProps> = ({
  tabs,
  currentTabId,
  isDarkTheme,
  onTabSelect,
  onTabClose,
  onAddTab,
}) => {
  return (
    <div className="Multopen">
        {tabs.map((tab) => {
          // Создаем стили для отображения цвета тега
          const tabStyle = tab.tagColor ? { 
            borderLeft: `4px solid ${tab.tagColor}`,
            borderTopLeftRadius: '0',
            borderBottomLeftRadius: '0',
            paddingLeft: '6px'
          } : {};
          
          return (
            <div
              key={tab.id}
              className={`tab ${tab.id === currentTabId ? 'active' : ''}`}
              style={tabStyle}
            >
              <button onClick={() => onTabSelect(tab.id)}>
                {tab.name}
              </button>
              {tabs.length > 1 && (
                <button
                  className="close-tab"
                  onClick={(e) => {
                    e.stopPropagation();
                    onTabClose(tab.id);
                  }}
                  type="button"
                >
                  <Icon
                    icon={IconNames.CROSS}
                    color={isDarkTheme ? '#d9dde0' : undefined}
                    size={12}
                  />
                </button>
              )}
            </div>
          );
        })}
        <button className="NOB" onClick={onAddTab} type="button">
          <Icon
            icon={IconNames.PLUS}
            color={isDarkTheme ? '#d9dde0' : undefined}
          />
        </button>
    </div>
  );
};

export default TabBar;
