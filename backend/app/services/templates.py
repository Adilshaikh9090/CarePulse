REC_TEMPLATES = {
    "Workload": ("Review current workload", "Workload is currently the strongest contributor to your welfare-risk indicator.", "Within 3 days"),
    "Fatigue": ("Encourage adequate rest period", "Elevated fatigue suggests scheduling protected rest time.", "Within 2 days"),
    "Sleep Quality": ("Improve sleep routine", "Reduced sleep quality is contributing to the current indicator.", "Within 7 days"),
    "Duty Hours": ("Review duty roster alignment", "Extended duty hours are elevating the indicator.", "Within 3 days"),
    "Job Satisfaction": ("Offer optional confidential welfare consultation", "Lower job satisfaction may benefit from confidential support.", "Within 7 days"),
    "Self-Reported Stress": ("Try guided relaxation exercises", "Self-reported stress levels suggest trying short relaxation exercises.", "Within 7 days"),
    "Rest Break Quality": ("Protect daily break windows", "Limited break quality is contributing to the indicator.", "Within 2 days"),
    "Overtime Frequency": ("Balance overtime allocation", "Frequent overtime is elevating the welfare-risk indicator.", "Within 3 days"),
}
REC_FALLBACK = ("Wellbeing follow-up", "A supportive check-in is suggested.", "Within 7 days")
REPEAT_REC = {"title": "Repeat wellbeing assessment in 7 days",
              "reason": "Tracking the trend helps confirm recovery early.",
              "timeframe": "In 7 days"}
