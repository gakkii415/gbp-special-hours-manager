"""Keep same-task retry commits on the explicitly recorded starting SHA."""
import re
import subprocess


def git(*args):
    return subprocess.check_output(['git', *args], text=True).strip()


def task_base():
    value = git('log', '-1', '--format=%(trailers:key=Task-Base,valueonly)')
    if not value:
        return git('rev-parse', 'HEAD^')
    if not re.fullmatch(r'[0-9a-f]{40}', value):
        raise ValueError('Task-Base must contain exactly one full starting commit SHA')
    subprocess.run(['git', 'merge-base', '--is-ancestor', value, 'HEAD^'], check=True)
    return value


if __name__ == '__main__':
    print(task_base())
