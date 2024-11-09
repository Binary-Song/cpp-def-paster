import os
import sys
import subprocess
import logging
from pathlib import Path

def check_encoding(file_path):
    try:
        with open(file_path, 'rb') as f:
            raw_data = f.read()
            if raw_data.startswith(b'\xef\xbb\xbf'):
                logging.error(f"File {file_path} contains BOM.")
                return False
            raw_data.decode('utf-8')

    except UnicodeDecodeError:
        logging.error(f"File {file_path} is not UTF-8 encoded.")
        return False
    return True

def check_repo_encoding(repo_path):
    try:
        result = subprocess.run(['git', 'ls-files', '--eol'], cwd=repo_path, stdout=subprocess.PIPE, text=True, check=True)
        files = result.stdout.splitlines()
        all_files_passed = True
        for file_info in files:
            parts = file_info.split()
            if len(parts) < 4:
                logging.error(f"Failed to parse git ls-files output: {file_info}")
                all_files_passed = False
                continue
            index_eol, workdir_eol, attr, file_rel_path = parts[0], parts[1], parts[2], parts[3]
            is_text_file = '-text' not in attr
            if is_text_file: # only check text files
                file_path = os.path.join(repo_path, file_rel_path)
                if not check_encoding(file_path):
                    all_files_passed = False
        return all_files_passed
    except subprocess.CalledProcessError as e:
        logging.error(f"Error: {e}")
        return False

def check_diff(repo_path : Path, incremental=False):
    empty_tree_hash = '4b825dc642cb6eb9a060e54bf8d69288fbee4904'
    diff_target = 'HEAD' if incremental == True else empty_tree_hash
    result = subprocess.run(['git', 'diff', '--staged', diff_target],
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
        if b'\r' in line:
            if current_file not in bad_file_set:
                bad_file_set.add(current_file)
                logging.error(f"Staged area diff: CR character in file {current_file}, see {diff_path}:{i}. Only LF line ending is allowed.")
            ok = False
    
    return ok

if __name__ == "__main__":
    repo_path = (Path(__file__) / ".." / "..").resolve()
    log_path = (repo_path / "log").resolve()
    os.makedirs("log", exist_ok=True)
    passed = True
    if not check_repo_encoding(repo_path):
        passed = False

    if not check_diff(repo_path, incremental=False):
        passed = False
    
    if passed:
        logging.info("Encoding checks passed.")
        sys.exit(0)
    else:
        sys.exit(1)
