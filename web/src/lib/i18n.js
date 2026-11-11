import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const en = {
  nav: { home: 'Home', about: 'About Us', academics: 'Academics', facilities: 'Facilities', admissions: 'Admissions', gallery: 'Gallery', notices: 'News & Events', contact: 'Contact', disclosure: 'Mandatory Disclosure', tc: 'TC Verification', login: 'ERP Login', more: 'More', applyNow: 'Apply Now' },
  common: { readMore: 'Read more', viewAll: 'View all', learnMore: 'Learn more', call: 'Call', email: 'Email', address: 'Address', submit: 'Submit', back: 'Back', next: 'Next', loading: 'Loading…', close: 'Close', search: 'Search', since: 'Since', all: 'All', download: 'Download', send: 'Send', phone: 'Phone', name: 'Name', message: 'Message', yes: 'Yes', no: 'No', previous: 'Previous', optional: 'optional' },
  top: { affiliation: 'CBSE Affiliation No.', schoolCode: 'School Code', admissionsOpen: 'Admissions Open 2027-28' },
  home: {
    exploreCampus: 'Explore Campus', scroll: 'Scroll',
    aboutKicker: 'Welcome to', leadersKicker: 'Leadership', leadersTitle: 'Guided by Visionaries',
    statsKicker: 'Raj at a Glance', statsTitle: 'Numbers that speak for themselves',
    facilitiesKicker: 'Campus & Facilities', facilitiesTitle: 'Everything a child needs to thrive',
    resultsKicker: 'Board Results', resultsTitle: 'A legacy of academic excellence', resultsNote: 'CBSE pass percentage over the last three years',
    classX: 'Class X', classXII: 'Class XII', registered: 'Registered', passed: 'Passed',
    galleryKicker: 'Moments', galleryTitle: 'Life at Raj English School',
    testimonialsKicker: 'Testimonials', testimonialsTitle: 'What parents & alumni say',
    noticesKicker: 'Stay Updated', noticesTitle: 'Notice Board', eventsTitle: 'Upcoming Events',
    achievementKicker: 'Proud Moment', ctaTitle: 'Give your child the Raj advantage', ctaText: 'Registrations are open from Play Group to Class XI. Apply online in just 5 minutes.',
    latest: 'Latest', admissionProcess: 'Admission Process',
  },
  about: { kicker: 'Our Story', foundation: 'Sanchetana Yoga Foundation', journey: 'Milestones', vision: 'Vision & Mission', messages: 'Messages from Leadership', timeline: [
    ['1997', 'Founded by Dr. Hari Om Singh and affiliated with CBSE, New Delhi'],
    ['2023', 'Class X board pass percentage of 91.76%'],
    ['2025', 'Class X result rises to 95.7% and Class XII to 84.5%'],
    ['Proud moment', "Students meet the President of India at Rashtrapati Bhavan on Children's Day"],
    ['2026–2031', 'CBSE affiliation continued for 2026–2031'],
    ['Today', '120 smart classes, 9 labs, 72 teachers and a campus of 8,805 sq m'],
  ] },
  academics: {
    kicker: 'Learning Pathways', title: 'Academics at Raj', intro: 'A CBSE curriculum delivered through smart classrooms, experiential learning and personal mentoring — from the first step in Play Group to the board examinations of Class XII.',
    stages: [
      ['Pre-Primary', 'Play Group – UKG', 'Play-way method, phonics, motor skills, music, art and joyful early literacy.'],
      ['Primary', 'Class I – V', 'Strong foundations in languages, mathematics and EVS with computer education and GK.'],
      ['Middle', 'Class VI – VIII', 'Science, social science, Sanskrit and computers with labs, projects and 18 clubs.'],
      ['Secondary', 'Class IX – X', 'Focused CBSE board preparation, regular unit tests and remedial classes.'],
      ['Senior Secondary', 'Class XI – XII', 'A choice of 20 subjects in senior school with practical labs, career counselling and board preparation.'],
    ],
    subjects: 'Subjects Offered', assessment: 'Assessment & Evaluation', assessmentText: 'Continuous and comprehensive evaluation through Unit Tests, Half-Yearly and Annual examinations as per CBSE guidelines. Results and report cards are available online in the parent portal.',
    calendar: 'Academic Calendar',
  },
  facilities: { kicker: 'World-class Infrastructure', title: 'Our Facilities', intro: 'An 8,805 sq m campus designed for learning, play and growth.' },
  gallery: { kicker: 'Photo Gallery', title: 'Captured Moments', categories: { All: 'All', Achievements: 'Achievements', Events: 'Events', Campus: 'Campus', Labs: 'Labs', Sports: 'Sports', Activities: 'Activities' } },
  notices: { kicker: 'Notice Board', title: 'News, Notices & Events', categories: { ALL: 'All', NOTICE: 'Notices', CIRCULAR: 'Circulars', NEWS: 'News', ACHIEVEMENT: 'Achievements' }, upcoming: 'Upcoming Events', pinned: 'Pinned', eventTypes: { EVENT: 'Event', HOLIDAY: 'Holiday', EXAM: 'Exam', PTM: 'PTM', ACTIVITY: 'Activity' } },
  contact: {
    kicker: 'Get in Touch', title: 'Contact Us', directory: 'Contact Directory', purpose: 'Purpose', officer: 'Officer', mobile: 'Mobile',
    enquiry: 'Send an Enquiry', enquiryText: 'Have a question about admissions, fees, hostel or transport? Leave your details and our team will call you back.',
    classInterested: 'Class interested in', thanks: 'Thank you! Our admission team will contact you shortly.', locate: 'Locate Us', hours: 'Office Hours', hoursText: 'Mon – Sat: 8:00 AM – 3:00 PM',
  },
  admission: {
    kicker: 'Admissions 2027-28', title: 'Begin your journey with us', steps: ['Student', 'Parents', 'Address', 'Documents', 'Review & Pay'],
    process: [['Register Online', 'Fill the online form and upload documents'], ['Pay Registration Fee', 'Secure online payment of the registration fee'], ['Interaction / Test', 'Date intimated via SMS / Email'], ['Admission Confirmation', 'Submit fee and documents at the office']],
    documents: 'Documents Required', instructions: 'General Instructions',
    studentName: 'Student full name', gender: 'Gender', male: 'Male', female: 'Female', other: 'Other', dob: 'Date of birth', grade: 'Class applying for', bloodGroup: 'Blood group', aadhaar: 'Aadhaar number', previousSchool: 'Previous school',
    fatherName: "Father's name", fatherPhone: "Father's mobile", fatherEmail: "Father's email", fatherOccupation: "Father's occupation", motherName: "Mother's name", motherPhone: "Mother's mobile", motherOccupation: "Mother's occupation",
    permanentAddress: 'Permanent address', correspondenceAddress: 'Correspondence address', sameAddress: 'Same as permanent address', sibling: 'Sibling studying in this school (name & class)', hostel: 'Hostel required', transport: 'School transport required',
    upload: 'Upload documents', uploadHint: 'PNG, JPG or PDF — max 1 MB each, up to 6 files', declaration: 'I hereby confirm that the details in this form are true and correct to the best of my knowledge, and I agree to abide by the rules of the school.',
    registrationFee: 'Registration fee', payNow: 'Submit & Pay', paying: 'Processing payment…', success: 'Application submitted successfully!', regNo: 'Your registration number', paymentRef: 'Payment reference', saveNote: 'Please save this number. You will receive updates on SMS / Email.',
    checkStatus: 'Check application status', status: 'Status', track: 'Track', applyAnother: 'Submit another application', demoGateway: 'Secure payment (demo gateway)',
  },
  disclosure: { kicker: 'As per CBSE norms', title: 'Mandatory Public Disclosure', GENERAL: 'A. General Information', STAFF: 'B. Staff (Teaching)', INFRASTRUCTURE: 'C. School Infrastructure', DOCUMENTS: 'D. Documents & Information', results: 'E. Result & Academics', available: 'Available at school office' },
  tc: { kicker: 'Online Verification', title: 'Transfer Certificate Verification', hint: 'Enter the TC number (e.g. TC/2026/0001) or the admission number', verified: 'Verified Transfer Certificate', notFound: 'No record found', student: 'Student name', father: "Father's name", admissionNo: 'Admission no.', class: 'Class last studied', leaving: 'Date of leaving', issue: 'Date of issue', conduct: 'Conduct', reason: 'Reason for leaving' },
  footer: { quick: 'Quick Links', reach: 'Reach Us', poweredBy: 'Powered by', rights: 'All rights reserved.', portal: 'Parent & Staff Portal', privacy: 'Privacy Policy', terms: 'Terms', refund: 'Refund Policy' },
};

