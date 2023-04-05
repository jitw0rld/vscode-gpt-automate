import os
import requests
from pathlib import Path
import shlex
import shutil

import pynvim

api = 'https://ethanmrettinger.dev'


@pynvim.plugin
class GPTAutomate(object):
    def __init__(self, nvim):
        self.nvim = nvim

    def get_api_key(self):
        return self.nvim.eval("g:vscode_gpt_automate_api_key")

    @pynvim.command("GPTAutomatePrompt", nargs="*", range="")
    def prompt(self, args, range):
        api_key = self.get_api_key()
        if not api_key:
            self.nvim.err_write(
                "Error: No API key found. Please set one in the plugin settings.\n")
            return

        input_prompt = self.nvim.funcs.input(
            "Please enter a task to complete using AI: ")
        if not input_prompt:
            return

        self.nvim.out_write("Processing prompt...\n")
        result = self.query_api(input_prompt)
        self.nvim.out_write("Processing result...\n")
        self.parse_commands(result)
        self.nvim.out_write("Done!\n")

    def query_api(self, text):
        headers = {"x-api-key": self.get_api_key()}
        json_data = {"prompt": text,
                     "workspaceFiles": self.get_workspace_files()}
        response = requests.post(f"{api}/api", headers=headers, json=json_data)
        response.raise_for_status()
        return response.text

    def parse_commands(self, result):
        commands = result.strip().split("~.")
        for command in commands:
            if not command:
                continue

            if command.startswith("."):
                command = command[1:]

            cmd, *args = shlex.split(command)

            if cmd == "NEW_FILE":
                self.handle_new_file_command(args[0])
            elif cmd == "NEW_FOLDER":
                self.handle_new_folder_command(args[0])
            elif cmd == "DEL_PATH":
                self.handle_del_path_command(args[0])
            elif cmd == "WRITE_TO_FILE":
                self.handle_write_to_file_command(args[0], " ".join(args[1:]))
            elif cmd == "EXECUTE_COMMAND":
                self.handle_execute_command(" ".join(args))
            elif cmd == "INVALID_REQUEST":
                self.handle_invalid_request(" ".join(args))
            elif cmd == "MOV_PATH":
                self.handle_move_path_command(args[0], args[1])
            else:
                self.nvim.err_write(
                    f"OpenAI returned an invalid command: {cmd}\n")

    def get_workspace_files(self):
        workspace_root = Path(self.nvim.eval("getcwd()"))
        workspace_files = []

        for root, _, files in os.walk(workspace_root):
            for file in files:
                if "node_modules" not in root:
                    workspace_files.append(str(Path(root) / file))

        return workspace_files

    def handle_new_file_command(self, file_path):
        workspace_root = Path(self.nvim.eval("getcwd()"))
        file_path = workspace_root / file_path
        file_path.parent.mkdir(parents=True, exist_ok=True)
        file_path.touch()

    def handle_new_folder_command(self, folder_path):
        workspace_root = Path(self.nvim.eval("getcwd()"))
        folder_path = workspace_root / folder_path
        folder_path.mkdir(parents=True, exist_ok=True)

    def handle_del_path_command(self, path):
        workspace_root = Path(self.nvim.eval("getcwd()"))
        path = workspace_root / path
        if path.exists():
            if path.is_file():
                path.unlink()
            else:
                path.r
                shutil.rmtree(path)
        else:
            self.nvim.err_write(f"Error: path {path} does not exist.\n")

    def handle_write_to_file_command(self, file_path, content):
        workspace_root = Path(self.nvim.eval("getcwd()"))
        file_path = workspace_root / file_path
        content = content.replace("\\n", "\n").replace(
            "\\t", "\t").replace('\\"', '"')
        with file_path.open("w") as file:
            file.write(content)

    def handle_execute_command(self, command):
        buf = self.nvim.current.buffer
        window = self.nvim.current.window

        buf.append([f"!{command}"])
        window.cursor = [len(buf), 0]

    def handle_invalid_request(self, reason):
        self.nvim.err_write(
            f"One or more action(s) could not be completed. Reason: '{reason}'\n")

    def handle_move_path_command(self, old_path, new_path):
        workspace_root = Path(self.nvim.eval("getcwd()"))
        old_path = workspace_root / old_path
        new_path = workspace_root / new_path

        if old_path.exists():
            new_path.parent.mkdir(parents=True, exist_ok=True)
            shutil.move(str(old_path), str(new_path))
        else:
            self.nvim.err_write(f"Error: path {old_path} does not exist.\n")
