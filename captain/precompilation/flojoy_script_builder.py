import ast
from collections import deque
import inspect
import os
import shutil
from typing import Any, cast
from PYTHON.utils.dynamic_module_import import get_module_func, get_module_path

from captain.precompilation.precompilation_utils import extract_pip_packages
from captain.precompilation.templates.classes.LightTopology import LightTopology
from captain.precompilation.templates.functions.get_missing_pip_packages import (
    get_missing_pip_packages,
)


class FlojoyScriptBuilder:
    '''
    Class used for building the string of the flojoy script.
    '''
    def __init__(self):
        self.items = []
        self.indent_level = 0
        self.imports = set()

    def add_import(self, import_string: str, alias: str | None = None, from_string: str | None = None):
        '''
        imports modules that aren't imported otherwise but necessary
        '''
        if from_string:
            if alias:
                self.imports.add(f"from {from_string} import {import_string} as {alias}")
            else:
                self.imports.add(f"from {from_string} import {import_string}")
        else:
            if alias:
                self.imports.add(f"import {import_string} as {alias}")
            else:
                self.imports.add(f"import {import_string}")

    def afc(self, item: Any):
        '''
        Add a function or class
        '''
        source_code_lines = inspect.getsource(item).splitlines()
        # Add the correct number of tab characters to the start of each line
        source_code_lines = [
            "\t" * self.indent_level + line for line in source_code_lines
        ]
        self.items += source_code_lines
        self.ami(item)

    def acb(self, block: str):
        '''
        Add a code block
        '''
        formatted = ["\t" * self.indent_level + line for line in block.splitlines()]
        self.items += formatted

    def al(self, name: str, items: Any):
        '''
        Make a list
        '''
        self.acb(f"{name} = []")
        for item in items:
            self.acb(f"{name}.append({item})")

    def ii(self):
        '''
        Increase indent level
        '''
        self.indent_level += 1

    def ri(self):
        '''
        Reduce indent level
        '''
        self.indent_level = max(0, self.indent_level - 1)
    
    def ad(self, name: str, dict: dict):
        '''
        Add a dict
        '''
        self.acb(f"{name} = {{}}")
        for node in dict:
            self.acb(f"{name}['{node}'] = '{dict[node]}'")

    def ami(self, item):
        '''
        Add module imports
        '''

        # Get the file where the function or class is defined
        file_path = inspect.getfile(item)

        # Read the file and parse it into an Abstract Syntax Tree
        with open(file_path, "r") as file:
            module_ast = ast.parse(file.read())

        # Find all import statements in the AST
        for node in ast.walk(module_ast):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    self.imports.add(f"import {alias.name}")
            elif isinstance(node, ast.ImportFrom):
                if node.level > 0:
                    dots = "." * node.level
                    module = f"{dots}{node.module}"
                else:
                    module = node.module
                for alias in node.names:
                    self.imports.add(f"from {module} import {alias.name}")

    def write_to_file(self, filename: str):
        # Create the final string with all the import statements and code items
        all_items = list(self.imports) + self.items
        final_string = "\n".join(all_items)

        with open(filename, "w") as f:
            f.write(final_string)

    def install_missing_pip_packages(self, nodes: list):
        packages = extract_pip_packages(nodes)
        self.afc(get_missing_pip_packages)
        self.al("packages", packages)
        self.acb("get_missing_pip_packages(packages)")

    def import_app_nodes(self, graph_nodes, path_to_output: str, is_ci: bool):
        '''
        Import app nodes and return node-to-function mapping
        '''
        node_id_to_func = {}
        self.imports.add("import sys")
        self.imports.add("import os")
        self.acb("sys.path.append(os.path.join(sys.path[0], 'PYTHON'))")
        imported = set() # keep track of imported files
        for node in graph_nodes:
            # -- get node module and check if CI --
            node = cast(dict[str, Any], graph_nodes[node])
            cmd: str = node["cmd"]
            cmd_mock: str = node["cmd"] + "_MOCK"
            func_module = get_module_func(cmd)
            node_id_to_func[node] = getattr(func_module, cmd).__name__
            ci_available = False
            if is_ci:
                try:
                    func_mock = getattr(
                        func_module, cmd_mock
                    )  # test to see if mock function exists
                    ci_available = True
                    node_id_to_func[node] = func_mock.__name__
                except AttributeError:
                    pass
            # ---------------------------------------

            # -- copy module directory to output directory --
            module_path = get_module_path(cmd)
            module_path = module_path.replace(".", os.path.sep)
            module_dir = module_path[: module_path.rfind(os.path.sep)]
            shutil.copytree(module_dir, os.path.join(path_to_output, module_dir))
            imported.add(module_dir)
            # ------------------------------------------------

            # -- check imports of module, and import any missing files recursively (only from nodes/) --
            stack = deque()
            stack.append(ast.parse(inspect.getsource(func_module)))
            while len(stack) > 0:
                module = stack.pop()
                for node in ast.walk(module):

                    if not (
                        isinstance(node, ast.Import) or isinstance(node, ast.ImportFrom)
                    ):
                        continue
                    module_name = node.module if isinstance(node, ast.ImportFrom) else node.names[0].name
                    if module_name is None:
                        raise ValueError("module name is None")
                    if not module_name.startswith("nodes."):
                        continue

                    path = (
                        "PYTHON"
                        + os.path.sep
                        + module_name.replace(".", os.path.sep)
                        + ".py"
                    )
                    if path in imported:
                        continue
                    destination_path = os.path.join(path_to_output, path)
                    destination_dir = os.path.dirname(destination_path)
                    if not os.path.exists(destination_dir):
                        os.makedirs(destination_dir)
                    shutil.copy(path, destination_path)
                    imported.add(path)
                    with open(path, "r") as f:
                        stack.append(ast.parse(f.read()))
            # ------------------------------------------------------------------------------------------

            # -- import module --
            module_dir = module_dir.replace(os.path.sep, ".")
            if ci_available:
                self.acb(f"from {module_dir} import {cmd_mock} as {cmd}")
            else:
                self.acb(f"from {module_dir} import {cmd}")
            # ------------------

        # add node_to_func to script (mapping of node_ids to function names)
        self.al("node_id_to_func", node_id_to_func)
    
    def add_execution_logic(self, topology):

