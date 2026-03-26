---
title: "What Local Coding Models Actually Work in a Terminal Workflow?"
description: "A practical rubric for evaluating local coding models in Ollama: latency, patch quality, command discipline, repo awareness, and where each model actually fits."
pubDate: 'Mar 26 2026'
---

Benchmark charts are useful, but they don't tell me what I actually want to know:

**Will this model help me finish real work in a terminal without getting in my way?**

That question is different from "which model got the highest score on a coding benchmark?" A terminal workflow has its own failure modes. The model needs to read code, explain it clearly, suggest sane shell commands, recover from errors, and stay disciplined when the best answer is "don't touch that yet."

This is the rubric I use when I'm testing local models for Billy.

## What a terminal coding workflow actually asks from a model

Inside a terminal assistant, the model is rarely doing one giant heroic task. Most of the time it's doing a sequence of smaller jobs:

- read a file or pasted stack trace
- explain what is wrong in plain English
- propose the next command to run
- interpret the output
- patch one small area without wrecking another
- keep enough context to continue the loop

That means the best local coding model is not always the one with the fanciest benchmark. The best one is the one that stays useful over repeated cycles of:

```text
read -> reason -> propose -> inspect output -> adjust
```

If a model is brilliant on generation but terrible at handling `stderr`, it feels bad in practice. If it's fast but reckless, it burns time. If it's accurate but too slow to stay in flow, I stop reaching for it.

## The five things I score first

When I test a local model, I score these before anything else.

### 1. First-token latency

I care a lot about how quickly the model starts responding.

In a terminal workflow, sub-second or near-immediate feedback matters because I am usually asking short, tactical questions:

- "Why is this test failing?"
- "What command should I run next?"
- "Explain this function."

If the model takes too long to begin, even good answers feel heavy.

### 2. Patch quality

Can the model make a focused change without spraying edits everywhere?

The best local coding models don't just generate code. They preserve intent:

- they avoid renaming things unnecessarily
- they keep existing style
- they don't "improve" unrelated code
- they stop when the requested change is complete

This matters more than raw cleverness.

### 3. Command discipline

This one gets overlooked.

In a terminal assistant, the model often suggests shell commands. A useful model proposes:

- the smallest safe next step
- commands that match the environment
- verification commands after making a change

A bad one jumps straight to destructive or over-broad commands.

I want:

```bash
go test ./internal/auth -run TestLogin
```

not:

```bash
go test ./...
```

when the scope is clearly one package and one failing path.

### 4. Error recovery

The real test is what happens after the first answer is wrong.

Strong models recover well when you hand them:

- a compiler error
- a failing test output
- a command that exited non-zero
- a mismatch between their assumption and the actual repo

Weak models tend to double down or repeat the same fix with new wording.

### 5. Context carryover

The model doesn't need to remember your whole career. It does need to remember the current thread:

- what file is being discussed
- what already failed
- what constraint you gave two turns ago
- what "don't change the API" means in context

This is where many smaller local models start to drift.

## My lightweight test harness

I don't run a giant benchmark suite every time. I use a compact set of tasks that map to real terminal work.

### Task 1: Explain an unfamiliar function

I paste a real function from a Go codebase and ask:

```text
Explain what this does, where the edge cases are, and what would break if I removed this guard clause.
```

This tells me a lot:

- Does the model actually read the code?
- Does it notice control flow?
- Does it explain instead of hallucinating?

### Task 2: Fix one failing test

I give the model:

- the failing test output
- the target file
- the instruction to keep the fix minimal

This is the single most useful test in practice. It combines reasoning, code generation, and restraint.

### Task 3: Write a focused regression test

I ask for one test that proves the bug is fixed.

Good coding models write a narrow test around the actual issue. Weak ones generate broad, noisy tests that don't prove much.

### Task 4: Propose the next shell command

I ask:

```text
What would you run next to verify this before changing code?
```

This reveals whether the model understands terminal workflows or is only good at text completion.

### Task 5: Continue after a bad assumption

I intentionally correct the model:

```text
No, that file doesn't exist. The config lives in internal/config/runtime.go. Try again.
```

That lets me see whether it updates cleanly or starts thrashing.

## What smaller models do well

Smaller local models are often better than people expect when the task is narrow.

They tend to be solid at:

- scaffolding
- unit test generation
- code explanation
- small function edits
- shell command suggestions
- repetitive transformations

If your workflow is mostly short loops on one file at a time, a smaller model can feel surprisingly good, especially on a laptop where responsiveness matters more than theoretical ceiling.

The main trap is expecting a smaller model to carry a long, multi-file reasoning chain without support.

## Where mid-sized coding models usually win

For me, the sweet spot has been mid-sized code-oriented models running locally through Ollama.

Why they tend to land better:

- better patch accuracy
- better follow-up answers after errors
- less drift across several turns
- stronger explanations of tradeoffs instead of just code dumps

That extra capacity matters once the workflow becomes:

- read this file
- inspect this output
- patch this function
- now explain the side effect in another module

This is where a good mid-sized model stops feeling like a toy and starts feeling like a useful collaborator.

## Where cloud models still have a real edge

Local models are getting strong fast, but I still see cloud models win in three places:

### Multi-file architecture changes

"Refactor the auth flow across six files and preserve all existing behavior" is still a hard problem locally.

### New libraries and fresh APIs

If the right answer depends on something that changed recently, the local model may confidently suggest stale patterns unless you paste the docs in.

### Long, nuanced reasoning chains

If the conversation runs for many turns and the constraints keep stacking up, larger cloud models still hold the thread better.

That doesn't make local less useful. It just means you should use local where local is strongest instead of asking it to be everything.

## My practical recommendation right now

If you're evaluating local coding models for a terminal assistant, optimize in this order:

1. responsiveness
2. patch quality
3. command discipline
4. error recovery
5. long-context reasoning

That order surprises people, but it matches actual use.

A model that is slightly less "smart" but starts fast, patches safely, and recovers well will get used more than a model that is theoretically stronger but feels slow and slippery.

For Billy specifically, I keep coming back to this pattern:

- use a strong local coding model as the default
- keep tasks scoped tightly
- prefer short verification loops
- switch to cloud only when the task genuinely demands it

That keeps the private, low-latency, low-cost path as the default instead of the exception.

## How to run your own evaluation in 30 minutes

If you want to test models without overthinking it, do this:

```bash
ollama pull qwen2.5-coder:14b
ollama pull qwen2.5-coder:7b
ollama pull mistral
```

Then run the same five tasks against each model:

- explain one real function
- fix one failing test
- write one regression test
- propose one verification command
- recover from one incorrect assumption

Score each answer on:

- speed
- correctness
- restraint
- usefulness after follow-up

Don't ask which model is "best." Ask:

**Which model makes the next 30 minutes of terminal work feel smoother?**

That's the answer that actually matters.

## Why this matters for Billy

Billy is built around this exact workflow: fast local loops, terminal-native interaction, command approval, and enough memory/history to keep context without shipping your code to someone else's servers.

If you're curious, the fastest way to try the workflow is:

```bash
curl -fsSL https://raw.githubusercontent.com/jd4rider/billy-app/main/scripts/install.sh | bash
```

Then pull a model, point Billy at it, and run the same evaluation loop on your own codebase. You'll learn more from one hour of that than from a week of reading leaderboard screenshots.
