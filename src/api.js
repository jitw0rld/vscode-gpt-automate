// src/api.js
const vscode = require('vscode');
const request = require('request');
const api = 'https://ethanmrettinger.dev';

function getApiKey() {
    const config = vscode.workspace.getConfiguration('vscode-gpt-automate');
    const apiKey = config.get('apiKey');
    return apiKey;
}

/**
 * @param {string} text
 * @param {string} workspaceFiles
 */
async function queryApi(text, workspaceFiles) {
    const apiKey = getApiKey();

    if (!apiKey) {
        vscode.window.showErrorMessage(
            'Error: No API key found. Please set one in the extension settings.'
        );
        return;
    }

    const options = {
        url: `${api}/api`,
        method: 'POST',
        headers: {
            'x-api-key': apiKey
        },
        json: {
            prompt: text,
            workspaceFiles: workspaceFiles,
            model: vscode.workspace
                .getConfiguration('vscode-gpt-automate')
                .get('model')
        }
    };

    return new Promise((resolve, reject) => {
        request(options, (error, response, body) => {
            // if response has an error, response body will have err property set to true
            console.log('Body: ' + JSON.stringify(body, null, 2));
            console.log(
                'Response body: ' + JSON.stringify(response.body, null, 2)
            );
            if (error) {
                vscode.window.showErrorMessage(`Error: ${error.message}`);
                reject(error);
            } else if (body.err) {
                vscode.window.showErrorMessage(
                    `Error: ${response.body.errMessage}`
                );
                reject(error);
            } else {
                resolve(body);
            }
        });
    });
}

module.exports = { queryApi, getApiKey };
