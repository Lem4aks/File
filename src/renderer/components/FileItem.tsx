import React from 'react';
import { Icon } from '@blueprintjs/core';
import { IconNames } from '@blueprintjs/icons';
import { FileItem as FileItemType } from '../types';
import { formatBytes, splitFileName } from '../utils/fileUtils';

interface FileItemProps {
  file: FileItemType;
  index: number;
  isSelected: boolean;
  isHovered: boolean;
  isDselected: boolean;
  isActivePanel: boolean;
  isDarkTheme: boolean;
  currentPath: string;
  pathSeparator: string;
  onMouseEnter: (index: number) => void;
  onMouseLeave: () => void;
  onClick: (e: React.MouseEvent, index: number, filePath: string) => void;
  onDoubleClick: (isDirectory: boolean, name: string, index: number) => void;
  onContextMenu: (e: React.MouseEvent, filePath: string) => void;
}

const FileItemComponent: React.FC<FileItemProps> = ({
  file,
  index,
  isSelected,
  isHovered,
  isDselected,
  isActivePanel,
  isDarkTheme,
  currentPath,
  pathSeparator,
  onMouseEnter,
  onMouseLeave,
  onClick,
  onDoubleClick,
  onContextMenu,
}) => {
  const filePath = `${currentPath}${pathSeparator}${file.name}`;
  const { base, ext } = splitFileName(file.name);
  const fileClass = isSelected
    ? 'selected'
    : isDselected
      ? 'dselect'
      : isHovered
        ? 'hovered'
        : '';

  return (
    <p
      className={`file-item ${fileClass}`}
      onMouseEnter={() => onMouseEnter(index)}
      onMouseLeave={onMouseLeave}
      onClick={(e) => {
        if (!isActivePanel) return;
        onClick(e, index, filePath);
      }}
      onDoubleClick={() => onDoubleClick(file.isDirectory, file.name, index)}
      onContextMenu={(e) => {
        e.stopPropagation();
        onContextMenu(e, filePath);
      }}
    >
      <span className="file-name">
        <Icon
          icon={file.isDirectory ? IconNames.FOLDER_CLOSE : IconNames.DOCUMENT}
          style={{ marginRight: '6px' }}
          color={isDarkTheme ? '#d9dde0' : undefined}
        />
        <span className="file-name-base">{base}</span>
        <span className="file-extension">{ext}</span>
      </span>
      <span className="file-date">
        {file.creationDate
          ? new Date(file.creationDate).toLocaleString()
          : '-'}
      </span>
      <span className="file-size">
        {file.isDirectory ? '--' : formatBytes(file.size)}
      </span>
    </p>
  );
};

export default FileItemComponent;
