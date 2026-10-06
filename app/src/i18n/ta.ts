/**
 * Tamil interface dictionary.
 *
 * Keys and wording are carried over from the shipped reader's `TamilStoicI18n`
 * dictionary so a reader switching to தமிழ் sees the same sentences they
 * already know. English strings live at the call sites (the repo's existing
 * convention); a key missing here simply falls back to the English literal.
 */
export const TA: Record<string, string> = {
  // chrome / navigation
  'nav.today': 'இன்று',
  'nav.chapters': 'அத்தியாயங்கள்',
  'nav.saved': 'சேமித்தவை',
  'nav.ask': 'வள்ளுவரைக் கேள்',
  'nav.backHome': 'முகப்புக்குத் திரும்ப',
  'nav.main': 'முதன்மை வழிசெலுத்தல்',
  'nav.prev': 'முந்தையது',
  'nav.next': 'அடுத்தது',
  'nav.listen': 'கேளுங்கள்',
  'action.settings': 'வாசிப்பு அமைப்புகள்',
  'action.saved': 'சேமித்தவை',
  'action.palette': 'தேடல் மற்றும் கட்டளைகள்',
  'action.cancel': 'ரத்து',

  // home
  'header.eyebrow': 'தமிழ் ஸ்டோயிக் · Tamil Stoic',
  'header.subtitle': 'திருக்குறள் — திருவள்ளுவரின் குறள்கள்',
  'header.tagline':
    'ஒரு நாளைக்கு ஒரு குறள், எளிய பொருளுடன். அனைத்தும் உங்கள் சாதனத்திலேயே.',
  'daily.title': 'இன்றைய குறள்',
  'daily.shuffle': 'வேறு ஒன்று',
  'daily.shuffleTitle': 'வேறு ஒரு குறளைக் காட்டு',
  'daily.share': 'இன்றைய குறளைப் பகிர்',
  'books.title': 'மூன்று பால்கள்',
  'books.sub': 'திருக்குறள் மூன்று பால்களாக அமைந்துள்ளது. ஒன்றைத் தட்டி, முழுமையாகப் படியுங்கள்.',
  'situations.title': 'சூழ்நிலை',
  'situations.sub': 'இன்று நீங்கள் எங்கே? பொருந்தும் வாயிலைத் தேர்ந்தெடுங்கள்; வள்ளுவர் அதற்குப் பேசுவார்.',
  'search.all': '1,330 குறள்களையும் தேடுங்கள்',

  // journey
  'journey.title': 'உங்கள் வாசிப்புப் பயணம்',
  'journey.empty': 'உங்கள் வாசிப்புப் பயணம் ஒரு குறளில் தொடங்குகிறது.',
  'journey.progress': '{r} குறள்கள் படித்தவை · {c} அதிகாரங்கள் பார்த்தவை · {s} நாள் தொடர்',
  'stat.read': 'படித்தவை',
  'stat.visited': 'பார்த்தவை',
  'stat.chapters': 'அதிகாரங்கள்',
  'stat.kurals': 'குறள்கள்',
  'stat.iyals': 'இயல்கள்',
  'stat.themes': 'தலைப்புகள்',

  // chapters / browse
  'browse.title': 'அத்தியாயங்கள்',
  'browse.sub': 'எண் அல்லது சொல் தேடுங்கள், அதிகாரம் தேர்வு செய்யுங்கள், அல்லது சுதந்திரமாக அலையுங்கள்.',
  'search.label': 'குறளை எண், தமிழ், எழுத்துப்படம் அல்லது ஆங்கிலத்தில் தேடுங்கள்',
  'search.placeholder': 'எண் அல்லது சொல் தேடுங்கள் — எ.கா. 151, பொறுத்தல், patience…',
  'search.suggestions': 'தேடல் பரிந்துரைகள்',
  'clear.text': 'அழி',
  'map.title': 'அனைத்து அதிகாரங்கள் · All 133 chapters',
  'list.loading': 'மேலும் ஏற்றப்படுகிறது…',

  // reader
  'detail.save': 'இந்தக் குறளைச் சேமி',
  'detail.unsave': 'சேமித்ததிலிருந்து நீக்கு',
  'detail.note': 'தனிக் குறிப்பு எழுது',
  'detail.share': 'இந்தக் குறளைப் பகிர்',
  'detail.meaning': 'பொருள்',
  'card.listen': 'கேளுங்கள்',
  'card.stop': 'நிறுத்து',
  'card.focus': 'முழுதும் படி',
  'card.reflect': 'சிந்தனை',

  // saved + reflections
  'saved.eyebrow': 'உங்கள் தனிச் சேகரிப்பு',
  'saved.title': 'சேமித்த குறள்கள்',
  'saved.intro':
    'சேமித்த குறள்களும் சிந்தனைகளும் இந்தச் சாதனத்திலேயே இருக்கும். எதுவும் தானாகப் பதிவேற்றப்படுவதில்லை.',
  'saved.empty': 'சரியான தருணத்தில் உங்களைச் சந்திக்கும் ஒரு குறளைச் சேமியுங்கள். இங்கே தோன்றும்.',
  'saved.noteLabel': 'தனிச் சிந்தனை',
  'reflection.title': 'ஒரு தனிச் சிந்தனை',
  'reflection.label': 'நீங்கள் என்ன நினைவில் கொள்ள விரும்புகிறீர்கள்?',
  'reflection.placeholder': 'உங்களுக்கான ஒரு எண்ணம் — இந்தச் சாதனத்தில் மட்டுமே சேமிக்கப்படும்.',
  'reflection.hint': '500 எழுத்துகள் வரை. காலியாக விட்டாலும் குறள் சேமிக்கப்படும்.',
  'reflection.save': 'சிந்தனையைச் சேமி',

  // settings
  'settings.title': 'வாசிப்பு அமைப்புகள்',
  'settings.eyebrow': 'இந்த வாசிப்பை உங்களுக்காக்குங்கள்',
  'settings.textSize': 'எழுத்து அளவு',
  'settings.spacing': 'வரிசை இடைவெளி',
  'settings.colour': 'நிறம்',
  'settings.language': 'இடைமுக மொழி',
  'settings.layers': 'வாசிப்பு அடுக்குகள்',
  'settings.motion': 'அசைவைக் குறை',
  'settings.contrast': 'அதிக மாறுபாடு',
  'settings.size.standard': 'சாதாரணம்',
  'settings.size.large': 'பெரியது',
  'settings.size.xlarge': 'மிகப் பெரியது',
  'settings.spacing.comfortable': 'வசதியானது',
  'settings.spacing.relaxed': 'தளர்வானது',
  'settings.colour.light': 'பனையோலை பகல்',
  'settings.colour.dark': 'சங்கக் களிமண்',
  'settings.colour.system': 'கணினியைப் பின்தொடர்',
  'settings.layer.tamil': 'தமிழ் குறள்',
  'settings.layer.translit': 'எழுத்துப்படம்',
  'settings.layer.translation': 'ஆங்கில மொழிபெயர்ப்பு',
  'settings.layer.simple': 'எளிய பொருள்',
  'settings.coupletNote':
    'தமிழ்க் குறள் எப்போதும் நிலையான இரண்டு வரிகளாகவே இருக்கும் — மேல் நான்கு சீர், கீழ் மூன்று சீர் — எந்த அளவு, இடைவெளி, மாறுபாடு தேர்வு செய்தாலும்.',

  // palette + shortcuts
  'palette.eyebrow': 'எங்கும் செல்லுங்கள்',
  'palette.title': 'தேடல் மற்றும் கட்டளைகள்',
  'palette.placeholder': 'குறள் எண், அதிகாரம் அல்லது கட்டளை தட்டவும்…',
  'palette.empty': 'பொருந்துவது எவ்வும் இல்லை.',
  'shortcuts.title': 'விசைப்பலகைக் குறுக்குவழிகள்',
  'shortcuts.eyebrow': 'விசைப்பலகை',
  'shortcuts.search': 'தேடலை முன்னிலைப்படுத்து',
  'shortcuts.palette': 'கட்டளைப் பட்டியலைத் திற',
  'shortcuts.j': 'அடுத்த குறள்',
  'shortcuts.k': 'முந்தைய குறள்',
  'shortcuts.s': 'குறளைச் சேமி',
  'shortcuts.l': 'குறளைக் கேளுங்கள்',
  'shortcuts.help': 'இந்த உதவியைக் காட்டு',
  'shortcuts.enter': 'முனைவு முறையில் குறளைப் படிக்க',

  // onboarding
  'onboard.close': 'சுற்றுலாவை மூடு',
  'onboard.step1Title': 'ஒரு நாளைக்கு ஒரு குறள்',
  'onboard.step1Body':
    'இன்றைய குறள் மேலே வரவேற்கிறது. வேறு பாடல் வேண்டுமானால் "வேறு ஒன்று" அழுத்தவும்; தேவைப்படுபவருக்குப் பகிரவும்.',
  'onboard.step2Title': 'உங்களைச் சந்திப்பதைச் சேமியுங்கள்',
  'onboard.step2Body':
    'எந்தக் குறளிலும் சேமி அழுத்தவும், அல்லது தனிச் சிந்தனை எழுதவும். இரண்டும் இந்தச் சாதனத்தில் மட்டுமே — எப்போதும் பதிவேற்றப்படாது.',
  'onboard.step3Title': 'உங்கள் வழியில், ஆஃப்லைனில்',
  'onboard.step3Body':
    'வாசிப்பு அமைப்புகளில் எழுத்து அளவு, அடுக்குகள், பகல்/இரவு நிறம் தேர்வு செய்யுங்கள். செயலியை நிறுவினால் முழு நூலகமும் ஆஃப்லைனில்.',
  'onboard.start': 'எனக்குக் காட்டுங்கள்',
  'onboard.back': 'பின்',
  'onboard.next': 'அடுத்து',
  'onboard.done': 'வாசிப்பைத் தொடங்கு',

  // toasts
  'toast.saved': 'சேமிக்கப்பட்டது ✓',
  'toast.removed': 'நீக்கப்பட்டது',
  'toast.reflectSaved': 'தனிச் சிந்தனை இந்தச் சாதனத்தில் சேமிக்கப்பட்டது.',
  'toast.copied': 'குறள் நகலெடுக்கப்பட்டது ✓',
  'toast.shareFailed': 'இந்தச் சாதனத்தில் பகிர முடியவில்லை',

  // credits
  'credits.title': 'பங்களிப்பும் திறந்த மூலமும்',
  'credits.eyebrow': 'திறந்த மூல · மூலக் குறிப்புகள்',

  // the daily ritual — today's leaf, the lit minute, the reminder
  'ritual.late': 'நீங்கள் குறித்த நேரம் கடந்துவிட்டது. குறள் எப்போதும் இங்கே இருக்கிறது.',
  'ritual.sit.ta': 'அமைதி',
  'ritual.sit.title': 'அதனுடன் அமருங்கள்',
  'ritual.sit.sub': 'விளக்கின் கீழ் ஒரு நிமிடம் — வேறொன்றுமில்லை.',
  'ritual.sit.done': 'இன்றைய குறளோடு நீங்கள் அமர்ந்துவிட்டீர்கள்.',
  'ritual.sit.streak': '{s} நாள் அமர்ந்தது',
  'ritual.sit.start': 'விளக்கை ஏற்று',
  'ritual.sit.pause': 'தழலை மூடு',
  'ritual.sit.resume': 'தொடர்',
  'ritual.sit.reset': 'அணைத்துவிடு',
  'ritual.sit.length': 'எவ்வளவு எண்ணெய்',
  'ritual.sit.toast': 'நீங்கள் அதனுடன் அமர்ந்தீர்கள் ✓',
  'ritual.sit.recorded': 'இன்றைக்குப் பதிவாகிவிட்டது. மீண்டும் அமர்வது உங்கள் விருப்பம்.',
  'reminder.title': 'திருக்குறள் · Thirukkural',
  'reminder.body': 'இன்றைய குறள் உங்களுக்குத் தயாராக இருக்கிறது.',
  'reminder.next': 'அடுத்தது',
  'reminder.today': 'இன்று',
  'reminder.tomorrow': 'நாளை',
  'reminder.enable': 'இந்தச் சாதனத்தில் அறிவிப்புகளை அனுமதி',
  'reminder.granted': 'நினைவூட்டல் இயக்கப்பட்டது ✓',
  'reminder.denied': 'அறிவிப்புகள் இல்லை — ஓலை இங்கேயே காத்திருக்கும்',
  'reminder.armed': 'இந்தச் சாதனத்திலேயே திட்டமிடப்பட்டது — எதுவும் அனுப்பப்படுவதில்லை.',
  'reminder.fallback':
    'இங்கு அறிவிப்புகள் இல்லை. நீங்கள் திறக்கும்போது ஓலை காத்திருக்கும்.',
  'settings.ritual': 'நாள்தோறும் சடங்கு',
  'settings.reminder': 'இன்றைய குறளை நினைவூட்டு',
  'settings.reminderHour': 'நினைவூட்டல் நேரம்',
  'settings.ritualNote':
    'குறள் எப்போதும் திறந்தே இருக்கும். நினைவூட்டல் எதையும் அனுப்பாது, எதையும் மேற்கோள் காட்டாது. அனைத்தும் இந்தச் சாதனத்திலேயே.',
}