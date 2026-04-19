# Annotation Guide

This guide explains how to label user turns consistently for the FeedbackAI in-house feedback intelligence model.

## General Rule

Label what the user is doing in the current message, not what you think they meant earlier in the session.

Always read:

- `original_prompt`
- `generated_content`
- the `recent_context`
- the `latest_user_message`

## Annotation Order

For each example, annotate in this order:

1. topic
2. sentiment
3. continue signal
4. themes
5. feedback quality
6. session stage

This order reduces confusion because topic and user intent often constrain the later labels.

## Topic

Label `off_topic` only when the message is materially unrelated to evaluating the submitted output.

Examples of `on_topic`:

- "It missed the risk section."
- "The tone felt too robotic."
- "The answer was accurate but too long."

Examples of `off_topic`:

- "By the way what movies do you watch?"
- "Can you tell me a joke?"
- "The weather here is terrible today."

If a message mixes feedback with a small aside, keep it `on_topic`.

## Sentiment

Choose the strongest fitting class.

`positive`
- clear praise
- satisfied tone
- explicit approval

`neutral`
- factual analysis
- calm criticism without emotional charge

`hesitant`
- uncertain, low-energy, short, reluctant
- examples:
  - "I guess it was okay."
  - "Maybe, I am not fully sure."
  - "Can we keep this short?"

`frustrated`
- annoyed, disappointed, irritated
- examples:
  - "This was honestly pretty bad."
  - "It kept missing obvious things."

`wants_to_stop`
- explicit or strong implied end intent
- examples:
  - "I want to stop here."
  - "That is enough for me."
  - "Can we wrap this up now?"

If the user is frustrated and also wants to stop, prefer `wants_to_stop`.

## Continue Signal

This is about willingness to continue the interview.

`continue`
- user sounds willing to keep going

`uncertain`
- user signals fatigue, doubt, or reduced willingness

`stop`
- user asks to end or strongly implies ending

Examples:

- "It missed the compliance section." -> `continue`
- "I can answer one more question." -> `uncertain`
- "Please end the session." -> `stop`

## Themes

Choose all themes that clearly apply. Do not add labels just because they might fit weakly.

Theme hints:

- `accuracy`: factual correctness
- `completeness`: missing important content
- `relevance`: includes wrong or unhelpful content for the prompt
- `clarity`: confusing, vague, hard to understand
- `tone`: style, warmth, professionalism, politeness
- `formatting`: structure, layout, bullets, headings, formatting quality
- `hallucination`: invented or unsupported content
- `latency`: speed and waiting time
- `usability`: whether the result is practically useful
- `reasoning`: logic, multi-step thinking, consistency
- `instruction_following`: whether the output followed prompt constraints
- `safety`: harmful or unsafe content
- `other`: meaningful feedback that fits none of the above

## Feedback Quality

Judge how actionable the message is for improvement work.

`vague`
- "It was fine."
- "Not great."

`somewhat_actionable`
- "It felt generic."
- "It was too long."

`highly_actionable`
- "It ignored the supply chain risks and added revenue claims that were not in the report."

## Session Stage

Use the conversational purpose of the turn.

- `opening`: greeting or starting the session
- `first_impression`: early overall reaction
- `strengths`: asking or answering what worked well
- `weaknesses`: asking or answering what went wrong
- `improvement_request`: asking or answering what to change next
- `wrap_up`: ending, confirming end, or closing summary

## Next Policy

Used only in the conversation policy dataset.

Map the current state to the next interviewer action.

Examples:

- user gives broad praise -> `probe_strength`
- user gives a vague complaint -> `probe_specific_issue`
- user goes off-topic -> `redirect_to_feedback`
- user sounds tired -> `shorten_question`
- user sounds upset -> `empathy_then_probe`
- user wants to stop -> `confirm_end`

## Quality Control Rules

- Do not label all negative feedback as `frustrated`.
- Do not label every short answer as `wants_to_stop`.
- Do not over-assign theme labels.
- Prefer `somewhat_actionable` unless the message is clearly either vague or detailed.
- When in doubt between `neutral` and `hesitant`, choose `hesitant` only if reduced willingness or uncertainty is clearly visible.
