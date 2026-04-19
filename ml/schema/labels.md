# Label Schema

This document defines the target labels for the FeedbackAI in-house feedback intelligence model.

## Input Record

Each training sample represents one user turn in context.

Required fields:

- `sample_id`
- `input_type`
- `source_model_label`
- `session_stage`
- `original_prompt`
- `generated_content`
- `recent_context`
- `latest_user_message`
- `labels`

## Sentiment

Single-label classification.

Allowed values:

- `positive`
- `neutral`
- `hesitant`
- `frustrated`
- `wants_to_stop`

Meaning:

- `positive`: user clearly praises the output or expresses satisfaction
- `neutral`: user provides calm factual feedback without strong emotion
- `hesitant`: user sounds unsure, tired, brief, reluctant, or low-energy
- `frustrated`: user sounds annoyed, disappointed, irritated, or strongly negative
- `wants_to_stop`: user explicitly or strongly implies that they want to end the session

## Topic

Single-label classification.

Allowed values:

- `on_topic`
- `off_topic`

Meaning:

- `on_topic`: the message is still about evaluating the submitted output
- `off_topic`: the message has drifted away from feedback on the output

## Continue Signal

Single-label classification.

Allowed values:

- `continue`
- `uncertain`
- `stop`

Meaning:

- `continue`: user is willing to continue the interview
- `uncertain`: user may continue but signals fatigue, hesitation, or low engagement
- `stop`: user wants to end the session

## Themes

Multi-label classification. A single message may have more than one theme.

Allowed values:

- `accuracy`
- `completeness`
- `relevance`
- `clarity`
- `tone`
- `formatting`
- `hallucination`
- `latency`
- `usability`
- `reasoning`
- `instruction_following`
- `safety`
- `other`

## Feedback Quality

Single-label classification.

Allowed values:

- `vague`
- `somewhat_actionable`
- `highly_actionable`

Meaning:

- `vague`: little specific detail, hard to act on
- `somewhat_actionable`: points to an issue but lacks concrete detail
- `highly_actionable`: gives a concrete issue, cause, example, or improvement direction

## Session Stage

Single-label classification.

Allowed values:

- `opening`
- `first_impression`
- `strengths`
- `weaknesses`
- `improvement_request`
- `wrap_up`

## Next Policy

Single-label classification used in the conversation policy dataset.

Allowed values:

- `greet_opening`
- `ask_first_impression`
- `probe_strength`
- `probe_weakness`
- `probe_specific_issue`
- `ask_improvement_priority`
- `redirect_to_feedback`
- `shorten_question`
- `empathy_then_probe`
- `confirm_end`
- `wrap_up`

## Greeting and Flow Categories

Used in the greetings and flows dataset.

Allowed values:

- `greeting_formal`
- `greeting_warm`
- `greeting_brief`
- `opening_contextual`
- `redirect_polite`
- `empathy_acknowledgement`
- `transition_strength_to_weakness`
- `transition_to_improvement`
- `confirm_end_session`
- `session_wrap_up`
