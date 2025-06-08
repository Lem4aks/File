declare global {
  interface Window {
    electron: {
      ipcRenderer: {
        [x: string]: any;
        invoke: (channel: string, ...args: any[]) => Promise<any>;
      };
    };
  }
}

export {};
