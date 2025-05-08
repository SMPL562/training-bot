def calculate_feedback(transcript: list, goals: list) -> dict:
    score = 0.0
    details = {}
    transcript_text = " ".join([entry["content"] for entry in transcript if entry["role"] == "user"]).lower()
    
    for goal in goals:
        if goal.lower() in transcript_text:
            score += 0.2
            details[goal] = "Achieved"
        else:
            details[goal] = "Not achieved"
    
    if "follow-up" in transcript_text or "appointment" in transcript_text:
        score += 0.4
        details["Follow-up"] = "Booked"
    else:
        details["Follow-up"] = "Not booked"
    
    return {"score": min(score, 1.0), "details": details}