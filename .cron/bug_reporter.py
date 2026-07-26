#!/usr/bin/env python3
"""
E2E Bug Reporter — Parse Playwright test results JSON and generate report.
Usage: python3 .cron/bug_reporter.py <e2e-results.json>
"""
import json, sys, os
from datetime import datetime

def load_results(path):
    if not os.path.exists(path):
        print("ERROR: Results file not found:", path)
        return None
    with open(path) as f:
        return json.load(f)

def analyze(results):
    if not results:
        return {"total": 0, "passed": 0, "failed": 0, "skipped": 0, "bugs": []}

    suites = results.get("suites", results.get("specs", []))
    # Handle different JSON formats
    if not suites:
        # Try flat format
        all_tests = []
        for key in ["specs", "tests"]:
            if key in results:
                all_tests = results[key]
                break
    else:
        all_tests = []
        for suite in suites:
            for spec in suite.get("specs", []):
                for test in spec.get("tests", []):
                    all_tests.append(test)

    total = len(all_tests)
    passed = sum(1 for t in all_tests if t.get("status") == "passed" or t.get("ok") == True)
    failed = sum(1 for t in all_tests if t.get("status") == "failed" or t.get("ok") == False)
    skipped = sum(1 for t in all_tests if t.get("status") == "skipped" or t.get("pending"))

    bugs = []
    for t in all_tests:
        status = t.get("status", t.get("ok"))
        if status in ("failed", False):
            title = t.get("title", t.get("name", "Unknown test"))
            errors = t.get("errors", [])
            for e in errors:
                bugs.append({
                    "test": title,
                    "message": e.get("message", str(e)),
                    "location": e.get("location", {}),
                })

    return {
        "total": total,
        "passed": passed,
        "failed": failed,
        "skipped": skipped,
        "bugs": bugs,
        "timestamp": datetime.utcnow().isoformat(),
    }

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 .cron/bug_reporter.py <e2e-results.json>")
        sys.exit(1)

    results = load_results(sys.argv[1])
    report = analyze(results)

    print("=" * 60)
    print(f"  E2E TEST REPORT — {report['timestamp']}")
    print("=" * 60)
    print(f"  Total:  {report['total']}")
    print(f"  Passed: {report['passed']} ✅")
    print(f"  Failed: {report['failed']} ❌")
    print(f"  Skipped:{report['skipped']} ⏭️")
    print("=" * 60)

    if report["bugs"]:
        print(f"\n  BUGS FOUND ({len(report['bugs'])}):")
        print("-" * 60)
        for i, bug in enumerate(report["bugs"], 1):
            print(f"  #{i}: {bug['test']}")
            print(f"       {bug['message'][:200]}")
            print()

    # Also save a summary markdown
    summary_path = os.path.join(os.path.dirname(sys.argv[1]) or ".", "e2e-summary.md")
    with open(summary_path, "w") as f:
        f.write(f"# E2E Test Report — {report['timestamp']}\n\n")
        f.write(f"- **Total:** {report['total']}\n")
        f.write(f"- **Passed:** {report['passed']} ✅\n")
        f.write(f"- **Failed:** {report['failed']} ❌\n")
        f.write(f"- **Skipped:** {report['skipped']} ⏭️\n\n")
        if report["bugs"]:
            f.write("## Bugs Found\n\n")
            for bug in report["bugs"]:
                f.write(f"- **{bug['test']}**: {bug['message'][:200]}\n")

    print(f"\n  Summary saved to: {summary_path}")

if __name__ == "__main__":
    main()
