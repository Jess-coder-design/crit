# Categorical 3D Positioning System — Complete Documentation

## Overview

The design landscape visualization now uses **explicit categorical positioning** based on dominant critical and design practices. This approach replaces continuous UMAP embeddings with transparent, auditable coordinate assignment.

**Key Insight:** Position = categorical membership (not magnitude, not similarity score)

---

## Quick Start

### For Visualization Developers
1. **Start here:** [QUICK_REFERENCE.md](QUICK_REFERENCE.md) — Axis definitions & data snapshot
2. **Then read:** [VISUALIZATION_GUIDELINES.md](VISUALIZATION_GUIDELINES.md) — How to render categorically
3. **Load:** `position_3Dmap.json` with the new coordinates
4. **Implementation checklist** in QUICK_REFERENCE.md

### For Understanding the Approach
1. **Start here:** [CATEGORICAL_POSITIONING.md](CATEGORICAL_POSITIONING.md) — Full explanation of the method
2. **See examples:** [EXAMPLES.md](EXAMPLES.md) — How to interpret positions
3. **Implementation notes:** [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md) — What was done & why

### For Auditing the Results
1. Review metadata fields in `position_3Dmap.json`:
   - `_dominant_critical_practice` — The keyword that determined X
   - `_critical_axis_position` — Its position on the X-axis
   - Same for design (Y-axis)
2. Verify using stats in [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)
3. Spot-check sentences against assignments

---

## Core Files

### Data Files

| File | Status | Purpose |
|------|--------|---------|
| **position_3Dmap.json** | ✓ UPDATED | 1,702 repositioned sentences with metadata |
| 3dmap_analysis.json | (unchanged) | Input: sentences with extracted keywords |
| keywordsorder.json | (reference) | Axis definitions for critical & design practices |

### Documentation Files

| File | Purpose |
|------|---------|
| **QUICK_REFERENCE.md** | Axis definitions, data snapshot, verification checklist |
| **CATEGORICAL_POSITIONING.md** | Full explanation of approach, algorithm, reasoning |
| **VISUALIZATION_GUIDELINES.md** | Rendering best practices, interactive features, what NOT to do |
| **IMPLEMENTATION_SUMMARY.md** | What was done, design decisions, limitations |
| **EXAMPLES.md** | Concrete examples of how to interpret positions |
| **README.md** (this file) | Navigation guide |

### Code Files

| File | Purpose |
|------|---------|
| **scripts/reposition_3d_categorical.py** | Python script that generated the new positions |

---

## The Approach at a Glance

### Position Assignment

For each sentence:

```
Critical keywords → count → dominant → X position (1-9)
Design keywords  → count → dominant → Y position (1-20)
Year             → as-is  →          Z position
Add jitter ±0.1 to prevent overlap
```

### Axes

**X-Axis (Critical Practices — 9 positions)**
```
1: question
2: critique
3: critical
4: interrogate
5: problematize
6: reframe
7: reflect
8: position
9: post-critical
```

**Y-Axis (Design Practices — 20 positions)**
```
1: work
2: craft
3: applied art
...
20: theorize
```

(See [QUICK_REFERENCE.md](QUICK_REFERENCE.md) for full list)

### Tie-Breaking Rule
When multiple keywords have equal counts: choose the earliest in axis order. *This is not neutral—it embeds a choice about priority.*

---

## Data Quality

| Metric | Value |
|--------|-------|
| Total sentences processed | 1,702 |
| With critical keywords | 577 (33.9%) |
| With design keywords | 1,584 (93.1%) |
| With both X and Y | 459 (27.0%) |
| With null X (no critical) | 1,125 (66.1%) |
| With null Y (no design) | 118 (6.9%) |

**Interpretation:** The corpus is heavily design-focused (93% have design vocabulary) but lightly critical (34% have critical vocabulary). This is honest about the data.

---

## Key Design Decisions

1. **Dominant Mode, Not First Match**
   - We count all keywords and pick the most frequent
   - Not the first keyword encountered
   - This embeds an assumption: *frequency indicates importance*

2. **Explicit Tie-Breaking**
   - When tied, we choose the earliest in axis order
   - This is not neutral; it biases toward foundational practices
   - The choice is documented in code

3. **Categorical + Jitter**
   - Base position = categorical (integer 1-9 or 1-20)
   - Jitter = small random displacement (±0.1)
   - Prevents visual overlap while maintaining categorical grouping

4. **Null Handling**
   - Sentences with no critical keywords get `x=null`
   - Don't drop them; give them special visual treatment
   - This honestly represents the data

---

## Advantages vs. Limitations

### ✓ Advantages
- Transparent: spatial logic is explicit and auditable
- Interpretable: humans understand why positions are assigned
- Designed: axis order is a deliberate argument
- Critiqueable: choices are visible and can be questioned
- Stable: reproducible positions (except jitter)
- Honest: null values acknowledge incompleteness

### ✗ Limitations (by design)
- ~66% have `x=null` (not all is critical)
- Tie-breaking rules are somewhat arbitrary
- Axis order is editorial, not discovered
- Jitter makes precise positions meaningless
- No continuous embedding properties (smoothness, dimensionality)

