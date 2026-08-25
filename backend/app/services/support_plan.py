"""Rule-based welfare support-plan builder.

Turns an AI risk prediction + its top contributing factors into a short list of
supportive, voluntary next steps. Tone is deliberately supportive — never
disciplinary, never diagnostic.
"""

TIER_HIGH = "high"
TIER_RECOMMENDED = "recommended"
TIER_OPTIONAL = "optional"

# Supportive resource content surfaced by the "View Support" action.
SUPPORT_RESOURCES = {
    "Workload": {
        "title": "Workload support resources",
        "lines": [
            "Workload trends are reviewed collectively — your individual check-in never triggers personal consequences.",
            "You can flag sustained overload in your daily check-in; recurring patterns feed anonymized unit-level reviews.",
            "Your welfare officer can help explore task rebalancing options with you, strictly on your terms.",
        ],
    },
    "Fatigue": {
        "title": "Fatigue & recovery resources",
        "lines": [
            "Short, protected recovery windows (10–20 min) measurably reduce accumulated fatigue.",
            "If duty-hour patterns feel unsustainable, they can be reviewed confidentially through welfare channels.",
            "Persistent exhaustion lasting 2+ weeks deserves a conversation — an optional consultation is available anytime.",
        ],
    },
    "Sleep Quality": {
        "title": "Sleep & wellness resources",
        "lines": [
            "A consistent sleep-wake schedule is the single highest-impact recovery habit.",
            "Avoid screens and heavy meals close to bedtime; keep the sleep environment cool and dark when possible.",
            "The wellness library includes guided wind-down audio and shift-sleep guidance — ask your welfare officer for access.",
        ],
    },
    "Job Satisfaction": {
        "title": "Confidential feedback & support channels",
        "lines": [
            "An optional, confidential welfare consultation can be arranged — participation is always voluntary.",
            "Anonymous feedback channels exist for role, team, or environment concerns.",
            "Low satisfaction phases are common and temporary; early conversations make them shorter.",
        ],
    },
    "General": {
        "title": "General wellbeing support",
        "lines": [
            "Regular check-ins are the most effective way to catch dips early — they take under two minutes.",
            "All responses stay confidential; only anonymized aggregates are ever visible to staff.",
            "Support is voluntary at every step: accept, snooze, or dismiss any suggestion freely.",
        ],
    },
}

# Factor-specific supportive actions. A bundle activates only while that factor
# is actively contributing upward to the indicator (direction == increasing).
FACTOR_BUNDLES = {
    "Workload": [
        ("Review current workload", "Workload is currently the strongest contributor to your indicator.",
         "Within 3 days", TIER_RECOMMENDED,
         ["List your top 5 current tasks and mark which could wait a week",
          "Identify one item to renegotiate or hand back"]),
        ("Consider task redistribution", "Sharing load early prevents overload from compounding.",
         "Within 5 days", TIER_OPTIONAL,
         ["Note tasks that could move to a colleague with capacity",
          "Raise redistribution at your next team sync"]),
        ("Schedule a workload review", "A structured review keeps workload decisions visible and fair.",
         "Within 7 days", TIER_OPTIONAL,
         ["Request a 15-minute workload review slot", "Bring your task notes along"]),
    ],
    "Fatigue": [
        ("Encourage adequate rest period", "Elevated fatigue suggests protecting rest time first.",
         "Within 2 days", TIER_RECOMMENDED,
         ["Block one full rest evening this week", "Keep a regular wind-down routine"]),
        ("Review recent duty-hour patterns", "Long or irregular hours quietly accumulate fatigue.",
         "Within 5 days", TIER_OPTIONAL,
         ["Compare duty hours across the last two weeks", "Flag patterns that look unsustainable"]),
        ("Schedule a follow-up check-in", "A short follow-up confirms whether rest is restoring your levels.",
         "In 7 days", TIER_OPTIONAL,
         ["Set aside two minutes for your next check-in", "Watch how fatigue responds to real rest"]),
    ],
    "Sleep Quality": [
        ("Encourage sufficient recovery time", "Reduced sleep quality limits both mood and resilience.",
         "Within 3 days", TIER_RECOMMENDED,
         ["Aim for a consistent sleep window tonight", "Protect at least one recovery block tomorrow"]),
        ("Provide sleep/wellness resources", "Practical sleep guidance is available on request.",
         "Anytime", TIER_OPTIONAL,
         ["Ask for the shift-sleep guidance sheet", "Try a guided wind-down session"]),
    ],
    "Job Satisfaction": [
        ("Offer an optional confidential welfare consultation", "Lower satisfaction sometimes needs a human conversation.",
         "Within 7 days", TIER_RECOMMENDED,
         ["Book a confidential chat with a welfare officer", "No record appears in any work file"]),
        ("Provide feedback/support resources", "Structured feedback channels are open whenever you're ready.",
         "Anytime", TIER_OPTIONAL,
         ["Use the anonymous feedback form", "Explore peer-support contacts"]),
    ],
}

