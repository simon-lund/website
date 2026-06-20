---
title: "Lund's Law"
description: 'A small law about why thinking you are exempt is the very thing that catches you, and the joke that justifies putting my name on it.'
pubDate: 'Jun 07 2026'
tags: ['Laws']
draft: true
---

I have a soft spot for laws that are one sentence long and annoyingly true.

- **Hyrum's Law:** with enough users, every observable behaviour of your system becomes something someone depends on, no matter what you promised.
- **Goodhart's Law:** when a measure becomes a target, it stops being a good measure.

You read them once and they rearrange how you see things. No proof, no math, just a line you cannot un-see. Before I get to mine, here is one in the wild.

## Start with a string

You add a `status` field. An enum feels like overkill, free text is flexible, so you ship a plain string. It works.

Then it grows. The values drift in: `active`, `Active`, `ACTIVE`, `actv`, one with a trailing space. Code all over the place starts branching on them. Reports group by them. A migration tries to tidy them up and breaks something that quietly relied on the typo.

Congratulations, you have an enum. The worst possible one: undocumented, inconsistent, unvalidated, and impossible to change because something now depends on every accidental spelling. There is even a name for the smell, *stringly typed*. So:

> Every free-text field is an enum that has not admitted it yet.

Which is really Hyrum's Law in different clothes: once a value can be observed, someone depends on it.

And notice the thing that talked you into free text in the first place. Postel's Law, *be liberal in what you accept*, is not actually a law. It is a suggestion phrased as an instruction, which you were free to take or ignore. That is the tell. The laws I care about are not advice. They do not need your cooperation and they do not accept your refusal. Postel's you can skip. The enum waits for you anyway.

## A word on names

You may have noticed I keep bolting surnames onto sentences. Is it not a bit much to coin a law and sign it?

> **Lund's Second Law.** Every law's name eventually converges on its author.

This has a famous cousin, Stigler's Law of Eponymy: no scientific discovery is named after its original discoverer. The perfect part, the part that made me want to write any of this down, is that Stephen Stigler named that law and then credited the sociologist Robert Merton as its real discoverer. It demonstrates itself in the act of being stated. Hyrum's Law does the same from the other side: Titus Winters coined the phrase and put Hyrum Wright's name on it, not his own. A law's name is not a claim of ownership. It is a label, and labels drift to whoever says them best.

## The law underneath

So, back to the string. Why did you skip the enum? Not ignorance. You knew enums existed. You filed *this* field under "exception": mine is different, it will stay clean, it does not need constraining. It is the same move as the engineer who has read Hyrum's Law and ships the undocumented behaviour anyway, and the manager who can quote Goodhart and targets the metric anyway. Everyone agrees with the law in general and exempts themselves in particular.

That is the law under all the others:

> **Lund's First Law.** Believing a law does not apply to you is not evidence of exemption. It is usually the reason it will.

The important word is *reason*. This is not just "you underestimate your risk," which is plain optimism bias and already has a name. The claim is sharper: the belief is not a mistake sitting next to the outcome, it is the cause of it. Thinking you are exempt is exactly what talks you out of the enum, the docs, the constraint that would have saved you. The law catches you *through* your confidence.

It has a long family. The legal version is two thousand years old: *ignorantia juris non excusat*, ignorance of the law excuses no one. The Greeks had the causal half, where hubris invites nemesis and pride goes before the fall. Finance has the temporal one, "this time is different," which Reinhart and Rogoff put on a book cover and which Templeton called the four most dangerous words in investing. None of them is quite the general thing, which is the whole reason to give it a name.

And putting my name on it is not arrogance, it is a controlled experiment. If the First Law is any good it will outlast my claim to it, and the name will drift off to whoever says it best. If it is not, this page is the only place it ever appears, which is its own kind of proof.

Either way: do not file yourself under "exception." That is the one move the law is watching for.
