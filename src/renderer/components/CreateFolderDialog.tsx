import React from 'react';

interface CreateFolderDialogProps {
  isOpen: boolean;
  folderName: string;
  onFolderNameChange: (name: string) => void;
  onCancel: () => void;
  onCreate: () => void;
}

const CreateFolderDialog: React.FC<CreateFolderDialogProps> = ({
  isOpen,
  folderName,
  onFolderNameChange,
  onCancel,
  onCreate,
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-dialog">
        <form method="dialog" onSubmit={(e) => e.preventDefault()}>
          <h3>Create New Folder</h3>
          <input
            type="text"
            value={folderName}
            onChange={(e) => onFolderNameChange(e.target.value)}
            placeholder="Folder Name"
            autoFocus
          />
          <div className="dialog-buttons">
            <button type="button" onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" onClick={onCreate}>
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateFolderDialog;
