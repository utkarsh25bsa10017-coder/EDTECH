import type { Bi, Exam } from './exams.ts';

/**
 * What each exam tests, stage by stage. Compiled from published syllabus
 * summaries (see docs/existing-materials.md, section 2); the exact pattern,
 * question counts and subject list follow each official notification.
 */
export interface Paper {
  name: Bi;
  /** e.g. "qualifying", "counts for merit" */
  note?: Bi;
  subjects: Bi[];
}

export interface Stage {
  name: Bi;
  papers: Paper[];
}

const b = (en: string, hi: string): Bi => ({ en, hi });

const QUALIFYING = b('Qualifying', 'क्वालिफ़ाइंग');

export const SYLLABUS: Record<Exam, { stages: Stage[]; note?: Bi }> = {
  'bpsc-tre': {
    stages: [
      {
        name: b('Written exam', 'लिखित परीक्षा'),
        papers: [
          {
            name: b('Part I: Language', 'भाग I: भाषा'),
            note: QUALIFYING,
            subjects: [b('Hindi', 'हिन्दी'), b('English', 'अंग्रेज़ी'), b('Urdu, Bengali and other languages in the notification', 'उर्दू, बांग्ला व अधिसूचना में दी गई अन्य भाषाएं')],
          },
          {
            name: b('Part II: General Studies', 'भाग II: सामान्य अध्ययन'),
            subjects: [
              b('History & national movement', 'इतिहास एवं राष्ट्रीय आंदोलन'),
              b('Geography', 'भूगोल'),
              b('Polity & economy', 'राजव्यवस्था एवं अर्थव्यवस्था'),
              b('General science', 'सामान्य विज्ञान'),
              b('Bihar GK', 'बिहार सामान्य ज्ञान'),
              b('Current affairs', 'समसामयिकी'),
              b('Mental ability & maths', 'मानसिक योग्यता एवं गणित'),
              b('Child development & pedagogy', 'बाल विकास एवं शिक्षाशास्त्र'),
            ],
          },
          {
            name: b('Part III: Subject paper, classes 6–8', 'भाग III: विषय पत्र, कक्षा 6–8'),
            subjects: [b('Maths & science', 'गणित एवं विज्ञान'), b('Social science', 'सामाजिक विज्ञान'), b('Hindi', 'हिन्दी'), b('English', 'अंग्रेज़ी'), b('Sanskrit', 'संस्कृत'), b('Urdu', 'उर्दू')],
          },
          {
            name: b('Part III: Subject paper, classes 9–10', 'भाग III: विषय पत्र, कक्षा 9–10'),
            subjects: [
              b('Hindi', 'हिन्दी'),
              b('English', 'अंग्रेज़ी'),
              b('Sanskrit', 'संस्कृत'),
              b('Urdu', 'उर्दू'),
              b('Mathematics', 'गणित'),
              b('Science', 'विज्ञान'),
              b('Social science', 'सामाजिक विज्ञान'),
            ],
          },
          {
            name: b('Part III: Subject paper, classes 11–12', 'भाग III: विषय पत्र, कक्षा 11–12'),
            subjects: [
              b('Physics', 'भौतिकी'),
              b('Chemistry', 'रसायन'),
              b('Mathematics', 'गणित'),
              b('Botany', 'वनस्पति विज्ञान'),
              b('Zoology', 'जंतु विज्ञान'),
              b('History', 'इतिहास'),
              b('Geography', 'भूगोल'),
              b('Economics', 'अर्थशास्त्र'),
              b('Political science', 'राजनीति विज्ञान'),
              b('Sociology', 'समाजशास्त्र'),
              b('Psychology', 'मनोविज्ञान'),
              b('Philosophy', 'दर्शनशास्त्र'),
              b('Hindi', 'हिन्दी'),
              b('English', 'अंग्रेज़ी'),
              b('Sanskrit', 'संस्कृत'),
              b('Urdu', 'उर्दू'),
              b('Accountancy', 'लेखाशास्त्र'),
              b('Business studies', 'व्यवसाय अध्ययन'),
              b('Computer science', 'कंप्यूटर विज्ञान'),
              b('Home science', 'गृह विज्ञान'),
              b('Music', 'संगीत'),
              b('Fine arts', 'ललित कला'),
            ],
          },
        ],
      },
    ],
    note: b(
      'Classes 1–5 have no separate subject paper. The subjects for classes 6–12 follow the vacancy table of each notification.',
      'कक्षा 1–5 के लिए अलग विषय पत्र नहीं है। कक्षा 6–12 के विषय हर अधिसूचना की रिक्ति तालिका के अनुसार होते हैं।',
    ),
  },
  'bihar-daroga': {
    stages: [
      {
        name: b('Prelims', 'प्रारंभिक परीक्षा'),
        papers: [
          {
            name: b('General Studies & Current Affairs', 'सामान्य अध्ययन एवं समसामयिकी'),
            note: QUALIFYING,
            subjects: [
              b('History', 'इतिहास'),
              b('Geography', 'भूगोल'),
              b('Polity', 'राजव्यवस्था'),
              b('Economy', 'अर्थव्यवस्था'),
              b('General science', 'सामान्य विज्ञान'),
              b('Bihar GK', 'बिहार सामान्य ज्ञान'),
              b('Current affairs', 'समसामयिकी'),
              b('Maths & mental ability', 'गणित एवं मानसिक योग्यता'),
            ],
          },
        ],
      },
      {
        name: b('Mains', 'मुख्य परीक्षा'),
        papers: [
          {
            name: b('Paper I: General Hindi', 'पत्र I: सामान्य हिन्दी'),
            note: QUALIFYING,
            subjects: [b('Grammar', 'व्याकरण'), b('Unseen passage', 'अपठित गद्यांश'), b('Vocabulary & fill in the blanks', 'शब्द ज्ञान एवं रिक्त स्थान')],
          },
          {
            name: b('Paper II: General Studies', 'पत्र II: सामान्य अध्ययन'),
            note: b('Counts for merit', 'मेधा सूची में गिना जाता है'),
            subjects: [
              b('General science', 'सामान्य विज्ञान'),
              b('Civics', 'नागरिक शास्त्र'),
              b('Indian history', 'भारतीय इतिहास'),
              b('Indian geography', 'भारतीय भूगोल'),
              b('Maths & mental ability', 'गणित एवं मानसिक योग्यता'),
            ],
          },
        ],
      },
    ],
  },
  'bpsc-cce': {
    stages: [
      {
        name: b('Prelims', 'प्रारंभिक परीक्षा'),
        papers: [
          {
            name: b('General Studies', 'सामान्य अध्ययन'),
            note: QUALIFYING,
            subjects: [
              b('General science', 'सामान्य विज्ञान'),
              b('Current events, national & international', 'राष्ट्रीय एवं अंतरराष्ट्रीय समसामयिक घटनाएं'),
              b('History of India & Bihar', 'भारत एवं बिहार का इतिहास'),
              b('Indian & world geography', 'भारत एवं विश्व का भूगोल'),
              b('Indian polity & economy', 'भारतीय राजव्यवस्था एवं अर्थव्यवस्था'),
              b('National movement & Bihar’s role', 'राष्ट्रीय आंदोलन एवं बिहार की भूमिका'),
              b('General mental ability', 'सामान्य मानसिक योग्यता'),
            ],
          },
        ],
      },
      {
        name: b('Mains', 'मुख्य परीक्षा'),
        papers: [
          {
            name: b('General Hindi', 'सामान्य हिन्दी'),
            note: QUALIFYING,
            subjects: [b('Essay', 'निबंध'), b('Grammar', 'व्याकरण'), b('Syntax', 'वाक्य विन्यास'), b('Summary writing', 'संक्षेपण')],
          },
          {
            name: b('GS Paper I', 'सामान्य अध्ययन पत्र I'),
            subjects: [b('Modern Indian history & culture', 'आधुनिक भारत का इतिहास एवं संस्कृति'), b('Current events', 'समसामयिक घटनाएं'), b('Statistical analysis & graphs', 'सांख्यिकीय विश्लेषण एवं आरेख')],
          },
          {
            name: b('GS Paper II', 'सामान्य अध्ययन पत्र II'),
            subjects: [b('Indian polity', 'भारतीय राजव्यवस्था'), b('Indian & Bihar economy', 'भारतीय एवं बिहार की अर्थव्यवस्था'), b('Science & technology in development', 'विकास में विज्ञान एवं प्रौद्योगिकी')],
          },
          {
            name: b('Essay & Optional', 'निबंध एवं वैकल्पिक विषय'),
            subjects: [b('Essay writing', 'निबंध लेखन'), b('One optional subject from the list', 'सूची से एक वैकल्पिक विषय')],
          },
        ],
      },
      {
        name: b('Interview', 'साक्षात्कार'),
        papers: [{ name: b('Personality test', 'व्यक्तित्व परीक्षण'), subjects: [b('Current affairs & Bihar', 'समसामयिकी एवं बिहार')] }],
      },
    ],
    note: b('Our practice sets cover the prelims.', 'हमारे अभ्यास सेट प्रारंभिक परीक्षा पर आधारित हैं।'),
  },
  'up-si': {
    stages: [
      {
        name: b('Written exam: four sections', 'लिखित परीक्षा: चार खण्ड'),
        papers: [
          {
            name: b('1. General Hindi', '1. सामान्य हिन्दी'),
            subjects: [b('Grammar', 'व्याकरण'), b('Vocabulary', 'शब्द ज्ञान'), b('Idioms & proverbs', 'मुहावरे एवं लोकोक्तियां'), b('Tatsam & tadbhav', 'तत्सम एवं तद्भव'), b('Literature & authors', 'साहित्य एवं रचनाकार')],
          },
          {
            name: b('2. Basic Law, Constitution & GK', '2. मूल विधि, संविधान एवं सामान्य ज्ञान'),
            subjects: [
              b('BNS, BNSS & BSA (new criminal laws)', 'बीएनएस, बीएनएसएस एवं बीएसए (नए आपराधिक कानून)'),
              b('Laws protecting women, children & SC/ST', 'महिला, बाल एवं अनुसूचित जाति/जनजाति संरक्षण कानून'),
              b('Traffic, environment & wildlife laws', 'यातायात, पर्यावरण एवं वन्यजीव कानून'),
              b('Human rights & RTI', 'मानवाधिकार एवं सूचना का अधिकार'),
              b('Indian Constitution', 'भारतीय संविधान'),
              b('General knowledge & current affairs', 'सामान्य ज्ञान एवं समसामयिकी'),
              b('Uttar Pradesh GK', 'उत्तर प्रदेश सामान्य ज्ञान'),
            ],
          },
          {
            name: b('3. Numerical & Mental Ability', '3. संख्यात्मक एवं मानसिक योग्यता'),
            subjects: [
              b('Number system', 'संख्या पद्धति'),
              b('Percentage, ratio & average', 'प्रतिशत, अनुपात एवं औसत'),
              b('Interest, profit & loss', 'ब्याज, लाभ एवं हानि'),
              b('Time, speed & distance', 'समय, चाल एवं दूरी'),
              b('Time & work', 'समय एवं कार्य'),
            ],
          },
          {
            name: b('4. Mental Aptitude, IQ & Reasoning', '4. मानसिक अभिरुचि, बुद्धिलब्धि एवं तार्किक क्षमता'),
            subjects: [
              b('Police aptitude: law & order, communal harmony, crime control', 'पुलिस अभिरुचि: कानून व्यवस्था, सांप्रदायिक सद्भाव, अपराध नियंत्रण'),
              b('Series & analogy', 'श्रृंखला एवं सादृश्यता'),
              b('Coding & decoding', 'कोडिंग-डिकोडिंग'),
              b('Directions & blood relations', 'दिशा एवं रक्त संबंध'),
              b('Logical diagrams', 'तार्किक आरेख'),
            ],
          },
        ],
      },
    ],
  },
};
