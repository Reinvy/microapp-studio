#!/usr/bin/env python3
"""
MicroApp Studio — E2E Playwright Tester
Tests live Vercel deployment with Playwright using existing headless shell.
"""
import json, os, sys, subprocess, re

BASE_URL = "https://microapp-studio.vercel.app"
CHROMIUM_PATH = ""  # Will use PLAYWRIGHT_BROWSERS_PATH
PLAYWRIGHT_BROWSERS = "/tmp/playwright-browsers"

def run_playwright():
    """Run Playwright E2E tests against live Vercel deployment."""
    # Build the script path relative to this file
    script_dir = os.path.dirname(os.path.abspath(__file__))
    script_path = os.path.join(script_dir, 'e2e_runner.js')
    
    result = subprocess.run(
        ['node', script_path],
        capture_output=True, text=True, timeout=180,
        env={
            **os.environ,
            'NODE_PATH': '/opt/data/workspace/microapp-studio/node_modules',
            'PLAYWRIGHT_BROWSERS_PATH': PLAYWRIGHT_BROWSERS,
            'BASE_URL': BASE_URL,
            'CHROMIUM_PATH': CHROMIUM_PATH,
        }
    )
    
    print(result.stdout)
    if result.stderr:
        stderr_text = result.stderr
        if len(stderr_text) > 2000:
            stderr_text = stderr_text[:2000] + "\n... (truncated)"
        print("[STDERR]", stderr_text, file=sys.stderr)
    
    # Parse JSON output
    match = re.search(r'---OUTPUT_JSON---\n(.*?)\n---END_OUTPUT_JSON---', result.stdout, re.DOTALL)
    if match:
        return json.loads(match.group(1))
    return None

if __name__ == '__main__':
    output = run_playwright()
    if output:
        output_path = '/tmp/e2e_results.json'
        with open(output_path, 'w') as f:
            json.dump(output, f, indent=2)
        print(f"\nResults saved to {output_path}")
        print(f"All passed: {output['summary']['allPassed']}")
        print(f"Pass rate: {output['summary']['passRate']}%")
        sys.exit(0 if output['summary']['allPassed'] else 1)
    else:
        print("Failed to parse test output")
        sys.exit(1)
