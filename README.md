# vscode-gpt-automate

Automatically perform actions with ChatGPT-turbo-3.5. Please do not steal my api key in here lol

## Features

### Capabilities

-   Make files with code in them
-   Create a project structure
-   Run commands, files and programs automatically
-   Create a workspace
-   Works in any language (But you **MUST** be specific!)

### Limitation:

-   It can not view your project structure or any code in the project **(WORK IN PROGRESS)**
-   It can only write so much text in files in one prompt
-   It has a tendency to reject prompts, even if they are good. Try to word it a little differently and be more verbose.
-   It can not work with files outside of the workspace
-   It has a tendency to reject prompts not JavaScript or C related due to the pre-prompt included in the code. This just means be more verbose and it will likely work.

## How to Install

1. Download the .vsix file
2. Open VSCode
3. Press Ctrl+Shift+X
4. Click the 3 dots in the top right corner
5. Click "Install from VSIX..."
6. Select the .vsix file
7. Reload VSCode

## How to Use

1. Open a workspace
2. Press CTRL+SHIFT+P
3. Type "GPT"
4. Select "GPT Automate Prompt"
5. Type your prompt
6. Press Enter
7. If your prompt is rejected you will get an INVALID_REQUEST error, so try again.

## How to write Good Prompts

-   Be Specific
-   Tell it what files to make
-   Tell it if you want to run it afterwards or not
-   Tell it what language(s) to use

### Good Prompts:

-   Make a nodejs program in JavaScript that says babbur 1,000 times and run it
-   Make a website in HTML with a few buttons on it that when clicked alert babbur
-   Make a file called main.py, write a program in Python that says babbur 1,000 times, and run it
-   Make a file called main.js, write a program in JavaScript that says babbur 1,000 times, and run it

### Bad Prompts:

-   Make a program that says babbur
-   Make snake
-   Make a website that says babbur
-   Make an app
