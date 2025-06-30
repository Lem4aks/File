import path from 'path';
import fs from 'fs';
import os from 'os';
import {
  app,
  BrowserWindow,
  shell,
  ipcMain,
  Menu,
  MenuItemConstructorOptions,
} from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import sudo from 'sudo-prompt';
import {
  loadTags,
  saveTags,
  addTag,
  updateTag,
  removeTag,
  getTagsForPath,
  addPathToTag,
  removePathFromTag,
} from './tagHelpers';
import MenuBuilder from './menu';
import { resolveHtmlPath } from './util';

const { exec } = require('child_process');
const { getDiskInfo } = require('node-disk-info');

let mainWindow: BrowserWindow | null = null;
let clipboardPaths: string[] | null = null;
let clipboardAction: 'copy' | null = null;

const deleteFileOrFolderWithSudo = async (filePath: string) => {
  return new Promise<{ success: boolean; error?: string }>((resolve) => {
    const command = `rm -rf "${filePath}"`;
    sudo.exec(
      command,
      { name: 'My Electron App' },
      (error: any, stdout: string, stderr: string) => {
        if (error) {
          resolve({ success: false, error: error.message });
        } else {
          resolve({ success: true });
        }
      },
    );
  });
};

const deleteFileOrFolder = async (filePath: string) => {
  if (os.platform() === 'linux') {
    filePath = filePath.replace(/\\/g, '/');
  }

  try {
    const stats = await fs.promises.stat(filePath);
    if (stats.isDirectory()) {
      if (typeof fs.promises.rm === 'function') {
        await fs.promises.rm(filePath, { recursive: true, force: true });
      } else {
        await fs.promises.rmdir(filePath, { recursive: true });
      }
    } else {
      await fs.promises.unlink(filePath);
    }

    return { success: true };
  } catch (error: any) {
    if (
      os.platform() === 'linux' &&
      (error.code === 'EACCES' || error.code === 'EPERM')
    ) {
      return await deleteFileOrFolderWithSudo(filePath);
    }
    return { success: false, error: error.message };
  }
};

const getUniqueFilePath = async (dir: string, originalName: string) => {
  const ext = path.extname(originalName);
  const baseName = path.basename(originalName, ext);
  let copyName = `copy_${baseName}${ext}`;
  let counter = 1;

  while (fs.existsSync(path.join(dir, copyName))) {
    copyName = `copy_${baseName}(${counter})${ext}`;
    counter++;
  }

  return path.join(dir, copyName);
};

class AppUpdater {
  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify();
  }
}

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

const isDebug =
  process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

if (isDebug) {
  require('electron-debug')();
}

const installExtensions = async () => {
  const installer = require('electron-devtools-installer');
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = ['REACT_DEVELOPER_TOOLS'];

  return installer
    .default(
      extensions.map((name) => installer[name]),
      forceDownload,
    )
    .catch(() => {});
};

