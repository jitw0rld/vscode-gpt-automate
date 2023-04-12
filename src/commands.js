// src/commands.js
const vscode = require('vscode');

async function handleNewFileCommand(filePath) {
    const rootFolder = getWorkspaceRootFolder();
    if (!rootFolder) return;

    const fileUri = vscode.Uri.joinPath(rootFolder, filePath);
    try {
        await vscode.workspace.fs.writeFile(fileUri, new Uint8Array([]));
    } catch (error) {
        vscode.window.showErrorMessage(
            `Error creating file ${filePath}: ${error.message}`
        );
    }
}

async function handleNewFolderCommand(folderPath) {
    const rootFolder = getWorkspaceRootFolder();
    if (!rootFolder) return;

    const folderUri = vscode.Uri.joinPath(rootFolder, folderPath);
    try {
        await vscode.workspace.fs.createDirectory(folderUri);
    } catch (error) {
        vscode.window.showErrorMessage(
            `Error creating folder ${folderPath}: ${error.message}`
        );
    }
}

async function handleDelFileCommand(filePath) {
    const rootFolder = getWorkspaceRootFolder();
    if (!rootFolder) return;

    const fileUri = vscode.Uri.joinPath(rootFolder, filePath);
    try {
        await vscode.workspace.fs.delete(fileUri, { recursive: true });
    } catch (error) {
        vscode.window.showErrorMessage(
            `Error deleting file ${filePath}: ${error.message}`
        );
    }
}

async function handleWriteToFileCommand(filePath, content) {
    const rootFolder = getWorkspaceRootFolder();
    if (!rootFolder) return;

    const fileUri = vscode.Uri.joinPath(rootFolder, filePath);
    content = content
        .replace(/\\n/g, '\n')
        .replace(/\\t/g, '\t')
        .replace(/\\\"/g, '"');
    const contentBytes = new TextEncoder().encode(content);

    try {
        await vscode.workspace.fs.writeFile(fileUri, contentBytes);
    } catch (error) {
        vscode.window.showErrorMessage(
            `Error writing to file ${filePath}: ${error.message}`
        );
    }
}

function handleExecuteCommand(command) {
    const terminal = vscode.window.createTerminal();
    terminal.sendText(command.trim().replace('"', ''));
    terminal.show();
}

function handleInvalidRequest(reason) {
    vscode.window.showErrorMessage(
        `One or more action(s) could not be completed. Reason: "${reason}"`
    );
}

async function handleMovePathCommand(oldPath, newPath) {
    const rootFolder = getWorkspaceRootFolder();
    if (!rootFolder) return;

    const oldFileUri = vscode.Uri.joinPath(rootFolder, oldPath);
    const newFileUri = vscode.Uri.joinPath(rootFolder, newPath);

    try {
        await vscode.workspace.fs.rename(oldFileUri, newFileUri);
    } catch (error) {
        vscode.window.showErrorMessage(
            `Error moving file ${oldPath} to ${newPath}: ${error.message}`
        );
    }
}

async function handleAppendToFileCommand(filePath, content) {
    const rootFolder = getWorkspaceRootFolder();
    if (!rootFolder) return;

    const fileUri = vscode.Uri.joinPath(rootFolder, filePath);
    try {
        const existingContentBytes = await vscode.workspace.fs.readFile(
            fileUri
        );
        const existingContent = new TextDecoder().decode(existingContentBytes);

        content = content.replace(/\\n/g, '\n').replace(/\\t/g, '\t');
        content = existingContent + content;
        const contentBytes = new TextEncoder().encode(content);

        await vscode.workspace.fs.writeFile(fileUri, contentBytes);
    } catch (error) {
        vscode.window.showErrorMessage(
            `Error appending to file ${filePath}: ${error.message}`
        );
    }
}

function getWorkspaceRootFolder() {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
        vscode.window.showErrorMessage('No workspace folder is currently open');
        return null;
    }
    return workspaceFolders[0].uri;
}

/**
 * @param {string} result
 */
async function parseCommands(result) {
    const commands = result
        .split('~.')
        .filter(command => command !== '')
        .map(command => {
            if (command.startsWith('.')) {
                command = command.slice(1);
            }

            const commandParts = command.split(' ');
            const commandType = commandParts[0];
            const commandArgs = commandParts
                .slice(1)
                .map(arg => arg.replace(/^"|"$/g, ''));

            return { type: commandType, args: commandArgs };
        });

    for (const command of commands) {
        switch (command.type) {
            case 'NEW_FILE':
                await handleNewFileCommand(command.args.join(' '));
                break;
            case 'NEW_FOLDER':
                await handleNewFolderCommand(command.args.join(' '));
                break;
            case 'DEL_PATH':
                await handleDelFileCommand(command.args.join(' '));
                break;
            case 'WRITE_TO_FILE':
                await handleWriteToFileCommand(
                    command.args[0],
                    command.args.slice(1).join(' ').replace(/\\"/g, '"')
                );
                break;
            case 'EXECUTE_COMMAND':
                handleExecuteCommand(command.args.join(' '));
                break;
            case 'INVALID_REQUEST':
                handleInvalidRequest(command.args.join(' '));
                break;
            case 'MOV_PATH':
                await handleMovePathCommand(command.args[0], command.args[1]);
                break;
            case 'APPEND_TO_FILE':
                await handleAppendToFileCommand(
                    command.args[0],
                    command.args.slice(1).join(' ')
                );
                break;
            case 'RFC':
                break;
            default:
                vscode.window.showErrorMessage(
                    `OpenAI returned an invalid command: ${command.type} (Make an issue on GitHub if this happens a lot!)`
                );
        }
    }
}

module.exports = {
    handleNewFileCommand,
    handleNewFolderCommand,
    handleDelFileCommand,
    handleWriteToFileCommand,
    handleExecuteCommand,
    handleInvalidRequest,
    handleMovePathCommand,
    handleAppendToFileCommand,
    parseCommands,
    getWorkspaceRootFolder
};
