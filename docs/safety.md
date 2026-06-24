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
