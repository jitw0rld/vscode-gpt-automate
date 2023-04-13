// src/vscode-gpt-automate.js
const vscode = require('vscode');
const path = require('path');
const { queryApi } = require('./api.js');
const { parseCommands, getWorkspaceRootFolder } = require('./commands.js');

let workspaceFiles = '';

/**
 * @param {{ subscriptions: vscode.Disposable[]; }} context
 */
function activate(context) {
    let disposable = vscode.commands.registerCommand(
        'vscode-gpt-automate.prompt',
        async () => {
            const input = await vscode.window.showInputBox({
                placeHolder: 'Setup the files for an express app in nodejs.',
                prompt: 'Please enter a task to complete using AI.',
                ignoreFocusOut: true,
                valueSelection: [0, 0],
                validateInput: text => {
                    if (text.length === 0) {
                        return 'Please enter a task to complete using AI.';
                    }
                    return null;
                }
            });
            if (input) {
                await vscode.window.withProgress(
                    {
                        location: vscode.ProgressLocation.Notification,
                        title: 'Processing prompt...',
                        cancellable: false
                    },
                    async progress => {
                        progress.report({
                            increment: 0,
                            message: 'Getting workspace files...'
                        });
                        await getWorkspaceFiles();
                        progress.report({
                            increment: 50,
                            message: 'Waiting for AI to complete prompt...'
                        });
                        const result = await queryApi(input, workspaceFiles);

                        // RFC Handshake: Request File Content
                        // Get the file located at the path specified in the result (RFC "path")
                        // Send the content of the file to the API. Limit to 2048 characters.
                        if (result.trim().toUpperCase().startsWith('RFC')) {
                            progress.report({
                                increment: 65,
                                message: 'Handling request for file content...'
                            });
                            // Get the path
                            // The message is in the format: RFC "path/to/file" (other text)
                            // Only get the path
                            const path = result.trim().split('"')[1].trim();

                            console.log('path', path);

                            const rootFolder = getWorkspaceRootFolder();
                            if (!rootFolder) return;

                            const folderUri = vscode.Uri.joinPath(
                                rootFolder,
                                path
                            );

                            const text = new TextDecoder().decode(
                                await vscode.workspace.fs.readFile(folderUri)
                            );

                            progress.report({
                                increment: 80,
                                message:
                                    'Waiting for AI to respond to file content context...'
                            });

                            let rfcReply = await queryApi(
                                input,
                                workspaceFiles,
                                true,
                                text
                            );
                            progress.report({
                                increment: 95,
                                message: 'Processing result...'
                            });
                            console.log('rfc reply', rfcReply);
                            await parseCommands(rfcReply);
                            progress.report({ increment: 100 });
                        } else {
                            progress.report({
                                increment: 95,
                                message: 'Processing result...'
                            });
                            await parseCommands(result);
                            progress.report({ increment: 100 });
                        }
                    }
                );

                vscode.window.showInformationMessage('Done!');
            }
        }
    );
    context.subscriptions.push(disposable);
}

async function getWorkspaceFiles() {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
        return;
    }

    const files = await vscode.workspace.findFiles(
        '**/*',
        '**/node_modules/**' // exclude node_modules
    );

    const fileNames = files.map(file => {
        return `'./${path.relative(vscode.workspace.rootPath, file.fsPath)}'`;
    });

    workspaceFiles = `${fileNames.join('\n')}\n`;
}

getWorkspaceFiles();

exports.activate = activate;
