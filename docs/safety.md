# Safety Notes

The app layer does not implement an independent safety runtime. It asks Hermes to decide policy outcomes.

Implemented demo categories:

- Personal data protection
- Dangerous instructions
- Self-harm escalation
- Parent-review topics
- Parent-blocked topics
- Regulated advice caution
- Checkpoint bonus-time flow

Policy outcomes match the spec's vocabulary, including `allow`, `answer_with_caution`, `educational_redirect`, `ask_parent_permission`, `block`, `crisis_escalation`, and `offer_checkpoint`.

Production work should replace the demo Hermes implementation with real Hermes gates and eval-backed policy packs.

## Runtime Isolation

The local MVP can run one Hermes Docker container per child through the Runtime Manager. This improves operational separation, resource accounting, and cleanup, but plain Docker should not be treated as the complete child-safety boundary.

Rules for this path:

- Do not expose the Runtime Manager publicly.
- Do not mount `/var/run/docker.sock` into the Next.js app or any child Hermes container.
- Do not mount host home directories or shared child data into child containers.
- Keep terminal, browser, web, code, cron, delegation, and broad memory tools disabled unless they have explicit review.
- Use one API key, data directory, port, and audit identity per child runtime.
- Move risky tool execution to ephemeral sandboxes with stronger isolation before production use.
