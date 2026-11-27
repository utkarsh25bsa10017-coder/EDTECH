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
  mppsc: {
    stages: [
      {
        name: b('Prelims: two objective papers', 'प्रारंभिक परीक्षा: दो वस्तुनिष्ठ प्रश्नपत्र'),
        papers: [
          {
            name: b('Paper I: General Studies', 'प्रश्नपत्र I: सामान्य अध्ययन'),
            note: b('Counts for the mains shortlist', 'मुख्य परीक्षा की सूची में गिना जाता है'),
            subjects: [
              b('History of India & Madhya Pradesh', 'भारत एवं मध्यप्रदेश का इतिहास'),
              b('Geography of India, the world & MP', 'भारत, विश्व एवं मध्यप्रदेश का भूगोल'),
              b('Indian polity & MP administration', 'भारतीय राजव्यवस्था एवं मध्यप्रदेश प्रशासन'),
              b('Economy of India & MP', 'भारत एवं मध्यप्रदेश की अर्थव्यवस्था'),
              b('General science & environment', 'सामान्य विज्ञान एवं पर्यावरण'),
              b('Current affairs', 'समसामयिकी'),
              b('Information & communication technology', 'सूचना एवं संचार प्रौद्योगिकी'),
              b('Tribes of Madhya Pradesh', 'मध्यप्रदेश की जनजातियां'),
            ],
          },
          {
            name: b('Paper II: General Aptitude (CSAT)', 'प्रश्नपत्र II: सामान्य अभिरुचि (सीसैट)'),
            note: QUALIFYING,
            subjects: [
              b('Comprehension', 'बोधगम्यता'),
              b('Reasoning & analytical ability', 'तार्किक एवं विश्लेषणात्मक क्षमता'),
              b('Decision making & problem solving', 'निर्णय लेना एवं समस्या समाधान'),
              b('Basic numeracy & data interpretation', 'आधारभूत संख्यात्मकता एवं आंकड़ों का विश्लेषण'),
              b('Hindi comprehension', 'हिन्दी भाषा में बोधगम्यता'),
            ],
          },
        ],
      },
      { name: b('Mains', 'मुख्य परीक्षा'), papers: [{ name: b('Descriptive papers', 'वर्णनात्मक प्रश्नपत्र'), subjects: [b('GS I–IV, Hindi & essay', 'सामान्य अध्ययन I–IV, हिन्दी एवं निबंध')] }] },
      { name: b('Interview', 'साक्षात्कार'), papers: [{ name: b('Personality test', 'व्यक्तित्व परीक्षण'), subjects: [b('Interview', 'साक्षात्कार')] }] },
    ],
    note: b('Our practice sets cover the prelims.', 'हमारे अभ्यास सेट प्रारंभिक परीक्षा पर आधारित हैं।'),
  },
  ras: {
    stages: [
      {
        name: b('Prelims', 'प्रारंभिक परीक्षा'),
        papers: [
          {
            name: b('General Knowledge & General Science', 'सामान्य ज्ञान एवं सामान्य विज्ञान'),
            note: b('Screening for the mains', 'मुख्य परीक्षा के लिए छंटनी'),
            subjects: [
              b('History, art & culture of Rajasthan', 'राजस्थान का इतिहास, कला एवं संस्कृति'),
              b('Indian history', 'भारत का इतिहास'),
              b('Geography of Rajasthan, India & the world', 'राजस्थान, भारत एवं विश्व का भूगोल'),
              b('Indian polity & Rajasthan administration', 'भारतीय राजव्यवस्था एवं राजस्थान प्रशासन'),
              b('Economy of India & Rajasthan', 'भारत एवं राजस्थान की अर्थव्यवस्था'),
              b('Science & technology', 'विज्ञान एवं प्रौद्योगिकी'),
              b('Reasoning & mental ability', 'तार्किक एवं मानसिक योग्यता'),
              b('Current affairs', 'समसामयिकी'),
            ],
          },
        ],
      },
      { name: b('Mains', 'मुख्य परीक्षा'), papers: [{ name: b('Descriptive papers', 'वर्णनात्मक प्रश्नपत्र'), subjects: [b('GS I–III, Hindi & English', 'सामान्य अध्ययन I–III, हिन्दी एवं अंग्रेज़ी')] }] },
      { name: b('Interview', 'साक्षात्कार'), papers: [{ name: b('Personality test', 'व्यक्तित्व परीक्षण'), subjects: [b('Interview', 'साक्षात्कार')] }] },
    ],
    note: b(
      'RPSC papers have used a fifth option for "not attempted"; our RAS mocks follow the pattern in the latest notice.',
      'आरपीएससी के प्रश्नपत्रों में "अनुत्तरित" के लिए पांचवां विकल्प रहा है; हमारे आरएएस मॉक नवीनतम सूचना के पैटर्न का पालन करते हैं।',
    ),
  },
  'bihar-stet': {
    stages: [
      {
        name: b('Eligibility test', 'पात्रता परीक्षा'),
        papers: [
          {
            name: b('Paper I: Secondary (classes 9–10)', 'प्रश्नपत्र I: माध्यमिक (कक्षा 9–10)'),
            subjects: [b('Chosen subject', 'चुना गया विषय'), b('Teaching aptitude & pedagogy', 'शिक्षण अभिरुचि एवं शिक्षाशास्त्र')],
          },
          {
            name: b('Paper II: Senior secondary (classes 11–12)', 'प्रश्नपत्र II: उच्च माध्यमिक (कक्षा 11–12)'),
            subjects: [b('Chosen subject', 'चुना गया विषय'), b('Teaching aptitude & pedagogy', 'शिक्षण अभिरुचि एवं शिक्षाशास्त्र')],
          },
        ],
      },
    ],
    note: b('Subjects and question split follow the BSEB notice.', 'विषय एवं प्रश्नों का विभाजन बीएसईबी की सूचना के अनुसार।'),
  },
  ctet: {
    stages: [
      {
        name: b('Two papers (take one or both)', 'दो प्रश्नपत्र (एक या दोनों)'),
        papers: [
          {
            name: b('Paper 1: Classes 1–5', 'प्रश्नपत्र 1: कक्षा 1–5'),
            subjects: [
              b('Child development & pedagogy', 'बाल विकास एवं शिक्षाशास्त्र'),
              b('Language I', 'भाषा I'),
              b('Language II', 'भाषा II'),
              b('Mathematics', 'गणित'),
              b('Environmental studies', 'पर्यावरण अध्ययन'),
            ],
          },
          {
            name: b('Paper 2: Classes 6–8', 'प्रश्नपत्र 2: कक्षा 6–8'),
            subjects: [
              b('Child development & pedagogy', 'बाल विकास एवं शिक्षाशास्त्र'),
              b('Language I', 'भाषा I'),
              b('Language II', 'भाषा II'),
              b('Maths & science, or social studies', 'गणित एवं विज्ञान, या सामाजिक अध्ययन'),
            ],
          },
        ],
      },
    ],
  },
  'cg-tet': {
    stages: [
      {
        name: b('Two papers (take one or both)', 'दो प्रश्नपत्र (एक या दोनों)'),
        papers: [
          {
            name: b('Paper 1: Classes 1–5', 'प्रश्नपत्र 1: कक्षा 1–5'),
            subjects: [
              b('Child development & pedagogy', 'बाल विकास एवं शिक्षाशास्त्र'),
              b('Hindi', 'हिन्दी'),
              b('English / regional language', 'अंग्रेज़ी / क्षेत्रीय भाषा'),
              b('Mathematics', 'गणित'),
              b('Environmental studies', 'पर्यावरण अध्ययन'),
            ],
          },
          {
            name: b('Paper 2: Classes 6–8', 'प्रश्नपत्र 2: कक्षा 6–8'),
            subjects: [
              b('Child development & pedagogy', 'बाल विकास एवं शिक्षाशास्त्र'),
              b('Hindi', 'हिन्दी'),
              b('English / regional language', 'अंग्रेज़ी / क्षेत्रीय भाषा'),
              b('Maths & science, or social studies', 'गणित एवं विज्ञान, या सामाजिक अध्ययन'),
            ],
          },
        ],
      },
    ],
    note: b('Questions on Chhattisgarh appear across sections; follow the latest notice.', 'छत्तीसगढ़ से जुड़े प्रश्न कई खण्डों में आते हैं; नवीनतम सूचना देखें।'),
  },
};
