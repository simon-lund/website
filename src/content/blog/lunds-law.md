---
title: "You are never the exception you think you are"
description: 'You did not skip the enum out of ignorance. You skipped it because you were sure your field was different. The danger is rarely not knowing the rule, it is being sure it does not apply to you.'
pubDate: 'Jun 07 2026'
tags: ['Laws']
draft: true
---

This is a rule I keep relearning, usually right after deciding it does not apply to me. The cleanest example I know is a database column.

You are adding a `status` field. An enum feels like overkill: the values are obvious, the feature is small, free text is flexible. So you ship a plain string. It is your field, you know what goes in it.

Then it grows. `active`, `Active`, `ACTIVE`, `actv`, one with a trailing space. Code in five places branches on the spelling, a dashboard groups by it, and someone finally writes a migration to tidy it up and breaks a report that quietly depended on the typo. You have an enum after all, just the worst possible one: undocumented, inconsistent, and unfixable because the mess is now load-bearing.

The thing is, you knew about enums. You did not skip the constraint out of ignorance. You skipped it because you were sure *this* field was different. It would stay clean. It did not need the discipline other people's fields need.

That is the actual rule, and it is much bigger than databases:

> The danger is rarely not knowing the rule. It is being sure it does not apply to you.

And the certainty is not a harmless misjudgement sitting next to the outcome. It is the cause of it. Believing you are the exception is exactly what talks you out of the enum, the test, the backup, the second opinion. The rule does not catch you despite your confidence. It catches you *through* it.

You see it most clearly in people who can recite the rule and exempt themselves anyway:

- The engineer who can quote Hyrum's Law, that with enough users every observable behaviour of your system becomes something someone depends on, and ships the leaky behaviour regardless, because surely no one will rely on *that*.
- The manager who knows Goodhart's Law, that a measure under pressure stops being a good measure, and targets the number anyway, because *their* team would never game it.
- Every bubble, where "this time is different" is not said by people who have never heard of bubbles. It is said by people who have, and have decided they are the one that lasts.

The pattern is ancient. The law settled it two thousand years ago with *ignorantia juris non excusat*, ignorance excuses no one. The Greeks knew the sharper half: hubris invites nemesis. It is not the ignorant who get the hard lessons, it is the confident. Agreeing with a rule in general costs nothing. The whole game is the single case you wave off as special, because that is the one case you stop defending.

So when you next reach for "mine is different, just this once", treat the feeling of being exempt as what it actually is. Not evidence. Usually the tell. Use the enum.
