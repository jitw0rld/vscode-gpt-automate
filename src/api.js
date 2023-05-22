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
 * @param {boolean} isRFCHandshake
 * @param {string} rfcContent
 * @returns {Promise<string>}
 */
async function queryApi(
    text,
    workspaceFiles,
    isRFCHandshake = false,
    rfcContent = ''
) {
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
                .get('model'),
            rfc: isRFCHandshake,
            rfcContent: rfcContent
        },
        timeout: 65000
    };

    return new Promise((resolve, reject) => {
        request(options, (error, response, body) => {
            if (error) {
                vscode.window.showErrorMessage(`Error: ${error.message}`);
                reject(error);
            } else if (body.err) {
                vscode.window.showErrorMessage(
                    `Error: ${response.body.error.message}`
                );
                reject(error);
            } else {
                console.log(body);
                resolve(body);
            }
        });
    });
}

module.exports = { queryApi, getApiKey };
