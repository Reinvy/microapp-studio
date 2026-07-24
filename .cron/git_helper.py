#!/usr/bin/env python3
"""
MicroApp Studio — Git Helper Script for Autonomous Cron Agents
Provides: branch creation, commit, push, PR creation/status
Usage: python3 .cron/git_helper.py <command> [args]
"""
import json, os, subprocess, sys, re

# Look for token in home dir first (safe), then project dir (legacy fallback)
TOKEN_PATHS = [
    os.path.expanduser("~/.cron_github_token"),
    os.path.expanduser("/opt/data/workspace/microapp-studio/.github_token"),
]
PROJECT_DIR = os.path.expanduser("/opt/data/workspace/microapp-studio")

def load_token():
    for path in TOKEN_PATHS:
        if os.path.exists(path):
            with open(path) as f:
                token = f.read().strip()
                if token:
                    return token
    print("ERROR: No GitHub token found. Check ~/.cron_github_token or .github_token")
    return ""

def run(cmd, capture=True):
    result = subprocess.run(cmd, cwd=PROJECT_DIR, capture_output=capture, text=True, timeout=60)
    return result

def create_branch(branch_name):
    """Create a new branch from main (deletes existing local if any)"""
    run(["git", "checkout", "main"])
    run(["git", "branch", "-D", branch_name], capture=False)
    run(["git", "pull", "--ff-only"])
    result = run(["git", "checkout", "-b", branch_name])
    return result.returncode == 0

def commit_and_push(branch_name, message):
    """Stage all, commit, push to origin"""
    run(["git", "add", "-A"])
    commit = run(["git", "commit", "-m", message])
    if commit.returncode != 0:
        # Nothing to commit
        return {"status": "no_changes", "message": "Nothing to commit"}
    token = load_token()
    remote = f"https://token:{token}@github.com/Reinvy/microapp-studio.git"
    push = run(["git", "push", "-u", remote, branch_name])
    if push.returncode != 0:
        return {"status": "push_failed", "message": push.stderr}
    return {"status": "pushed", "branch": branch_name}

def create_pr(title, body, branch):
    """Create a PR via GitHub API"""
    token = load_token()
    data = json.dumps({
        "title": title,
        "body": body,
        "head": branch,
        "base": "main"
    })
    result = subprocess.run([
        "curl", "-s", "-X", "POST",
        "-H", f"Authorization: token {token}",
        "-H", "Content-Type: application/json",
        "-d", data,
        "https://api.github.com/repos/Reinvy/microapp-studio/pulls"
    ], capture_output=True, text=True, timeout=30)
    resp = json.loads(result.stdout)
    if "html_url" in resp:
        return {"status": "created", "url": resp["html_url"], "number": resp["number"]}
    return {"status": "failed", "message": resp.get("message", "Unknown"), "errors": resp.get("errors", [])}

def merge_pr(pr_number):
    """Merge a PR via GitHub API (squash merge)"""
    token = load_token()
    data = json.dumps({"merge_method": "squash"})
    result = subprocess.run([
        "curl", "-s", "-X", "PUT",
        "-H", f"Authorization: token {token}",
        "-H", "Content-Type: application/json",
        "-d", data,
        f"https://api.github.com/repos/Reinvy/microapp-studio/pulls/{pr_number}/merge"
    ], capture_output=True, text=True, timeout=30)
    resp = json.loads(result.stdout)
    if resp.get("merged"):
        return {"status": "merged", "sha": resp.get("sha")}
    return {"status": "failed", "message": resp.get("message", "Unknown")}

def list_open_prs():
    """List open PRs with their status"""
    token = load_token()
    result = subprocess.run([
        "curl", "-s",
        "-H", f"Authorization: token {token}",
        "https://api.github.com/repos/Reinvy/microapp-studio/pulls?state=open"
    ], capture_output=True, text=True, timeout=30)
    prs = json.loads(result.stdout)
    if isinstance(prs, dict) and "message" in prs:
        return []
    return [{"number": p["number"], "title": p["title"], "branch": p["head"]["ref"], "url": p["html_url"], "state": p["state"]} for p in prs]

def get_pr_status(pr_number):
    """Get combined status of a PR's CI checks"""
    token = load_token()
    # Get PR head SHA
    result = subprocess.run([
        "curl", "-s",
        "-H", f"Authorization: token {token}",
        f"https://api.github.com/repos/Reinvy/microapp-studio/pulls/{pr_number}"
    ], capture_output=True, text=True, timeout=30)
    pr = json.loads(result.stdout)
    if "head" not in pr:
        return {"status": "unknown", "message": "PR not found"}
    sha = pr["head"]["sha"]
    # Check status
    status_result = subprocess.run([
        "curl", "-s",
        "-H", f"Authorization: token {token}",
        f"https://api.github.com/repos/Reinvy/microapp-studio/commits/{sha}/status"
    ], capture_output=True, text=True, timeout=30)
    status = json.loads(status_result.stdout)
    return {"sha": sha, "state": status.get("state", "unknown")}

def get_file_tree(path="src"):
    """Get current file tree for analysis"""
    result = subprocess.run(["find", path, "-type", "f", "(", "-name", "*.ts", "-o", "-name", "*.tsx", "-o", "-name", "*.css", "-o", "-name", "*.json", ")", "|", "sort"], 
                          cwd=PROJECT_DIR, capture_output=True, text=True, timeout=10)
    # Fallback if find fails
    if result.returncode != 0:
        result = subprocess.run(["find", path, "-type", "f"], cwd=PROJECT_DIR, capture_output=True, text=True, timeout=10)
    return result.stdout.strip().split("\n") if result.stdout.strip() else []

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 .cron/git_helper.py <command> [args...]")
        print("Commands: create-branch BRANCH | commit-push BRANCH MSG | create-pr TITLE BODY BRANCH | merge-pr NUMBER | list-prs | pr-status NUMBER | file-tree")
        sys.exit(1)

    cmd = sys.argv[1]
    
    if cmd == "create-branch" and len(sys.argv) >= 3:
        result = create_branch(sys.argv[2])
        print(json.dumps({"status": "ok" if result else "failed"}))
    elif cmd == "commit-push" and len(sys.argv) >= 4:
        result = commit_and_push(sys.argv[2], sys.argv[3])
        print(json.dumps(result))
    elif cmd == "create-pr" and len(sys.argv) >= 5:
        result = create_pr(sys.argv[2], sys.argv[3], sys.argv[4])
        print(json.dumps(result))
    elif cmd == "merge-pr" and len(sys.argv) >= 3:
        result = merge_pr(int(sys.argv[2]))
        print(json.dumps(result))
    elif cmd == "list-prs":
        prs = list_open_prs()
        print(json.dumps(prs))
    elif cmd == "pr-status" and len(sys.argv) >= 3:
        result = get_pr_status(int(sys.argv[2]))
        print(json.dumps(result))
    elif cmd == "file-tree":
        tree = get_file_tree()
        print("\n".join(tree))
    else:
        print(json.dumps({"error": "Invalid command or args"}))
