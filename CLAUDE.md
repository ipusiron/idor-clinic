# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

IDOR Clinic is a client-side educational tool for demonstrating IDOR (Insecure Direct Object Reference) vulnerabilities. It's a fully static web application with no backend server, using simulated APIs and data stored in JSON files.

## Commands

This is a static web application with no build process, package manager, or tests:
- **Run locally**: Open `index.html` directly in a browser or serve with any HTTP server
- **Deploy**: Push to GitHub Pages (configured for `main` branch, root folder)
- **No npm/yarn**: Pure JavaScript without dependencies or build tools

## Architecture

### Core Structure
- **Hash-based routing**: Uses `#/app`, `#/compare`, `#/learn` to avoid 404s on GitHub Pages
- **Global namespace**: All modules attached to `window.App` object
- **Module loading order** (critical - loaded via script tags in index.html):
  1. `utils.js` - Helper functions
  2. `data.js` - Data initialization, token mapping
  3. `auth.js` - Session management
  4. `api.js` - Simulated API (VULN/SECURE mode switching)
  5. `ui.js` - UI rendering, Attack Panel
  6. `main.js` - Bootstrap and event binding

### Mode System
- **VULN mode**: Vulnerable behavior allowing IDOR attacks
- **SECURE mode**: Implements proper authorization checks
- Mode toggle affects behavior in `api.js` which branches logic based on `App.MODE`

### Data Flow
1. Static JSON files in `data/` loaded into memory at startup
2. `api.js` simulates backend responses based on current mode
3. No actual network requests - all processing is client-side
4. Attack Panel manipulates request parameters before passing to simulated API

### Key Implementation Details
- **User IDs**: Sequential (1001, 1002, 1003)
- **Order IDs**:
  - VULN: Predictable `ORD-000XXX` format
  - SECURE: Random tokens `tok_XXXXXX...`
- **Token mapping**: `data.js` maintains bidirectional maps between predictable IDs and secure tokens
- **Rate limiting**: Simulated in `utils.js` using session storage
- **Attack detection**: Monitors rapid consecutive attempts at different IDs

## File Modifications

When modifying files:
- Maintain relative paths (no leading `/`) for GitHub Pages compatibility
- Keep all logic client-side
- Preserve the global `window.App` namespace pattern
- Test both VULN and SECURE modes after changes
