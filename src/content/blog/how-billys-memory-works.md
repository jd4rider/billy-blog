---
title: "How Billy's Memory System Works"
description: "Just say 'remember that I'm building a SaaS in Go' — Billy stores it and injects it into every future conversation. Here's how the natural language detection, SQLite storage, and system prompt injection work under the hood."
pubDate: 'Mar 17 2026'
tags: ['deep-dive', 'go']
---

One of the problems with AI coding assistants is that they're stateless. Every session starts from zero. You tell the assistant you're using Go, it forgets by tomorrow. You mention your project is a CLI tool — next conversation, no idea. You're starting from scratch every time, re-establishing context, copy-pasting your stack into every chat.

Billy's memory system fixes this. You don't flip a switch or fill out a form. You just talk:

```
> remember that I prefer tabs over spaces in Go
> remember that this project uses SQLite, not Postgres
> my preference is short, practical code examples — no theory
```

Billy intercepts these, extracts the fact, stores it in a local SQLite database, and injects it as context into every future conversation. The model already knows who you are before you type a single word.

---

## Natural Language Detection

The first challenge is figuring out *when* the user wants to save something versus when they're just chatting. Billy uses a two-pass approach in `internal/memory/memory.go`.

**Pass 1: Prefix matching.** Before any message goes to Ollama, Billy checks whether it starts with one of ~40 trigger phrases:

```
remember that ...
save to memory: ...
note that ...
don't forget that ...
keep in mind ...
for future reference, ...
fyi: ...
```

This is intentionally broad. You shouldn't need to memorize a syntax. "Please remember that I use Neovim" works just as well as "remember I use Neovim." The phrases are checked case-insensitively. If a match is found, the text after the phrase is the fact to store — and the message never reaches Ollama at all.

**Pass 2: Contains-based fallback.** If no prefix matches, Billy scans the full sentence for save-intent verbs like "save a memory," "save a note," or "remember that I." This catches phrasing like:

```
> Can you save a memory that I'm building this with Bubble Tea?
```

If the sentence contains "that," everything after it is extracted as the fact.

---

## Where Memories Live

Facts are stored in a SQLite database at `~/.localai/history.db` — the same file that holds your conversation history. There's a dedicated `memories` table:

```sql
CREATE TABLE IF NOT EXISTS memories (
    id         TEXT PRIMARY KEY,
    content    TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL
);
```

Each memory gets a UUID primary key, which makes them easy to reference when deleting. The store is scoped to your machine — nothing is ever sent to a server.

---

## Injected Into Every Conversation

Before Billy sends any message to the Ollama API, it loads all memories and builds a system prompt:

```
You are Billy, a helpful AI coding assistant running locally.
You are knowledgeable, concise, and prefer practical examples.
...

Things I know about the user:
- I prefer tabs over spaces in Go
- This project uses SQLite, not Postgres
- Short, practical code examples — no theory

Use this context naturally in your responses when relevant.
```

This system prompt is prepended to every conversation history sent to the model. The model never sees a bare chat — it always sees you with context. Over time, as you add more preferences and project context, responses get increasingly tailored to how you work.

The system prompt also includes an important instruction: if Billy detects a memory-save phrase, the fact has *already been saved* before the model sees the message. The model should simply confirm warmly rather than suggesting shell commands or config edits. (Early versions of this without the instruction would sometimes respond with `echo "alias..." >> ~/.zshrc` when you asked it to remember something — not useful.)

---

## Managing Your Memories

You can inspect and manage memories any time with `/memory`:

```
/memory                     # list everything Billy knows about you
/memory forget <id>         # remove a specific memory by ID prefix
/memory clear               # wipe all memories
```

The list view shows each memory with its short ID prefix, so you can quickly forget something that's no longer accurate:

```
[a3f1] I prefer tabs over spaces in Go
[b92c] This project uses SQLite, not Postgres
[c44e] Short, practical code examples — no theory
```

```
> /memory forget b92c
Memory forgotten.
```

---

## Open-Core Memory

Billy now ships with memory persistence in the open-core build.

That means memories persist across sessions indefinitely, stay local on your machine, and never require a cloud account or paid unlock.

This is one of the first things users notice — the feeling of working with an assistant that actually knows you. Not because of a cloud profile or account. Just a small SQLite table on your machine and a system prompt.

---

## Under the Hood in 30 Seconds

Here's the full flow for a memory-save request:

1. You type `remember that I prefer short variable names`
2. `memory.DetectAndExtract()` matches the `"remember that "` prefix, returns `"I prefer short variable names"`
3. `store.SaveMemory(uuid, fact)` writes it to `~/.localai/history.db`
4. Billy replies with a warm confirmation; the message *never* reaches Ollama
5. On your next message, `store.ListMemories()` fetches all facts
6. `memory.BuildSystemPrompt(facts)` constructs the system prompt
7. The system prompt is prepended to the conversation before the API call

No cloud. No account. No training on your data. Just a UUID, a string, and a SQLite row.
