---
title: 'Introducing Billy — Why I Built a Local AI Coding Assistant'
description: 'GitHub Copilot costs $10/month. Cursor is $20/month. I wanted a fast, private AI pair programmer that runs entirely on my machine — so I built one in Go.'
pubDate: 'Mar 17 2026'
---

GitHub Copilot is $10/month. Cursor is $20/month. These aren't huge numbers on their own, but they add up — and more than the cost, I kept running into the same feeling: I'm sending my code to someone else's server every time I ask for help.

I wanted something different. An AI coding assistant that:

- **Runs entirely offline** — no API keys, no data leaving my machine
- **Costs nothing to use** after you have it set up
- **Actually feels good to use** in the terminal, not just functional

So I built Billy.

## The Stack

Billy is a Go app with a terminal UI built on [Bubble Tea](https://github.com/charmbracelet/bubbletea) — Charm's Elm-inspired framework for building TUI applications. If you haven't used it, the pattern is clean: you have a `Model`, an `Update` function, and a `View` function. State flows in one direction. It's the kind of architecture that makes you feel like you know what's happening at all times.

For the AI side, Billy talks to [Ollama](https://ollama.com) — a local server that runs open-source models like `qwen2.5-coder`, `llama3`, `deepseek-coder`, and dozens of others. You're not locked into any particular model. If a new one comes out that's better for your use case, you pull it and switch.

```bash
billy "explain this function"
git diff | billy "summarize these changes"
cat error.log | billy "what's causing this?"
```

That's the one-shot mode. For longer sessions there's a full TUI with scrollable history, syntax-highlighted responses, and a command picker you open with `/`.

## The Problem with Existing Tools

The tools I was using had one of two problems:

**Problem 1: They're cloud-first.** Every prompt you send goes to a remote server. Your code, your errors, your architectural decisions — all of it. For most people this is fine. For people working on anything sensitive, or people who just don't love the idea of their entire codebase passing through third-party infrastructure, it's a non-starter.

**Problem 2: They're IDE-first.** Copilot lives in VS Code. Cursor *is* a fork of VS Code. I spend a lot of time in the terminal — running builds, tailing logs, grepping through codebases. Having to context-switch to an editor to ask a question breaks flow.

Billy lives where I already am.

## The Memory System

One thing I'm proud of is the memory system. You don't need to configure anything — you just talk to Billy like you're talking to a collaborator:

```
remember that I'm building a SaaS in Go
save that my project uses PostgreSQL with pgx
don't forget I prefer short, focused functions over big ones
```

Billy detects the intent and stores it. From that point on, those facts get injected into every conversation — so you don't have to re-establish context every time you start a new session.

It's backed by SQLite. Everything lives in `~/.localai/history.db`. No cloud sync, no account, no telemetry.

## Agentic Mode

The default mode is what I call "agentic." When Billy suggests a shell command in a response, it detects the code block and prompts before running it:

```
┌─ Run command? ──────────────────┐
│  git commit -m "fix auth race"  │
│  [Y]es  [A]lways  [N]o          │
└─────────────────────────────────┘
```

You can approve once, approve all commands of that type for the session, or skip. It's the Copilot CLI permission model, but running against a model on your own hardware.

## What's Working Today

Billy is still early, but it's genuinely useful already:

- Full TUI chat with conversation history and an interactive session picker
- One-shot mode for piping input from the terminal
- Memory system with natural language detection
- Model switching and pulling from within the app (`/model`, `/pull`)
- Agentic mode with permission-gated shell execution
- Context compaction (`/compact`) for long sessions
- Named session checkpoints (`/session`)
- Filesystem tools: `/pwd`, `/cd` with live directory picker, `/ls`, `/git`
- Support-first monetization — setup help, sponsorship, and future convenience bundles instead of crippling the core app

## What's Coming

The roadmap has a few things I'm excited about:

- **Teaching mode** — instead of just running commands, Billy walks you through them step by step
- **More backends** — Groq support for when you want cloud speed without the lock-in
- **Voice mode** — Whisper + Piper TTS for a fully local voice-to-code workflow
- **IDE plugins** — VS Code and JetBrains integration

## Try It

```bash
# macOS / Linux desktop
curl -fsSL https://raw.githubusercontent.com/jd4rider/billy-wails/main/scripts/install.sh | bash

# macOS CLI
brew tap jd4rider/billy
brew install billy

# Linux / macOS (install script)
curl -fsSL https://raw.githubusercontent.com/jd4rider/billy-app/main/scripts/install.sh | bash

# Windows CLI
scoop bucket add billy https://github.com/jd4rider/scoop-billy
scoop install billy
```

Then make sure Ollama is running with a model pulled:

```bash
ollama pull qwen2.5-coder:14b
billy
```

The full documentation is at [docs.billysh.online](https://docs.billysh.online). The source is at [github.com/jd4rider/billy-app](https://github.com/jd4rider/billy-app) — issues and PRs are very welcome.

If this resonates with you, star the repo and follow along. We're just getting started.