# Primary rules: (risk_level, top factor) -> headline step.
PRIMARY_RULES = {
    ("High", "Workload"): ("Review current workload",
                           "Risk is high and workload is the main driver — this is the first thing worth easing.",
                           "Within 2 days", TIER_HIGH,
                           ["List your top 5 current tasks and mark which could wait a week",
                            "Identify one item to renegotiate or hand back",
                            "Request a workload review if overload persists"]),
    ("Moderate", "Fatigue"): ("Encourage adequate rest period",
                              "Risk is moderate and fatigue is leading — prioritized rest usually helps fastest.",
                              "Within 2 days", TIER_RECOMMENDED,
                              ["Block one full rest evening this week",
                               "Keep a regular wind-down routine",
                               "Re-check your fatigue level after real rest"]),
}
LOW_RISK_STEP = ("Continue regular wellbeing check-ins",
                 "Your indicators look healthy — steady check-ins help keep it that way.",
                 "Every 7 days", TIER_OPTIONAL,
                 ["Keep your twice-weekly check-in rhythm", "Watch how you respond to rest and workload shifts"])
FOLLOW_UP_STEP = ("Repeat wellbeing assessment in 7 days",
                  "Tracking the trend helps confirm recovery early.",
                  "In 7 days", TIER_OPTIONAL,
                  ["Set aside two minutes for your next check-in", "Compare results after a week of rest"])


def _bundle_for(factor_name: str) -> list[dict]:
    return [{"title": title, "reason": reason, "timeframe": timeframe,
             "actions": actions, "tier": tier}
            for (title, reason, timeframe, tier, actions) in FACTOR_BUNDLES[factor_name]]


# Engine factor names -> support-plan family used by rules/bundles.
FACTOR_CATEGORY = {
    "Workload": "Workload",
    "Recent Workload Change": "Workload",
    "Overtime Frequency": "Workload",
    "Fatigue": "Fatigue",
    "Duty Hours": "Fatigue",
    "Rest Break Quality": "Fatigue",
    "Sleep Quality": "Sleep Quality",
    "Job Satisfaction": "Job Satisfaction",
}


def build_support_plan(risk_level: str, top_factors: list[dict]) -> list[dict]:
    """Return ordered plan steps: dicts with tier/title/reason/timeframe/actions/category/support."""
    steps: list[dict] = []
    top = [f for f in (top_factors or []) if f.get("direction") == "increasing"]
    primary_name = top[0]["name"] if top else None
    primary_cat = FACTOR_CATEGORY.get(primary_name, "General")

    # Critical escalations always lead with priority human review (supportive framing).
    if risk_level == "Critical":
        steps.append({
            "title": "Immediate authorized welfare review",
            "reason": ("Several indicators are strongly elevated together — a priority review "
                       "with appropriate professional support is the safest next step. "
                       "Participation remains voluntary and confidential."),
            "timeframe": "Within 24 hours", "tier": TIER_HIGH,
            "category": "Review",
            "actions": [
                "A welfare officer will reach out with confidential support options",
                "Consider requesting rest/recovery time through your supervisor",
                "Professional support resources are available via View Support",
            ]})

    # 1) primary rule (risk level x top factor family), per spec
    rule_key = "High" if risk_level == "Critical" else risk_level
    rule = PRIMARY_RULES.get((rule_key, primary_cat))
    if rule:
        title, reason, timeframe, tier, actions = rule
        steps.append({"title": title, "reason": reason, "timeframe": timeframe,
                      "tier": tier, "category": primary_cat, "actions": actions})
    elif risk_level == "Low" and not top:
        steps.append(dict(zip(
            ("title", "reason", "timeframe", "tier", "actions"), LOW_RISK_STEP, strict=True),
            category="Follow-up"))

    # 2) factor bundles for active (increasing) factors — one bundle per family
    added_titles = {s["title"] for s in steps}
    seen_cats = set()
    for f in top[:4]:
        cat = FACTOR_CATEGORY.get(f["name"])
        if not cat or cat in seen_cats or cat not in FACTOR_BUNDLES:
            continue
        seen_cats.add(cat)
        for i, item in enumerate(_bundle_for(cat)):
            if item["title"] in added_titles:
                continue
            step = dict(item, category=cat)
            if risk_level == "Low":
                step["tier"] = TIER_OPTIONAL
            elif (i == 0 and cat == primary_cat and risk_level == "High"
                  and step["tier"] == TIER_RECOMMENDED):
                step["tier"] = TIER_HIGH
            steps.append(step)
            added_titles.add(step["title"])

    if not steps:  # graceful fallback (unknown factors / odd states)
        steps.append(dict(zip(("title", "reason", "timeframe", "tier", "actions"), LOW_RISK_STEP,
                              strict=True), category="Follow-up"))

    # 3) follow-up reminder step (skip when already covered by Low-risk step)
    if not any(s["category"] == "Follow-up" for s in steps):
        steps.append(dict(zip(("title", "reason", "timeframe", "tier", "actions"), FOLLOW_UP_STEP,
                              strict=True), category="Follow-up"))

    # attach supportive resources + order by tier
    rank = {TIER_HIGH: 0, TIER_RECOMMENDED: 1, TIER_OPTIONAL: 2}
    for s in steps:
        res = SUPPORT_RESOURCES.get(s["category"], SUPPORT_RESOURCES["General"])
        s["support"] = {"title": res["title"], "lines": res["lines"]}
        s.setdefault("actions", [])
    return sorted(steps, key=lambda s: (rank[s["tier"]],))[:6]
