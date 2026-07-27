#!/usr/bin/env python3
"""
MicroApp Studio — E2E Bug Reporter
Parses Playwright JSON results and generates a formatted report.
Usage: python3 .cron/bug_reporter.py <e2e-results.json>
"""
import json, sys, os
from datetime import datetime

def analyze_results(filepath):
    if not os.path.exists(filepath):
        print(f"ERROR: Results file not found: {filepath}")
        return {"total": 0, "passed": 0, "failed": 0, "skipped": 0, "failures": []}

    with open(filepath) as f:
        data = json.load(f)

    stats = data.get("stats", {})
    total = stats.get("expected", 0) + stats.get("unexpected", 0) + stats.get("skipped", 0)
    passed = stats.get("expected", 0)
    failed = stats.get("unexpected", 0)
    skipped = stats.get("skipped", 0)
    flaky = stats.get("flaky", 0)

    # Extract individual failure details from suites
    failures = []

    def walk_suites(suites):
        for suite in suites:
            for spec in suite.get("specs", []):
                ok = spec.get("ok", True)
                title = spec.get("title", "Unknown")
                file = suite.get("file", spec.get("file", ""))
                if not ok:
                    tests = spec.get("tests", [])
                    error_msg = "Unknown error"
                    for t in tests:
                        errors = t.get("errors", [])
                        if errors:
                            error_msg = errors[0].get("message", str(errors[0]))
                    failures.append({
                        "title": title,
                        "file": file,
                        "error": error_msg[:500]
                    })
            # Recurse into nested suites (describe blocks)
            if "suites" in suite:
                walk_suites(suite["suites"])

    walk_suites(data.get("suites", []))

    return {
        "total": total,
        "passed": passed,
        "failed": failed,
        "skipped": skipped,
        "flaky": flaky,
        "failures": failures,
        "timestamp": datetime.now().isoformat()
    }

def print_report(results):
    print("=" * 60)
    print(f"E2E TEST REPORT — {results['timestamp']}")
    print("=" * 60)
    print(f"Total:  {results['total']}")
    print(f"Passed: {results['passed']} ✅")
    print(f"Failed: {results['failed']} ❌")
    print(f"Skipped:{results['skipped']} ⏭️")
    print("=" * 60)

    if results["failed"] > 0:
        print("\nFAILURES:")
        for f in results["failures"]:
            print(f"\n  [{f['file']}] {f['title']}")
            print(f"  Error: {f['error'][:200]}")
    else:
        print("\n✅ ALL TESTS PASSED")

    return results

if __name__ == "__main__":
    filepath = sys.argv[1] if len(sys.argv) > 1 else "e2e-results.json"
    results = analyze_results(filepath)
    print_report(results)
    # Write summary
    summary_path = os.path.join(os.path.dirname(filepath) or ".", "e2e-summary.md")
    with open(summary_path, "w") as f:
        f.write(f"# E2E Test Report — {results['timestamp']}\n\n")
        f.write(f"- **Total:** {results['total']}\n")
        f.write(f"- **Passed:** {results['passed']} ✅\n")
        f.write(f"- **Failed:** {results['failed']} ❌\n")
        f.write(f"- **Skipped:** {results['skipped']} ⏭️\n")
        if results["failed"] > 0:
            f.write(f"\n## Failures\n\n")
            for fr in results["failures"]:
                f.write(f"### {fr['title']}\n")
                f.write(f"- File: {fr['file']}\n")
                f.write(f"- Error: {fr['error'][:300]}\n\n")
        f.write("\n")
