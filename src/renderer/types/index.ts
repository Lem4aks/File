// Define application types
export type PanelTab = {
  id: number;
  name: string;
  history: string[];
  currentIndex: number;
  currentPath: string;
  isTagMode?: boolean;
  tagId?: string;
  tagColor?: string;
};

export type FileItem = {
  name: string;
  isDirectory: boolean;
  creationDate?: number;
  size?: number;
  date?: Date;
  originalPath?: string;
};

export type Shortcut = {
  name: string;
  path: string;
};

export type FileTag = {
  id: string;
  name: string;
  color: string;
  paths: string[];
};

export type ActivePage = 'left' | 'right';