const createWindow = async () => {
  if (isDebug) {
    await installExtensions();
  }

  const RESOURCES_PATH = app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(__dirname, '../../assets');

  const getAssetPath = (...paths: string[]): string => {
    return path.join(RESOURCES_PATH, ...paths);
  };

  ipcMain.handle('get-files', async (_, currentPath: string) => {
    try {
      const entries = await fs.promises.readdir(currentPath, {
        withFileTypes: true,
      });

      const fileEntries = await Promise.all(
        entries.map(async (entry) => {
          const filePath = path.join(currentPath, entry.name);
          try {
            const stats = await fs.promises.stat(filePath);
            return {
              name: entry.name,
              isDirectory: entry.isDirectory(),
              size: entry.isDirectory() ? null : stats.size,
              creationDate: stats.birthtime, // или stats.ctime, если требуется
            };
          } catch (error: any) {
            if (error.code === 'ENOENT') {
              console.warn(
                `Файл не найден: ${filePath}. Возможно, он был удалён.`,
              );
            }
            return null;
          }
        }),
      );

      return fileEntries.filter((entry) => entry !== null);
    } catch (error: any) {
      throw error;
    }
  });

  ipcMain.handle('get-disks', async () => {
    const platform = os.platform();
    try {
      const disks = await getDiskInfo();

      if (platform === 'win32') {
        return disks.map((disk) => disk.mounted);
      }
      if (platform === 'darwin') {
        return disks
          .map((disk) => disk.mounted)
          .filter((p: string) => p.startsWith('/Volumes/'))
          .map((p: string) => p.replace('/Volumes/', ''));
      }
      if (platform === 'linux') {
        return disks
          .filter(
            (disk: any) =>
              disk.filesystem && /^\/dev\/sd[a-z]\d+$/.test(disk.filesystem),
          )
          .map((disk: any) => ({
            device: disk.filesystem.replace('/dev/', ''),
            mount: disk.mounted,
          }));
      }

      return [];
    } catch (error) {
      return [];
    }
  });

  ipcMain.handle('get-parent', async (_, currentPath: string) => {
    const { platform } = process;

    if (platform === 'win32') {
      if (/^[A-Za-z]:\\$/.test(currentPath)) {
        return currentPath;
      }

      const normalizedPath = currentPath.endsWith('\\')
        ? currentPath.slice(0, -1)
        : currentPath;
      let parentPath = path.dirname(normalizedPath);

      if (/^[A-Za-z]:$/.test(parentPath)) {
        parentPath += '\\';
      } else {
        parentPath += '\\';
      }

      return parentPath;
    }

    if (currentPath === '/') {
      return currentPath;
    }

    const normalizedPath = currentPath.endsWith('/')
      ? currentPath.slice(0, -1)
      : currentPath;
    let parentPath = path.dirname(normalizedPath);

    if (parentPath !== '/') {
      parentPath += '/';
    }

    return parentPath;
  });

  ipcMain.handle('get-platform', async () => {
    return os.platform();
  });

  ipcMain.handle('get-user-home', async () => {
    return os.homedir();
  });

  ipcMain.on('show-context-menu', async (event, { filePaths, targetPath }) => {
    if (!mainWindow) return;

    const template: MenuItemConstructorOptions[] = [];

    template.push({
      label: 'New Folder',
      click: () => {
        mainWindow?.webContents.send('create-folder-dialog');
      },
    });

    if (filePaths && filePaths.length > 0) {
      template.push(
        {
          label: 'Delete',
          click: async () => {
            for (const fp of filePaths) {
              await deleteFileOrFolder(fp);
            }
            mainWindow?.webContents.send('refresh-files');
          },
        },
        {
          label: 'Copy',
          click: () => {
            clipboardPaths = filePaths;
            clipboardAction = 'copy';
          },
        },
      );
    }

    template.push({
      label: 'Paste',
      enabled: clipboardPaths !== null && clipboardPaths.length > 0,
      click: async () => {
        if (!clipboardPaths || !clipboardAction) return;

        let destinationDir: string = '';
        if (targetPath) {
          try {
            const stats = await fs.promises.stat(targetPath);
            destinationDir = stats.isDirectory()
              ? targetPath
              : path.dirname(targetPath);
          } catch (err) {
            destinationDir = '';
          }
        }
        for (const cp of clipboardPaths) {
          let normalizedCp = cp;
          if (os.platform() === 'linux') {
            normalizedCp = cp.replace(/\\/g, '/');
          }
          const fileName = path.basename(normalizedCp);
          const newFilePath = await getUniqueFilePath(destinationDir, fileName);

          try {
            const stats = await fs.promises.stat(normalizedCp);
            if (stats.isDirectory()) {
              await fs.promises.cp(normalizedCp, newFilePath, {
                recursive: true,
              });
            } else {
              await fs.promises.copyFile(normalizedCp, newFilePath);
            }
          } catch (error) {
            // Skip file if error occurs during copy
          }
        }
        mainWindow?.webContents.send('refresh-files');
      },
    });

    const menu = Menu.buildFromTemplate(template);
    // Важно! Для корректного отображения контекстного меню в Electron
    // нужно учитывать особенности работы координат
    // Используем screen-относительные координаты вместо относительных к окну
    menu.popup({
      window: mainWindow,
      x: undefined,
      y: undefined,
      positioningItem: 0,
    });
  });

  ipcMain.handle('open-file', async (event, filePath) => {
    const command =
      process.platform === 'win32'
        ? `start "" "${filePath}"`
        : process.platform === 'darwin'
          ? `open "${filePath}"`
          : `xdg-open "${filePath}"`; // Linux

    return new Promise<{ success: boolean; error?: string }>((resolve) => {
      exec(command, (error: Error | null) => {
        if (error) {
          resolve({ success: false, error: error.message });
        } else {
          resolve({ success: true });
        }
      });
    });
  });

  ipcMain.handle(
    'create-folder',
    async (event, params: { parentPath: string; folderName: string }) => {
      try {
        if (!params || typeof params !== 'object') {
          return { success: false, error: 'Invalid parameters format' };
        }

        const { parentPath, folderName } = params;

        if (!parentPath || !folderName) {
          return { success: false, error: 'Invalid path or folder name' };
        }

        const folderPath = path.join(parentPath, folderName);
        await fs.promises.mkdir(folderPath, { recursive: true });

        mainWindow?.webContents.send('refresh-files');
        return { success: true };
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        return { success: false, error: errorMessage };
      }
    },
  );

  mainWindow = new BrowserWindow({
    show: false,
    width: 1024,
    height: 728,
    minWidth: 820,
    minHeight: 255,
    icon: getAssetPath('icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  mainWindow.loadURL(resolveHtmlPath('index.html'));

  mainWindow.on('ready-to-show', () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    if (process.env.START_MINIMIZED) {
      mainWindow.minimize();
    } else {
      mainWindow.show();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  const menuBuilder = new MenuBuilder(mainWindow);
  menuBuilder.buildMenu();

  // Open urls in the user's browser
  mainWindow.webContents.setWindowOpenHandler((edata) => {
    shell.openExternal(edata.url);
    return { action: 'deny' };
  });

  // Remove this if your app does not use auto updates
  // eslint-disable-next-line
  new AppUpdater();

  // Регистрируем IPC-обработчики для тегов
  ipcMain.handle('load-tags', () => {
    return loadTags();
  });

  ipcMain.handle('save-tags', (_, tags) => {
    return saveTags(tags);
  });

  ipcMain.handle('add-tag', async (event, tag) => {
    const result = await addTag(tag);
    event.sender.send('tags-updated');
    return result;
  });

  ipcMain.handle('update-tag', async (event, tag) => {
    const result = await updateTag(tag);
    event.sender.send('tags-updated');
    return result;
  });

  ipcMain.handle('remove-tag', async (event, tagId) => {
    const result = await removeTag(tagId);
    event.sender.send('tags-updated');
    return result;
  });

  ipcMain.handle('get-file-tags', (_, path) => {
    return getTagsForPath(path);
  });

  ipcMain.handle('add-path-to-tag', async (event, { tagId, path }) => {
    const result = await addPathToTag(tagId, path);
    event.sender.send('tags-updated');
    return result;
  });

  ipcMain.handle('remove-path-from-tag', async (event, { tagId, path }) => {
    const result = await removePathFromTag(tagId, path);
    event.sender.send('tags-updated');
    return result;
  });

  // Получение информации о файле/директории (для проверки isDirectory)
  ipcMain.handle('get-file-stats', async (_, filePath) => {
    try {
      const stats = await fs.promises.stat(filePath);
      return {
        isDirectory: stats.isDirectory(),
        size: stats.size,
        creationDate: stats.birthtime,
      };
    } catch (error) {
      return null;
    }
  });
};

/**
 * Add event listeners...
 */

app.on('window-all-closed', () => {
  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app
  .whenReady()
  .then(() => {
    createWindow();
    app.on('activate', () => {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (mainWindow === null) createWindow();
    });
  })
  .catch((error: unknown) => {
    // Log any startup errors
    if (error instanceof Error) {
      console.error('Application startup error:', error.message);
    } else {
      console.error('Application startup error:', error);
    }
  });
