import argparse
import json
import os
from colorama import Fore
import subprocess

CHANNEL_RELEASE = 'release'
CHANNEL_PRE_RELEASE = 'pre-release'

def next_even_number(number: int) -> int:
    if number % 2 == 0:
        return number + 2
    else:
        return number + 1

def next_odd_number(number: int) -> int:
    if number % 2 != 0:
        return number + 2
    else:
        return number + 1

def bump_version(version: str, which_part_to_bump, channel):
    major, minor, patch = version.split('.')
    major, minor, patch = int(major), int(minor), int(patch)

    if which_part_to_bump == 'major':
        if channel == CHANNEL_RELEASE:
            major += 1
            minor = 0
            patch = 0
        elif channel == CHANNEL_PRE_RELEASE:
            major += 1
            minor = 0
            patch = 1
        else:
            raise ValueError(f"Unknown channel: {channel}")
    elif which_part_to_bump == 'minor':
        if channel == CHANNEL_RELEASE:
            minor += 1
            patch = 0
        elif channel == CHANNEL_PRE_RELEASE:
            minor += 1
            patch = 1
        else:
            raise ValueError(f"Unknown channel: {channel}")
    elif which_part_to_bump == 'patch':
        if channel == CHANNEL_RELEASE:
            patch = next_even_number(patch)
        elif channel == CHANNEL_PRE_RELEASE:
            patch = next_odd_number(patch)
        else:
            raise ValueError(f"Unknown channel: {channel}")
    else:
        raise ValueError(f"Unknown part to bump: {which_part_to_bump}")
    return f"{major}.{minor}.{patch}"

def input_str(prompt: str, choices: list) -> str:
    value = input(f'Select {prompt} ({choices}):')
    if value not in choices:
        raise ValueError(f"Invalid value: {value}")
    return value

def check_run(cmd: list):
    print(f"running: {cmd}")
    subprocess.run(cmd, check=True)

def main():
    CHANNEL_CHOICES = [CHANNEL_RELEASE, CHANNEL_PRE_RELEASE]
    BUMP_CHOICES = ['major', 'minor', 'patch']

    parser = argparse.ArgumentParser(description='Trigger a release.')
    parser.add_argument('--channel', choices=CHANNEL_CHOICES, default=None, help='Specify the release channel.')
    parser.add_argument('--bump', choices=BUMP_CHOICES, default=None, help='Specify which part of the version to bump.')
    
    args = parser.parse_args()

    if args.channel is None:
        args.channel = input_str("channel", CHANNEL_CHOICES)

    if args.bump is None:
        args.bump = input_str("bump", BUMP_CHOICES)

    # read package.json, get version
    package_json_path = os.path.join(os.path.dirname(__file__), '..', 'package.json')
    with open(package_json_path, 'r') as file:
        package_data = json.load(file)
    current_version = package_data.get('version')
    if not current_version:
        raise ValueError("Version not found in package.json")

    # bump version
    next_version = bump_version(current_version, args.bump, args.channel)
    package_data['version'] = next_version

    # ARE YOU SURE
    print(f"Channel: {Fore.LIGHTRED_EX}{args.channel}{Fore.RESET}")
    print(f"Version: {Fore.LIGHTRED_EX}{current_version}{Fore.RESET} -> {Fore.LIGHTGREEN_EX}{next_version}{Fore.RESET}")
    confirm = input(f"Do you want to proceed with the release? (y/n):").strip().lower()
    if confirm != 'y':
        print("Release aborted.")
        return 1

    # write package.json
    with open(package_json_path, 'w') as file:
        json.dump(package_data, file, indent=2)

    # git add package.json
    subprocess.run(['git', 'add', package_json_path], check=True)

    # confirm git add
    confirm = input(f"Change staged. Continue? (y/n):").strip().lower()
    if confirm != 'y':
        print("Release aborted.")
        return 1
 
    check_run(['git', 'commit', '-m', f'Bump version to {next_version}'])
    check_run(['git', 'tag', f'v{next_version}'])
    check_run(['git', 'push'])
    check_run(['git', 'push', '--tags'])
    return 0

if __name__ == "__main__":
    exit_code = main()
    if exit_code != 0:
        exit(1)
    else:
        exit(0)
    
