import os
import sys
import subprocess
import logging
from pathlib import Path
import argparse

def check_diff(repo_path : Path, incremental=False):
    empty_tree_hash = '4b825dc642cb6eb9a060e54bf8d69288fbee4904'
    cmd =['git', 'diff', '--staged', 'HEAD'] if incremental else ['git', 'diff', empty_tree_hash, 'HEAD']
    result = subprocess.run(cmd,
                            cwd=repo_path,
                            stdout=subprocess.PIPE,
                            text=False,
                            #encoding='utf-8',
                            check=True)
    output = result.stdout
    diff_path = repo_path / "log" / "staged.diff"
    with open(diff_path, 'wb') as f:
        f.write(output)

    ok = True
    current_file = "<unknown>"
    bad_file_set = set()
    for i, line in enumerate(output.split(b'\n'), start=1):
        if line.startswith(b'diff --git'):
            # current_file example: b/src/test/extension.test.ts
            current_file = line.split()[-1].decode('utf-8')
            if current_file.startswith('b/') or current_file.startswith('a/'):
                # current_file example: src/test/extension.test.ts
                current_file = current_file[2:]
        if line.startswith(b'+') and b'\r' in line:
            if current_file not in bad_file_set:
                bad_file_set.add(current_file)
                logging.error(f"CR in file {current_file}, see {diff_path}:{i}.")
            ok = False
        
        if line.startswith(b'+') and b'\xef\xbb\xbf' in line:
            if current_file not in bad_file_set:
                bad_file_set.add(current_file)
                logging.error(f"BOM in file {current_file}, see {diff_path}:{i}.")
            ok = False

    return ok

if __name__ == "__main__":

    parser = argparse.ArgumentParser(description="Check for encoding issues in git diffs.")
    parser.add_argument('--full', action='store_true', help='Run a full check instead of an incremental one.')
    args = parser.parse_args()

    repo_path = (Path(__file__) / ".." / "..").resolve()
    log_path = (repo_path / "log").resolve()
    os.makedirs("log", exist_ok=True)
    passed = True

    if not check_diff(repo_path, incremental=not args.full):
        passed = False
    
    if passed:
        logging.info("Encoding checks passed.")
        sys.exit(0)
    else:
        sys.exit(1)
