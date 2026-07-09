---
name: fix-issue
description: Fix a GitHub issue end-to-end. Reads the issue, routes to the correct agent via labels, implements the fix, writes tests, and opens a PR.
disable-model-invocation: true
---

Fix the GitHub issue: $ARGUMENTS

## 1. Read the issue

Run `gh issue view $ARGUMENTS --json title,body,labels` to get the full issue details, acceptance criteria, and labels.

## 2. Determine the agent via labels

Read the labels array and look for an `agent-*` label:

- `agent-backend` → use the **backend-dev** agent
- `agent-frontend` → use the **frontend-dev** agent
- `agent-designer` → use the **ui-designer** agent

**If no `agent-*` label is found, STOP and ask the user which agent to use.** Do not guess from the issue content. Example prompt:
> This issue has no agent label. Which agent should handle it?
> 1. backend-dev
> 2. frontend-dev
> 3. ui-designer

## 3. Create a feature branch

```
git checkout -b feature/$ARGUMENTS-<short-description>
```

## 4. Execute with the routed agent

### If backend-dev or frontend-dev:

1. Read existing related code to understand current patterns
2. If frontend: check the `@theme` block in `src/app/globals.css` first, then check for mockups in `docs/mockups/issue-$ARGUMENTS/`
3. Implement the changes following CLAUDE.md conventions
4. Write tests using the test-writer agent

### If ui-designer:

1. Read the `@theme` block in `src/app/globals.css` before starting
2. Create the folder `docs/mockups/issue-$ARGUMENTS/` — MANDATORY
3. Produce HTML/CSS mockups in `docs/mockups/issue-$ARGUMENTS/mockup.html`
4. Include a `docs/mockups/issue-$ARGUMENTS/README.md` with component mapping and Tailwind classes
5. No tests or linting required for design artifacts

## 5. Run the pr-ready checklist

Execute the full checklist in `.claude/skills/pr-ready/SKILL.md` and fix every point that does not pass. **Never skip this step.**

## 6. Commit and open a PR

```
git add -A
git commit -m "<type>(<scope>): <description> (closes #$ARGUMENTS)"
git push -u origin feature/$ARGUMENTS-<short-description>
gh pr create --title "<description>" --body "Closes #$ARGUMENTS"
```

Commit type conventions:
- `feat(<scope>)` for new features
- `fix(<scope>)` for bug fixes
- `docs(design)` for mockups and design artifacts
