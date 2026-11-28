"""Generate video.yaml for English Convey Video #1 from the final script's [SLIDE n] cues.
say = the spoken lines between this cue and the next (teleprompter). Fields per slide are hand-mapped from the cue text."""
import re, yaml, sys
src = sys.argv[1] if len(sys.argv) > 1 else "/workspace/work/ec/video1/script-final-body.md"
txt = open(src).read().split("## Sources")[0]
lines = [l.strip() for l in txt.splitlines()]
says, cur, pre, part = {}, None, [], None
parts = {}
for l in lines:
    if not l or l.startswith("[B-ROLL") or l.startswith("<!--") or l.startswith(">"): continue
    if l.startswith("## Part"): part = l[3:]; continue
    if l.startswith("# "): continue
    m = re.match(r"\[SLIDE (\d+):", l)
    if m: cur = int(m.group(1)); says[cur] = []; parts[cur] = part; continue
    if l.startswith("[PAUSE"): (says[cur] if cur else pre).append("(pause)"); continue
    (says[cur] if cur else pre).append(l)
says[1] = pre + says.get(1, [])
S = {
 1: dict(template="kinetic_text", eyebrow="FOUR FRIENDS · ONE TABLE", text="Three lean into the shot.\nOne says *\"I'm good, thanks.\"*", align="center"),
 2: dict(template="title_card", eyebrow="ENGLISH CONVEY · PSYCHOLOGY", title="Why Quietly Saying *\"No\"* Makes Everyone Uncomfortable", subtitle="Three forces behind a five-second silence"),
 3: dict(template="timeline", title="Three forces behind the pause", events=[{"date":"1","text":"Fear in your head"},{"date":"2","text":"Silent judgment"},{"date":"3","text":"Group pressure"}]),
 4: dict(template="chapter_card", prefix="FORCE ", number="1", title="Fear *Inside* Your Own Head", subtitle="Before anyone reacts, you feel it first."),
 5: dict(template="study_card", eyebrow="STUDY · 2008", sample="Columbia students", authors="Flynn & Lake (2008)", journal="Journal of Personality and Social Psychology", finding="Find *one* stranger who will walk you to the gym. How many people will you have to ask?", stats="Predicted asks: 7.2 | danger\nActual asks: 2.3 | accent", caveat="Study 2 · averages per participant", source="Flynn & Lake (2008), JPSP 95(1), 128–143"),
 6: dict(template="split_compare", eyebrow="FLIP THE CAMERA", title="Two sides of a *no*", a_icon="🙋", a_title="The person asking", a_body="Flynn & Lake (2008)\nUnderestimate how hard refusing feels", a_tone="muted", b_icon="🙅", b_title="The person saying no", b_body="Givi & Kirk (2024)\nOverestimate how badly the no will land", b_tone="accent"),
 7: dict(template="study_card", eyebrow="STUDY · 2024", sample="5 studies · 2,000+ people", authors="Givi & Kirk (2024)", journal="Journal of Personality and Social Psychology", finding="Pilot survey: most had said yes to an invitation they *didn't want*, out of fear of declining.", stats="Pilot (51 people): 77% | accent", caveat="Plus five main studies — one with real couples.", source="Givi & Kirk (2024), JPSP 126(6), 1103–1115"),
 8: dict(template="split_compare", eyebrow="THE MIND GAP", title="What decliners *expect* vs what inviters *report*", a_icon="🔴", a_title="You expect", a_body="They focus on the bare \"NO\"\nThey'll be upset\nFewer invites later", a_tone="danger", b_icon="💭", b_title="Inviters report", b_body="They think about the thoughts behind your decision\nLess upset than you fear", b_tone="accent", verdict="Everyday invitations · scenario studies + one couples study"),
 9: dict(template="split_compare", eyebrow="A SIMPLE PUZZLE", title="Why vanilla doesn't start an *argument*", a_icon="🍦", a_title="Vanilla", a_body="Your personal taste", a_tone="accent", b_icon="🍫", b_title="Chocolate", b_body="No verdict on theirs", b_tone="muted"),
 10: dict(template="quote_card", eyebrow="THE CORE IDEA", quote="A personal boundary tells people what *you* won't do. A principled refusal can make people question what *they're* doing.", author="English Convey", role="The thesis of this video", tone="accent"),
 11: dict(template="split_compare", eyebrow="TWO REAL MOMENTS", title="Boundary or *principle*?", a_icon="☕", a_title="Personal limit", a_body="\"I'm skipping coffee so I sleep tonight.\"", a_tone="accent", b_icon="💬", b_title="Principled stand", b_body="Refusing to join a group chat that mocks a colleague", b_tone="danger"),
 12: dict(template="split_compare", eyebrow="GOFFMAN'S LENS (1959)", title="Social life as *theater*", a_icon="🎭", a_title="Front stage", a_body="Before an audience\nWe manage how we appear", a_tone="accent", b_icon="🚪", b_title="Back stage", b_body="Away from the audience\nWe relax parts of the act", b_tone="muted", verdict="Our interpretation — not a lab finding", source="Goffman (1959), The Presentation of Self in Everyday Life"),
 13: dict(template="lower_third", name="Monin, Sawyer & Marquez (2008)", role="4 studies · US undergraduates · \"The Rejection of Moral Rebels\"", tag="MORAL REBELS"),
 14: dict(template="split_compare", eyebrow="TWO STUDIES", title="How *outsiders* saw the refuser", a_icon="🎤", a_title="Speech study", a_body="Those who went along: disliked him\nObservers: preferred him", a_tone="accent", b_icon="🔎", b_title="Biased suspect task", b_body="Those who went along: tended to like him less\nObservers: rated him more moral, but did not significantly prefer him", b_tone="danger", source="Monin, Sawyer & Marquez (2008), JPSP 95(1), 76–93"),
 15: dict(template="bullet_list", title="Why rebels spark dislike", items=[{"text":"Expected judgment threatens self-image","tone":"accent"},{"text":"Writing about a personal value first removed the gap (Study 4)"},{"text":"A later online replication did not repeat it — disputed","tone":"danger"}], source="Holubar (2015) OSF a4fmg · Monin (2015) OSF 3s2zd"),
 16: dict(template="chapter_card", prefix="FORCE ", number="3", title="Standing *Alone*", subtitle="Nobody needs to judge you. It still feels heavy."),
 17: dict(template="study_card", eyebrow="ASCH · 1955", sample="123 people", authors="Solomon Asch (1955)", journal="Scientific American · \"Opinions and Social Pressure\"", finding="Match a line on a card. Alone it's easy. Then everyone else gives the *same wrong answer*.", stats="Alone: <1% | muted\nWith the group: 36.8% | accent", caveat="36.8% of answers — not of people. ~1/4 never went along; ~3/4 went along at least sometimes.", source="Asch (1955), Scientific American 193(5), 31–35"),
 18: dict(template="stat_bars", eyebrow="ASCH (1955)", title="Errors by size of the wrong *majority*", items="1 opponent: 3.6\n2 opponents: 13.6\n*3 opponents*: 31.8", highlight="3 opponents", max=40, suffix="%", decimals=1, unit="Bigger majorities added very little."),
 19: dict(template="punch_in", eyebrow="THE ALLY EFFECT", text="*ONE* TRUTHFUL PARTNER", caption="Wrong answers only one fourth as often (Asch, 1955)", tone="accent"),
 20: dict(template="three_cards", title="Not every silence comes from strength", cards=[{"icon":"🙈","label":"Silence from fear","text":"Hiding · going along"},{"icon":"🧭","label":"Calm boundary","text":"A clear personal limit"},{"icon":"⚖️","label":"Principled stand","text":"Acting on values"}]),
 21: dict(template="bullet_list", title="Three ideas to try *(not tested in the studies)*", items=["Pair a limit with a warm phrase","State your limit, not their flaw","Let the pause settle calmly"]),
 22: dict(template="kinetic_text", eyebrow="BACK AT THE TABLE", text="*\"I'm good, thanks —*\n*no coffee after noon.\"*", align="center"),
 23: dict(template="title_card", eyebrow="NEXT ON ENGLISH CONVEY", title="AI Confidence vs. *Independent Thinking*", subtitle="Comment: when did you last say \"yes\" just to avoid five awkward seconds?"),
}
slides = []
for n in sorted(S):
    d = dict(S[n]); d["layout"] = d.get("layout", "SCAM")
    d["say"] = " ".join(says.get(n, [])).replace("*", "")
    if parts.get(n): d["act"] = int(re.search(r"\d+", parts[n]).group(0))
    slides.append(d)
doc = {"title": 'Why Quietly Saying "No" Makes Everyone Uncomfortable', "theme": "english-convey", "copy": ["mp4", "png", "prompter"], "duration": 6, "slides": slides}
hdr = "# English Convey · Video #1 — generated from script-final.md [SLIDE n] cues by make_yaml.py (one slide per cue; say = teleprompter text)\n# build: python3 -m khordegir build videos/english-convey-video1 --no-copy\n"
open("video.yaml", "w").write(hdr + yaml.safe_dump(doc, allow_unicode=True, sort_keys=False, width=120))
print(len(slides), "slides")
