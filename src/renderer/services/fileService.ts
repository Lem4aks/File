import { FileItem } from '../types';

class FileService {
  async getFiles(path: string): Promise<FileItem[]> {
    try {
      return await window.electron.ipcRenderer.invoke('get-files', path);
    } catch (error) {
      console.error('Error listing files:', error);
      return [];
    }
  }

  async getParentDirectory(path: string): Promise<string> {
    try {
      return await window.electron.ipcRenderer.invoke('get-parent', path);
    } catch (error) {
      console.error('Error getting parent directory:', error);
      throw error;
    }
  }

  async openFile(
    filePath: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      return await window.electron.ipcRenderer.invoke('open-file', filePath);
    } catch (error) {
      console.error('Failed to open file:', error);
      return { success: false, error: String(error) };
    }
  }

  async getPlatform(): Promise<string> {
    try {
      return await window.electron.ipcRenderer.invoke('get-platform');
    } catch (error) {
      console.error('Error getting platform:', error);
      return 'unknown';
    }
  }

  async createFolder(parentPath: string, folderName: string): Promise<boolean> {
    try {
      console.log('[fileService] Creating folder. Params:', {
        parentPath,
        folderName,
        folderNameLength: folderName ? folderName.length : 0,
        isEmptyOrWhitespace: !folderName || folderName.trim() === '',
      });

      if (!folderName || folderName.trim() === '') {
        console.error('[fileService] Rejected empty folder name');
        return false;
      }

      const params = { parentPath, folderName };
      console.log('[fileService] Sending params as object:', params);

      const result = await window.electron.ipcRenderer.invoke(
        'create-folder',
        params,
      );

      console.log('[fileService] Folder creation result:', result);
      return result;
    } catch (error) {
      console.error('[fileService] Error creating folder:', error);
      return false;
    }
  }

  async getAvailableDisks(): Promise<string[] | DiskInfo[]> {
    try {
      return await window.electron.ipcRenderer.invoke('get-disks');
    } catch (error) {
      console.error('Error getting available disks:', error);
      return [];
    }
  }
}

export interface DiskInfo {
  device: string;
  mount: string;
}

export default new FileService();
