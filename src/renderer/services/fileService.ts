import { FileItem } from '../types';

/**
 * Service for handling file system operations through IPC
 */
class FileService {
  /**
   * Get files in a directory
   */
  async getFiles(path: string): Promise<FileItem[]> {
    try {
      return await window.electron.ipcRenderer.invoke('get-files', path);
    } catch (error) {
      console.error('Error listing files:', error);
      return [];
    }
  }

  /**
   * Get parent directory
   */
  async getParentDirectory(path: string): Promise<string> {
    try {
      return await window.electron.ipcRenderer.invoke('get-parent', path);
    } catch (error) {
      console.error('Error getting parent directory:', error);
      throw error;
    }
  }

  /**
   * Open a file using default application
   */
  async openFile(filePath: string): Promise<{ success: boolean; error?: string }> {
    try {
      return await window.electron.ipcRenderer.invoke('open-file', filePath);
    } catch (error) {
      console.error('Failed to open file:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Get platform information
   */
  async getPlatform(): Promise<string> {
    try {
      return await window.electron.ipcRenderer.invoke('get-platform');
    } catch (error) {
      console.error('Error getting platform:', error);
      return 'unknown';
    }
  }

  /**
   * Create a new folder
   */
  async createFolder(parentPath: string, folderName: string): Promise<boolean> {
    try {
      console.log('[fileService] Creating folder. Params:', {
        parentPath,
        folderName,
        folderNameLength: folderName ? folderName.length : 0,
        isEmptyOrWhitespace: !folderName || folderName.trim() === '',
      });
      
      // Убедимся, что имя папки определено и не пустое
      if (!folderName || folderName.trim() === '') {
        console.error('[fileService] Rejected empty folder name');
        return false;
      }
      
      // Передаем параметры как единый объект вместо отдельных аргументов
      // для избежания проблем с IPC и кириллицей
      const params = { parentPath, folderName };
      console.log('[fileService] Sending params as object:', params);
      
      const result = await window.electron.ipcRenderer.invoke('create-folder', params);
      
      console.log('[fileService] Folder creation result:', result);
      return result;
    } catch (error) {
      console.error('[fileService] Error creating folder:', error);
      return false;
    }
  }

  /**
   * Get available disks (Windows: string[], Linux: DiskInfo[])
   */
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
