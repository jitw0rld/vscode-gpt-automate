![vscode-gpt-automate](https://user-images.githubusercontent.com/79817320/228329856-d289f84e-234d-463e-baa7-4cc2d14280ef.png)

# vscode-gpt-automate 🤖

Exponentiate your developer workflow using ChatGPT seamlessly integrated into VSCode.

Here is a **FREE** API key that is usable for the duration of the Public Beta:
```bb9bf2e8-4cbd-4550-af69-e55da038729a```

Email me to register for a new key (`ethan@ethanmrettinger.dev`)

## Features 🔥

### Capabilities 🚀

-   ✅ Make files with code in them
-   ✅ Create a project structure
-   ✅ Run commands, files and programs automatically
-   ✅ Create a workspace
-   ✅ Works in any language (But you **MUST** be specific!)
-   ✅ Can see the file names of all files in your workspace (excluding node_modules because it is too large)

### Limitation ⚠️

-   ❌ It can not view code in any of your files
-   ❌ It can only write so much text in files in one prompt
-   ❌ It has a tendency to reject prompts, even if they are good. Try to word it a little differently and be more verbose.
-   ❌ It can not work with files outside of the workspace
-   ❌ It has a tendency to reject prompts not JavaScript or C related due to the pre-prompt included in the code. This just means be more verbose and it will likely work.
-   ❌ Prompt max length can be reached if you have a very large workspace. This is being fixed.

## Examples 📒

### Smart File Generation 📂

![demo_1](https://user-images.githubusercontent.com/79817320/228382472-984a9973-131a-4c77-9634-2709b9f4feb9.gif)

### Workspace Context 🧠

![demo_2](https://user-images.githubusercontent.com/79817320/228382440-a2b5c8dc-03e4-4926-87cb-c1bd33601897.gif)

### Instantly Complete Tedious Tasks 😴

![demo_3](https://user-images.githubusercontent.com/79817320/228382407-7a842e0e-b28b-467a-af4e-d1e4398e5ca9.gif)

### Workflow Enhancer ⏩

![demo_4](https://user-images.githubusercontent.com/79817320/228382413-65a3b37a-ab25-4feb-8bd7-d2b40b5e75d2.gif)

## Installation 📦

### Visual Studio Code

1. Search `vscode-gpt-automate` in the Extensions marketplace
2. Click Install
3. Navigate to settings, and under **Extensions > GPT Automate** (or search `vscode-gpt-automate`), set your API key.
4. Reload VSCode if necessary

## How to Use 📝

### Visual Studio Code

1. Open a workspace
2. Press `CTRL+SHIFT+P`
3. Type "`GPT`"
4. Select `GPT Automate Prompt`
5. Type your prompt
6. Press Enter

While it _may_ be able to deliver on bad prompts, it's **generally recommended** to stick with good prompt conventions to get more reliable results.

## How to write Good Prompts

-   ✅ Be Specific
-   ✅ Tell it what files to make
-   ✅ Tell it if you want to run it afterwards or not
-   ✅ Tell it what language(s) to use

### Good Prompts:

-   ✅ Make a nodejs program in JavaScript that says babbur 1,000 times and run it
-   ✅ Make a website in HTML with a few buttons on it that when clicked alert babbur
-   ✅ Make a file called main.py, write a program in Python that says babbur 1,000 times, and run it
-   ✅ Make a file called main.js, write a program in JavaScript that says babbur 1,000 times, and run it
-   ✅ Delete all files in my workspace besides 'index.js' and 'main.js' and make a file called 'index.js' that says babbur 1,000 times and run it

### Bad Prompts:

-   ❌ Make a program that says babbur
-   ❌ Make snake
-   ❌ Make a website that says babbur
-   ❌ Make an app