const hi = {
  nav: { home: 'मुख्य पृष्ठ', about: 'हमारे बारे में', academics: 'शिक्षा', facilities: 'सुविधाएँ', admissions: 'प्रवेश', gallery: 'गैलरी', notices: 'समाचार एवं कार्यक्रम', contact: 'संपर्क', disclosure: 'अनिवार्य प्रकटीकरण', tc: 'टीसी सत्यापन', login: 'ईआरपी लॉगिन', more: 'और', applyNow: 'अभी आवेदन करें' },
  common: { readMore: 'और पढ़ें', viewAll: 'सभी देखें', learnMore: 'अधिक जानें', call: 'कॉल करें', email: 'ईमेल', address: 'पता', submit: 'जमा करें', back: 'पीछे', next: 'आगे', loading: 'लोड हो रहा है…', close: 'बंद करें', search: 'खोजें', since: 'स्थापना', all: 'सभी', download: 'डाउनलोड', send: 'भेजें', phone: 'फ़ोन', name: 'नाम', message: 'संदेश', yes: 'हाँ', no: 'नहीं', previous: 'पिछला', optional: 'वैकल्पिक' },
  top: { affiliation: 'सीबीएसई संबद्धता सं.', schoolCode: 'विद्यालय कोड', admissionsOpen: 'प्रवेश प्रारंभ 2027-28' },
  home: {
    exploreCampus: 'परिसर देखें', scroll: 'स्क्रॉल करें',
    aboutKicker: 'आपका स्वागत है', leadersKicker: 'नेतृत्व', leadersTitle: 'दूरदर्शी मार्गदर्शन',
    statsKicker: 'राज एक नज़र में', statsTitle: 'आँकड़े जो स्वयं बोलते हैं',
    facilitiesKicker: 'परिसर एवं सुविधाएँ', facilitiesTitle: 'बच्चे के विकास के लिए सब कुछ',
    resultsKicker: 'बोर्ड परिणाम', resultsTitle: 'शैक्षणिक उत्कृष्टता की विरासत', resultsNote: 'पिछले तीन वर्षों का सीबीएसई उत्तीर्ण प्रतिशत',
    classX: 'कक्षा X', classXII: 'कक्षा XII', registered: 'पंजीकृत', passed: 'उत्तीर्ण',
    galleryKicker: 'यादगार पल', galleryTitle: 'राज इंग्लिश स्कूल का जीवन',
    testimonialsKicker: 'प्रशंसापत्र', testimonialsTitle: 'अभिभावक और पूर्व छात्र क्या कहते हैं',
    noticesKicker: 'अपडेट रहें', noticesTitle: 'सूचना पट्ट', eventsTitle: 'आगामी कार्यक्रम',
    achievementKicker: 'गौरव का क्षण', ctaTitle: 'अपने बच्चे को दें राज का लाभ', ctaText: 'प्ले ग्रुप से कक्षा XI तक पंजीकरण प्रारंभ हैं। केवल 5 मिनट में ऑनलाइन आवेदन करें।',
    latest: 'ताज़ा', admissionProcess: 'प्रवेश प्रक्रिया',
  },
  about: { kicker: 'हमारी कहानी', foundation: 'संचेतना योग फाउंडेशन', journey: 'उपलब्धियाँ', vision: 'दृष्टि एवं लक्ष्य', messages: 'नेतृत्व के संदेश', timeline: [
    ['1997', 'डॉ. हरि ओम सिंह द्वारा स्थापना एवं सीबीएसई, नई दिल्ली से संबद्धता'],
    ['2023', 'कक्षा X बोर्ड उत्तीर्ण प्रतिशत 91.76%'],
    ['2025', 'कक्षा X का परिणाम 95.7% और कक्षा XII का 84.5%'],
    ['गौरव का क्षण', 'बाल दिवस पर राष्ट्रपति भवन में विद्यार्थियों की भारत की राष्ट्रपति से भेंट'],
    ['2026–2031', 'सीबीएसई संबद्धता 2026–2031 के लिए जारी'],
    ['आज', '120 स्मार्ट कक्षाएँ, 9 प्रयोगशालाएँ, 72 शिक्षक और 8,805 वर्ग मीटर का परिसर'],
  ] },
  academics: {
    kicker: 'सीखने के मार्ग', title: 'राज में शिक्षा', intro: 'स्मार्ट कक्षाओं, अनुभवात्मक शिक्षा और व्यक्तिगत मार्गदर्शन के माध्यम से सीबीएसई पाठ्यक्रम — प्ले ग्रुप के पहले कदम से कक्षा XII की बोर्ड परीक्षा तक।',
    stages: [
      ['पूर्व-प्राथमिक', 'प्ले ग्रुप – यूकेजी', 'खेल-खेल में शिक्षा, ध्वनि ज्ञान, मोटर कौशल, संगीत, कला और आनंदमय प्रारंभिक साक्षरता।'],
      ['प्राथमिक', 'कक्षा I – V', 'कंप्यूटर शिक्षा और सामान्य ज्ञान के साथ भाषा, गणित और पर्यावरण अध्ययन की मज़बूत नींव।'],
      ['माध्यमिक', 'कक्षा VI – VIII', 'प्रयोगशालाओं, परियोजनाओं और 18 क्लबों के साथ विज्ञान, सामाजिक विज्ञान, संस्कृत और कंप्यूटर।'],
      ['सेकेंडरी', 'कक्षा IX – X', 'केंद्रित सीबीएसई बोर्ड तैयारी, नियमित इकाई परीक्षाएँ और उपचारात्मक कक्षाएँ।'],
      ['सीनियर सेकेंडरी', 'कक्षा XI – XII', 'सीनियर स्कूल में 20 विषयों का विकल्प, प्रायोगिक प्रयोगशालाएँ, करियर परामर्श और बोर्ड तैयारी।'],
    ],
    subjects: 'उपलब्ध विषय', assessment: 'मूल्यांकन एवं परीक्षा', assessmentText: 'सीबीएसई दिशानिर्देशों के अनुसार इकाई परीक्षा, अर्धवार्षिक और वार्षिक परीक्षाओं के माध्यम से सतत एवं व्यापक मूल्यांकन। परिणाम और रिपोर्ट कार्ड अभिभावक पोर्टल पर ऑनलाइन उपलब्ध हैं।',
    calendar: 'शैक्षणिक कैलेंडर',
  },
  facilities: { kicker: 'विश्व-स्तरीय अवसंरचना', title: 'हमारी सुविधाएँ', intro: 'सीखने, खेलने और आगे बढ़ने के लिए बना 8,805 वर्ग मीटर का परिसर।' },
  gallery: { kicker: 'फोटो गैलरी', title: 'यादगार क्षण', categories: { All: 'सभी', Achievements: 'उपलब्धियाँ', Events: 'कार्यक्रम', Campus: 'परिसर', Labs: 'प्रयोगशालाएँ', Sports: 'खेल', Activities: 'गतिविधियाँ' } },
  notices: { kicker: 'सूचना पट्ट', title: 'समाचार, सूचनाएँ एवं कार्यक्रम', categories: { ALL: 'सभी', NOTICE: 'सूचनाएँ', CIRCULAR: 'परिपत्र', NEWS: 'समाचार', ACHIEVEMENT: 'उपलब्धियाँ' }, upcoming: 'आगामी कार्यक्रम', pinned: 'महत्वपूर्ण', eventTypes: { EVENT: 'कार्यक्रम', HOLIDAY: 'अवकाश', EXAM: 'परीक्षा', PTM: 'अभिभावक बैठक', ACTIVITY: 'गतिविधि' } },
  contact: {
    kicker: 'संपर्क करें', title: 'हमसे संपर्क करें', directory: 'संपर्क निर्देशिका', purpose: 'उद्देश्य', officer: 'अधिकारी', mobile: 'मोबाइल',
    enquiry: 'पूछताछ भेजें', enquiryText: 'प्रवेश, शुल्क, छात्रावास या परिवहन के बारे में कोई प्रश्न? अपना विवरण दें, हमारी टीम आपको कॉल करेगी।',
    classInterested: 'किस कक्षा में रुचि', thanks: 'धन्यवाद! हमारी प्रवेश टीम शीघ्र ही आपसे संपर्क करेगी।', locate: 'हमारा स्थान', hours: 'कार्यालय समय', hoursText: 'सोम – शनि: प्रातः 8:00 – अपराह्न 3:00',
  },
  admission: {
    kicker: 'प्रवेश 2027-28', title: 'हमारे साथ अपनी यात्रा शुरू करें', steps: ['विद्यार्थी', 'अभिभावक', 'पता', 'दस्तावेज़', 'समीक्षा एवं भुगतान'],
    process: [['ऑनलाइन पंजीकरण', 'ऑनलाइन फॉर्म भरें और दस्तावेज़ अपलोड करें'], ['पंजीकरण शुल्क भुगतान', 'पंजीकरण शुल्क का सुरक्षित ऑनलाइन भुगतान'], ['वार्तालाप / परीक्षा', 'तिथि SMS / ईमेल द्वारा सूचित'], ['प्रवेश पुष्टि', 'कार्यालय में शुल्क और दस्तावेज़ जमा करें']],
    documents: 'आवश्यक दस्तावेज़', instructions: 'सामान्य निर्देश',
    studentName: 'विद्यार्थी का पूरा नाम', gender: 'लिंग', male: 'पुरुष', female: 'महिला', other: 'अन्य', dob: 'जन्म तिथि', grade: 'किस कक्षा हेतु आवेदन', bloodGroup: 'रक्त समूह', aadhaar: 'आधार संख्या', previousSchool: 'पिछला विद्यालय',
    fatherName: 'पिता का नाम', fatherPhone: 'पिता का मोबाइल', fatherEmail: 'पिता का ईमेल', fatherOccupation: 'पिता का व्यवसाय', motherName: 'माता का नाम', motherPhone: 'माता का मोबाइल', motherOccupation: 'माता का व्यवसाय',
    permanentAddress: 'स्थायी पता', correspondenceAddress: 'पत्राचार का पता', sameAddress: 'स्थायी पते के समान', sibling: 'इसी विद्यालय में पढ़ रहे भाई/बहन (नाम व कक्षा)', hostel: 'छात्रावास आवश्यक', transport: 'विद्यालय परिवहन आवश्यक',
    upload: 'दस्तावेज़ अपलोड करें', uploadHint: 'PNG, JPG या PDF — प्रत्येक अधिकतम 1 MB, अधिकतम 6 फ़ाइलें', declaration: 'मैं पुष्टि करता/करती हूँ कि इस फॉर्म में दिया गया विवरण मेरी जानकारी में सत्य और सही है, और मैं विद्यालय के नियमों का पालन करने के लिए सहमत हूँ।',
    registrationFee: 'पंजीकरण शुल्क', payNow: 'जमा करें एवं भुगतान करें', paying: 'भुगतान प्रक्रिया जारी…', success: 'आवेदन सफलतापूर्वक जमा हो गया!', regNo: 'आपकी पंजीकरण संख्या', paymentRef: 'भुगतान संदर्भ', saveNote: 'कृपया यह संख्या सुरक्षित रखें। आपको SMS / ईमेल पर सूचनाएँ प्राप्त होंगी।',
    checkStatus: 'आवेदन की स्थिति देखें', status: 'स्थिति', track: 'देखें', applyAnother: 'एक और आवेदन करें', demoGateway: 'सुरक्षित भुगतान (डेमो गेटवे)',
  },
  disclosure: { kicker: 'सीबीएसई मानदंडों के अनुसार', title: 'अनिवार्य सार्वजनिक प्रकटीकरण', GENERAL: 'क. सामान्य जानकारी', STAFF: 'ख. शिक्षण स्टाफ', INFRASTRUCTURE: 'ग. विद्यालय अवसंरचना', DOCUMENTS: 'घ. दस्तावेज़ एवं जानकारी', results: 'ङ. परिणाम एवं शैक्षणिक', available: 'विद्यालय कार्यालय में उपलब्ध' },
  tc: { kicker: 'ऑनलाइन सत्यापन', title: 'स्थानांतरण प्रमाण पत्र सत्यापन', hint: 'टीसी संख्या (जैसे TC/2026/0001) या प्रवेश संख्या दर्ज करें', verified: 'सत्यापित स्थानांतरण प्रमाण पत्र', notFound: 'कोई रिकॉर्ड नहीं मिला', student: 'विद्यार्थी का नाम', father: 'पिता का नाम', admissionNo: 'प्रवेश संख्या', class: 'अंतिम कक्षा', leaving: 'विद्यालय छोड़ने की तिथि', issue: 'जारी करने की तिथि', conduct: 'आचरण', reason: 'छोड़ने का कारण' },
  footer: { quick: 'त्वरित लिंक', reach: 'हम तक पहुँचें', poweredBy: 'संचालित', rights: 'सर्वाधिकार सुरक्षित।', portal: 'अभिभावक एवं स्टाफ पोर्टल', privacy: 'गोपनीयता नीति', terms: 'नियम', refund: 'धनवापसी नीति' },
};

const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('rny_lang') : null;

i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, hi: { translation: hi } },
  lng: saved || 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  returnObjects: true,
});

const applyLang = (lng) => { document.documentElement.lang = lng; };
applyLang(i18n.language);
i18n.on('languageChanged', (lng) => { localStorage.setItem('rny_lang', lng); applyLang(lng); });

export default i18n;
