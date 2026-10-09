#!/usr/bin/env python3
"""Smoke-test every route as each seeded demo role, and the boundaries between them.

Logs in through the real Auth.js credentials endpoint, then GETs each route with
that session.

Two things are checked, because a status code alone proves neither:

  1. the route renders content unique to that role's page (so a page that silently
     rendered an empty shell does not pass);
  2. a role cannot reach another role's area — cross-role requests must either
     redirect to the caller's own dashboard or be refused.

Usage: python3 scripts/smoke.py [baseUrl]
"""
import os
import re
import subprocess
import sys
import tempfile
import urllib.parse

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:3000"
PASSWORD = "Demo@12345"

# route -> a string that can only appear if that page actually rendered
ROLES = {
    "superadmin": (
        "superadmin@demo.example",
        {
            "/dashboard/superadmin": "Platform totals",
            "/dashboard/superadmin/notifications": "Notifications",
        },
    ),
    "admin": (
        "admin@demo.example",
        {
            "/dashboard/admin": "Today at a glance",
            "/dashboard/admin/patients": "Everyone registered with this healthcare center",
            "/dashboard/admin/doctors": "Clinicians on this center",
            "/dashboard/admin/departments": "Clinical units in this center",
            "/dashboard/admin/appointments": "Every booking across the center",
            "/dashboard/admin/medicines": "Formulary, pricing and batch stock",
            "/dashboard/admin/notifications": "Notifications",
        },
    ),
    "doctor": (
        "doctor@demo.example",
        {
            "/dashboard/doctor": "Your clinical day",
            "/dashboard/doctor/appointments": "Bookings against your own list",
            "/dashboard/doctor/patients": "People you have an appointment",
            "/dashboard/doctor/notifications": "Notifications",
        },
    ),
    "patient": (
        "patient@demo.example",
        {
            "/dashboard/patient": "Your appointments, results and bills",
            "/dashboard/patient/appointments": "Everything booked in your name",
            "/dashboard/patient/doctors": "Clinicians available at",
            "/dashboard/patient/prescriptions": "Everything your doctor has prescribed",
            "/dashboard/patient/laboratory": "Ask your doctor to interpret them",
            "/dashboard/patient/invoices": "Bills raised by your healthcare center",
            "/dashboard/patient/payments": "Every payment recorded against your invoices",
            "/dashboard/patient/medical-history": "Your consultations, prescriptions",
            "/dashboard/patient/notifications": "Notifications",
        },
    ),
}

PUBLIC = [
    "/",
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password?token=not-a-real-token",
    "/verify-email?token=not-a-real-token",
]

# A role must never render another role's dashboard. Each entry is
# (role, forbidden path, own home).
BOUNDARIES = [
    ("patient", "/dashboard/admin", "/dashboard/patient"),
    ("patient", "/dashboard/doctor", "/dashboard/patient"),
    ("patient", "/dashboard/superadmin", "/dashboard/patient"),
    ("doctor", "/dashboard/admin", "/dashboard/doctor"),
    ("doctor", "/dashboard/admin/patients", "/dashboard/doctor"),
    ("admin", "/dashboard/superadmin", "/dashboard/admin"),
    ("superadmin", "/dashboard/admin", "/dashboard/superadmin"),
]

# Strings that must never appear for a role that is not entitled to them.
LEAKS = {
    "patient": ["Today at a glance", "Formulary, pricing and batch stock",
                "Your clinical day", "Platform totals"],
    "doctor": ["Today at a glance", "Formulary, pricing and batch stock",
               "Platform totals"],
    "admin": ["Platform totals", "Your clinical day"],
    "superadmin": ["Today at a glance", "Your clinical day"],
}


def fetch(jar, path, follow=False):
    """Returns (status, body)."""
    cmd = [
        "curl", "-sS", "-w", "\n__STATUS__%{http_code}",
        "-b", jar, "-c", jar, "--max-time", "60",
    ]
    if follow:
        cmd += ["-L", "--max-redirs", "3"]
    cmd.append(BASE + path)
    out = subprocess.run(cmd, capture_output=True, text=True)
    text = out.stdout
    m = re.search(r"__STATUS__(\d{3})$", text)
    status = int(m.group(1)) if m else 0
    body = text[: m.start()] if m else text
    return status, body


def login(email):
    jar = tempfile.mktemp(suffix=".cookies")
    subprocess.run(
        ["curl", "-sS", "-c", jar, f"{BASE}/api/auth/csrf"],
        capture_output=True, text=True,
    )
    with open(jar) as fh:
        cookies = fh.read()
    m = re.search(r"csrf-token\s+(\S+)", cookies)
    if not m:
        return None
    # The cookie holds "token|hash". Auth.js verifies the hash against the secret
    # and then requires the POST body to carry only the token half. curl stores the
    # cookie percent-encoded, so decode before splitting.
    token = urllib.parse.unquote(m.group(1)).split("|", 1)[0]

    fetch_status, _ = fetch(jar, "/api/auth/session")
    subprocess.run(
        ["curl", "-sS", "-o", "/dev/null", "-b", jar, "-c", jar,
         "-X", "POST", f"{BASE}/api/auth/callback/credentials",
         "-H", "Content-Type: application/x-www-form-urlencoded",
         "--data-urlencode", f"csrfToken={token}",
         "--data-urlencode", f"email={email}",
         "--data-urlencode", f"password={PASSWORD}",
         "--data-urlencode", "callbackUrl=/dashboard"],
        capture_output=True, text=True,
    )

    _, body = fetch(jar, "/api/auth/session")
    if '"id"' not in body:
        return None
    return jar


def main():
    failures = []
    jars = {}

    def check(ok, label, detail=""):
        print(f"  {'OK  ' if ok else 'FAIL'} {label} {detail}")
        if not ok:
            failures.append(label)

    print("== public ==")
    jar = tempfile.mktemp(suffix=".cookies")
    for path in PUBLIC:
        status, body = fetch(jar, path)
        check(status == 200 and "Sign in" in body or status == 200,
              f"GET {path}", f"status={status}")

    print("== signed out ==")
    for path in ["/dashboard", "/dashboard/admin", "/change-password"]:
        status, body = fetch(jar, path)
        redirected = "NEXT_REDIRECT" in body and "/login" in body
        check(status in (200, 307, 302) and (redirected or status in (302, 307)),
              f"GET {path} while signed out", f"status={status}")

    for role, (email, routes) in ROLES.items():
        print(f"== {role} ({email}) ==")
        jar = login(email)
        if not jar:
            check(False, f"login as {email}")
            continue
        jars[role] = jar

        for path, marker in routes.items():
            status, body = fetch(jar, path)
            check(status == 200 and marker in body, f"GET {path}",
                  f"status={status} marker={'yes' if marker in body else 'MISSING'}")

        status, body = fetch(jar, "/dashboard")
        home = f"/dashboard/{role}"
        check("NEXT_REDIRECT" in body and home in body,
              "GET /dashboard routes to own home")

    for role, path, home in BOUNDARIES:
        jar = jars.get(role)
        if not jar:
            continue
        status, body = fetch(jar, path)
        redirected_home = "NEXT_REDIRECT" in body and home in body
        leaked = [s for s in LEAKS[role] if s in body]
        check(redirected_home and not leaked,
              f"{role} cannot reach {path}",
              f"redirected_home={redirected_home} leaks={leaked}")

    print()
    if failures:
        print(f"FAILURES ({len(failures)}):")
        for f in failures:
            print("  -", f)
        return 1

    print("All checks passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())