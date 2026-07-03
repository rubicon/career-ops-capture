# Security Policy

## Reporting a vulnerability

Please report security vulnerabilities privately. Do not open a public issue or
discussion for a security report.

The preferred channel is GitHub private vulnerability reporting. Go to the
[Security tab](https://github.com/rubicon/career-ops-capture/security/advisories/new)
and open a private advisory. This keeps the report confidential until a fix is
available.

If you cannot use GitHub private reporting, email dax@rubicontv.com with the
details.

Please include:

- A description of the vulnerability and its impact.
- Steps to reproduce, or a proof of concept.
- The extension version and browser version affected.

You can expect an acknowledgement within a few business days. Once the issue is
confirmed, a fix will be prepared and released, and the report will be credited
unless you prefer to remain anonymous.

## Supported versions

Security fixes are provided for the latest published release. This is a
pre-1.0 project, so only the most recent minor line is supported.

| Version | Supported |
| ------- | --------- |
| 0.1.x   | Yes       |
| < 0.1   | No        |

## Scope

Career-Ops Capture reads pages you open in your own logged-in session and sends
captured listings only to a career-ops endpoint on your own machine (loopback).
It has no server component and no telemetry. Reports about data leaving the
machine, about the extension reaching any host other than `www.linkedin.com` and
`127.0.0.1`, or about privilege escalation in the extension are all in scope and
welcome. See [PRIVACY.md](PRIVACY.md) for the data-handling model.