These aren't failures—they're *features that make critique possible*.

---

## How to Use the New Positioning

### Immediate Implementation
1. Load `position_3Dmap.json` into your 3D visualization
2. Parse `_dominant_critical_practice` and `_dominant_design_practice` for auditing
3. Render as bands/zones, not scattered points
4. Add axis labels (category names at each position)
5. Handle null values visually (don't drop sentences)
6. Show jitter as intentional spacing
7. Include UI explaining the categorical structure

### Visualization Checklist
- [ ] Load new `position_3Dmap.json`
- [ ] Render categorical bands (not scattered points)
- [ ] Add axis labels
- [ ] Handle null values gracefully
- [ ] Show jitter as intentional
- [ ] Include algorithm explanation in UI
- [ ] Enable hovering to see assignment decision
- [ ] Optional: add toggle for jitter re-sampling

### Future: Making It Interactive
- Toggle assignment rules (dominant vs. first-match)
- Reorder axes live
- Show secondary/alternative positions as ghosts
- Collapse categories to test distinctiveness

---

## Verification & Auditing

### Verify the Data
```python
import json

with open('position_3Dmap.json') as f:
    data = json.load(f)

# Should have 1702 entries
assert len(data) == 1702

# Each should have audit metadata
for item in data:
    assert '_dominant_critical_practice' in item
    assert '_dominant_design_practice' in item
```

### Spot-Check Assignments
Pick a few random sentences and verify:
1. Do the keywords match what the sentence says?
2. Does the dominant practice make sense?
3. Would you assign it the same way?

### Review Statistics
Compare the distribution breakdown in [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md) with your intuition about the corpus. Does it match expectations?

---

## Implementation Files

### Python Script: `reposition_3d_categorical.py`
- Located in `../scripts/`
- Reads: `3dmap_analysis.json`, `keywordsorder.json`
- Writes: `position_3Dmap.json`
- Includes detailed comments and statistics output

**Run:**
```bash
python scripts/reposition_3d_categorical.py
```

Output:
- 1,702 sentences repositioned
- Statistics printed to console
- New file written to `position_3Dmap.json`

---

## Reading Guide by Role

### Visualization Developer
→ [QUICK_REFERENCE.md](QUICK_REFERENCE.md) → [VISUALIZATION_GUIDELINES.md](VISUALIZATION_GUIDELINES.md)

### Researcher/Theorist
→ [CATEGORICAL_POSITIONING.md](CATEGORICAL_POSITIONING.md) → [EXAMPLES.md](EXAMPLES.md)

### Project Manager/Supervisor
→ [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md) → [QUICK_REFERENCE.md](QUICK_REFERENCE.md)

### Auditor/Skeptic
→ [EXAMPLES.md](EXAMPLES.md) → Spot-check `position_3Dmap.json` → Review code in `scripts/reposition_3d_categorical.py`

---

## FAQ

### Q: Why are ~66% of sentences at x=null?
**A:** Because they don't contain critical vocabulary. Not all design research is explicitly critical. This is honest.

### Q: The axis order seems arbitrary. Can it change?
**A:** Yes! That's the point. The order is a design argument. It can be questioned, reordered, and reimagined. See [VISUALIZATION_GUIDELINES.md](VISUALIZATION_GUIDELINES.md) for interactive reordering ideas.

### Q: What does jitter do?
**A:** Prevents sentences at the same categorical position from perfectly overlapping. It's small (±0.1) to maintain categorical grouping while preventing visual clutter.

### Q: Can I run this script again?
**A:** Yes! The script is deterministic (except for jitter). Run it again and you'll get the same positions (with different jitter). This is intentional.

### Q: How do I handle null values in visualization?
**A:** Don't silently drop them. Give them a visual treatment: ghost rendering, separate zone, or distinct color. See [VISUALIZATION_GUIDELINES.md](VISUALIZATION_GUIDELINES.md) for options.

### Q: What if I disagree with the axis ordering?
**A:** Great! That means it's working. The ordering is meant to be questioned. See [VISUALIZATION_GUIDELINES.md](VISUALIZATION_GUIDELINES.md) for ideas on interactive reordering.

---

## Next Steps

1. **Review** the relevant documentation for your role (see Reading Guide above)
2. **Implement** the new `position_3Dmap.json` in your visualization
3. **Test** with a few sample sentences (verify positions make sense)
4. **Deploy** and observe how the categorical structure feels
5. **Iterate** based on user feedback and your own critical reflection

---

## Support & Questions

If something is unclear:

1. **Check the docs** — most questions are answered in one of the guides
2. **Spot-check examples** — see [EXAMPLES.md](EXAMPLES.md) for concrete cases
3. **Review the code** — comments in `scripts/reposition_3d_categorical.py` explain the logic
4. **Verify data** — use the checklist in [QUICK_REFERENCE.md](QUICK_REFERENCE.md)

---

## Final Thought

This approach shifts from *"let the data speak for itself"* to *"make our design decisions visible."*

That's where visualization becomes critical design practice.

---

**Documentation Version:** 1.0  
**Data Version:** position_3Dmap.json (1,702 sentences, categorical positioning)  
**Generated:** January 2026  
**Status:** Ready for implementation
