/* Tamil Stoic — Thirukkural page behaviour
 *
 * Sections:
 *   • i18n — English/தமிழ் interface language (dictionary ships Tamil only;
 *     English strings live at the call sites and in the static markup)
 *   • Today's Kural (deterministic pick from today's date; "Another" for a new one)
 *   • Three books (அறம் / பொருள் / காமம்) — filter by section
 *   • Situation doors — life-situation shortcuts that map to themes
 *   • Browse — search + suggestions + chapter + theme chips (chapter & theme exclusive)
 *   • Chapter map — 133-chapter grid grouped by book, with visited marks
 *   • Reading journey — locally tracked read marks, visited chapters, gentle streak
 *   • Focus reader, command palette, keyboard shortcuts, TTS recitation
 *
 * Reader is intentionally quiet: large Tamil, muted chrome, generous line-height,
 * focus pulls to the couplet itself.
 */
(function () {
  "use strict";

  var KURALS = window.KURALS || [];
  var CHAPTERS = window.CHAPTERS || [];
  var SECTIONS = window.SECTIONS || [];
  var THEMES = window.THEMES || [];

  var PREF_KEY = "tamil-stoic-reader-preferences-v1";
  var RECENT_KEY = "tamil-stoic-recent-searches-v1";
  var JOURNEY_KEY = "tamil-stoic-journey-v1";

  // Capture deep-link inputs before the first render can rewrite the URL.
  var bootHash = location.hash || "";
  var bootQuery = (function () {
    try { return new URLSearchParams(location.search).get("q") || ""; } catch (e) { return ""; }
  })();

  // ---------- i18n: Tamil dictionary, English pass-through --------------
  var I18N = {
    ta: {
      "skip.daily": "இன்றைய குறளுக்குச் செல்லவும்",
      "skip.browse": "தேடல் மற்றும் உலாவுக்குச் செல்லவும்",
      "header.eyebrow": "தமிழ் ஸ்டோயிக் · Tamil Stoic",
      "header.subtitle": "திருக்குறள் — திருவள்ளுவரின் குறள்கள்",
      "header.tagline":
        "ஒரு நாளைக்கு ஒரு குறள். மூன்று பால்கள் நடந்து செல்ல. நீங்கள் இருக்கும் சூழ்நிலைக்கான வாயில் — ஒவ்வொரு பாடலும் <b>தமிழில்</b>, எளிய ஆங்கிலப் பொருளுடன்.",
      "header.tools": "வாசகக் கருவிகள்",
      "action.settings": "வாசிப்பு அமைப்புகள்",
      "action.saved": "சேமித்தவை",
      "action.openSaved": "சேமித்த குறள்களைத் திறக்க",
      "action.palette": "தேடல் மற்றும் கட்டளைகள்",
      "action.dismiss": "இப்போது வேண்டாம்",
      "action.cancel": "ரத்து",
      "onboard.cardLabel": "புதியவரா நீங்கள்?",
      "onboard.cardText":
        "தமிழ் ஸ்டோயிக் புதியவரா? 30 வினாடிச் சுற்றுலா — தினசரி பாடல், தனிச் சேமிப்பு, ஆஃப்லைன் வாசிப்பு.",
      "onboard.start": "எனக்குக் காட்டுங்கள்",
      "install.action": "செயலியை நிறுவு",
      "update.text": "தமிழ் ஸ்டோயிக்கின் அமைதியான, புதிய பதிப்பு தயாராக உள்ளது.",
      "update.now": "இப்போது புதுப்பி",
      "update.later": "பின்னர்",
      "daily.title": "இன்றைய குறள் · Today's Kural",
      "daily.shuffle": "வேறு ஒன்று · Another",
      "daily.shuffleTitle": "வேறு ஒரு குறளைக் காட்டு",
      "daily.share": "இன்றைய குறளைப் பகிர்",
      "daily.browse": "அனைத்தையும் உலாவு →",
      "books.title": "மூன்று பால்கள் · The three books",
      "books.sub": "திருக்குறள் மூன்று பால்களாக அமைந்துள்ளது. ஒன்றைத் தட்டி, முழுமையாகப் படியுங்கள்.",
      "situations.title": "சரியான வாயிலைத் திற · சூழ்நிலை",
      "situations.sub": "இன்று நீங்கள் எங்கே? பொருந்தும் வாயிலைத் தேர்ந்தெடுங்கள்; வள்ளுவர் அதற்குப் பேசுவார்.",
      "browse.title": "உலாவு · அதிகாரங்கள்",
      "browse.sub": "எண் அல்லது சொல் தேடுங்கள், அதிகாரம் தேர்வு செய்யுங்கள், அல்லது சுதந்திரமாக அலையுங்கள்.",
      "journey.empty": "உங்கள் வாசிப்புப் பயணம் ஒரு குறளில் தொடங்குகிறது.",
      "journey.progress": "{r} குறள்கள் படித்தவை · {c} அதிகாரங்கள் பார்த்தவை · {s} நாள் தொடர்",
      "search.label": "குறளை எண், தமிழ், எழுத்துப்படம் அல்லது ஆங்கிலத்தில் தேடுங்கள்",
      "search.suggestions": "தேடல் பரிந்துரைகள்",
      "search.placeholder": "எண் அல்லது சொல் தேடுங்கள் — எ.கா. 151, பொறுத்தல், patience…",
      "chapter.label": "அதிகாரம் · Chapter",
      "chapter.aria": "அதிகாரம் வாரியாக வடிகட்டு",
      "clear.aria": "அதிகாரம், பால், சூழ்நிலை, தலைப்பு, தேடல் அனைத்தையும் அழி",
      "clear.text": "அழி",
      "chips.aria": "தலைப்பு வாரியாக வடிகட்டு",
      "list.loading": "மேலும் ஏற்றப்படுகிறது…",
      "map.title": "அனைத்து அதிகாரங்கள் · All 133 chapters",
      "backToTop": "மேல்",
      "saved.close": "சேமித்த குறள்களை மூடு",
      "saved.eyebrow": "உங்கள் தனிச் சேகரிப்பு",
      "saved.title": "சேமித்த குறள்கள்",
      "saved.intro": "சேமித்த குறள்களும் சிந்தனைகளும் இந்தச் சாதனத்திலேயே இருக்கும். எதுவும் தானாகப் பதிவேற்றப்படுவதில்லை.",
      "saved.empty": "சரியான தருணத்தில் உங்களைச் சந்திக்கும் ஒரு குறளைச் சேமியுங்கள். இங்கே தோன்றும்.",
      "reflection.close": "சிந்தனை எடிட்டரை மூடு",
      "reflection.title": "ஒரு தனிச் சிந்தனை",
      "reflection.label": "நீங்கள் என்ன நினைவில் கொள்ள விரும்புகிறீர்கள்?",
      "reflection.placeholder": "உங்களுக்கான ஒரு எண்ணம் — இந்தச் சாதனத்தில் மட்டுமே சேமிக்கப்படும்.",
      "reflection.hint": "500 எழுத்துகள் வரை. காலியாக விட்டாலும் குறள் சேமிக்கப்படும்.",
      "reflection.save": "சிந்தனையைச் சேமி",
      "settings.close": "வாசிப்பு அமைப்புகளை மூடு",
      "settings.eyebrow": "இந்த வாசிப்பை உங்களுக்காக்குங்கள்",
      "settings.title": "வாசிப்பு அமைப்புகள்",
      "settings.textSize": "எழுத்து அளவு",
      "settings.textSizeAria": "எழுத்து அளவு",
      "settings.size.standard": "சாதாரணம்",
      "settings.size.large": "பெரியது",
      "settings.size.xlarge": "மிகப் பெரியது",
      "settings.spacing": "வரிசை இடைவெளி",
      "settings.spacingAria": "வரிசை இடைவெளி",
      "settings.spacing.comfortable": "வசதியானது",
      "settings.spacing.relaxed": "தளர்வானது",
      "settings.colour": "நிறம்",
      "settings.colourAria": "நிறத் திட்டம்",
      "settings.colour.light": "பனையோலை பகல்",
      "settings.colour.dark": "கோயில் இரவு",
      "settings.colour.system": "கணினியைப் பின்தொடர்",
      "settings.language": "இடைமுக மொழி · Interface language",
      "settings.languageAria": "இடைமுக மொழி",
      "settings.layers": "வாசிப்பு அடுக்குகள்",
      "settings.layer.tamil": "தமிழ் குறள்",
      "settings.layer.translit": "எழுத்துப்படம்",
      "settings.layer.translation": "ஆங்கில மொழிபெயர்ப்பு",
      "settings.layer.simple": "எளிய பொருள்",
      "settings.motion": "அசைவைக் குறை",
      "focus.close": "வாசிப்பை மூடு",
      "nav.prev": "முந்தையது",
      "nav.next": "அடுத்தது",
      "nav.listen": "கேளுங்கள்",
      "palette.eyebrow": "எங்கும் செல்லுங்கள்",
      "palette.title": "தேடல் மற்றும் கட்டளைகள்",
      "palette.aria": "குறள் எண், அதிகாரம் அல்லது கட்டளை தட்டவும்",
      "palette.placeholder": "குறள் எண், அதிகாரம் அல்லது கட்டளை தட்டவும்…",
      "palette.navigate": "நகர்த்த",
      "palette.open": "திற",
      "palette.close": "மூடு",
      "palette.empty": "பொருந்துவது எதுவும் இல்லை.",
      "shortcuts.close": "குறுக்குவழிகளை மூடு",
      "shortcuts.eyebrow": "விசைப்பலகை",
      "shortcuts.title": "விசைப்பலகைக் குறுக்குவழிகள்",
      "shortcuts.search": "தேடலை முன்னிலைப்படுத்து",
      "shortcuts.palette": "கட்டளைப் பட்டியலைத் திற",
      "shortcuts.j": "அடுத்த குறள்",
      "shortcuts.k": "முந்தைய குறள்",
      "shortcuts.s": "முனைவுக் குறளைச் சேமி",
      "shortcuts.l": "முனைவுக் குறளைக் கேளுங்கள்",
      "shortcuts.enter": "முனைவு முறையில் குறளைப் படிக்க",
      "shortcuts.help": "இந்த உதவியைக் காட்டு",
      "onboard.close": "சுற்றுலாவை மூடு",
      "onboard.step1Eyebrow": "ஒன்று முதல் மூன்று",
      "onboard.step1Title": "ஒரு நாளைக்கு ஒரு குறள்",
      "onboard.step1Body": "இன்றைய குறள் மேலே வரவேற்கிறது. வேறு பாடல் வேண்டுமானால் “வேறு ஒன்று” அழுத்தவும்; தேவைப்படுபவருக்குப் பகிரவும்.",
      "onboard.step2Eyebrow": "இரண்டு முதல் மூன்று",
      "onboard.step2Title": "உங்களைச் சந்திப்பதைச் சேமியுங்கள்",
      "onboard.step2Body": "எந்தக் குறளிலும் சேமி அழுத்தவும், அல்லது தனிச் சிந்தனை எழுதவும். இரண்டும் இந்தச் சாதனத்தில் மட்டுமே — எப்போதும் பதிவேற்றப்படாது.",
      "onboard.step3Eyebrow": "மூன்று முதல் மூன்று",
      "onboard.step3Title": "உங்கள் வழியில், ஆஃப்லைனில்",
      "onboard.step3Body": "வாசிப்பு அமைப்புகளில் எழுத்து அளவு, அடுக்குகள், பகல்/இரவு நிறம் தேர்வு செய்யுங்கள். செயலியை நிறுவினால் முழு நூலகமும் ஆஃப்லைனில்.",
      "onboard.back": "பின்",
      "onboard.next": "அடுத்து",
      "onboard.done": "வாசிப்பைத் தொடங்கு",
      "credits.eyebrow": "திறந்த மூல · மூலக் குறிப்புகள்",
      "credits.title": "பங்களிப்பும் திறந்த மூலமும்",
      "credits.intro": "இந்த வாசிப்பு அனுபவத்தை உருவாக்கியவர்களுக்கும் திட்டங்களுக்கும் மரியாதையுடன் தமிழ் ஸ்டோயிக் உருவாக்கப்பட்டுள்ளது. மூலக் குறியீடும் உரிம விவரங்களும் அனைவரும் பார்க்கவும் மீண்டும் பயன்படுத்தவும் திறந்தவை.",
      "credits.app.label": "செயலி",
      "credits.app.body": "செயலிக் குறியீடு, இடைமுகம், திட்டத்திற்காக உருவாக்கப்பட்ட காட்சிக் கூறுகள் ஆகியவை © 2026 pewsaipie; <b>MIT உரிமத்தின்</b> கீழ் வெளியிடப்பட்டுள்ளன. மூலக் களஞ்சியத்தில் குறியீடு, உருவாக்கச் சுட்டிகள், சோதனைகள், ஆவணங்கள் உள்ளன.",
      "credits.app.link": "GitHub-இல் மூலத்தைப் பாருங்கள் →",
      "credits.app.license": "MIT உரிமத்தைப் படிக்கவும்",
      "credits.kural.label": "தமிழ் உரை மற்றும் அமைப்பு",
      "credits.kural.body": "தமிழ்க் குறள்கள், எழுத்துப்பெயர்ப்புகள், அதிகார அமைப்பு ஆகியவை நிலையான பரிமேலழகர் அடிப்படையிலான பதிப்பைப் பின்பற்றி <b>tk120404/thirukkural</b> திட்டத்திலிருந்து பெறப்பட்டவை. மூலத் தரவுத்தொகுப்பு Apache 2.0 உரிமத்தில் உள்ளது; உருவாக்கப்பட்ட தரவிலும் அதன் மூலம் குறிப்பிடப்பட்டுள்ளது.",
      "credits.kural.source": "மூலத் தரவுத்தொகுப்பைப் பாருங்கள் →",
      "credits.kural.license": "Apache 2.0 உரிமத்தைப் படிக்கவும்",
      "credits.pope.label": "வரலாற்று ஆங்கில மூலம்",
      "credits.pope.body": "ஆங்கிலக் கவிதை மொழிபெயர்ப்புகளும் உரை விளக்கங்களும் <b>G. U. Pope</b>, W. H. Drew, John Lazarus, F. W. Ellis (1886) ஆகியோருக்குச் சேரும். இந்த வரலாற்று நூல் பொதுச் சொத்து; மூலத் தரவுத்தொகுப்பு வழியாக சேர்க்கப்பட்டுள்ளது.",
      "credits.pope.note": "எளிய ஆங்கிலப் பொருள்கள் Pope-ன் உரையிலிருந்து தமிழ் ஸ்டோயிக் திட்டத்திற்காகப் புதிதாக எழுதப்பட்டவை; அவை Pope-ன் சொற்கள் அல்ல.",
      "credits.editorial.label": "திட்ட எழுத்தாக்கமும் திருத்தப் பணியும்",
      "credits.editorial.title": "நவீன பொருள்களும் திருத்தங்களும்",
      "credits.editorial.body": "எளிய ஆங்கிலப் பொருள்கள் இந்தத் திட்டத்திற்காக எழுதப்பட்டவை. உரைத் திருத்தங்கள் காரணங்களுடனும் ஆதாரங்களுடனும் பதிவு செய்யப்பட்டுள்ளன; எவை சரிபார்க்கப்பட்டன, எவை இன்னும் முழுமையாகப் படிக்கப்படவில்லை என்பதை ஆய்வுக் குறிப்புகள் விளக்குகின்றன.",
      "credits.editorial.glosses": "திட்டத்தின் சொந்த பொருள்களைப் பாருங்கள் →",
      "credits.editorial.corrections": "திருத்த ஆதாரங்களைப் பாருங்கள்",
      "credits.editorial.review": "உரை ஆய்வுக் குறிப்புகளைப் படிக்கவும்",
      "credits.fonts.label": "ஆஃப்லைன் எழுத்துருக்கள்",
      "credits.fonts.title": "எழுத்துருக்களும் வடிவமைப்பாளர்களும்",
      "credits.fonts.body": "தமிழ் ஸ்டோயிக் ஆஃப்லைனிலும் இயங்க <b>Fontsource</b> வழியாக எழுத்துருக்கள் இங்கேயே வழங்கப்படுகின்றன. எழுத்துரு மென்பொருள் தனியாக <b>SIL Open Font License 1.1</b> உரிமத்தில் உள்ளது.",
      "credits.fonts.fontsource": "Fontsource பற்றி →",
      "credits.fonts.license": "எழுத்துரு உரிமமும் பதிப்புரிமைக் குறிப்புகளும்",
      "credits.distribution.label": "மறுபயன்பாடும் வெளிப்படைத்தன்மையும்",
      "credits.distribution.title": "திறந்த வடிவமைப்பு",
      "credits.distribution.body": "வெளியிடப்படும் வாசிப்புச் செயலியில் மூன்றாம் தரப்பு JavaScript சார்புகளோ வெளிப்புற எழுத்துரு/செயலி கோரிக்கைகளோ இல்லை. ‘கேளுங்கள்’ அம்சம் உலாவி அல்லது சாதனம் வழங்கும் குரல்களைப் பயன்படுத்துகிறது; அவை இந்தத் திட்டத்துடன் சேர்க்கப்படவில்லை. சேமித்தவை உங்கள் சாதனத்திலேயே இருக்கும்.",
      "credits.distribution.notices": "மூன்றாம் தரப்பு குறிப்புகள் அனைத்தையும் படிக்கவும் →",
      "credits.distribution.contribute": "GitHub-இல் பாருங்கள், மாற்றுங்கள் அல்லது பங்களியுங்கள்",
      "footer.credits":
        "ஆங்கிலக் கவிதை மொழிபெயர்ப்புகளும் உரை விளக்கங்களும் <b>G. U. Pope</b> (W. H. Drew, John Lazarus &amp; F. W. Ellis உடன், 1886) அவர்களுடையவை — பொதுச் சொத்து. தமிழ் உரை <b>tk120404/thirukkural</b> திட்டத்திலிருந்து (Apache 2.0) பெறப்பட்டது. <a href=\"#credits\">முழு மூலக் குறிப்புகள், ஆதாரங்கள், திறந்த மூல உரிமங்கள் →</a>",
      "footer.about": "<b>tamil-stoic-app</b> · தமிழ் ஞானத்திற்கான அமைதியான மூலை. அறம் · பொருள் · காமம்",

      /* dynamic strings (fallbacks live at the call sites) */
      "result.showing": "காட்டப்படுகிறது",
      "result.of": "இல்",
      "result.kurals": "குறள்கள்",
      "result.filtered": " (மொத்தம் {t} இலிருந்து வடிகட்டப்பட்டது)",
      "empty.title": "தேடலில் எதுவும் கிடைக்கவில்லை",
      "empty.body": "எதுவும் இல்லை. குறள் எண் (எ.கா. <b>151</b>) அல்லது வேறு சொல் முயற்சிக்கவும், அல்லது அழியை அழுத்தவும்.",
      "block.english": "ஆங்கில மொழிபெயர்ப்பு",
      "block.simple": "எளிய பொருள்",
      "books.descAll": "முழுப் பாதையையும் நட — அனைத்து 1,330 குறள்கள்.",
      "books.descVirtue": "அறம், சரியான நடத்தை, உள் வாழ்வு குறித்து. (அறம்)",
      "books.descWealth": "அரசாட்சி, செல்வம், உழைப்பு, நட்பு, உலகம் குறித்து. (பொருள்)",
      "books.descLove": "காதல், ஏக்கம், இதய வாழ்வு குறித்து. (காமம்)",
      "books.kuralsUnit": "குறள்கள்",
      "map.chaptersUnit": "அதிகாரங்கள்",
      "intro.range": "குறள்கள் {a} – {b}",
      "intro.clear": "அனைத்து அதிகாரங்களுக்கும் திரும்பு",
      "card.listen": "கேளுங்கள்",
      "card.stop": "நிறுத்து",
      "card.focus": "முழுமையாகப் படி",
      "card.prevAria": "முந்தைய குறள்",
      "card.nextAria": "அடுத்த குறள்",
      "card.listenAria": "இந்தக் குறளைக் கேளுங்கள்",
      "card.focusAria": "இந்தக் குறளை முனைவு முறையில் படி",
      "card.linkAria": "இந்தக் குறளுக்கான இணைப்பு",
      "speech.unsupported": "இந்த உலாவியில் ஒலி இல்லை.",
      "speech.failed": "இந்தச் சாதனத்தில் ஒலி இயக்க முடியவில்லை. தமிழ் குரல் இல்லாமல் இருக்கலாம்.",
      "speech.noTamilVoice": "இந்தச் சாதனத்தில் தமிழ் குரல் நிறுவப்படவில்லை — எழுத்துப்படமாக ஒலிக்கப்படும். தமிழ் குரலை நிறுவினால் மூல எழுத்தில் கேட்கலாம்.",
      "speech.blocked": "ஒலி உலாவியால் தடுக்கப்பட்டது — மீண்டும் ‘கேளுங்கள்’ அழுத்துங்கள்.",
      "daily.listenAria": "இன்றைய குறளைக் கேளுங்கள்",
      "daily.focusAria": "இன்றைய குறளை முனைவு முறையில் படி",
      "nav.kuralOf": "குறள் {n} / 1330",
      "actions.group": "குறள் ",
      "actions.shareGroup": "பகிர்வுக்குரிய குறள் ",
      "action.save": "சேமி",
      "action.savedLabel": "சேமித்தது",
      "action.reflect": "சிந்தி",
      "action.share": "பகிர்",
      "action.remove": "நீக்கு",
      "action.openSavedN": "{n} சேமித்த குறள்களைத் திற",
      "share.link": "இணைப்பைப் பகிர்",
      "share.copy": "இணைப்பை நகலெடு",
      "share.card": "பகிர்ப்பு அட்டை உருவாக்கு",
      "saved.metaPrefix": "குறள் #",
      "saved.noteLabel": "தனிச் சிந்தனை",
      "reflection.metaPrefix": "குறள் #",
      "toast.keepLayer": "குறைந்தது ஒரு வாசிப்பு அடுக்கையாவது காட்டுங்கள்.",
      "toast.saved": "இந்தச் சாதனத்தில் தனியாகச் சேமிக்கப்பட்டது.",
      "toast.removed": "சேமித்த குறள்களிலிருந்து நீக்கப்பட்டது.",
      "toast.reflectSaved": "தனிச் சிந்தனை இந்தச் சாதனத்தில் சேமிக்கப்பட்டது.",
      "toast.kuralSaved": "குறள் இந்தச் சாதனத்தில் தனியாகச் சேமிக்கப்பட்டது.",
      "toast.copied": "நகலெடுக்கப்பட்டது.",
      "toast.copyFail": "இங்கே நகலெடுக்க முடியவில்லை. முகவரிப் பட்டையிலிருந்து நகலெடுங்கள்.",
      "toast.shareCopied": "பகிர்வு இணைப்பு நகலெடுக்கப்பட்டது.",
      "toast.shareSheet": "பகிர்வுப் பட்டை திறந்தது.",
      "toast.cardPreparing": "இருமொழிப் பகிர்ப்பு அட்டை தயாராகிறது…",
      "toast.cardReady": "உங்கள் இருமொழிப் பகிர்ப்பு அட்டை பகிர்வதற்குத் தயார்.",
      "toast.cardSheet": "பகிர்ப்பு அட்டை உங்கள் பகிர்வுப் பட்டையில் தயார்.",
      "toast.cardFail": "இந்த உலாவியில் அட்டை உருவாக்க முடியவில்லை.",
      "toast.installDone": "தமிழ் ஸ்டோயிக் உங்கள் முதல்பக்கத்தில் தயார்.",
      "toast.storage": "உள்ளமைவுச் சேமிப்பு கிடைக்கவில்லை — இந்த அமர்வுக்கு மட்டுமே சேமிப்பு நீடிக்கும்.",
      "install.prompt": "அமைதியான, ஆஃப்லைன் வாசிப்புக்காக தமிழ் ஸ்டோயிக்கை உங்கள் தொலைபேசியில் நிறுவவும்.",
      "install.ios": "<strong>iPhone/iPad-இல் நிறுவ:</strong> <b>Share</b>, பின் <b>Add to Home Screen</b> என்பதை அழுத்தவும்.",
      "palette.cmd.today": "இன்றைய குறளுக்குச் செல்",
      "palette.cmd.browse": "உலாவுக்குச் செல்",
      "palette.cmd.saved": "சேமித்த குறள்களைத் திற",
      "palette.cmd.settings": "வாசிப்பு அமைப்புகளைத் திற",
      "palette.cmd.map": "அதிகார வரைபடத்திற்குச் செல்",
      "palette.cmd.random": "வேறு ஒரு குறள் (சீரற்ற)",
      "palette.cmd.night": "இரவு/பகல் நிறம் மாற்று",
      "palette.cmd.shortcuts": "விசைப்பலகைக் குறுக்குவழிகள்",
      "palette.kind.command": "கட்டளை",
      "palette.kind.kural": "குறள்",
      "palette.kind.chapter": "அதிகாரம்",
      "palette.kind.theme": "தலைப்பு",
      "journey.marking": "படித்ததாகக் குறிக்கப்படுகிறது"
    }
  };

  var lang = "en";
  var languageChangeCallbacks = [];

  function safeGet(key) {
    try { return window.localStorage ? window.localStorage.getItem(key) : null; } catch (e) { return null; }
  }
  function safeSet(key, value) {
    try { if (window.localStorage) window.localStorage.setItem(key, value); } catch (e) { /* private mode */ }
  }

  function currentLanguage() {
    try {
      var stored = JSON.parse(safeGet(PREF_KEY) || "{}");
      if (stored && (stored.uiLanguage === "ta" || stored.uiLanguage === "en")) return stored.uiLanguage;
    } catch (e) { /* ignore */ }
    return "en";
  }

  function fmt(str, vars) {
    return String(str).replace(/\{(\w+)\}/g, function (m, key) {
      return Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key]) : m;
    });
  }

  function t(key, fallback) {
    var dict = I18N[lang] || {};
    if (Object.prototype.hasOwnProperty.call(dict, key)) return dict[key];
    return fallback != null ? fallback : key;
  }

  function tf(key, fallback, vars) {
    var dict = I18N[lang] || {};
    if (Object.prototype.hasOwnProperty.call(dict, key)) return fmt(dict[key], vars);
    return fmt(fallback, vars);
  }

  function applyLanguage() {
    document.documentElement.lang = lang;
    Array.prototype.forEach.call(
      document.querySelectorAll("[data-i18n], [data-i18n-html]"),
      function (el) {
        var key = el.getAttribute("data-i18n") || el.getAttribute("data-i18n-html");
        if (!el.dataset.i18nEn) el.dataset.i18nEn = el.innerHTML;
        el.innerHTML = lang === "ta" && I18N.ta[key] ? I18N.ta[key] : el.dataset.i18nEn;
        el.lang = lang;
      }
    );
    Array.prototype.forEach.call(document.querySelectorAll("[data-i18n-placeholder]"), function (el) {
      if (el.dataset.i18nPlaceholderEn == null) el.dataset.i18nPlaceholderEn = el.getAttribute("placeholder") || "";
      var key = el.getAttribute("data-i18n-placeholder");
      el.setAttribute("placeholder", lang === "ta" && I18N.ta[key] ? I18N.ta[key] : el.dataset.i18nPlaceholderEn);
    });
    Array.prototype.forEach.call(document.querySelectorAll("[data-i18n-aria]"), function (el) {
      if (el.dataset.i18nAriaEn == null) el.dataset.i18nAriaEn = el.getAttribute("aria-label") || "";
      var key = el.getAttribute("data-i18n-aria");
      el.setAttribute("aria-label", lang === "ta" && I18N.ta[key] ? I18N.ta[key] : el.dataset.i18nAriaEn);
    });
    Array.prototype.forEach.call(document.querySelectorAll("[data-i18n-title]"), function (el) {
      if (el.dataset.i18nTitleEn == null) el.dataset.i18nTitleEn = el.getAttribute("title") || "";
      var key = el.getAttribute("data-i18n-title");
      el.setAttribute("title", lang === "ta" && I18N.ta[key] ? I18N.ta[key] : el.dataset.i18nTitleEn);
    });
    languageChangeCallbacks.forEach(function (cb) {
      try { cb(lang); } catch (e) { /* a secondary render must not break the page */ }
    });
  }

  function setLanguage(next) {
    lang = next === "ta" ? "ta" : "en";
    applyLanguage();
  }

  window.TamilStoicI18n = {
    t: t,
    tf: tf,
    fmt: fmt,
    getLanguage: function () { return lang; },
    setLanguage: setLanguage,
    onChange: function (cb) { languageChangeCallbacks.push(cb); },
  };

  // ---------- Situation doors (English + Tamil, mapped to a theme or chapter) ----------
  var SITUATIONS = [
    { id: "anger",     ta: "கோபம் வந்தபோது",     en: "When I'm angry",        theme: "anger" },
    { id: "patience",  ta: "பொறுமை தேவை",        en: "When I need patience",  theme: "patience" },
    { id: "grief",     ta: "துன்பத்தில்",         en: "When I'm grieving",     theme: "impermanence" },
    { id: "fear",      ta: "பயம் வருகிறது",       en: "When I'm afraid",       theme: "calm" },
    { id: "starting",  ta: "புதிதாக தொடங்கும்போது", en: "When I'm starting something", theme: "effort" },
    { id: "friends",   ta: "நட்பை நினைக்கும்போது",  en: "Thinking of friends",   theme: "friendship" },
    { id: "family",    ta: "குடும்பத்தில்",       en: "With family",           theme: "family" },
    { id: "wealth",    ta: "பொருள் தேடும்போது",    en: "About money & work",    theme: "wealth" },
    { id: "words",     ta: "பேசும் முன்",          en: "Before I speak",        theme: "truth" },
    { id: "love",      ta: "காதலில்",              en: "In love",               theme: "love" },
    { id: "learning",  ta: "கற்கும்போது",          en: "When I'm learning",     theme: "learning" },
    { id: "wisdom",    ta: "ஞானம் தேடி",           en: "Looking for wisdom",    theme: "wisdom" },
  ];

  // Engraved line-icons (single stroke family) for books and doors.
  var ICON_ATTRS = 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';
  var BOOK_ICONS = {
    all: '<svg ' + ICON_ATTRS + '><circle cx="12" cy="12" r="3.2"/><circle cx="12" cy="12" r="8.2"/><path d="M12 3.8v3M12 17.2v3M3.8 12h3M17.2 12h3"/></svg>',
    virtue: '<svg ' + ICON_ATTRS + '><path d="M12 3.5c1.6 1.9 1.6 4.4 0 6.3-1.6-1.9-1.6-4.4 0-6.3z"/><path d="M6.5 13.5h11c0 3.6-2.4 6.5-5.5 6.5s-5.5-2.9-5.5-6.5z"/><path d="M9 20.5h6"/></svg>',
    wealth: '<svg ' + ICON_ATTRS + '><path d="M12 4v16M7 20h10M12 7l-5.5 2.2L9 14M12 7l5.5 2.2L15 14"/><path d="M3.5 14a2.5 2.5 0 0 0 5 0L6 9.5 3.5 14zM15.5 14a2.5 2.5 0 0 0 5 0L18 9.5l-2.5 4.5z"/></svg>',
    love: '<svg ' + ICON_ATTRS + '><path d="M12 20s-7-4.6-7-9.6C5 7.5 7.2 5.5 9.6 5.5c1.4 0 2.4.7 2.4 1.6 0-.9 1-1.6 2.4-1.6 2.4 0 4.6 2 4.6 4.9 0 5-7 9.6-7 9.6z"/><path d="M12 7.1V4.5"/></svg>',
  };
  var SITUATION_ICONS = {
    anger: '<path d="M12 3.5c3 3.4 5.5 6.2 5.5 9.6A5.5 5.5 0 0 1 6.5 13c0-2 1-4 3-6.4.4 1.7 1.2 2.7 2.2 3.2.4-2.3.3-4.3.3-6.3z"/>',
    patience: '<path d="M3.5 9.5c2-2 4-2 6 0s4 2 6 0 4-2 5 0M3.5 14.5c2-2 4-2 6 0s4 2 6 0 4-2 5 0"/>',
    grief: '<path d="M12 3.5s5.5 6.4 5.5 10a5.5 5.5 0 0 1-11 0c0-3.6 5.5-10 5.5-10z"/><path d="M9.5 14.5a2.6 2.6 0 0 0 2.5 2.4"/>',
    fear: '<path d="M12 3.5l7 2.6v5.2c0 4.4-3 7.6-7 9.2-4-1.6-7-4.8-7-9.2V6.1z"/><path d="M9.5 11.5c.8 1 1.6 1.5 2.5 1.5s1.7-.5 2.5-1.5"/>',
    starting: '<path d="M12 20.5v-7"/><path d="M12 13.5C12 9.9 9.4 7 6 6.5c-.4 3.7 1.7 7 6 7.5z"/><path d="M12 13.5c0-3 2.3-5.6 5.4-6 .4 3.3-1.6 6.1-5.4 6.5z"/>',
    friends: '<circle cx="8.5" cy="9" r="2.6"/><circle cx="15.5" cy="9" r="2.6"/><path d="M4 19c.6-2.6 2.3-4 4.5-4s3.9 1.4 4.5 4M11 19c.6-2.6 2.3-4 4.5-4s3.9 1.4 4.5 4"/>',
    family: '<path d="M4.5 11.5L12 5l7.5 6.5"/><path d="M6.5 10.5v9h11v-9"/><path d="M10 19.5v-4.5h4v4.5"/>',
    wealth: '<circle cx="12" cy="12" r="7.5"/><path d="M12 7.5v9M9.8 9.8h3.4a1.8 1.8 0 0 1 0 3.6h-2.4a1.8 1.8 0 0 0 0 3.6h3.4"/>',
    words: '<path d="M4.5 5.5h15v10h-9l-4 3.5v-3.5h-2z"/><path d="M8 9h8M8 12h5"/>',
    love: '<path d="M12 19.5s-6.5-4.3-6.5-9A4.3 4.3 0 0 1 12 7.7a4.3 4.3 0 0 1 6.5 2.8c0 4.7-6.5 9-6.5 9z"/>',
    learning: '<path d="M4.5 5.5h6a2 2 0 0 1 2 2v11a2 2 0 0 0-2-2h-6z"/><path d="M19.5 5.5h-6a2 2 0 0 0-2 2v11a2 2 0 0 1 2-2h6z"/>',
    wisdom: '<path d="M3.5 12s3.2-5.5 8.5-5.5S20.5 12 20.5 12s-3.2 5.5-8.5 5.5S3.5 12 3.5 12z"/><circle cx="12" cy="12" r="2.4"/>',
  };
  function situationIcon(id) {
    var body = SITUATION_ICONS[id] || SITUATION_ICONS.wisdom;
    return '<svg ' + ICON_ATTRS + '>' + body + '</svg>';
  }

  var PAGE_SIZE = 12; // quieter — fewer cards on screen at once

  // ---------- DOM ----------
  var listEl = document.getElementById("kural-list");
  var chipsEl = document.getElementById("chips");
  var searchEl = document.getElementById("search");
  var chapterEl = document.getElementById("chapter");
  var clearBtn = document.getElementById("clear-filters");
  var countEl = document.getElementById("result-count");
  var rangeEl = document.getElementById("result-range");
  var sentinelEl = document.getElementById("sentinel");
  var dailyCardEl = document.getElementById("daily-card");
  var dailyDateEl = document.getElementById("daily-date");
  var dailyShuffleEl = document.getElementById("daily-shuffle");
  var booksGridEl = document.getElementById("books-grid");
  var situationsGridEl = document.getElementById("situations-grid");
  var chapterMapBodyEl = document.getElementById("chapter-map-body");
  var chapterIntroEl = document.getElementById("chapter-intro");
  var suggestionsEl = document.getElementById("search-suggestions");
  var backToTopEl = document.getElementById("back-to-top");
  var journeyTextEl = document.getElementById("journey-text");
  var journeyRingEl = document.querySelector(".journey-ring-fg");
  var paletteDialog = document.getElementById("palette-dialog");
  var paletteInput = document.getElementById("palette-input");
  var paletteList = document.getElementById("palette-list");
  var focusDialog = document.getElementById("focus-dialog");
  var focusBody = document.getElementById("focus-body");

  var debounce;
  var lastResults = KURALS.slice();
  var lastJourneyText = "";
  var journeyRefreshScheduled = false;

  // Defensive: auto-create sentinel if HTML is outdated
  if (!sentinelEl && listEl && listEl.parentNode) {
    sentinelEl = document.createElement("div");
    sentinelEl.id = "sentinel";
    sentinelEl.className = "sentinel";
    sentinelEl.innerHTML = '<div class="spinner"></div><span>Loading more…</span>';
    listEl.parentNode.appendChild(sentinelEl);
  }

  // state includes book (section id or 'all') and situation id (or null)
  var state = {
    theme: "all",
    chapter: "all",
    book: "all",
    situation: null,
    query: "",
    shown: PAGE_SIZE,
    dailyIndex: todayIndex(),
  };

  // ---------- lookups ----------
  var chById = {};
  CHAPTERS.forEach(function (c) { chById[c.n] = c; });

  var secById = {};
  SECTIONS.forEach(function (s) { secById[s.id] = s; });

  var themeById = {};
  THEMES.forEach(function (tItem) { themeById[tItem.id] = tItem; });

  function themeLabel(id) {
    return themeById[id] ? themeById[id].en : id;
  }

  // ---------- helpers ----------
  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function pad(n) {
    return n < 100 ? (n < 10 ? "00" + n : "0" + n) : String(n);
  }

  function taNumeral(n) {
    var digits = "௦௧௨௩௪௫௬௭௮௯";
    return String(n).split("").map(function (d) { return digits[Number(d)] || d; }).join("");
  }

  function todayIndex() {
    var d = new Date();
    var start = new Date(d.getFullYear(), 0, 0);
    var diff = d - start;
    var dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
    return dayOfYear % Math.max(1, KURALS.length);
  }

  function formatDate(d) {
    var locale = lang === "ta" ? "ta-IN" : undefined;
    try {
      return d.toLocaleDateString(locale, {
        weekday: "long", year: "numeric", month: "long", day: "numeric",
      });
    } catch (e) {
      try {
        return d.toLocaleDateString(undefined, {
          weekday: "long", year: "numeric", month: "long", day: "numeric",
        });
      } catch (e2) {
        return d.toDateString();
      }
    }
  }

  function highlight(text, q) {
    var safe = escapeHtml(text);
    if (!q) return safe;
    try {
      var re = new RegExp("(" + q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")", "gi");
      return safe.replace(re, "<mark>$1</mark>");
    } catch (e) {
      return safe;
    }
  }

  function countForTheme(id) {
    if (id === "all") return KURALS.length;
    var c = 0;
    for (var i = 0; i < KURALS.length; i++) if (KURALS[i].th === id) c++;
    return c;
  }

  function countForSection(id) {
    if (id === "all") return KURALS.length;
    var c = 0;
    for (var i = 0; i < KURALS.length; i++) if (KURALS[i].sec === id) c++;
    return c;
  }

  function findKural(n) {
    for (var i = 0; i < KURALS.length; i++) if (KURALS[i].n === n) return KURALS[i];
    return null;
  }

  function safeScrollTo(el, opts) {
    if (el && typeof el.scrollIntoView === "function") {
      var settings = opts || { block: "start" };
      // The companion's accessibility preference should also calm the existing
      // browse/filter navigation, not just CSS transitions.
      if (document.body && document.body.dataset.reduceMotion === "true") {
        settings = Object.assign({}, settings, { behavior: "auto" });
      }
      try { el.scrollIntoView(settings); } catch (e) { /* ignore */ }
    }
  }

  function focusSilently(el) {
    if (el && typeof el.focus === "function") {
      try { el.focus({ preventScroll: true }); } catch (e) { el.focus(); }
    }
  }

  // ---------- reading journey (device-local) ----------
  function loadJourney() {
    var raw = safeGet(JOURNEY_KEY);
    var data = { read: {}, chapters: {}, streak: 0, last: "" };
    if (raw) {
      try {
        var parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          data.read = parsed.read || {};
          data.chapters = parsed.chapters || {};
          data.streak = Number(parsed.streak) || 0;
          data.last = String(parsed.last || "");
        }
      } catch (e) { /* start fresh */ }
    }
    // Gentle streak: continuing a chain, restarting it, or simply visiting.
    var today = new Date().toISOString().slice(0, 10);
    if (data.last !== today) {
      var yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      data.streak = data.last === yesterday ? data.streak + 1 : 1;
      data.last = today;
      persistJourney(data);
    }
    return data;
  }

  function persistJourney(data) {
    safeSet(JOURNEY_KEY, JSON.stringify(data));
  }

  var journey = loadJourney();

  function markRead(n) {
    var key = String(n);
    if (journey.read[key]) return;
    journey.read[key] = true;
    persistJourney(journey);
    scheduleJourneyUpdate();
  }

  function markChapterVisited(n) {
    var key = String(n);
    if (journey.chapters[key]) return;
    journey.chapters[key] = true;
    persistJourney(journey);
    scheduleJourneyUpdate();
    paintVisitedChapters();
  }

  function journeyCounts() {
    return {
      read: Object.keys(journey.read).length,
      chapters: Object.keys(journey.chapters).length,
      streak: journey.streak || 0,
    };
  }

  function scheduleJourneyUpdate() {
    if (journeyRefreshScheduled) return;
    journeyRefreshScheduled = true;
    Promise.resolve().then(function () {
      journeyRefreshScheduled = false;
      updateJourneyUi();
    });
  }

  function updateJourneyUi() {
    if (!journeyTextEl) return;
    var counts = journeyCounts();
    var text;
    if (counts.read === 0) {
      text = t("journey.empty", "Your reading journey begins with one couplet.");
    } else {
      text = tf("journey.progress", "{r} couplets read · {c} chapters visited · {s}-day streak", {
        r: counts.read,
        c: counts.chapters,
        s: counts.streak,
      });
    }
    if (text !== lastJourneyText) {
      journeyTextEl.textContent = text;
      lastJourneyText = text;
    }
    if (journeyRingEl) {
      var fraction = Math.min(1, counts.read / Math.max(1, KURALS.length));
      journeyRingEl.style.strokeDashoffset = String(97.4 * (1 - fraction));
    }
  }

  // Marks cards as read after they are comfortably in view. No-op where the
  // IntersectionObserver API is unavailable (older WebViews, test shims).
  var readObserver = null;
  function observeReadMarks() {
    if (!("IntersectionObserver" in window) || !listEl) return;
    if (!readObserver) {
      readObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.55) {
            var match = (entry.target.id || "").match(/^kural-(\d+)$/);
            if (match) markRead(Number(match[1]));
            readObserver.unobserve(entry.target);
          }
        });
      }, { threshold: [0.55] });
    }
    Array.prototype.forEach.call(listEl.querySelectorAll(".kural-card"), function (card) {
      readObserver.observe(card);
    });
  }

  // ---------- matching ----------
  function matches(k) {
    // Book filter
    if (state.book !== "all" && k.sec !== state.book) return false;

    // Chapter is the most specific filter. If set, it wins over theme/situation.
    if (state.chapter !== "all") {
      if (String(k.ch) !== String(state.chapter)) return false;
    } else if (state.theme !== "all" && k.th !== state.theme) {
      return false;
    }

    var q = state.query.trim().toLowerCase();
    if (!q) return true;

    if (/^\d+$/.test(q)) return String(k.n) === String(parseInt(q, 10));

    var ch = chById[k.ch];
    var sec = secById[k.sec];
    var th = themeById[k.th];
    var haystack = [
      k.ta[0], k.ta[1],
      k.tr[0], k.tr[1],
      k.en[0], k.en[1],
      k.s,
      ch ? ch.ta : "", ch ? ch.en : "",
      sec ? sec.ta : "", sec ? sec.en : "",
      th ? th.ta + " " + th.en : ""
    ].join(" \n ").toLowerCase();

    var words = q.split(/\s+/);
    for (var i = 0; i < words.length; i++) {
      if (haystack.indexOf(words[i]) === -1) return false;
    }
    return true;
  }

  // ---------- rendering ----------
  // Present each couplet in the familiar four-word / three-word layout,
  // regardless of how the source dataset's two poetic lines are segmented.
  function tamilCoupletLines(kural) {
    var words = (kural.ta || []).join(" ").trim().split(/\s+/).filter(Boolean);
    return [words.slice(0, 4).join(" "), words.slice(4).join(" ")];
  }

  function cardHtml(k, opts) {
    var options = opts || {};
    var q = state.query.trim();
    var showQ = q && !/^\d+$/.test(q) ? q : "";
    var ch = chById[k.ch];
    var sec = secById[k.sec];
    var taLines = tamilCoupletLines(k);
    var cardId = options.plain ? "" : ' id="kural-' + k.n + '"';

    var enLines =
      '<span class="line">' + escapeHtml(k.en[0]) + "</span>" +
      (k.en[1] ? '<span class="line">' + escapeHtml(k.en[1]) + "</span>" : "");

    var numMarkup = options.plain
      ? '<span class="kural-num">#' + pad(k.n) + "</span>"
      : '<a class="kural-num" href="#kural-' + k.n + '" title="' + t("card.linkAria", "Link to this kural") +
        '" aria-label="' + t("card.linkAria", "Link to this kural") + ' #' + pad(k.n) + '">#' + pad(k.n) + "</a>";

    var navMarkup = options.plain
      ? ""
      : '<span class="kural-foot-nav" role="group" aria-label="' +
          tf("nav.kuralOf", "Kural {n} of 1330", { n: pad(k.n) }) + '">' +
          '<button type="button" class="card-action" data-app-action="prev" data-kural="' + k.n +
            '" aria-label="' + t("card.prevAria", "Previous kural") + '"><span aria-hidden="true">←</span></button>' +
          '<button type="button" class="card-action" data-app-action="next" data-kural="' + k.n +
            '" aria-label="' + t("card.nextAria", "Next kural") + '"><span aria-hidden="true">→</span></button>' +
          '<button type="button" class="card-action" data-app-action="listen" data-kural="' + k.n +
            '" aria-label="' + t("card.listenAria", "Listen to this kural") + '"><span aria-hidden="true">♪</span> <span class="listen-label">' +
            t("card.listen", "Listen") + "</span></button>" +
          '<button type="button" class="card-action" data-app-action="focus" data-kural="' + k.n +
            '" aria-label="' + t("card.focusAria", "Read this kural in focus mode") + '"><span aria-hidden="true">▭</span> ' +
            t("card.focus", "Read fully") + "</button>" +
        "</span>";

    return (
      '<article class="kural-card"' + cardId + ' tabindex="-1">' +
        '<div class="kural-meta">' +
          numMarkup +
          '<span class="kural-chapter"><span lang="ta">' + escapeHtml(ch ? ch.ta : "") + "</span>" +
            '<span class="ch-en" lang="en">· ' + escapeHtml(ch ? ch.en : "") + "</span></span>" +
          '<span class="kural-theme">' + escapeHtml(themeLabel(k.th)) + "</span>" +
        "</div>" +

        '<div class="kural-tamil-block">' +
          '<p class="kural-ta" lang="ta">' +
            '<span class="line">' + highlight(taLines[0], showQ) + "</span>" +
            '<span class="line">' + highlight(taLines[1], showQ) + "</span>" +
          "</p>" +
        "</div>" +
        '<div class="kural-transliteration-block">' +
          '<p class="kural-translit">' +
            escapeHtml(k.tr[0]) + " —<br/>" + escapeHtml(k.tr[1]) +
          "</p>" +
        "</div>" +

        '<hr class="kural-divider" />' +

        '<div class="kural-translation-block">' +
          '<div class="block-label">' + t("block.english", "English translation") + "</div>" +
          '<blockquote class="kural-en" lang="en">' + enLines +
            '<span class="source">— G. U. Pope (1886)</span>' +
          "</blockquote>" +
        "</div>" +

        '<div class="kural-meaning-block">' +
          '<div class="block-label" style="margin-top:16px;">' + t("block.simple", "Simple meaning") + "</div>" +
          '<div class="kural-simple" lang="en">' + highlight(k.s, showQ) + "</div>" +
        "</div>" +

        '<div class="kural-foot">' +
          '<span class="section-tag">' +
            escapeHtml(sec ? sec.ta : "") + " · " + escapeHtml(sec ? sec.en : "") +
          "</span>" +
          navMarkup +
          "<span>திருக்குறள் " + pad(k.n) + "</span>" +
        "</div>" +
      "</article>"
    );
  }

  function dailyCardHtml(k) {
    var ch = chById[k.ch];
    var sec = secById[k.sec];
    var taLines = tamilCoupletLines(k);
    return (
      '<span class="ta-watermark" aria-hidden="true">' + taNumeral(k.n) + "</span>" +
      '<div class="daily-meta">' +
        '<span class="daily-num">#' + pad(k.n) + "</span>" +
        '<span class="kural-chapter"><span lang="ta">' + escapeHtml(ch ? ch.ta : "") + "</span>" +
          '<span class="ch-en" lang="en">· ' + escapeHtml(ch ? ch.en : "") + "</span></span>" +
        '<span class="section-tag">' +
          escapeHtml(sec ? sec.ta : "") + " · " + escapeHtml(sec ? sec.en : "") +
        "</span>" +
      "</div>" +
      '<div class="kural-tamil-block">' +
        '<p class="kural-ta daily-ta" lang="ta">' +
          '<span class="line">' + escapeHtml(taLines[0]) + "</span>" +
          '<span class="line">' + escapeHtml(taLines[1]) + "</span>" +
        "</p>" +
      "</div>" +
      '<div class="kural-transliteration-block">' +
        '<p class="kural-translit">' + escapeHtml(k.tr[0]) + " —<br/>" + escapeHtml(k.tr[1]) + "</p>" +
      "</div>" +
      '<hr class="kural-divider" />' +
      '<div class="kural-meaning-block">' +
        '<div class="block-label">' + t("block.simple", "Simple meaning") + "</div>" +
        '<div class="kural-simple" lang="en">' + escapeHtml(k.s) + "</div>" +
      "</div>" +
      '<div class="daily-extra">' +
        '<button type="button" class="card-action" data-app-action="listen" data-kural="' + k.n +
          '" aria-label="' + t("daily.listenAria", "Listen to today's kural") + '">' +
          '<span aria-hidden="true">♪</span> <span class="listen-label">' + t("card.listen", "Listen") + "</span></button>" +
        '<button type="button" class="card-action" data-app-action="focus" data-kural="' + k.n +
          '" aria-label="' + t("daily.focusAria", "Read today's kural in focus mode") + '">' +
          '<span aria-hidden="true">▭</span> ' + t("card.focus", "Read fully") + "</button>" +
      "</div>"
    );
  }

  function syncFilterChrome() {
    var chapterActive = state.chapter !== "all";
    var bookActive = state.book !== "all";
    var situationActive = !!state.situation;
    var queryActive = !!state.query.trim();
    var themeActive = state.theme !== "all";
    var anyFilter = chapterActive || bookActive || situationActive || queryActive || themeActive;

    if (chapterEl) {
      chapterEl.classList.toggle("has-value", chapterActive);
      if (chapterEl.value !== String(state.chapter)) chapterEl.value = String(state.chapter);
    }
    if (searchEl) searchEl.classList.toggle("has-value", queryActive);
    if (clearBtn) clearBtn.hidden = !anyFilter;

    // book cards + situation doors active state
    if (booksGridEl) {
      Array.prototype.forEach.call(booksGridEl.querySelectorAll(".book-card"), function (el) {
        var id = el.getAttribute("data-book");
        var match = state.book === "all" ? id === "all" : String(state.book) === id;
        el.classList.toggle("active", match);
        el.setAttribute("aria-pressed", String(match));
      });
    }
    if (situationsGridEl) {
      Array.prototype.forEach.call(situationsGridEl.querySelectorAll(".situation"), function (el) {
        var active = el.getAttribute("data-situation") === state.situation;
        el.classList.toggle("active", active);
        el.setAttribute("aria-pressed", String(active));
      });
    }

    if (chapterMapBodyEl) {
      Array.prototype.forEach.call(chapterMapBodyEl.querySelectorAll(".map-cell"), function (el) {
        el.classList.toggle("current", el.getAttribute("data-chapter") === String(state.chapter));
      });
    }
  }

  function renderChapterIntro() {
    if (!chapterIntroEl) return;
    if (state.chapter === "all") {
      chapterIntroEl.hidden = true;
      chapterIntroEl.innerHTML = "";
      return;
    }
    var ch = chById[parseInt(state.chapter, 10)];
    if (!ch) {
      chapterIntroEl.hidden = true;
      return;
    }
    var kurals = KURALS.filter(function (k) { return k.ch === ch.n; });
    var first = kurals.length ? kurals[0].n : "";
    var last = kurals.length ? kurals[kurals.length - 1].n : "";
    var themes = {};
    kurals.forEach(function (k) { themes[k.th] = true; });
    var themeHtml = Object.keys(themes).map(function (id) {
      var th = themeById[id];
      return th
        ? '<span class="chapter-intro-theme">' + escapeHtml(th.ta) + " · " + escapeHtml(th.en) + "</span>"
        : "";
    }).join("");

    chapterIntroEl.innerHTML =
      '<span class="chapter-intro-num">அதிகாரம் ' + ch.n + " · Chapter " + ch.n + "</span>" +
      '<span class="chapter-intro-ta" lang="ta">' + escapeHtml(ch.ta) + "</span>" +
      '<span class="chapter-intro-en" lang="en">' + escapeHtml(ch.en) + "</span>" +
      '<span class="chapter-intro-range">' + tf("intro.range", "Kurals {a} – {b}", { a: first, b: last }) + "</span>" +
      '<div class="chapter-intro-themes">' + themeHtml + "</div>" +
      '<button type="button" class="chapter-intro-clear" data-app-action="clear-chapter">' +
        t("intro.clear", "Back to all chapters") + "</button>";
    chapterIntroEl.hidden = false;
  }

  function render() {
    syncFilterChrome();
    if (!listEl) return;
    var results = KURALS.filter(matches);
    lastResults = results;
    var visible = results.slice(0, state.shown);

    if (countEl) {
      var totalLabel = KURALS.length;
      if (lang === "ta") {
        countEl.textContent =
          t("result.showing", "காட்டப்படுகிறது") + " " + visible.length + " " +
          t("result.of", "இல்") + " " + results.length + " " + t("result.kurals", "குறள்கள்") +
          (results.length !== totalLabel
            ? tf("result.filtered", " (மொத்தம் {t} இலிருந்து வடிகட்டப்பட்டது)", { t: totalLabel })
            : "");
      } else {
        countEl.textContent =
          "Showing " + visible.length + " of " + results.length + " kurals" +
          (results.length !== totalLabel ? " (filtered from " + totalLabel + ")" : "");
      }
    }
    if (rangeEl) {
      rangeEl.textContent =
        results.length > 0
          ? "#" + pad(results[0].n) + " – #" + pad(results[results.length - 1].n)
          : "";
    }

    renderChapterIntro();

    if (results.length === 0) {
      listEl.innerHTML =
        '<div class="empty">' +
          '<svg width="88" height="88" viewBox="0 0 96 96" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round">' +
            '<path d="M48 14c16 10 26 22 26 36 0 16-12 28-26 32-14-4-26-16-26-32 0-14 10-26 26-36z"/>' +
            '<path d="M48 22v56M48 40c-6-4-12-5-18-5M48 52c6-4 12-5 18-5M48 64c-6-4-12-5-18-5"/>' +
          "</svg>" +
          '<p class="kural-ta">' + t("empty.title", "Nothing found in this search") + "</p>" +
          "<p>" + t("empty.body", "Nothing found. Try a kural number (e.g. <b>151</b>) or another word, or press Clear.") + "</p>" +
        "</div>";
      if (sentinelEl) sentinelEl.style.display = "none";
      syncHash();
      return;
    }

    listEl.innerHTML = visible.map(function (k) { return cardHtml(k); }).join("");
    if (sentinelEl) sentinelEl.style.display = results.length > visible.length ? "" : "none";
    observeReadMarks();
    syncHash();
    syncListenLabels(); // fresh buttons must reflect any audio already playing
  }

  function renderChips() {
    if (!chipsEl) return;
    chipsEl.innerHTML = THEMES.map(function (th) {
      var active = state.theme === th.id ? " active" : "";
      return (
        '<button class="chip' + active + '" data-theme="' + th.id + '" aria-pressed="' +
        (state.theme === th.id) + '">' +
          '<span class="chip-ta" lang="ta">' + escapeHtml(th.ta) + "</span>" + escapeHtml(th.en) +
          '<span class="count">' + countForTheme(th.id) + "</span>" +
        "</button>"
      );
    }).join("");
  }

  function renderChapterOptions() {
    if (!chapterEl) return;
    var html = '<option value="all">அனைத்து அதிகாரங்கள் · All 133 chapters</option>';
    SECTIONS.forEach(function (s) {
      html += '<optgroup label="' + escapeHtml(s.ta + " · " + s.en) + '">';
      CHAPTERS.filter(function (c) { return c.sec === s.id; }).forEach(function (c) {
        html +=
          '<option value="' + c.n + '">' + c.n + ". " + escapeHtml(c.ta) +
          " — " + escapeHtml(c.en) + "</option>";
      });
      html += "</optgroup>";
    });
    chapterEl.innerHTML = html;
    chapterEl.value = state.chapter;
  }

  function renderBooks() {
    if (!booksGridEl) return;
    // An "All" card + one per section
    var cards = [
      {
        id: "all",
        ta: "முப்பாலும்",
        en: "All three books",
        desc: t("books.descAll", "Walk the whole path — all 1,330 couplets."),
        count: KURALS.length,
        cls: "book-all",
        icon: BOOK_ICONS.all,
      },
    ];
    var iconsBySection = { 1: BOOK_ICONS.virtue, 2: BOOK_ICONS.wealth, 3: BOOK_ICONS.love };
    var descKeys = { 1: "books.descVirtue", 2: "books.descWealth", 3: "books.descLove" };
    var descFallbacks = {
      1: "On virtue, right conduct, and the inner life. (அறம்)",
      2: "On kingship, wealth, work, friendship, and the world. (பொருள்)",
      3: "On love, longing, and the life of the heart. (காமம்)",
    };
    SECTIONS.forEach(function (s) {
      cards.push({
        id: String(s.id),
        ta: s.ta,
        en: s.en,
        desc: t(descKeys[s.id], descFallbacks[s.id]),
        count: countForSection(s.id),
        cls: "book-" + s.id,
        icon: iconsBySection[s.id] || BOOK_ICONS.all,
      });
    });

    booksGridEl.innerHTML = cards.map(function (c) {
      return (
        '<button type="button" class="book-card ' + c.cls + '" data-book="' + c.id + '" aria-pressed="false">' +
          '<span class="book-icon" aria-hidden="true">' + c.icon + "</span>" +
          '<span class="book-ta" lang="ta">' + escapeHtml(c.ta) + "</span>" +
          '<span class="book-en">' + escapeHtml(c.en) + "</span>" +
          '<span class="book-desc">' + escapeHtml(c.desc) + "</span>" +
          '<span class="book-count">' + c.count + " " + t("books.kuralsUnit", "kurals") + "</span>" +
        "</button>"
      );
    }).join("");
    syncFilterChrome();
  }

  function renderSituations() {
    if (!situationsGridEl) return;
    situationsGridEl.innerHTML = SITUATIONS.map(function (s) {
      var th = themeById[s.theme];
      return (
        '<button type="button" class="situation" data-situation="' + s.id + '" data-theme="' + s.theme + '" aria-pressed="false">' +
          '<span class="situation-icon" aria-hidden="true">' + situationIcon(s.id) + "</span>" +
          '<span class="situation-ta" lang="ta">' + escapeHtml(s.ta) + "</span>" +
          '<span class="situation-en">' + escapeHtml(s.en) + "</span>" +
          '<span class="situation-theme">' +
            (th ? escapeHtml(th.ta) + " · " + escapeHtml(th.en) : "") +
          "</span>" +
        "</button>"
      );
    }).join("");
    syncFilterChrome();
  }

  function paintVisitedChapters() {
    if (!chapterMapBodyEl) return;
    Array.prototype.forEach.call(chapterMapBodyEl.querySelectorAll(".map-cell"), function (el) {
      var n = el.getAttribute("data-chapter");
      el.classList.toggle("visited", !!journey.chapters[n]);
    });
  }

  function renderChapterMap() {
    if (!chapterMapBodyEl) return;
    var html = "";
    SECTIONS.forEach(function (s) {
      var chs = CHAPTERS.filter(function (c) { return c.sec === s.id; });
      html +=
        '<div class="map-section">' +
          '<h4 class="map-section-title">' +
            '<span class="map-section-ta" lang="ta">' + escapeHtml(s.ta) + "</span>" +
            '<span class="map-section-en">' + escapeHtml(s.en) + " · " + chs.length + " " +
              t("map.chaptersUnit", "chapters") + "</span>" +
          "</h4>" +
          '<div class="map-grid">';
      chs.forEach(function (c) {
        html +=
          '<button type="button" class="map-cell" data-chapter="' + c.n + '" title="' +
            escapeHtml(c.ta) + " — " + escapeHtml(c.en) + '">' +
            '<span class="map-num">' + c.n + ".</span>" +
            '<span class="map-ta" lang="ta">' + escapeHtml(c.ta) + "</span>" +
          "</button>";
      });
      html += "</div></div>";
    });
    chapterMapBodyEl.innerHTML = html;
    paintVisitedChapters();
    syncFilterChrome();
  }

  function renderDaily() {
    if (!dailyCardEl) return;
    var idx = state.dailyIndex % KURALS.length;
    if (idx < 0) idx += KURALS.length;
    var k = KURALS[idx];
    dailyCardEl.innerHTML = dailyCardHtml(k);
    if (dailyDateEl) dailyDateEl.textContent = formatDate(new Date());
    syncListenLabels();
  }

  // ---------- reading position restoration (per-tab) ----------
  var RESTORE_KEY = "tamil-stoic-reading-position-v1";

  function saveReadingPosition() {
    try {
      var y = window.scrollY || document.documentElement.scrollTop || 0;
      if (y < 700) return; // only meaningful once the reader is deep in the list
      window.sessionStorage.setItem(RESTORE_KEY, JSON.stringify({ y: y, shown: state.shown }));
    } catch (e) { /* private browsing */ }
  }

  function restoreReadingPosition() {
    if (bootHash || bootQuery) return; // an explicit deep link always wins
    try {
      var raw = window.sessionStorage.getItem(RESTORE_KEY);
      if (!raw) return;
      var data = JSON.parse(raw);
      if (!data || typeof data.y !== "number" || data.y < 700) return;
      state.shown = Math.max(PAGE_SIZE, Number(data.shown) || PAGE_SIZE);
      render();
      window.setTimeout(function () {
        try { window.scrollTo(0, data.y); } catch (e) { /* jsdom / old engines */ }
      }, 60);
    } catch (e) { /* ignore */ }
  }

  function bindReadingPosition() {
    var ticking = false;
    window.addEventListener("scroll", function () {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame
        ? window.requestAnimationFrame(function () { ticking = false; saveReadingPosition(); })
        : (ticking = false, saveReadingPosition());
    }, { passive: true });
  }

  // ---------- URL state (shareable filters, untouched kural links) ----------
  function syncHash() {
    var hash = "";
    if (state.chapter !== "all") hash = "#chapter-" + state.chapter;
    else if (state.situation) hash = "#situation-" + state.situation;
    else if (state.book !== "all") hash = "#book-" + state.book;
    else if (state.theme !== "all") hash = "#theme-" + state.theme;

    if (!hash && /^#kural-\d+$/.test(location.hash)) return; // keep explicit card links
    if (hash === location.hash) return;
    try {
      history.replaceState(null, "", hash || location.pathname);
    } catch (e) { /* file:// or old engine */ }
  }

  // ---------- suggestions & recent searches ----------
  function recentSearches() {
    try {
      var parsed = JSON.parse(safeGet(RECENT_KEY) || "[]");
      return Array.isArray(parsed) ? parsed.filter(function (x) { return typeof x === "string"; }).slice(0, 6) : [];
    } catch (e) { return []; }
  }

  function rememberSearch(q) {
    q = String(q || "").trim();
    if (!q || /^\d+$/.test(q)) return; // numbers are one-shot lookups, not habits
    var list = recentSearches().filter(function (x) { return x.toLowerCase() !== q.toLowerCase(); });
    list.unshift(q);
    safeSet(RECENT_KEY, JSON.stringify(list.slice(0, 6)));
  }

  var suggestionItems = [];
  var activeSuggestion = -1;

  function buildSuggestions(q) {
    var items = [];
    var query = q.trim().toLowerCase();

    if (!query) {
      recentSearches().forEach(function (r) {
        items.push({ type: "text", label: r, kind: t("palette.kind.command", "recent") });
      });
      return items.slice(0, 6);
    }

    if (/^\d+$/.test(query)) {
      KURALS.forEach(function (k) {
        if (String(k.n).indexOf(query) === 0 && items.length < 4) {
          items.push({ type: "kural", n: k.n, label: "#" + pad(k.n), kind: t("palette.kind.kural", "kural") });
        }
      });
    }

    CHAPTERS.forEach(function (c) {
      if (items.length >= 7) return;
      if (c.en.toLowerCase().indexOf(query) !== -1 || c.ta.indexOf(q.trim()) !== -1 || String(c.n) === query) {
        items.push({ type: "chapter", n: c.n, label: c.n + ". " + c.en, ta: c.ta, kind: t("palette.kind.chapter", "chapter") });
      }
    });

    THEMES.forEach(function (th) {
      if (items.length >= 7) return;
      if (th.en.toLowerCase().indexOf(query) !== -1 || th.ta.indexOf(q.trim()) !== -1) {
        items.push({ type: "theme", id: th.id, label: th.en, ta: th.ta, kind: t("palette.kind.theme", "theme") });
      }
    });

    if (!/^\d+$/.test(query)) {
      for (var i = 0; i < KURALS.length && items.length < 7; i++) {
        var k = KURALS[i];
        var hay = (k.en.join(" ") + " " + k.s + " " + k.tr.join(" ")).toLowerCase();
        if (hay.indexOf(query) !== -1) {
          items.push({ type: "kural", n: k.n, label: "#" + pad(k.n) + " " + k.en[0].slice(0, 42) + "…", kind: t("palette.kind.kural", "kural") });
        }
      }
    }

    recentSearches().forEach(function (r) {
      if (items.length < 7 && r.toLowerCase().indexOf(query) !== -1 &&
          !items.some(function (it) { return it.type === "text" && it.label === r; })) {
        items.push({ type: "text", label: r, kind: t("palette.kind.command", "recent") });
      }
    });

    return items;
  }

  function renderSuggestions() {
    if (!suggestionsEl || !searchEl) return;
    suggestionItems = buildSuggestions(searchEl.value || "");
    activeSuggestion = -1;
    if (suggestionItems.length === 0) {
      suggestionsEl.hidden = true;
      searchEl.setAttribute("aria-expanded", "false");
      searchEl.removeAttribute("aria-activedescendant");
      return;
    }
    suggestionsEl.innerHTML = suggestionItems.map(function (item, i) {
      var inner =
        (item.type === "kural" ? '<span class="sg-num">' + escapeHtml(item.label) + "</span>" : "") +
        (item.ta ? '<span class="sg-ta" lang="ta">' + escapeHtml(item.ta) + "</span>" : "") +
        (item.type !== "kural" ? "<span>" + escapeHtml(item.label) + "</span>" : "") +
        '<span class="sg-kind">' + escapeHtml(item.kind) + "</span>";
      return '<div class="suggestion" role="option" id="sg-opt-' + i +
        '" aria-selected="false" data-sg-index="' + i + '">' + inner + "</div>";
    }).join("");
    suggestionsEl.hidden = false;
    searchEl.setAttribute("aria-expanded", "true");
  }

  function hideSuggestions() {
    if (!suggestionsEl || !searchEl) return;
    suggestionsEl.hidden = true;
    searchEl.setAttribute("aria-expanded", "false");
    searchEl.removeAttribute("aria-activedescendant");
    activeSuggestion = -1;
  }

  function moveSuggestion(delta) {
    if (!suggestionItems.length || !suggestionsEl || suggestionsEl.hidden) return;
    var options = suggestionsEl.querySelectorAll(".suggestion");
    if (activeSuggestion >= 0 && options[activeSuggestion]) {
      options[activeSuggestion].classList.remove("is-active");
      options[activeSuggestion].setAttribute("aria-selected", "false");
    }
    activeSuggestion = (activeSuggestion + delta + suggestionItems.length + 1) % (suggestionItems.length + 1);
    if (activeSuggestion === suggestionItems.length) activeSuggestion = -1;
    if (activeSuggestion >= 0 && options[activeSuggestion]) {
      options[activeSuggestion].classList.add("is-active");
      options[activeSuggestion].setAttribute("aria-selected", "true");
      searchEl.setAttribute("aria-activedescendant", options[activeSuggestion].id);
      try { options[activeSuggestion].scrollIntoView({ block: "nearest" }); } catch (e) { /* ignore */ }
    } else {
      searchEl.removeAttribute("aria-activedescendant");
    }
  }

  function jumpToKural(n) {
    var idx = -1;
    for (var i = 0; i < KURALS.length; i++) if (KURALS[i].n === n) idx = i;
    if (idx < 0) return;
    state.query = "";
    state.chapter = "all";
    state.theme = "all";
    state.situation = null;
    state.book = "all";
    if (searchEl) searchEl.value = "";
    state.shown = Math.max(PAGE_SIZE, idx + 1 + Math.floor(PAGE_SIZE / 2));
    renderChips();
    render();
    try { history.replaceState(null, "", "#kural-" + n); } catch (e) { /* ignore */ }
    var el = document.getElementById("kural-" + n);
    safeScrollTo(el, { block: "start" });
    focusSilently(el);
    hideSuggestions();
  }

  function applySuggestion(item) {
    if (!item) return;
    if (item.type === "kural") {
      jumpToKural(item.n);
    } else if (item.type === "chapter") {
      state.chapter = String(item.n);
      state.theme = "all";
      state.situation = null;
      state.shown = PAGE_SIZE;
      if (chapterEl) chapterEl.value = String(item.n);
      markChapterVisited(item.n);
      renderChips();
      render();
      var listTop = document.getElementById("kural-list");
      safeScrollTo(listTop, { block: "start" });
      hideSuggestions();
    } else if (item.type === "theme") {
      state.theme = item.id;
      state.situation = null;
      state.chapter = "all";
      state.shown = PAGE_SIZE;
      if (chapterEl) chapterEl.value = "all";
      renderChips();
      render();
      var browse = document.getElementById("browse");
      safeScrollTo(browse, { block: "start" });
      hideSuggestions();
    } else if (item.type === "text") {
      if (searchEl) searchEl.value = item.label;
      state.query = item.label;
      state.shown = PAGE_SIZE;
      render();
      hideSuggestions();
    }
  }

  // ---------- focus reading mode ----------
  var focusNumber = null;
  var lastDialogTrigger = null;

  function openPanel(dialog, trigger) {
    if (!dialog) return;
    lastDialogTrigger = trigger || document.activeElement;
    dialog.__opener = lastDialogTrigger;
    try {
      if (typeof dialog.showModal === "function" && !dialog.hasAttribute("open")) {
        dialog.showModal();
      } else {
        dialog.setAttribute("open", "");
      }
    } catch (e) {
      dialog.setAttribute("open", "");
    }
  }

  function closePanel(dialog) {
    if (!dialog) return;
    var opener = dialog.__opener || lastDialogTrigger;
    try {
      if (typeof dialog.close === "function" && dialog.hasAttribute("open")) dialog.close();
      else dialog.removeAttribute("open");
    } catch (e) {
      dialog.removeAttribute("open");
    }
    if (opener && typeof opener.focus === "function") {
      window.setTimeout(function () { focusSilently(opener); }, 0);
    }
  }

  function renderFocusCard() {
    var k = findKural(focusNumber);
    if (!k || !focusBody) return;
    var ch = chById[k.ch];
    focusBody.innerHTML = cardHtml(k, { plain: true });
    var label = document.getElementById("focus-kural-label");
    if (label) {
      label.textContent = (lang === "ta" ? "குறள் #" : "Kural #") + pad(k.n) + (ch ? " · " + ch.en : "");
    }
    syncListenLabels(); // focus button must show Stop if this kural is playing
  }

  function showStatus(message) {
    var toast = document.getElementById("app-status");
    if (!toast) return;
    toast.textContent = message;
    toast.hidden = false;
    window.clearTimeout(showStatus._timer);
    showStatus._timer = window.setTimeout(function () { toast.hidden = true; }, 4200);
  }

  function openFocus(n, trigger) {
    focusNumber = Number(n);
    if (!focusNumber || !findKural(focusNumber)) return;
    renderFocusCard();
    updateFocusNav();
    openPanel(focusDialog, trigger);
    focusSilently(focusBody && focusBody.querySelector(".kural-card"));
  }

  function moveFocus(delta) {
    if (!focusNumber) return;
    var next = Math.min(KURALS.length, Math.max(1, focusNumber + delta));
    if (next === focusNumber) return;
    focusNumber = next;
    renderFocusCard();
    updateFocusNav();
  }

  function updateFocusNav() {
    var prev = document.getElementById("focus-prev");
    var next = document.getElementById("focus-next");
    if (prev) prev.disabled = focusNumber <= 1;
    if (next) next.disabled = focusNumber >= KURALS.length;
  }

  // ---------- card list navigation (prev/next within current results) ----------
  function stepInResults(currentN, delta) {
    var idx = -1;
    for (var i = 0; i < lastResults.length; i++) if (lastResults[i].n === currentN) { idx = i; break; }
    if (idx < 0) return;
    var target = idx + delta;
    if (target < 0) target = lastResults.length - 1;
    if (target >= lastResults.length) target = 0;
    var k = lastResults[target];
    if (target >= state.shown) {
      state.shown = target + 1 + Math.floor(PAGE_SIZE / 2);
      render();
    }
    var el = document.getElementById("kural-" + k.n);
    safeScrollTo(el, { block: "start" });
    focusSilently(el);
  }

  // ---------- speech (device TTS, no network) ----------
  // Hardened implementation. Real-engine landmines handled here:
  //   * Chrome fires onerror("interrupted") for a cancelled utterance
  //     asynchronously, after a replacement may already play -> token guard.
  //   * Chrome can garbage-collect an utterance nothing references, cutting
  //     speech short or never starting it -> strong module-level reference.
  //   * Chrome can silently drop a speak() issued in the same tick as
  //     cancel() -> verify the engine actually started; retry once if not.
  //   * iOS Safari requires speak() inside the user gesture -> always speak
  //     synchronously first; only ever recover asynchronously.
  //   * Devices without a Tamil voice (Windows, iOS, some Androids) silently
  //     say nothing and fire no error -> fall back to the transliteration so
  //     the reader always hears the kural, with a one-time explanation.
  //   * getVoices() is empty until the engine warms up and some WebViews
  //     never fire voiceschanged -> prime at boot with short polling.
  var speakingN = null;
  var speechToken = 0;
  var voiceCache = null;
  var currentUtterance = null; // strong ref: keeps Chrome from GC-ing mid-speech
  var noTamilVoiceWarned = false;

  function loadVoices(synth) {
    try { voiceCache = synth.getVoices() || []; } catch (e) { voiceCache = []; }
    return voiceCache;
  }

  function primeVoices() {
    var synth = window.speechSynthesis;
    if (!synth || typeof synth.getVoices !== "function") return;
    loadVoices(synth);
    if (!voiceCache.length) {
      // Chrome/Android populate the list asynchronously; a few WebViews
      // never fire voiceschanged at all, so poll briefly instead.
      [250, 800, 2000, 4000].forEach(function (ms) {
        window.setTimeout(function () { loadVoices(synth); }, ms);
      });
    }
    var onVoices = function () { loadVoices(synth); };
    if (typeof synth.addEventListener === "function") {
      try { synth.addEventListener("voiceschanged", onVoices); } catch (e) { /* older engine */ }
    }
    try { synth.onvoiceschanged = onVoices; } catch (e) { /* ignore */ }
  }

  function voiceLangCode(voice) {
    return String((voice && voice.lang) || "").toLowerCase().replace("_", "-");
  }

  function pickTamilVoice(synth) {
    var voices = voiceCache && voiceCache.length ? voiceCache : loadVoices(synth);
    for (var i = 0; i < voices.length; i++) {
      var code = voiceLangCode(voices[i]);
      if (code === "ta" || code.indexOf("ta-") === 0) return voices[i];
    }
    return null;
  }

  // Fallback narrator when the device has no Tamil voice: prefer an Indian
  // English voice (closest pronunciation for the transliterated couplet),
  // then any English voice, then the engine default.
  function pickFallbackVoice(synth) {
    var voices = voiceCache && voiceCache.length ? voiceCache : loadVoices(synth);
    var firstEnglish = null;
    for (var i = 0; i < voices.length; i++) {
      var code = voiceLangCode(voices[i]);
      if (code.indexOf("en") !== 0) continue;
      if (!firstEnglish) firstEnglish = voices[i];
      if (code === "en-in") return voices[i];
    }
    return firstEnglish;
  }

  // Repaint every Listen control (cards, daily card, focus dialog) from the
  // single source of truth. Called after each re-render because innerHTML
  // swaps would otherwise drop the "Stop" state while audio keeps playing,
  // making the next click silently stop hidden speech instead of starting it.
  function syncListenLabels() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-app-action="listen"]'), function (btn) {
      var n = Number(btn.getAttribute("data-kural"));
      var active = speakingN !== null && n === speakingN;
      var label = btn.querySelector(".listen-label");
      if (label) label.textContent = active ? t("card.stop", "Stop") : t("card.listen", "Listen");
      if (active) btn.classList.add("is-speaking");
      else btn.classList.remove("is-speaking");
    });
    var focusBtn = document.getElementById("focus-listen");
    if (focusBtn) {
      var span = focusBtn.querySelector("span:last-child");
      var focusActive = speakingN !== null && focusNumber === speakingN;
      if (span) span.textContent = focusActive ? t("card.stop", "Stop") : t("nav.listen", "Listen");
    }
  }

  function stopSpeech() {
    speechToken++;
    speakingN = null;
    currentUtterance = null;
    var synth = window.speechSynthesis;
    if (synth) {
      try { synth.cancel(); } catch (e) { /* engine may already be idle */ }
    }
    syncListenLabels();
  }

  function isVoiceMissingError(err) {
    return err === "not-found" || err === "language-unavailable" ||
      err === "language-not-supported" || err === "voice-unavailable" ||
      err === "synthesis-unavailable";
  }

  function speechFailToast() {
    showStatus(t("speech.failed", "Audio couldn't play on this device. It may lack a Tamil voice."));
  }

  // Build and start the utterance for kural n. `useTranslit` reads the
  // romanised couplet instead of the Tamil script (no Tamil voice installed,
  // or the engine rejected its reported Tamil voice at play time).
  function startSpeech(n, token, opts) {
    var options = opts || {};
    var synth = window.speechSynthesis;
    var k = findKural(n);
    if (!k || !synth) return;

    var voice = options.useTranslit ? null : pickTamilVoice(synth);
    var utter;
    if (voice) {
      utter = new SpeechSynthesisUtterance(k.ta[0] + " " + k.ta[1]);
      utter.voice = voice;
      utter.lang = voice.lang || "ta-IN";
    } else {
      utter = new SpeechSynthesisUtterance(k.tr[0] + " " + k.tr[1]);
      var fallback = pickFallbackVoice(synth);
      if (fallback) utter.voice = fallback;
      utter.lang = (fallback && fallback.lang) || "en-IN";
      if (!noTamilVoiceWarned) {
        noTamilVoiceWarned = true;
        showStatus(t("speech.noTamilVoice",
          "No Tamil voice is installed on this device - reading the transliteration instead. " +
          "Install a Tamil voice to hear the original script."));
      }
    }
    utter.rate = 0.9;
    currentUtterance = utter;
    var usedTamil = !!voice;
    var retried = false;

    utter.onend = function () {
      if (token !== speechToken) return; // superseded - newer speech owns the UI
      speakingN = null;
      currentUtterance = null;
      syncListenLabels();
    };

    utter.onerror = function (event) {
      if (token !== speechToken) return; // cancelled on purpose - ignore
      var err = event && typeof event.error === "string" ? event.error : "";
      if (err === "interrupted" || err === "canceled" || err === "cancelled") return;
      speakingN = null;
      currentUtterance = null;
      syncListenLabels();
      if (usedTamil && isVoiceMissingError(err)) {
        // The engine reported a Tamil voice but failed to use it (some
        // Android builds do). Self-heal: read the transliteration instead.
        startSpeech(n, token, { useTranslit: true });
        return;
      }
      if (err === "not-allowed") {
        showStatus(t("speech.blocked", "Audio was blocked by the browser - tap Listen again to allow it."));
      } else {
        speechFailToast();
      }
    };

    speakingN = n;
    syncListenLabels();
    try {
      // Always inside the click gesture: iOS Safari refuses deferred speech.
      synth.speak(utter);
      // Chrome occasionally queues speech while the engine is paused and
      // stays silent until resumed; resume() is a harmless no-op otherwise.
      try { synth.resume(); } catch (e) { /* ignore */ }
    } catch (e) {
      speakingN = null;
      currentUtterance = null;
      syncListenLabels();
      speechFailToast();
      return;
    }

    // Verify the engine actually took the speak() call. Chrome can silently
    // drop a speak() issued in the same tick as cancel(); this check only
    // ever *starts* speech that was dropped - never stops speech that began.
    window.setTimeout(function () {
      if (token !== speechToken) return; // stopped or switched meanwhile
      if (speakingN !== n || currentUtterance !== utter) return; // ended or errored
      if (synth.speaking === true || synth.pending === true) return; // playing
      if (retried) return;
      retried = true;
      try {
        synth.speak(utter);
        try { synth.resume(); } catch (e2) { /* ignore */ }
      } catch (e) { /* give up quietly; the next click restarts cleanly */ }
    }, 150);
  }

  function toggleSpeech(n) {
    if (!window.speechSynthesis || typeof window.SpeechSynthesisUtterance !== "function") {
      showStatus(t("speech.unsupported", "Audio is not available in this browser."));
      return;
    }
    var synth = window.speechSynthesis;
    n = Number(n);
    if (!findKural(n)) return;

    var engineBusy = synth.speaking === true || synth.pending === true;
    if (speakingN === n && engineBusy) {
      stopSpeech(); // toggle the currently-playing kural off
      return;
    }
    // speakingN === n with an idle engine means the previous run died without
    // delivering onend (a known Web Speech quirk): fall through and restart
    // instead of pretending to stop silence.

    // Switching from another kural (or recovering): invalidate in-flight
    // callbacks first so the old utterance's late interrupted-error can't
    // reset the new one's labels, then cancel any live speech.
    speechToken++;
    var token = speechToken;
    currentUtterance = null;
    if (engineBusy) {
      try { synth.cancel(); } catch (e) { /* ignore */ }
    }
    startSpeech(n, token, {});
  }

  // ---------- command palette ----------
  var paletteItems = [];
  var paletteIndex = 0;

  function paletteCommands() {
    return [
      { id: "today", label: t("palette.cmd.today", "Go to today's Kural"), kind: t("palette.kind.command", "command") },
      { id: "browse", label: t("palette.cmd.browse", "Go to browse & search"), kind: t("palette.kind.command", "command") },
      { id: "saved", label: t("palette.cmd.saved", "Open saved Kurals"), kind: t("palette.kind.command", "command") },
      { id: "settings", label: t("palette.cmd.settings", "Open reading settings"), kind: t("palette.kind.command", "command") },
      { id: "map", label: t("palette.cmd.map", "Go to the chapter map"), kind: t("palette.kind.command", "command") },
      { id: "random", label: t("palette.cmd.random", "Another kural (random)"), kind: t("palette.kind.command", "command") },
      { id: "night", label: t("palette.cmd.night", "Toggle day / night colour"), kind: t("palette.kind.command", "command") },
      { id: "shortcuts", label: t("palette.cmd.shortcuts", "Keyboard shortcuts"), kind: t("palette.kind.command", "command") },
    ];
  }

  function buildPaletteItems(q) {
    var query = (q || "").trim().toLowerCase();
    var items = paletteCommands().filter(function (c) {
      return !query || c.label.toLowerCase().indexOf(query) !== -1;
    }).map(function (c) { return { type: "command", id: c.id, label: c.label, kind: c.kind }; });

    if (query) {
      CHAPTERS.forEach(function (c) {
        if (items.length < 10 && (c.en.toLowerCase().indexOf(query) !== -1 || c.ta.indexOf(q.trim()) !== -1 || String(c.n) === query)) {
          items.push({ type: "chapter", n: c.n, label: c.n + ". " + c.en, ta: c.ta, kind: t("palette.kind.chapter", "chapter") });
        }
      });
      THEMES.forEach(function (th) {
        if (items.length < 12 && (th.en.toLowerCase().indexOf(query) !== -1 || th.ta.indexOf(q.trim()) !== -1)) {
          items.push({ type: "theme", id: th.id, label: th.en, ta: th.ta, kind: t("palette.kind.theme", "theme") });
        }
      });
      if (/^\d+$/.test(query)) {
        var exact = findKural(parseInt(query, 10));
        if (exact) items.unshift({ type: "kural", n: exact.n, label: "#" + pad(exact.n) + " " + exact.en[0].slice(0, 40), kind: t("palette.kind.kural", "kural") });
      } else {
        for (var i = 0; i < KURALS.length && items.length < 14; i++) {
          var k = KURALS[i];
          var hay = (k.en.join(" ") + " " + k.s + " " + k.tr.join(" ")).toLowerCase();
          if (hay.indexOf(query) !== -1) {
            items.push({ type: "kural", n: k.n, label: "#" + pad(k.n) + " " + k.en[0].slice(0, 40) + "…", kind: t("palette.kind.kural", "kural") });
          }
        }
      }
    }
    return items.slice(0, 14);
  }

  function renderPalette() {
    if (!paletteList || !paletteInput) return;
    paletteItems = buildPaletteItems(paletteInput.value);
    paletteIndex = 0;
    if (paletteItems.length === 0) {
      paletteList.innerHTML = '<li class="palette-empty">' + t("palette.empty", "Nothing matches.") + "</li>";
      return;
    }
    paletteList.innerHTML = paletteItems.map(function (item, i) {
      return '<li class="palette-item" role="option" id="pi-opt-' + i + '" data-pi-index="' + i +
        '" aria-selected="' + (i === 0) + '">' +
          (item.ta ? '<span class="pi-ta" lang="ta">' + escapeHtml(item.ta) + "</span>" : "") +
          '<span class="' + (item.type === "kural" ? "pi-num" : "") + '">' + escapeHtml(item.label) + "</span>" +
          '<span class="pi-kind">' + escapeHtml(item.kind) + "</span>" +
        "</li>";
    }).join("");
    if (paletteInput) paletteInput.setAttribute("aria-activedescendant", "pi-opt-0");
  }

  function movePalette(delta) {
    if (!paletteItems.length) return;
    paletteIndex = (paletteIndex + delta + paletteItems.length) % paletteItems.length;
    var options = paletteList.querySelectorAll(".palette-item");
    Array.prototype.forEach.call(options, function (li, i) {
      li.setAttribute("aria-selected", String(i === paletteIndex));
      if (i === paletteIndex) {
        try { li.scrollIntoView({ block: "nearest" }); } catch (e) { /* ignore */ }
      }
    });
    if (paletteInput) paletteInput.setAttribute("aria-activedescendant", "pi-opt-" + paletteIndex);
  }

  function runPaletteItem(item) {
    if (!item) return;
    closePanel(paletteDialog);
    if (item.type === "command") {
      if (item.id === "today") safeScrollTo(document.getElementById("daily"), { block: "start" });
      else if (item.id === "browse") safeScrollTo(document.getElementById("browse"), { block: "start" });
      else if (item.id === "map") safeScrollTo(document.getElementById("chapter-map"), { block: "start" });
      else if (item.id === "saved") { var b = document.getElementById("saved-open"); if (b) b.click(); }
      else if (item.id === "settings") { var s = document.getElementById("reader-settings-open"); if (s) s.click(); }
      else if (item.id === "random") { var sh = document.getElementById("daily-shuffle"); if (sh) sh.click(); safeScrollTo(document.getElementById("daily"), { block: "start" }); }
      else if (item.id === "shortcuts") openPanel(document.getElementById("shortcuts-dialog"), document.getElementById("palette-open"));
      else if (item.id === "night") {
        var btn = document.querySelector('[data-preference="color-scheme"][data-value="' +
          (document.body.dataset.colorScheme === "dark" ? "light" : "dark") + '"]');
        if (btn) btn.click();
      }
    } else {
      applySuggestion(item);
    }
  }

  function openPalette(trigger) {
    if (!paletteDialog) return;
    openPanel(paletteDialog, trigger);
    if (paletteInput) {
      paletteInput.value = "";
      renderPalette();
      window.setTimeout(function () { focusSilently(paletteInput); }, 0);
    }
  }

  // ---------- events ----------
  function bindChipEvents() {
    if (!chipsEl) return;
    chipsEl.addEventListener("click", function (e) {
      var btn = e.target.closest(".chip");
      if (!btn) return;
      var next = btn.getAttribute("data-theme");
      state.theme = next;
      state.situation = null; // chip click clears situation highlight
      if (next !== "all") {
        state.chapter = "all";
      }
      state.shown = PAGE_SIZE;
      renderChips();
      render();
    });
  }

  function bindControlEvents() {
    if (chapterEl) {
      chapterEl.addEventListener("change", function () {
        state.chapter = chapterEl.value || "all";
        if (state.chapter !== "all") {
          state.theme = "all";
          state.situation = null;
          markChapterVisited(state.chapter);
        }
        state.shown = PAGE_SIZE;
        renderChips();
        render();
      });
    }

    if (searchEl) {
      searchEl.addEventListener("input", function () {
        clearTimeout(debounce);
        debounce = setTimeout(function () {
          state.query = searchEl.value;
          state.shown = PAGE_SIZE;
          render();
          renderSuggestions();
        }, 120);
      });
      searchEl.addEventListener("focus", renderSuggestions);
      searchEl.addEventListener("keydown", function (e) {
        if (e.key === "ArrowDown") { e.preventDefault(); moveSuggestion(1); }
        else if (e.key === "ArrowUp") { e.preventDefault(); moveSuggestion(-1); }
        else if (e.key === "Enter") {
          if (activeSuggestion >= 0 && suggestionItems[activeSuggestion]) {
            e.preventDefault();
            rememberSearch(searchEl.value);
            applySuggestion(suggestionItems[activeSuggestion]);
          } else {
            rememberSearch(searchEl.value);
            hideSuggestions();
          }
        } else if (e.key === "Escape") {
          hideSuggestions();
        }
      });
      searchEl.addEventListener("blur", function () {
        window.setTimeout(hideSuggestions, 140);
      });
    }

    if (suggestionsEl) {
      suggestionsEl.addEventListener("mousedown", function (e) {
        // Keep focus in the input so blur never races the click.
        if (e.target.closest(".suggestion")) e.preventDefault();
      });
      suggestionsEl.addEventListener("click", function (e) {
        var btn = e.target.closest(".suggestion");
        if (!btn) return;
        var idx = Number(btn.getAttribute("data-sg-index"));
        rememberSearch(searchEl ? searchEl.value : "");
        applySuggestion(suggestionItems[idx]);
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener("click", function () {
        clearTimeout(debounce);
        state.theme = "all";
        state.chapter = "all";
        state.book = "all";
        state.situation = null;
        state.query = "";
        state.shown = PAGE_SIZE;
        if (searchEl) searchEl.value = "";
        if (chapterEl) chapterEl.value = "all";
        renderChips();
        render();
        hideSuggestions();
        // scroll user back to browse top so they see the reset
        var browse = document.getElementById("browse");
        safeScrollTo(browse, { block: "start", behavior: "smooth" });
      });
    }
  }

  function bindSectionEvents() {
    if (booksGridEl) {
      booksGridEl.addEventListener("click", function (e) {
        var btn = e.target.closest(".book-card");
        if (!btn) return;
        var id = btn.getAttribute("data-book");
        state.book = id === "all" ? "all" : parseInt(id, 10);
        state.chapter = "all";
        state.theme = "all";
        state.situation = null;
        state.shown = PAGE_SIZE;
        if (chapterEl) chapterEl.value = "all";
        renderChips();
        render();
        var browse = document.getElementById("browse");
        safeScrollTo(browse, { block: "start", behavior: "smooth" });
      });
    }

    if (situationsGridEl) {
      situationsGridEl.addEventListener("click", function (e) {
        var btn = e.target.closest(".situation");
        if (!btn) return;
        var id = btn.getAttribute("data-situation");
        var theme = btn.getAttribute("data-theme");
        // Toggling: click the same door again to deselect
        if (state.situation === id) {
          state.situation = null;
          state.theme = "all";
        } else {
          state.situation = id;
          state.theme = theme || "all";
          state.chapter = "all";
          state.book = "all";
          if (chapterEl) chapterEl.value = "all";
        }
        state.shown = PAGE_SIZE;
        renderChips();
        render();
        var browse = document.getElementById("browse");
        safeScrollTo(browse, { block: "start", behavior: "smooth" });
      });
    }

    if (chapterMapBodyEl) {
      chapterMapBodyEl.addEventListener("click", function (e) {
        var cell = e.target.closest(".map-cell");
        if (!cell) return;
        var n = cell.getAttribute("data-chapter");
        state.chapter = n;
        state.theme = "all";
        state.situation = null;
        state.shown = PAGE_SIZE;
        if (chapterEl) chapterEl.value = n;
        markChapterVisited(n);
        renderChips();
        render();
        var listTop = document.getElementById("kural-list");
        safeScrollTo(listTop, { block: "start", behavior: "smooth" });
      });
    }

    if (dailyShuffleEl) {
      dailyShuffleEl.addEventListener("click", function () {
        // Pick a *different* random kural
        var next = Math.floor(Math.random() * KURALS.length);
        if (KURALS.length > 1 && next === state.dailyIndex) next = (next + 1) % KURALS.length;
        state.dailyIndex = next;
        renderDaily();
      });
    }
  }

  function bindAppActions() {
    document.addEventListener("click", function (event) {
      var action = event.target.closest("[data-app-action]");
      if (!action) return;
      var type = action.getAttribute("data-app-action");
      var n = Number(action.getAttribute("data-kural"));
      if (type === "prev") stepInResults(n, -1);
      else if (type === "next") stepInResults(n, 1);
      else if (type === "listen") toggleSpeech(n);
      else if (type === "focus") openFocus(n, action);
      else if (type === "clear-chapter") {
        state.chapter = "all";
        if (chapterEl) chapterEl.value = "all";
        render();
      }
    });
  }

  function bindPaletteEvents() {
    var openBtn = document.getElementById("palette-open");
    if (openBtn) openBtn.addEventListener("click", function () { openPalette(openBtn); });

    if (paletteInput) {
      paletteInput.addEventListener("input", renderPalette);
      paletteInput.addEventListener("keydown", function (e) {
        if (e.key === "ArrowDown") { e.preventDefault(); movePalette(1); }
        else if (e.key === "ArrowUp") { e.preventDefault(); movePalette(-1); }
        else if (e.key === "Enter") {
          e.preventDefault();
          runPaletteItem(paletteItems[paletteIndex]);
        }
      });
    }
    if (paletteList) {
      paletteList.addEventListener("click", function (e) {
        var li = e.target.closest(".palette-item");
        if (!li) return;
        runPaletteItem(paletteItems[Number(li.getAttribute("data-pi-index"))]);
      });
    }
  }

  function bindFocusEvents() {
    var prev = document.getElementById("focus-prev");
    var next = document.getElementById("focus-next");
    var listen = document.getElementById("focus-listen");
    if (prev) prev.addEventListener("click", function () { moveFocus(-1); updateFocusNav(); });
    if (next) next.addEventListener("click", function () { moveFocus(1); updateFocusNav(); });
    if (listen) listen.addEventListener("click", function () { if (focusNumber) toggleSpeech(focusNumber); });
  }

  function bindBackToTop() {
    if (!backToTopEl) return;
    var ticking = false;
    function update() {
      ticking = false;
      var y = window.scrollY || document.documentElement.scrollTop || 0;
      backToTopEl.hidden = y < 700;
      var controls = document.getElementById("controls");
      if (controls) controls.classList.toggle("is-stuck", y > 560);
    }
    window.addEventListener("scroll", function () {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame ? window.requestAnimationFrame(update) : update();
    }, { passive: true });
    update();
    backToTopEl.addEventListener("click", function () {
      var browse = document.getElementById("browse");
      safeScrollTo(browse, { block: "start", behavior: "smooth" });
      focusSilently(browse);
    });
  }

  function isTypingTarget(el) {
    if (!el) return false;
    var tag = (el.tagName || "").toLowerCase();
    return tag === "input" || tag === "textarea" || tag === "select" || el.isContentEditable;
  }

  function bindKeyboardShortcuts() {
    document.addEventListener("keydown", function (e) {
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        openPalette(document.activeElement);
        return;
      }
      if (isTypingTarget(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
      if (document.querySelector("dialog[open]")) return;

      if (e.key === "/") {
        e.preventDefault();
        if (searchEl) { focusSilently(searchEl); searchEl.select && searchEl.select(); }
      } else if (e.key === "?") {
        e.preventDefault();
        openPanel(document.getElementById("shortcuts-dialog"), document.activeElement);
      } else if (e.key === "j" || e.key === "k") {
        var cards = Array.prototype.slice.call(document.querySelectorAll(".kural-card"));
        if (!cards.length) return;
        e.preventDefault();
        var active = document.activeElement && document.activeElement.closest
          ? document.activeElement.closest(".kural-card") : null;
        var idx = active ? cards.indexOf(active) : -1;
        var target = e.key === "j"
          ? cards[Math.min(cards.length - 1, idx + 1)]
          : cards[Math.max(0, idx <= 0 ? 0 : idx - 1)];
        if (target) {
          safeScrollTo(target, { block: "start" });
          focusSilently(target);
        }
      } else if (e.key === "s" || e.key === "l" || e.key === "Enter") {
        var card = document.activeElement && document.activeElement.closest
          ? document.activeElement.closest(".kural-card, #daily-card") : null;
        if (!card) return;
        if (e.key === "s") {
          var save = card.querySelector('[data-kural-action="save"]');
          if (save) { e.preventDefault(); save.click(); }
        } else if (e.key === "l") {
          var listen = card.querySelector('[data-app-action="listen"]');
          if (listen) { e.preventDefault(); listen.click(); }
        } else {
          var match = (card.id || "").match(/^kural-(\d+)$/);
          var num = match ? Number(match[1]) : 0;
          if (!num) {
            var seal = card.querySelector(".daily-num");
            if (seal) num = Number(String(seal.textContent).replace(/\D/g, ""));
          }
          if (num) { e.preventDefault(); openFocus(num, card); }
        }
      }
    });
  }

  if (chipsEl) bindChipEvents();
  bindControlEvents();
  bindSectionEvents();
  bindAppActions();
  bindPaletteEvents();
  bindFocusEvents();
  bindBackToTop();
  bindKeyboardShortcuts();

  if (sentinelEl && "IntersectionObserver" in window) {
    var io = new IntersectionObserver(
      function (entries) {
        if (entries[0].isIntersecting && sentinelEl.style.display !== "none") {
          state.shown += PAGE_SIZE;
          render();
        }
      },
      { rootMargin: "700px 0px" }
    );
    io.observe(sentinelEl);
  } else if (!("IntersectionObserver" in window)) {
    state.shown = KURALS.length;
  }

  // ---------- init ----------
  lang = currentLanguage();
  primeVoices();
  renderChapterOptions();
  renderChips();
  renderBooks();
  renderSituations();
  renderChapterMap();
  renderDaily();
  render();
  applyLanguage(); // static markup + re-renders dynamic strings via callbacks
  updateJourneyUi();
  bindReadingPosition();
  restoreReadingPosition();

  // Shared-target entry point (manifest share_target → ?q=…)
  if (bootQuery) {
    if (searchEl) searchEl.value = bootQuery;
    state.query = bootQuery;
    state.shown = PAGE_SIZE;
    render();
    try { history.replaceState(null, "", location.pathname); } catch (e) { /* ignore */ }
    var browseEl = document.getElementById("browse");
    safeScrollTo(browseEl, { block: "start" });
  }

  // deep link: #kural-151 or #book-1, #chapter-16, #situation-anger, #theme-anger
  var hash = bootHash || "";
  var m;
  if ((m = hash.match(/^#kural-(\d+)$/))) {
    var target = parseInt(m[1], 10);
    var idx = KURALS.findIndex(function (k) { return k.n === target; });
    if (idx >= 0) {
      state.shown = Math.max(PAGE_SIZE, idx + 1 + Math.floor(PAGE_SIZE / 2));
      render();
      var el = document.getElementById("kural-" + target);
      safeScrollTo(el, { block: "start" });
      focusSilently(el);
    }
  } else if ((m = hash.match(/^#chapter-(\d+)$/))) {
    state.chapter = m[1];
    state.theme = "all";
    state.shown = KURALS.length;
    markChapterVisited(m[1]);
    renderChips();
    render();
    safeScrollTo(document.getElementById("browse"), { block: "start" });
  } else if ((m = hash.match(/^#book-(\d+|all)$/))) {
    state.book = m[1] === "all" ? "all" : parseInt(m[1], 10);
    state.shown = PAGE_SIZE;
    render();
    safeScrollTo(document.getElementById("browse"), { block: "start" });
  } else if ((m = hash.match(/^#situation-([a-z]+)$/))) {
    var sit = null;
    for (var i = 0; i < SITUATIONS.length; i++) {
      if (SITUATIONS[i].id === m[1]) { sit = SITUATIONS[i]; break; }
    }
    if (sit) {
      state.situation = sit.id;
      state.theme = sit.theme;
      state.chapter = "all";
      state.book = "all";
      state.shown = PAGE_SIZE;
      renderChips();
      render();
      safeScrollTo(document.getElementById("browse"), { block: "start" });
    }
  } else if ((m = hash.match(/^#theme-([a-z-]+)$/))) {
    var themeHit = THEMES.some(function (th) { return th.id === m[1]; });
    if (themeHit) {
      state.theme = m[1];
      state.situation = null;
      state.chapter = "all";
      state.book = "all";
      state.shown = PAGE_SIZE;
      renderChips();
      render();
      safeScrollTo(document.getElementById("browse"), { block: "start" });
    }
  }

  // Re-render every dynamic surface when the interface language changes.
  window.TamilStoicI18n.onChange(function () {
    renderChapterOptions();
    renderChips();
    renderBooks();
    renderSituations();
    renderChapterMap();
    renderDaily();
    render();
    updateJourneyUi();
    if (suggestionsEl && !suggestionsEl.hidden) renderSuggestions();
  });
})();
