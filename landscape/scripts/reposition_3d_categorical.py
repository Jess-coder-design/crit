"""
Reposition 3D map using categorical axis ordering.

Core idea: Encode order explicitly as lookup tables, not continuous scores.

Approach:
1. Critical practices map to X axis positions (1-9)
2. Design practices map to Y axis positions (1-20)
3. Year maps to Z axis
4. For each sentence: count keyword matches in each category
5. Assign X/Y based on dominant practice (highest count)
6. Add small random jitter to prevent perfect overlap
"""

import json
import random
import os

# Critical practice axis (X) - centered at 0
CRITICAL_ORDER = {
    "question": -2,
    "critique": -1,
    "critical": 0,
    "interrogate": 1,
    "problematize": 2,
    "reframe": 3,
    "reflect": 4,
    "position": 5,
    "post-critical": 6
}

# Design practice axis (Y) - centered at 0
DESIGN_ORDER = {
    "work": -4,
    "craft": -3,
    "applied art": -2,
    "practice": -1,
    "design": 0,
    "project": 1,
    "plan": 2,
    "intend": 3,
    "iterate": 4,
    "explore": 5,
    "inquire": 6,
    "analyze": 7,
    "evaluate": 8,
    "investigate": 9,
    "conceptualize": 10,
    "narrate": 11,
    "discourse": 12,
    "dialecticize": 13,
    "systematize": 14,
    "theorize": 15
}

JITTER_RANGE = 0.1  # ±0.1 jitter to prevent perfect overlap

def get_dominant_category(keywords_list, category_order):
    """
    Find the highest-positioned keyword on the axis.
    
    This prioritizes more specific/rare keywords (higher numbers)
    over common ones (lower numbers).
    Returns (position, keyword, unique_count) tuple.
    """
    if not keywords_list:
        return None, None, 0
    
    # Find all matching keywords
    matching = [kw for kw in keywords_list if kw in category_order]
    
    if not matching:
        return None, None, 0
    
    # Count unique keywords in this category
    unique_keywords = set(matching)
    unique_count = len(unique_keywords)
    
    # Pick the keyword with the highest position on the axis
    # (e.g., "position" at 8 beats "critical" at 3)
    dominant = max(matching, key=lambda kw: category_order[kw])
    position = category_order[dominant]
    
    return position, dominant, unique_count

def add_jitter(position):
    """Add small random jitter to categorical position."""
    if position is None:
        return None
    jitter = random.uniform(-JITTER_RANGE, JITTER_RANGE)
    return position + jitter

def process_sentences(analysis_json_path, output_json_path):
    """
    Read analysis, compute categorical positions, write repositioned data.
    """
    # Load analysis data
    with open(analysis_json_path, 'r', encoding='utf-8') as f:
        sentences_data = json.load(f)
    
    repositioned = []
    
    for item in sentences_data:
        url = item.get("url")
        sentence = item.get("sentence")
        year = item.get("year")
        critical_keywords = item.get("critical", [])
        design_keywords = item.get("design", [])
        
        # Determine position for critical practice (maps to X)
        x_position, dominant_critical, critical_unique = get_dominant_category(critical_keywords, CRITICAL_ORDER)
        
        # Determine position for design practice (maps to Y)
        y_position, dominant_design, design_unique = get_dominant_category(design_keywords, DESIGN_ORDER)
        
        # Z is year (as-is)
        z_position = year
        
        # Only add jitter if there are multiple unique keywords in that category
        # Single keyword = exact position on axis
        x_final = x_position
        y_final = y_position
        if x_position is not None and critical_unique > 1:
            x_final = add_jitter(x_position)
        if y_position is not None and design_unique > 1:
            y_final = add_jitter(y_position)
        
        repositioned.append({
            "url": url,
            "sentence": sentence,
            "x": x_final,
            "y": y_final,
            "z": z_position,
            "date": year,
            # Include metadata for interpretation
            "_dominant_critical_practice": dominant_critical,
            "_critical_axis_position": x_position,
            "_dominant_design_practice": dominant_design,
            "_design_axis_position": y_position
        })
    
    # Write repositioned data
    with open(output_json_path, 'w', encoding='utf-8') as f:
        json.dump(repositioned, f, indent=2, ensure_ascii=False)
    
    print(f"[OK] Repositioned {len(repositioned)} sentences")
    print(f"[OK] Written to: {output_json_path}")
    
    # Print statistics
    print("\n--- Categorical Distribution ---")
    critical_dist = {}
    design_dist = {}
    for item in repositioned:
        crit = item.get("_dominant_critical_practice")
        des = item.get("_dominant_design_practice")
        if crit:
            critical_dist[crit] = critical_dist.get(crit, 0) + 1
        if des:
            design_dist[des] = design_dist.get(des, 0) + 1
    
    print("\nCritical Practices (X-axis):")
    for kw in sorted(CRITICAL_ORDER.keys(), key=lambda k: CRITICAL_ORDER[k]):
        count = critical_dist.get(kw, 0)
        print(f"  {kw:20} (pos {CRITICAL_ORDER[kw]:2}): {count:4} sentences")
    
    print("\nDesign Practices (Y-axis):")
    for kw in sorted(DESIGN_ORDER.keys(), key=lambda k: DESIGN_ORDER[k]):
        count = design_dist.get(kw, 0)
        print(f"  {kw:20} (pos {DESIGN_ORDER[kw]:2}): {count:4} sentences")

if __name__ == "__main__":
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    json_dir = os.path.join(base_dir, "json", "landscape")
    
    analysis_path = os.path.join(json_dir, "3dmap_analysis.json")
    output_path = os.path.join(json_dir, "position_3dmap.json")
    
    print("Processing sentences with categorical axis ordering...\n")
    process_sentences(analysis_path, output_path)
