import os
import stat
from pathlib import Path

if os.name == 'nt':
    python_cmd_name = 'python'
else:
    python_cmd_name = 'python3'

repo_path = (Path(__file__) / ".." / "..").resolve()
check_script_path = repo_path / "codecheck" / "encoding_check.py"

precommit_hook_content = f'''#!/bin/sh
{python_cmd_name} "{check_script_path}"
'''
postcommit_hook_content = f'''#!/bin/sh
{python_cmd_name} "{check_script_path}" --full
'''

def setupHook(filename, content):
    hook_dir = Path(__file__).parent.parent / '.git' / 'hooks'
    hook_dir.mkdir(parents=True, exist_ok=True)
    hook_file = hook_dir / filename
    hook_file.write_text(content)
    hook_file.chmod(hook_file.stat().st_mode | stat.S_IEXEC)
    print(f"hook set up: {hook_file}")

setupHook('pre-commit', precommit_hook_content)
setupHook('post-commit', postcommit_hook_content)
