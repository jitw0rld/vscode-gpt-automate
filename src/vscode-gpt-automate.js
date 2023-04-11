// src/vscode-gpt-automate.js
const vscode = require('vscode');
const path = require('path');
const { queryApi } = require('./api.js');
const { parseCommands } = require('./commands.js');

let workspaceFiles = '';

// /**
//  * @param {{ subscriptions: vscode.Disposable[]; }} context
//  */
// function activate(context) {
//     let disposable = vscode.commands.registerCommand(
//         'vscode-gpt-automate.prompt',
//         async () => {
//             const input = await vscode.window.showInputBox({
//                 placeHolder: 'Setup the files for an express app in nodejs.',
//                 prompt: 'Please enter a task to complete using AI.',
//                 ignoreFocusOut: true,
//                 valueSelection: [0, 0],
//                 validateInput: text => {
//                     if (text.length === 0) {
//                         return 'Please enter a task to complete using AI.';
//                     }
//                     return null;
//                 }
//             });
//             if (input) {
//                 await vscode.window.withProgress(
//                     {
//                         location: vscode.ProgressLocation.Notification,
//                         title: 'Processing prompt...',
//                         cancellable: false
//                     },
//                     async progress => {
//                         progress.report({
//                             increment: 0,
//                             message: 'Getting workspace files...'
//                         });
//                         await getWorkspaceFiles();
//                         progress.report({
//                             increment: 50,
//                             message: 'Waiting for AI to complete prompt...'
//                         });
//                         const result = await queryApi(input, workspaceFiles);
//                         progress.report({
//                             increment: 95,
//                             message: 'Processing result...'
//                         });
//                         await parseCommands(result);
//                         progress.report({ increment: 100 });
//                     }
//                 );

//                 vscode.window.showInformationMessage('Done!');
//             }
//         }
//     );
//     context.subscriptions.push(disposable);
// }

/**
 * @param {{ subscriptions: vscode.Disposable[]; }} context
 */
async function activate(context) {
    context.subscriptions.push(
        vscode.commands.registerCommand('vscode-gpt-automate.prompt', () => {
            const panel = vscode.window.createWebviewPanel(
                'vscode-gpt-automate',
                'GPT Automate',
                vscode.ViewColumn.One,
                {
                    enableScripts: true
                }
            );

            panel.webview.html = getWebviewContent();

            panel.webview.onDidReceiveMessage(
                async message => {
                    switch (message.command) {
                        case 'processTask':
                            const task = message.text;
                            if (task) {
                                await vscode.window.withProgress(
                                    {
                                        location:
                                            vscode.ProgressLocation
                                                .Notification,
                                        title: 'Processing prompt...',
                                        cancellable: false
                                    },
                                    async progress => {
                                        progress.report({
                                            increment: 0,
                                            message:
                                                'Getting workspace files...'
                                        });
                                        await getWorkspaceFiles();
                                        progress.report({
                                            increment: 50,
                                            message:
                                                'Waiting for AI to complete prompt...'
                                        });
                                        const result = await queryApi(
                                            task,
                                            workspaceFiles
                                        );
                                        progress.report({
                                            increment: 95,
                                            message: 'Processing result...'
                                        });
                                        await parseCommands(result);
                                        progress.report({ increment: 100 });
                                    }
                                );

                                vscode.window.showInformationMessage('Done!');
                            }
                            return;
                    }
                },
                undefined,
                context.subscriptions
            );
        })
    );
}

function getWebviewContent() {
    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>GPT Automate</title>
            <style>
                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
                    padding: 20px;
                }
                h1 {
                    font-size: 2rem;
                    margin-bottom: 20px;
                }
                form {
                    display: flex;
                    flex-direction: column;
                }
                label {
                    font-size: 1.5rem;
                    margin-bottom: 10px;
                }
                textarea {
                    font-size: 1.5rem;
                    padding: 10px;
                    margin-bottom: 10px;
                    /* match base vscode colors */
                    background-color: #1e1e1e;
                    color: #d4d4d4;
                    border: 1px solid #3f3f46;
                    border-radius: 4px;
                }
                button {
                    /* call to action */
                    background-color: #007acc;
                    color: #fff;
                    font-size: 1.5rem;
                    padding: 10px;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                }
            </style>

        </head>
        <body>
            <h1>GPT Automate</h1>
            <form id="task-form">
                <label for="task-input">Please enter a task to complete using AI:</label>
                <textarea type="text" id="task-input" name="task-input" required></textarea>
                <button type="submit">Submit</button>
            </form>
            <script>
                const vscode = acquireVsCodeApi();

                document.getElementById('task-form').addEventListener('submit', (event) => {
                    event.preventDefault();
                    const task = document.getElementById('task-input').value;
                    vscode.postMessage({
                        command: 'processTask',
                        text: task
                    });
                });
            </script>
        </body>
        </html>`;
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
